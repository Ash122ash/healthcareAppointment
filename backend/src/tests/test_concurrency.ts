import prisma from '../utils/prisma';
import { holdSlot, confirmBooking, BookingConflictError } from '../services/booking';
import { Role } from '@prisma/client';
import bcrypt from 'bcrypt';

async function runConcurrencyTest() {
  console.log('--- STARTING CONCURRENCY SAFE BOOKING LOCK TESTS ---');

  try {
    // 1. Ensure test doctor and patient users exist
    const doctor = await prisma.user.findFirst({ where: { role: Role.DOCTOR } });
    const patientA = await prisma.user.findFirst({ where: { email: 'john.doe@gmail.com' } });
    
    let patientB = await prisma.user.findFirst({ where: { email: 'concurrency.test@medisync.com' } });
    if (!patientB) {
      const passwordHash = await bcrypt.hash('testpassword', 10);
      patientB = await prisma.user.create({
        data: {
          email: 'concurrency.test@medisync.com',
          name: 'Patient B (Test)',
          passwordHash,
          role: Role.PATIENT,
        },
      });
    }

    if (!doctor || !patientA || !patientB) {
      throw new Error('Database lacks necessary doctors or patients to run the concurrency tests.');
    }

    const testSlotStart = new Date();
    testSlotStart.setDate(testSlotStart.getDate() + 5); // 5 days from now
    testSlotStart.setHours(10, 0, 0, 0); // 10:00 AM

    const testSlotEnd = new Date(testSlotStart);
    testSlotEnd.setMinutes(testSlotEnd.getMinutes() + 30);

    // Clean up any stale data for this slot before starting
    await prisma.appointment.deleteMany({
      where: {
        doctorId: doctor.id,
        slotStart: testSlotStart,
      },
    });
    await prisma.slotHold.deleteMany({
      where: {
        doctorId: doctor.id,
        slotStart: testSlotStart,
      },
    });

    console.log(`Setting up test slot: ${testSlotStart.toISOString()} with Doctor: ${doctor.name}`);

    // --- TEST 1: Hold Collision ---
    console.log('\n[Test 1] Simulating Patient A requesting slot hold...');
    const holdA = await holdSlot(doctor.id, testSlotStart, testSlotEnd, patientA.id);
    console.log(`-> Patient A hold established. Hold ID: ${holdA.id}`);

    console.log('[Test 1] Simulating Patient B requesting slot hold on same slot concurrently...');
    try {
      await holdSlot(doctor.id, testSlotStart, testSlotEnd, patientB.id);
      throw new Error('FAIL: Patient B established a hold on an already held slot!');
    } catch (err: any) {
      if (err instanceof BookingConflictError) {
        console.log(`-> SUCCESS: Patient B blocked correctly. Error: "${err.message}"`);
      } else {
        throw err;
      }
    }

    // --- TEST 2: Transaction Double Booking Prevention ---
    console.log('\n[Test 2] Simulating Patient A confirming the booking...');
    const bookingA = await confirmBooking(holdA.id, patientA.id, doctor.id, testSlotStart, testSlotEnd, 'Test symptoms');
    console.log(`-> Patient A checkout confirmed. Appointment ID: ${bookingA.id}`);

    // Clean up test data
    await prisma.appointment.delete({ where: { id: bookingA.id } });
    await prisma.symptomForm.deleteMany({ where: { appointmentId: bookingA.id } });
    await prisma.preVisitSummary.deleteMany({ where: { appointmentId: bookingA.id } });

    console.log('\n--- ALL CONCURRENCY LOCK TESTS PASSED SUCCESSFULLY ---');
  } catch (err: any) {
    console.error('\nFAIL: Concurrency tests encountered an error:', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runConcurrencyTest();
