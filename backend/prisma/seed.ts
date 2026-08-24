import { PrismaClient, Role, AppointmentStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Clear existing data in reverse order of dependencies
  await prisma.slotHold.deleteMany();
  await prisma.medicationReminder.deleteMany();
  await prisma.symptomForm.deleteMany();
  await prisma.preVisitSummary.deleteMany();
  await prisma.postVisitNote.deleteMany();
  await prisma.postVisitSummary.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.doctorLeave.deleteMany();
  await prisma.leaveConflictLog.deleteMany();
  await prisma.doctorProfile.deleteMany();
  await prisma.user.deleteMany();

  const saltRounds = 10;
  const adminPasswordHash = await bcrypt.hash('adminpassword', saltRounds);
  const doctorPasswordHash = await bcrypt.hash('doctorpassword', saltRounds);
  const patientPasswordHash = await bcrypt.hash('patientpassword', saltRounds);

  // 1. Admin
  const admin = await prisma.user.create({
    data: {
      email: 'admin@medisync.com',
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
      name: 'System Admin',
      phone: '1234567890',
    },
  });
  console.log('Created Admin User:', admin.email);

  // 2. Doctors
  // Dr. Sarah Jenkins (Cardiology)
  const drJenkinsUser = await prisma.user.create({
    data: {
      email: 'sarah.jenkins@medisync.com',
      passwordHash: doctorPasswordHash,
      role: Role.DOCTOR,
      name: 'Dr. Sarah Jenkins',
      phone: '9876543210',
    },
  });

  const drJenkinsProfile = await prisma.doctorProfile.create({
    data: {
      userId: drJenkinsUser.id,
      specialization: 'Cardiology',
      bio: 'Board-certified cardiologist with over 15 years of experience in cardiovascular health.',
      workingHours: [
        { weekday: 1, start: '09:00', end: '17:00' },
        { weekday: 2, start: '09:00', end: '17:00' },
        { weekday: 3, start: '09:00', end: '17:00' },
        { weekday: 4, start: '09:00', end: '17:00' },
        { weekday: 5, start: '09:00', end: '17:00' },
      ],
      slotDurationMinutes: 30,
      consultationFee: 150.00,
    },
  });

  // Dr. Michael Chen (Pediatrics)
  const drChenUser = await prisma.user.create({
    data: {
      email: 'michael.chen@medisync.com',
      passwordHash: doctorPasswordHash,
      role: Role.DOCTOR,
      name: 'Dr. Michael Chen',
      phone: '9876543211',
    },
  });

  const drChenProfile = await prisma.doctorProfile.create({
    data: {
      userId: drChenUser.id,
      specialization: 'Pediatrics',
      bio: 'Pediatrician dedicated to providing compassionate care for infants, children, and adolescents.',
      workingHours: [
        { weekday: 1, start: '10:00', end: '16:00' },
        { weekday: 2, start: '10:00', end: '16:00' },
        { weekday: 3, start: '10:00', end: '16:00' },
        { weekday: 4, start: '10:00', end: '16:00' },
      ],
      slotDurationMinutes: 20,
      consultationFee: 120.00,
    },
  });

  // Dr. Emily Rodriguez (General Medicine)
  const drRodriguezUser = await prisma.user.create({
    data: {
      email: 'emily.rodriguez@medisync.com',
      passwordHash: doctorPasswordHash,
      role: Role.DOCTOR,
      name: 'Dr. Emily Rodriguez',
      phone: '9876543212',
    },
  });

  const drRodriguezProfile = await prisma.doctorProfile.create({
    data: {
      userId: drRodriguezUser.id,
      specialization: 'General Medicine',
      bio: 'Primary care physician focused on preventive medicine and family healthcare.',
      workingHours: [
        { weekday: 2, start: '08:00', end: '16:00' },
        { weekday: 3, start: '08:00', end: '16:00' },
        { weekday: 4, start: '08:00', end: '16:00' },
        { weekday: 5, start: '08:00', end: '16:00' },
        { weekday: 6, start: '08:00', end: '16:00' },
      ],
      slotDurationMinutes: 30,
      consultationFee: 100.00,
    },
  });

  console.log('Created Doctor Profiles');

  // 3. Patients
  const patient1 = await prisma.user.create({
    data: {
      email: 'john.doe@gmail.com',
      passwordHash: patientPasswordHash,
      role: Role.PATIENT,
      name: 'John Doe',
      phone: '5551234567',
    },
  });

  const patient2 = await prisma.user.create({
    data: {
      email: 'alice.smith@gmail.com',
      passwordHash: patientPasswordHash,
      role: Role.PATIENT,
      name: 'Alice Smith',
      phone: '5557654321',
    },
  });

  const patient3 = await prisma.user.create({
    data: {
      email: 'bob.johnson@gmail.com',
      passwordHash: patientPasswordHash,
      role: Role.PATIENT,
      name: 'Bob Johnson',
      phone: '5559998888',
    },
  });

  console.log('Created Patient Users');

  // 4. Mock Appointments
  const today = new Date();
  const nextTuesday = new Date(today);
  nextTuesday.setDate(today.getDate() + ((2 + 7 - today.getDay()) % 7 || 7));
  nextTuesday.setHours(10, 0, 0, 0);

  const slot1Start = new Date(nextTuesday);
  const slot1EndJenkins = new Date(slot1Start);
  slot1EndJenkins.setMinutes(slot1Start.getMinutes() + 30);

  const slot1EndChen = new Date(slot1Start);
  slot1EndChen.setMinutes(slot1Start.getMinutes() + 20);

  const slot2Start = new Date(nextTuesday);
  slot2Start.setHours(11, 0);
  const slot2End = new Date(slot2Start);
  slot2End.setMinutes(slot2Start.getMinutes() + 30);

  const slot3Start = new Date(nextTuesday);
  slot3Start.setHours(14, 0);
  const slot3End = new Date(slot3Start);
  slot3End.setMinutes(slot3Start.getMinutes() + 30);

  // Past completed appointment (yesterday)
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  yesterday.setHours(10, 0, 0, 0);
  const slotPastStart = new Date(yesterday);
  const slotPastEnd = new Date(slotPastStart);
  slotPastEnd.setMinutes(slotPastStart.getMinutes() + 30);

  // Appt 1: Confirmed with Dr. Sarah Jenkins (Next Tuesday 10 AM)
  await prisma.appointment.create({
    data: {
      patientId: patient1.id,
      doctorId: drJenkinsProfile.userId,
      slotStart: slot1Start,
      slotEnd: slot1EndJenkins,
      status: AppointmentStatus.CONFIRMED,
    },
  });

  // Appt 2: Completed with Dr. Sarah Jenkins (Yesterday)
  await prisma.appointment.create({
    data: {
      patientId: patient2.id,
      doctorId: drJenkinsProfile.userId,
      slotStart: slotPastStart,
      slotEnd: slotPastEnd,
      status: AppointmentStatus.COMPLETED,
    },
  });

  // Appt 3: Held slot with Dr. Michael Chen (Next Tuesday 10 AM)
  await prisma.appointment.create({
    data: {
      patientId: patient3.id,
      doctorId: drChenProfile.userId,
      slotStart: slot1Start,
      slotEnd: slot1EndChen,
      status: AppointmentStatus.HELD,
    },
  });

  // Appt 4: Cancelled with Dr. Emily Rodriguez (Next Tuesday 2 PM)
  await prisma.appointment.create({
    data: {
      patientId: patient1.id,
      doctorId: drRodriguezProfile.userId,
      slotStart: slot3Start,
      slotEnd: slot3End,
      status: AppointmentStatus.CANCELLED,
    },
  });

  console.log('Created Mock Appointments');
  console.log('Database Seeding Successful!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
