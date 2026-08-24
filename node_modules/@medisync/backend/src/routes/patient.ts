import { Router } from 'express';
import { Role, AppointmentStatus, EmailType } from '@prisma/client';
import prisma from '../utils/prisma';
import { authenticateToken, requireRole } from '../middlewares/auth';
import { holdSlot, confirmBooking, BookingConflictError } from '../services/booking';
import { logEmail, sendEmailFromLog } from '../services/email';
import { createGoogleCalendarEvent, deleteGoogleCalendarEvent } from '../services/googleCalendar';

const router = Router();

// Secure all patient routes
router.use(authenticateToken);
router.use(requireRole(Role.PATIENT));

// Endpoint: Search doctors by name or specialization
router.get('/doctors', async (req, res) => {
  const { query } = req.query;

  try {
    const doctors = await prisma.doctorProfile.findMany({
      where: query
        ? {
            OR: [
              { user: { name: { contains: String(query), mode: 'insensitive' } } },
              { specialization: { contains: String(query), mode: 'insensitive' } },
            ],
          }
        : {},
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    return res.json({ status: 'success', doctors });
  } catch (err) {
    console.error('Error searching doctors:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to search doctors.' });
  }
});

// Endpoint: Calculate available slots for a doctor on a specific date
router.get('/doctors/:id/availability', async (req, res) => {
  const { id: doctorId } = req.params;
  const { date } = req.query;

  try {
    if (!date) {
      return res.status(400).json({ error: 'Bad Request', message: 'Date is required.' });
    }

    const queryDate = new Date(String(date));
    const weekday = queryDate.getDay(); // 0 = Sunday, 1 = Monday, etc.

    // 1. Fetch Doctor working hours and slot duration
    const doctor = await prisma.doctorProfile.findUnique({
      where: { userId: doctorId },
    });

    if (!doctor) {
      return res.status(404).json({ error: 'Not Found', message: 'Doctor not found.' });
    }

    const workingHours = doctor.workingHours as any[];
    const daySchedule = workingHours.find((h) => h.weekday === weekday);

    if (!daySchedule) {
      // Doctor does not work on this weekday
      return res.json({ status: 'success', slots: [] });
    }

    // Parse start and end hours (e.g. "09:00" -> hours: 9, minutes: 0)
    const [startH, startM] = daySchedule.start.split(':').map(Number);
    const [endH, endM] = daySchedule.end.split(':').map(Number);

    const slotDuration = doctor.slotDurationMinutes; // default 30

    // Set boundary limits
    const startLimit = new Date(queryDate);
    startLimit.setHours(startH, startM, 0, 0);

    const endLimit = new Date(queryDate);
    endLimit.setHours(endH, endM, 0, 0);

    // Fetch existing appointments on this day
    const startOfDay = new Date(queryDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(queryDate);
    endOfDay.setHours(23, 59, 59, 999);

    const appts = await prisma.appointment.findMany({
      where: {
        doctorId,
        slotStart: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: {
          in: [AppointmentStatus.CONFIRMED, AppointmentStatus.HELD, AppointmentStatus.COMPLETED],
        },
      },
    });

    // Fetch active slot holds
    const holds = await prisma.slotHold.findMany({
      where: {
        doctorId,
        slotStart: {
          gte: startOfDay,
          lte: endOfDay,
        },
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    const slots: { start: string; end: string }[] = [];
    let currentSlot = new Date(startLimit);

    const now = new Date();

    while (currentSlot < endLimit) {
      const slotStart = new Date(currentSlot);
      const slotEnd = new Date(currentSlot);
      slotEnd.setMinutes(slotEnd.getMinutes() + slotDuration);

      // Check if slot start is in the past (for today's queries)
      const isFuture = slotStart > now;

      // Check if slot is occupied
      const isBooked = appts.some(
        (a) => a.slotStart.getTime() === slotStart.getTime()
      );

      // Check if slot has active hold
      const isHeld = holds.some(
        (h) => h.slotStart.getTime() === slotStart.getTime()
      );

      if (isFuture && !isBooked && !isHeld) {
        slots.push({
          start: slotStart.toISOString(),
          end: slotEnd.toISOString(),
        });
      }

      // Advance
      currentSlot.setMinutes(currentSlot.getMinutes() + slotDuration);
    }

    return res.json({ status: 'success', slots });
  } catch (err) {
    console.error('Error fetching doctor slots:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to calculate available slots.' });
  }
});

// Endpoint: Select slot (holds it for 90 seconds)
router.post('/holds', async (req, res) => {
  const { doctorId, slotStart, slotEnd } = req.body;
  const patientId = req.user!.id;

  try {
    if (!doctorId || !slotStart || !slotEnd) {
      return res.status(400).json({ error: 'Bad Request', message: 'Missing required hold properties.' });
    }

    const hold = await holdSlot(
      doctorId,
      new Date(slotStart),
      new Date(slotEnd),
      patientId
    );

    const remainingSecs = Math.max(0, Math.ceil((hold.expiresAt.getTime() - Date.now()) / 1000));

    return res.status(201).json({
      status: 'success',
      holdId: hold.id,
      expiresAt: hold.expiresAt,
      remainingSecs,
    });
  } catch (err: any) {
    if (err instanceof BookingConflictError) {
      return res.status(409).json({ error: 'Conflict', message: err.message });
    }
    console.error('Error establishing slot hold:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to lock slot.' });
  }
});

// Endpoint: Confirm Booking
router.post('/appointments', async (req, res) => {
  const { holdId, doctorId, slotStart, slotEnd, symptomsText } = req.body;
  const patientId = req.user!.id;

  try {
    if (!holdId || !doctorId || !slotStart || !slotEnd || !symptomsText) {
      return res.status(400).json({ error: 'Bad Request', message: 'Missing required booking confirmation fields.' });
    }

    const appt = await confirmBooking(
      holdId,
      patientId,
      doctorId,
      new Date(slotStart),
      new Date(slotEnd),
      symptomsText
    );

    // Fetch details for email
    const patientUser = await prisma.user.findUnique({ where: { id: patientId } });
    const doctorUser = await prisma.user.findUnique({
      where: { id: doctorId },
    });

    if (patientUser && doctorUser) {
      // 1. Log and send Email notification
      const log = await logEmail(patientUser.email, EmailType.BOOKING_CONFIRM, {
        patientName: patientUser.name,
        doctorName: doctorUser.name,
        slotStart: appt.slotStart,
      });
      await sendEmailFromLog(log.id);

      // 2. Synchronize Google Calendar Event
      createGoogleCalendarEvent(appt.id).catch((err) => {
        console.error(`Google Calendar Event Sync failed for Appt ${appt.id}:`, err);
      });
    }

    return res.status(201).json({
      status: 'success',
      appointment: appt,
    });
  } catch (err: any) {
    if (err instanceof BookingConflictError) {
      return res.status(409).json({ error: 'Conflict', message: err.message });
    }
    console.error('Error confirming appointment booking:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to confirm appointment booking.' });
  }
});

// Endpoint: Fetch patient appointments history
router.get('/appointments', async (req, res) => {
  try {
    const patientId = req.user!.id;
    const appointments = await prisma.appointment.findMany({
      where: {
        patientId,
      },
      include: {
        doctor: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        symptomForm: true,
        preVisitSummary: true,
        postVisitNote: true,
        postVisitSummary: true,
      },
      orderBy: {
        slotStart: 'desc',
      },
    });

    return res.json({ status: 'success', appointments });
  } catch (err) {
    console.error('Error fetching patient appointments:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to retrieve appointments.' });
  }
});

// Endpoint: Cancel appointment
router.post('/appointments/:id/cancel', async (req, res) => {
  const { id } = req.params;
  const patientId = req.user!.id;

  try {
    const appt = await prisma.appointment.findFirst({
      where: { id, patientId },
      include: {
        patient: true,
        doctor: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!appt) {
      return res.status(404).json({ error: 'Not Found', message: 'Appointment not found.' });
    }

    if (appt.status === AppointmentStatus.CANCELLED) {
      return res.status(400).json({ error: 'Bad Request', message: 'Appointment is already cancelled.' });
    }

    // Cancel appointment
    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        status: AppointmentStatus.CANCELLED,
      },
    });

    // 1. Delete Google Calendar Event
    deleteGoogleCalendarEvent(id).catch((err) => {
      console.error(`Google Calendar Event cancel failed for Appt ${id}:`, err);
    });

    // 2. Send email notification
    const log = await logEmail(appt.patient.email, EmailType.CANCELLATION, {
      patientName: appt.patient.name,
      doctorName: appt.doctor.user.name,
      slotStart: appt.slotStart,
    });
    await sendEmailFromLog(log.id);

    return res.json({
      status: 'success',
      message: 'Appointment cancelled successfully.',
      appointment: updated,
    });
  } catch (err) {
    console.error('Error cancelling appointment:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to cancel appointment.' });
  }
});

// Endpoint: Fetch active medication reminders
router.get('/reminders', async (req, res) => {
  try {
    const reminders = await prisma.medicationReminder.findMany({
      where: { patientId: req.user!.id },
      orderBy: { scheduledTime: 'asc' },
    });
    return res.json({ status: 'success', reminders });
  } catch (err) {
    console.error('Error fetching reminders:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to retrieve reminders.' });
  }
});

// Endpoint: Toggle reminder status (sent/complete status)
router.patch('/reminders/:id/toggle', async (req, res) => {
  const { id } = req.params;

  try {
    const reminder = await prisma.medicationReminder.findFirst({
      where: { id, patientId: req.user!.id },
    });

    if (!reminder) {
      return res.status(404).json({ error: 'Not Found', message: 'Reminder not found.' });
    }

    const updated = await prisma.medicationReminder.update({
      where: { id },
      data: {
        sent: !reminder.sent,
        sentAt: !reminder.sent ? new Date() : null,
      },
    });

    return res.json({
      status: 'success',
      message: `Reminder marked as ${updated.sent ? 'completed' : 'pending'}.`,
      reminder: updated,
    });
  } catch (err) {
    console.error('Error toggling reminder status:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to toggle reminder.' });
  }
});

export default router;
