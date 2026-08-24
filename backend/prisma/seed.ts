import { PrismaClient, Role, AppointmentStatus, LLMStatus, UrgencyLevel } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Clear existing data in reverse order of dependencies
  await prisma.medicationReminder.deleteMany();
  await prisma.slotHold.deleteMany();
  await prisma.symptomForm.deleteMany();
  await prisma.preVisitSummary.deleteMany();
  await prisma.postVisitNote.deleteMany();
  await prisma.postVisitSummary.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.doctorLeave.deleteMany();
  await prisma.leaveConflictLog.deleteMany();
  await prisma.doctorProfile.deleteMany();
  await prisma.emailLog.deleteMany();
  await prisma.user.deleteMany();

  const saltRounds = 10;
  const adminHash   = await bcrypt.hash('adminpassword', saltRounds);
  const doctorHash  = await bcrypt.hash('Demo@1234', saltRounds);
  const patientHash = await bcrypt.hash('Patient@1234', saltRounds);

  // ──────────────────────────────────────
  // 1. ADMIN
  // ──────────────────────────────────────
  await prisma.user.create({
    data: {
      email: 'admin@medisync.com',
      passwordHash: adminHash,
      role: Role.ADMIN,
      name: 'System Admin',
      phone: '9000000001',
    },
  });
  console.log('✅ Admin created');

  // ──────────────────────────────────────
  // 2. DOCTORS
  // ──────────────────────────────────────
  const drRajeshUser = await prisma.user.create({
    data: {
      email: 'dr.rajesh.kumar@medisync.com',
      passwordHash: doctorHash,
      role: Role.DOCTOR,
      name: 'Dr. Rajesh Kumar',
      phone: '9000000002',
    },
  });
  const drRajeshProfile = await prisma.doctorProfile.create({
    data: {
      userId: drRajeshUser.id,
      specialization: 'Cardiology',
      bio: 'Senior cardiologist with 18 years of experience in interventional cardiology and heart failure management. MBBS, MD, DM – AIIMS Delhi.',
      workingHours: [
        { weekday: 1, start: '09:00', end: '17:00' },
        { weekday: 2, start: '09:00', end: '17:00' },
        { weekday: 3, start: '09:00', end: '17:00' },
        { weekday: 4, start: '09:00', end: '17:00' },
        { weekday: 5, start: '09:00', end: '17:00' },
      ],
      slotDurationMinutes: 30,
      consultationFee: 800,
    },
  });

  const drPriyaUser = await prisma.user.create({
    data: {
      email: 'dr.priya.sharma@medisync.com',
      passwordHash: doctorHash,
      role: Role.DOCTOR,
      name: 'Dr. Priya Sharma',
      phone: '9000000003',
    },
  });
  const drPriyaProfile = await prisma.doctorProfile.create({
    data: {
      userId: drPriyaUser.id,
      specialization: 'Pediatrics',
      bio: 'Child health specialist focused on growth, development, and preventive care. MBBS, MD Paediatrics – KEM Mumbai.',
      workingHours: [
        { weekday: 1, start: '10:00', end: '16:00' },
        { weekday: 2, start: '10:00', end: '16:00' },
        { weekday: 4, start: '10:00', end: '16:00' },
        { weekday: 5, start: '10:00', end: '16:00' },
      ],
      slotDurationMinutes: 20,
      consultationFee: 600,
    },
  });

  const drArjunUser = await prisma.user.create({
    data: {
      email: 'dr.arjun.mehta@medisync.com',
      passwordHash: doctorHash,
      role: Role.DOCTOR,
      name: 'Dr. Arjun Mehta',
      phone: '9000000004',
    },
  });
  const drArjunProfile = await prisma.doctorProfile.create({
    data: {
      userId: drArjunUser.id,
      specialization: 'Orthopedics',
      bio: 'Orthopedic surgeon specialising in joint replacement and sports injuries. MBBS, MS Ortho – PGIMER Chandigarh.',
      workingHours: [
        { weekday: 2, start: '08:00', end: '14:00' },
        { weekday: 3, start: '08:00', end: '14:00' },
        { weekday: 5, start: '08:00', end: '14:00' },
        { weekday: 6, start: '08:00', end: '12:00' },
      ],
      slotDurationMinutes: 30,
      consultationFee: 700,
    },
  });

  const drSunitaUser = await prisma.user.create({
    data: {
      email: 'dr.sunita.rao@medisync.com',
      passwordHash: doctorHash,
      role: Role.DOCTOR,
      name: 'Dr. Sunita Rao',
      phone: '9000000005',
    },
  });
  const drSunitaProfile = await prisma.doctorProfile.create({
    data: {
      userId: drSunitaUser.id,
      specialization: 'Dermatology',
      bio: 'Expert dermatologist in medical and cosmetic skin care, acne, eczema, and hair disorders. MBBS, MD Dermatology – Manipal.',
      workingHours: [
        { weekday: 1, start: '11:00', end: '18:00' },
        { weekday: 3, start: '11:00', end: '18:00' },
        { weekday: 4, start: '11:00', end: '18:00' },
        { weekday: 6, start: '10:00', end: '14:00' },
      ],
      slotDurationMinutes: 20,
      consultationFee: 500,
    },
  });

  console.log('✅ 4 Doctor profiles created');

  // ──────────────────────────────────────
  // 3. PATIENTS
  // ──────────────────────────────────────
  const amit = await prisma.user.create({
    data: { email: 'amit.verma@gmail.com', passwordHash: patientHash, role: Role.PATIENT, name: 'Amit Verma', phone: '9111000001' },
  });
  const sneha = await prisma.user.create({
    data: { email: 'sneha.patel@gmail.com', passwordHash: patientHash, role: Role.PATIENT, name: 'Sneha Patel', phone: '9111000002' },
  });
  const rohit = await prisma.user.create({
    data: { email: 'rohit.singh@gmail.com', passwordHash: patientHash, role: Role.PATIENT, name: 'Rohit Singh', phone: '9111000003' },
  });
  const meera = await prisma.user.create({
    data: { email: 'meera.nair@gmail.com', passwordHash: patientHash, role: Role.PATIENT, name: 'Meera Nair', phone: '9111000004' },
  });
  const vikram = await prisma.user.create({
    data: { email: 'vikram.joshi@gmail.com', passwordHash: patientHash, role: Role.PATIENT, name: 'Vikram Joshi', phone: '9111000005' },
  });
  console.log('✅ 5 Patient users created');

  // ──────────────────────────────────────
  // 4. APPOINTMENTS WITH FULL FEATURE DATA
  // ──────────────────────────────────────
  const now = new Date();

  const daysFromNow = (d: number, h: number, m = 0) => {
    const dt = new Date(now);
    dt.setDate(dt.getDate() + d);
    dt.setHours(h, m, 0, 0);
    return dt;
  };

  // --- COMPLETED APPOINTMENT (3 days ago) with Post-Visit Summary + Medication Reminders ---
  const pastStart = daysFromNow(-3, 10);
  const pastEnd   = daysFromNow(-3, 10, 30);
  const completedAppt = await prisma.appointment.create({
    data: {
      patientId: amit.id,
      doctorId: drRajeshProfile.userId,
      slotStart: pastStart,
      slotEnd: pastEnd,
      status: AppointmentStatus.COMPLETED,
    },
  });

  await prisma.symptomForm.create({
    data: {
      appointmentId: completedAppt.id,
      symptomsText: 'Chest tightness and mild shortness of breath for the past week, especially during morning walks.',
    },
  });

  await prisma.preVisitSummary.create({
    data: {
      appointmentId: completedAppt.id,
      urgencyLevel: UrgencyLevel.HIGH,
      chiefComplaint: 'Chest tightness and exertional dyspnea',
      suggestedQuestions: [
        'Do you have a history of hypertension or high cholesterol?',
        'Does the pain radiate to your left arm or jaw?',
        'Have you experienced these symptoms before?',
      ],
      rawLLMResponse: '{"urgencyLevel":"HIGH","chiefComplaint":"Chest tightness and exertional dyspnea"}',
      status: LLMStatus.SUCCESS,
    },
  });

  await prisma.postVisitNote.create({
    data: {
      appointmentId: completedAppt.id,
      clinicalNotes: 'Patient presents with stable angina. ECG shows mild ST changes. BP 148/92 mmHg. Started on Amlodipine 5mg and Aspirin 75mg. Lifestyle modification advised. Follow-up in 2 weeks.',
      prescriptionJSON: JSON.stringify([
        { medicine: 'Amlodipine', dosage: '5mg', frequency: 'Once daily', durationDays: 30 },
        { medicine: 'Aspirin', dosage: '75mg', frequency: 'Once daily after food', durationDays: 30 },
        { medicine: 'Atorvastatin', dosage: '10mg', frequency: 'Once at night', durationDays: 30 },
      ]),
    },
  });

  await prisma.postVisitSummary.create({
    data: {
      appointmentId: completedAppt.id,
      patientFriendlyText: 'Dr. Rajesh Kumar found that you have mild stable angina — a condition where your heart temporarily doesn\'t get enough blood, causing chest tightness. Your blood pressure was a little high. He has prescribed three medicines to improve blood flow, thin the blood slightly, and lower cholesterol. Please avoid strenuous activity, reduce salt intake, and do gentle walks. Come back in 2 weeks.',
      medicationSchedule: [
        { medicine: 'Amlodipine', dosage: '5mg', frequency: 'Once daily in the morning', durationDays: 30, instructions: 'Take at the same time every day. Do not miss a dose.' },
        { medicine: 'Aspirin', dosage: '75mg', frequency: 'Once daily after food', durationDays: 30, instructions: 'Always take after a meal to protect your stomach.' },
        { medicine: 'Atorvastatin', dosage: '10mg', frequency: 'Once at bedtime', durationDays: 30, instructions: 'Take at night for best effect.' },
      ],
      followUpSteps: [
        'Schedule a follow-up appointment in 2 weeks.',
        'Monitor blood pressure twice daily and note readings.',
        'Avoid heavy lifting and intense exercise for now.',
        'Reduce salt and fried food in your diet.',
        'Visit emergency immediately if chest pain worsens or spreads to the arm or jaw.',
      ],
      status: LLMStatus.SUCCESS,
    },
  });

  // Medication reminders for Amit
  const reminderBase = new Date(now);
  reminderBase.setHours(8, 0, 0, 0);
  for (let i = 0; i < 7; i++) {
    const t = new Date(reminderBase);
    t.setDate(t.getDate() + i);
    await prisma.medicationReminder.create({
      data: { appointmentId: completedAppt.id, patientId: amit.id, medicine: 'Amlodipine 5mg', scheduledTime: t },
    });
  }
  console.log('✅ Completed appointment with AI summary + medication reminders created for Amit Verma');

  // --- CONFIRMED FUTURE APPOINTMENTS ---
  const future1Start = daysFromNow(2, 11);
  const future1End   = daysFromNow(2, 11, 30);
  await prisma.appointment.create({
    data: {
      patientId: sneha.id,
      doctorId: drPriyaProfile.userId,
      slotStart: future1Start,
      slotEnd: future1End,
      status: AppointmentStatus.CONFIRMED,
    },
  });

  const future2Start = daysFromNow(3, 9);
  const future2End   = daysFromNow(3, 9, 30);
  await prisma.appointment.create({
    data: {
      patientId: rohit.id,
      doctorId: drArjunProfile.userId,
      slotStart: future2Start,
      slotEnd: future2End,
      status: AppointmentStatus.CONFIRMED,
    },
  });

  const future3Start = daysFromNow(4, 14);
  const future3End   = daysFromNow(4, 14, 20);
  await prisma.appointment.create({
    data: {
      patientId: meera.id,
      doctorId: drSunitaProfile.userId,
      slotStart: future3Start,
      slotEnd: future3End,
      status: AppointmentStatus.CONFIRMED,
    },
  });

  const future4Start = daysFromNow(5, 9, 30);
  const future4End   = daysFromNow(5, 10);
  await prisma.appointment.create({
    data: {
      patientId: vikram.id,
      doctorId: drRajeshProfile.userId,
      slotStart: future4Start,
      slotEnd: future4End,
      status: AppointmentStatus.CONFIRMED,
    },
  });

  console.log('✅ Future confirmed appointments created');

  // --- DOCTOR ON LEAVE + CANCELLED CONFLICTING APPOINTMENT ---
  // Dr. Priya goes on leave in 2 days — but Rohit had a future appointment that day → auto cancelled
  const leaveDate = daysFromNow(2, 0);
  leaveDate.setHours(0, 0, 0, 0);

  // Appointment that conflicts with leave (already confirmed above for Sneha → we'll cancel it)
  await prisma.doctorLeave.create({
    data: {
      doctorId: drPriyaProfile.userId,
      date: leaveDate,
      reason: 'Medical conference – National Pediatrics Summit 2026',
    },
  });

  // Mark Sneha's appointment as cancelled (conflicts with leave)
  await prisma.appointment.updateMany({
    where: { patientId: sneha.id, doctorId: drPriyaProfile.userId },
    data: { status: AppointmentStatus.CANCELLED },
  });

  // Log the conflict
  await prisma.leaveConflictLog.create({
    data: {
      doctorId: drPriyaProfile.userId,
      leaveDate: leaveDate,
      cancelledAppointments: [
        { patientName: sneha.name, patientEmail: sneha.email, slotStart: future1Start },
      ],
    },
  });

  console.log('✅ Doctor leave created for Dr. Priya Sharma with cancelled conflict appointment');

  // --- CANCELLED APPOINTMENT ---
  const cancelledStart = daysFromNow(-1, 15);
  const cancelledEnd   = daysFromNow(-1, 15, 30);
  await prisma.appointment.create({
    data: {
      patientId: vikram.id,
      doctorId: drSunitaProfile.userId,
      slotStart: cancelledStart,
      slotEnd: cancelledEnd,
      status: AppointmentStatus.CANCELLED,
    },
  });

  console.log('✅ Cancelled appointment created for Vikram Joshi');

  console.log('\n🎉 Database seeding complete!');
  console.log('────────────────────────────────────────');
  console.log('Admin       → admin@medisync.com        / adminpassword');
  console.log('Doctors     → dr.rajesh.kumar@medisync.com etc. / Demo@1234');
  console.log('Patients    → amit.verma@gmail.com etc. / Patient@1234');
  console.log('────────────────────────────────────────');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
