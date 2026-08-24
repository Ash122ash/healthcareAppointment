import { Prisma } from '@prisma/client';
import prisma from '../utils/prisma';
import { generatePreVisitSummary } from './ai';

export class BookingConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BookingConflictError';
  }
}

export async function holdSlot(
  doctorId: string,
  slotStart: Date,
  slotEnd: Date,
  patientId: string
) {
  // Check if doctor profile exists
  const doctor = await prisma.doctorProfile.findUnique({
    where: { userId: doctorId },
  });
  if (!doctor) {
    throw new BookingConflictError('Doctor profile not found.');
  }

  // Check if slot is already occupied by a confirmed appointment
  const existingAppt = await prisma.appointment.findFirst({
    where: {
      doctorId,
      slotStart,
      status: {
        in: ['CONFIRMED', 'HELD', 'COMPLETED'],
      },
    },
  });

  if (existingAppt) {
    throw new BookingConflictError('This slot is already booked.');
  }

  // Check for any active, unexpired holds on this slot
  const now = new Date();
  const existingHold = await prisma.slotHold.findFirst({
    where: {
      doctorId,
      slotStart,
      expiresAt: {
        gt: now,
      },
    },
  });

  if (existingHold) {
    if (existingHold.patientId === patientId) {
      // Patient already holds this slot, extend it
      return prisma.slotHold.update({
        where: { id: existingHold.id },
        data: {
          expiresAt: new Date(Date.now() + 90 * 1000), // 90 seconds expiry
        },
      });
    }
    throw new BookingConflictError('This slot is temporarily locked by another patient.');
  }

  // Create new hold
  return prisma.slotHold.create({
    data: {
      doctorId,
      patientId,
      slotStart,
      slotEnd,
      expiresAt: new Date(Date.now() + 90 * 1000),
    },
  });
}

export async function confirmBooking(
  holdId: string,
  patientId: string,
  doctorId: string,
  slotStart: Date,
  slotEnd: Date,
  symptomsText: string
) {
  // Execute database transaction at Serializable isolation level
  const appointment = await prisma.$transaction(
    async (tx) => {
      const now = new Date();

      // 1. Verify hold exists and has not expired
      const hold = await tx.slotHold.findUnique({
        where: { id: holdId },
      });

      if (!hold || hold.expiresAt < now || hold.patientId !== patientId) {
        throw new BookingConflictError('Your session lock on this slot has expired. Please select the slot again.');
      }

      // 2. Double check that no concurrent transaction has booked this slot
      const existingAppt = await tx.appointment.findFirst({
        where: {
          doctorId,
          slotStart,
          status: {
            in: ['CONFIRMED', 'HELD', 'COMPLETED'],
          },
        },
      });

      if (existingAppt) {
        throw new BookingConflictError('This slot has just been booked by another patient. Please select another slot.');
      }

      // 3. Create the appointment (mark HELD or CONFIRMED)
      const appt = await tx.appointment.create({
        data: {
          patientId,
          doctorId,
          slotStart,
          slotEnd,
          status: 'CONFIRMED', // Confirm booking
        },
      });

      // 4. Create symptom form entry
      await tx.symptomForm.create({
        data: {
          appointmentId: appt.id,
          symptomsText,
        },
      });

      // 5. Delete the hold
      await tx.slotHold.delete({
        where: { id: holdId },
      });

      return appt;
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    }
  );

  // Asynchronously trigger AI pre-visit pipeline and email notifications
  // (Failures will degrade gracefully inside the AI services and not affect checkout success)
  triggerPreVisitPipeline(appointment.id, symptomsText).catch((err) => {
    console.error(`AI Pipeline trigger error for appointment ${appointment.id}:`, err);
  });

  return appointment;
}

async function triggerPreVisitPipeline(appointmentId: string, symptomsText: string) {
  const result = await generatePreVisitSummary(symptomsText);

  await prisma.preVisitSummary.create({
    data: {
      appointmentId,
      urgencyLevel: result.urgencyLevel,
      chiefComplaint: result.chiefComplaint,
      suggestedQuestions: result.suggestedQuestions,
      rawLLMResponse: result.rawLLMResponse,
      status: result.status,
    },
  });

  console.log(`Pre-visit AI pipeline completed for appointment ${appointmentId}`);
}
