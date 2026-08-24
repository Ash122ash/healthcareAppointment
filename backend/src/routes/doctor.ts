import { Router } from 'express';
import { Role, AppointmentStatus, EmailType } from '@prisma/client';
import prisma from '../utils/prisma';
import { authenticateToken, requireRole } from '../middlewares/auth';
import { generatePostVisitSummary } from '../services/ai';
import { logEmail, sendEmailFromLog } from '../services/email';
import { deleteGoogleCalendarEvent } from '../services/googleCalendar';

const router = Router();

// Secure all doctor routes
router.use(authenticateToken);
router.use(requireRole(Role.DOCTOR));

// Endpoint: Fetch today's and upcoming appointments for doctor
router.get('/appointments', async (req, res) => {
  try {
    const doctorId = req.user!.id;
    const appointments = await prisma.appointment.findMany({
      where: {
        doctorId,
      },
      include: {
        patient: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
          },
        },
        symptomForm: true,
        preVisitSummary: true,
        postVisitNote: true,
        postVisitSummary: true,
      },
      orderBy: {
        slotStart: 'asc',
      },
    });

    return res.json({ status: 'success', appointments });
  } catch (err) {
    console.error('Error fetching doctor appointments:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to retrieve appointments.' });
  }
});

// Endpoint: Submit clinical notes, prescription, and generate AI Patient friendly summary
router.post('/appointments/:id/notes', async (req, res) => {
  const { id: appointmentId } = req.params;
  const { clinicalNotes, prescriptionJSON } = req.body;

  try {
    if (!clinicalNotes || !prescriptionJSON) {
      return res.status(400).json({ error: 'Bad Request', message: 'Clinical notes and prescription are required.' });
    }

    const appt = await prisma.appointment.findFirst({
      where: { id: appointmentId, doctorId: req.user!.id },
      include: { patient: true },
    });

    if (!appt) {
      return res.status(404).json({ error: 'Not Found', message: 'Appointment not found.' });
    }

    // Generate AI Summary
    const aiResult = await generatePostVisitSummary(clinicalNotes);

    // Save in transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create PostVisitNote
      const note = await tx.postVisitNote.create({
        data: {
          appointmentId,
          clinicalNotes,
          prescriptionJSON,
        },
      });

      // 2. Create PostVisitSummary
      const summary = await tx.postVisitSummary.create({
        data: {
          appointmentId,
          patientFriendlyText: aiResult.patientFriendlyText,
          medicationSchedule: aiResult.medicationSchedule,
          followUpSteps: aiResult.followUpSteps,
          status: aiResult.status,
        },
      });

      // 3. Update appointment to completed
      await tx.appointment.update({
        where: { id: appointmentId },
        data: {
          status: AppointmentStatus.COMPLETED,
        },
      });

      // 4. Create medication reminders for patient if medicines exist in prescription
      const reminderPromises = aiResult.medicationSchedule.map((med: any) => {
        const scheduledTime = new Date();
        scheduledTime.setDate(scheduledTime.getDate() + 1); // Mock: start reminders tomorrow
        scheduledTime.setHours(9, 0, 0, 0); // Default daily reminder morning time

        return tx.medicationReminder.create({
          data: {
            appointmentId,
            patientId: appt.patientId,
            medicine: med.medicine,
            scheduledTime,
          },
        });
      });

      await Promise.all(reminderPromises);

      return { note, summary };
    });

    return res.json({
      status: 'success',
      message: 'Consultation notes submitted and AI patient summary generated.',
      data: result,
    });
  } catch (err) {
    console.error('Error submitting appointment notes:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to submit consultation notes.' });
  }
});

// Endpoint: Fetch leave dates for this doctor
router.get('/leaves', async (req, res) => {
  try {
    const leaves = await prisma.doctorLeave.findMany({
      where: { doctorId: req.user!.id },
      orderBy: { date: 'asc' },
    });
    return res.json({ status: 'success', leaves });
  } catch (err) {
    console.error('Error fetching doctor leaves:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to retrieve leaves.' });
  }
});

// Endpoint: Request leave date (Admin conflict handling logic triggered here)
router.post('/leaves', async (req, res) => {
  const { date, reason } = req.body;
  const doctorId = req.user!.id;

  try {
    if (!date) {
      return res.status(400).json({ error: 'Bad Request', message: 'Leave date is required.' });
    }

    const leaveDate = new Date(date);
    const startOfDay = new Date(leaveDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(leaveDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Conflict Check: Find all active appointments for this doctor on this day
    const conflictingAppts = await prisma.appointment.findMany({
      where: {
        doctorId,
        slotStart: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: {
          in: [AppointmentStatus.CONFIRMED, AppointmentStatus.HELD],
        },
      },
      include: {
        patient: true,
        doctor: {
          include: {
            user: true,
          },
        },
      },
    });

    // Run cancellation logic inside transaction
    await prisma.$transaction(async (tx) => {
      // 1. Create Leave date record
      await tx.doctorLeave.create({
        data: {
          doctorId,
          date: startOfDay,
          reason: reason || null,
        },
      });

      // 2. Cancel conflicting appointments
      if (conflictingAppts.length > 0) {
        const apptIds = conflictingAppts.map((a) => a.id);
        await tx.appointment.updateMany({
          where: { id: { in: apptIds } },
          data: {
            status: AppointmentStatus.CANCELLED,
          },
        });

        // 3. Log the operation in LeaveConflictLog
        await tx.leaveConflictLog.create({
          data: {
            doctorId,
            leaveDate: startOfDay,
            cancelledAppointments: conflictingAppts.map((a) => ({
              id: a.id,
              patientName: a.patient.name,
              patientEmail: a.patient.email,
              slotStart: a.slotStart,
            })),
          },
        });
      }
    });

    // Send emails and remove Google Calendar events asynchronously
    for (const appt of conflictingAppts) {
      // 1. Delete calendar event
      deleteGoogleCalendarEvent(appt.id).catch((err) => {
        console.error(`Failed to delete calendar event for cancelled leave appt ${appt.id}:`, err);
      });

      // 2. Log cancellation notification
      logEmail(appt.patient.email, EmailType.LEAVE_NOTICE, {
        patientName: appt.patient.name,
        doctorName: appt.doctor.user.name,
        leaveDate: startOfDay,
      })
        .then((log) => sendEmailFromLog(log.id))
        .catch((err) => {
          console.error(`Failed to send leave cancellation email for appt ${appt.id}:`, err);
        });
    }

    return res.status(201).json({
      status: 'success',
      message: `Leave request registered successfully. ${conflictingAppts.length} conflicting appointments were cancelled and patients notified.`,
      cancelledCount: conflictingAppts.length,
    });
  } catch (err) {
    console.error('Error scheduling leave request:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to schedule leave request.' });
  }
});

// Endpoint: Fetch doctor profile details
router.get('/profile', async (req, res) => {
  try {
    const profile = await prisma.doctorProfile.findUnique({
      where: { userId: req.user!.id },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
            googleRefreshToken: true,
          },
        },
      },
    });

    if (!profile) {
      return res.status(404).json({ error: 'Not Found', message: 'Doctor profile not found.' });
    }

    return res.json({ status: 'success', profile });
  } catch (err) {
    console.error('Error fetching doctor profile:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to retrieve profile.' });
  }
});

// Endpoint: Update doctor profile config
router.put('/profile', async (req, res) => {
  const { specialization, bio, workingHours, slotDurationMinutes, consultationFee } = req.body;

  try {
    const updated = await prisma.doctorProfile.update({
      where: { userId: req.user!.id },
      data: {
        specialization,
        bio,
        workingHours,
        slotDurationMinutes: slotDurationMinutes ? parseInt(slotDurationMinutes) : undefined,
        consultationFee: consultationFee ? parseFloat(consultationFee) : undefined,
      },
    });

    return res.json({ status: 'success', profile: updated });
  } catch (err) {
    console.error('Error updating doctor profile:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to update profile config.' });
  }
});

export default router;
