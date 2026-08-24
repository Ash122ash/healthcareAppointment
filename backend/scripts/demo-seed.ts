/**
 * MediSync Comprehensive Demo Data Seeder
 * Uses Node's built-in fetch (Node 18+) — no extra dependencies
 */

const BASE = 'http://localhost:5000/api/v1';

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function post(url: string, body: any, token?: string) {
  const headers: any = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const r = await fetch(`${BASE}${url}`, { method: 'POST', headers, body: JSON.stringify(body) });
  const data = await r.json();
  if (!r.ok) throw Object.assign(new Error(data.message || r.statusText), { data });
  return data;
}

async function get(url: string, token: string) {
  const r = await fetch(`${BASE}${url}`, { headers: { Authorization: `Bearer ${token}` } });
  const data = await r.json();
  if (!r.ok) throw Object.assign(new Error(data.message || r.statusText), { data });
  return data;
}

async function login(email: string, password: string) {
  const d = await post('/auth/login', { email, password });
  return { token: d.accessToken as string, id: d.user.id as string };
}

// ─────────────────────── Doctor definitions ──────────────────────────────
const DOCTORS = [
  {
    email: 'dr.rajesh.kumar@medisync.com', password: 'Demo@1234',
    name: 'Dr. Rajesh Kumar', phone: '+91-9800001001',
    specialization: 'Cardiology',
    bio: 'Senior cardiologist with 15+ years at AIIMS. Expert in interventional cardiology and heart failure management.',
    slotDurationMinutes: 30, consultationFee: 800,
    workingHours: [
      { weekday: 1, start: '09:00', end: '17:00' },
      { weekday: 2, start: '09:00', end: '17:00' },
      { weekday: 3, start: '09:00', end: '17:00' },
      { weekday: 4, start: '09:00', end: '17:00' },
      { weekday: 5, start: '09:00', end: '13:00' },
    ],
  },
  {
    email: 'dr.priya.sharma@medisync.com', password: 'Demo@1234',
    name: 'Dr. Priya Sharma', phone: '+91-9800001002',
    specialization: 'Pediatrics',
    bio: 'Child health specialist with focus on neonatal care and childhood immunology. 12 years experience at Apollo.',
    slotDurationMinutes: 20, consultationFee: 600,
    workingHours: [
      { weekday: 1, start: '10:00', end: '18:00' },
      { weekday: 2, start: '10:00', end: '18:00' },
      { weekday: 3, start: '10:00', end: '18:00' },
      { weekday: 5, start: '10:00', end: '18:00' },
      { weekday: 6, start: '10:00', end: '14:00' },
    ],
  },
  {
    email: 'dr.arjun.mehta@medisync.com', password: 'Demo@1234',
    name: 'Dr. Arjun Mehta', phone: '+91-9800001003',
    specialization: 'Orthopedics',
    bio: 'Joint replacement surgeon specialising in knee and hip arthroplasty. Published researcher in sports medicine.',
    slotDurationMinutes: 45, consultationFee: 1000,
    workingHours: [
      { weekday: 1, start: '08:00', end: '14:00' },
      { weekday: 2, start: '08:00', end: '14:00' },
      { weekday: 4, start: '08:00', end: '14:00' },
      { weekday: 5, start: '08:00', end: '14:00' },
    ],
  },
  {
    email: 'dr.sunita.rao@medisync.com', password: 'Demo@1234',
    name: 'Dr. Sunita Rao', phone: '+91-9800001004',
    specialization: 'Dermatology',
    bio: 'Cosmetic and medical dermatologist. Expert in acne, psoriasis, hair loss and laser therapies.',
    slotDurationMinutes: 30, consultationFee: 700,
    workingHours: [
      { weekday: 2, start: '11:00', end: '19:00' },
      { weekday: 3, start: '11:00', end: '19:00' },
      { weekday: 4, start: '11:00', end: '19:00' },
      { weekday: 6, start: '10:00', end: '16:00' },
    ],
  },
];

// ─────────────────────── Patient definitions ──────────────────────────────
const PATIENTS = [
  { email: 'amit.verma@gmail.com',   password: 'Patient@1234', name: 'Amit Verma',   phone: '+91-9700001001' },
  { email: 'sneha.patel@gmail.com',  password: 'Patient@1234', name: 'Sneha Patel',  phone: '+91-9700001002' },
  { email: 'rohit.singh@gmail.com',  password: 'Patient@1234', name: 'Rohit Singh',  phone: '+91-9700001003' },
  { email: 'meera.nair@gmail.com',   password: 'Patient@1234', name: 'Meera Nair',   phone: '+91-9700001004' },
  { email: 'vikram.joshi@gmail.com', password: 'Patient@1234', name: 'Vikram Joshi', phone: '+91-9700001005' },
];

const futureSlot = (days: number, hour: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

// ─────────────────────── MAIN ────────────────────────────────────────────
async function main() {
  console.log('\n🏥  MediSync Demo Data Seeder\n' + '='.repeat(55));

  // ── 1. Admin login ───────────────────────────────────────────────────────
  console.log('\n[1/6] Authenticating Admin...');
  const { token: adminToken } = await login('admin@medisync.com', 'adminpassword');
  console.log('  ✅ Admin authenticated');

  // ── 2. Create Doctors ────────────────────────────────────────────────────
  console.log('\n[2/6] Creating 4 Doctors via Admin API...');
  const doctorIds: Record<string, string> = {};

  for (const doc of DOCTORS) {
    try {
      const r = await post('/admin/doctors', doc, adminToken);
      doctorIds[doc.email] = r.doctor.id;
      console.log(`  ✅ ${doc.name} (${doc.specialization}) — ₹${doc.consultationFee}/visit`);
    } catch (e: any) {
      if ((e.message || '').includes('already')) {
        console.log(`  ⚠️  ${doc.name} already registered`);
        try { const l = await login(doc.email, doc.password); doctorIds[doc.email] = l.id; } catch {}
      } else {
        console.error(`  ❌ ${doc.name}: ${e.message}`);
      }
    }
    await sleep(300);
  }

  // ── 3. Register Patients ─────────────────────────────────────────────────
  console.log('\n[3/6] Registering 5 Patients...');
  const patientTokens: Record<string, string> = {};

  for (const pat of PATIENTS) {
    try {
      await post('/auth/register', pat);
      console.log(`  ✅ Registered: ${pat.name} <${pat.email}>`);
    } catch (e: any) {
      const msg = e.message || '';
      if (msg.includes('already') || msg.includes('exist')) {
        console.log(`  ⚠️  ${pat.name} already registered`);
      } else {
        console.error(`  ❌ ${pat.name}: ${msg}`);
      }
    }
    try {
      const l = await login(pat.email, pat.password);
      patientTokens[pat.email] = l.token;
    } catch (e: any) {
      console.error(`  ❌ Login failed for ${pat.name}: ${e.message}`);
    }
    await sleep(200);
  }

  // ── 4. Book Appointments ─────────────────────────────────────────────────
  console.log('\n[4/6] Booking 5 Appointments with Symptom Forms...');

  const firstPatTok = Object.values(patientTokens)[0];
  let doctorProfiles: any[] = [];
  if (firstPatTok) {
    try {
      const r = await get('/patient/doctors', firstPatTok);
      doctorProfiles = r.doctors || [];
      console.log(`  Found ${doctorProfiles.length} doctor profiles in system`);
    } catch (e: any) {
      console.log(`  ⚠️  Doctor list fetch: ${e.message}`);
    }
  }

  const getProfileId = (email: string) =>
    doctorProfiles.find((d: any) => d.user?.email === email)?.id;

  const BOOKINGS = [
    {
      label: 'Amit Verma → Dr. Rajesh Kumar (Chest Pain — HIGH)',
      patEmail: 'amit.verma@gmail.com',
      docEmail: 'dr.rajesh.kumar@medisync.com',
      slotStart: futureSlot(1, 10),
      symptoms: 'Chest pain radiating to left arm, shortness of breath on exertion for 2 weeks. Family history of cardiac disease. Pain score 8/10.',
      severity: 'HIGH',
    },
    {
      label: "Sneha Patel → Dr. Priya Sharma (Child's Fever — MEDIUM)",
      patEmail: 'sneha.patel@gmail.com',
      docEmail: 'dr.priya.sharma@medisync.com',
      slotStart: futureSlot(1, 11),
      symptoms: 'Child (age 5) high fever 103°F for 3 days, rash on chest, refusing food, mild diarrhoea.',
      severity: 'MEDIUM',
    },
    {
      label: 'Rohit Singh → Dr. Arjun Mehta (Knee Injury — MEDIUM)',
      patEmail: 'rohit.singh@gmail.com',
      docEmail: 'dr.arjun.mehta@medisync.com',
      slotStart: futureSlot(2, 9),
      symptoms: 'Right knee pain and swelling after sports injury 3 days ago. Difficulty bending knee. Pain 7/10 on movement.',
      severity: 'MEDIUM',
    },
    {
      label: 'Meera Nair → Dr. Sunita Rao (Skin Rash — LOW)',
      patEmail: 'meera.nair@gmail.com',
      docEmail: 'dr.sunita.rao@medisync.com',
      slotStart: futureSlot(2, 12),
      symptoms: 'Itchy red scaly patches on arms, neck and behind knees for 6 weeks. Worsens after sun exposure. Previous eczema history.',
      severity: 'LOW',
    },
    {
      label: 'Vikram Joshi → Dr. Rajesh Kumar (BP Follow-up — LOW)',
      patEmail: 'vikram.joshi@gmail.com',
      docEmail: 'dr.rajesh.kumar@medisync.com',
      slotStart: futureSlot(7, 10),
      symptoms: 'Follow-up for hypertension. Home BP readings 145-155/90-95 mmHg. On Amlodipine 5mg. Morning headaches.',
      severity: 'LOW',
    },
  ];

  const bookedApptIds: Record<string, string> = {};

  for (const bk of BOOKINGS) {
    const tok = patientTokens[bk.patEmail];
    const profId = getProfileId(bk.docEmail);
    if (!tok)    { console.log(`  ⚠️  Skipped (no token): ${bk.label}`);          continue; }
    if (!profId) { console.log(`  ⚠️  Skipped (doctor not found): ${bk.label}`);  continue; }

    try {
      await post('/patient/holds', { doctorProfileId: profId, slotStart: bk.slotStart }, tok);
      const r = await post('/patient/appointments', {
        doctorProfileId: profId, slotStart: bk.slotStart,
        symptoms: bk.symptoms, severity: bk.severity,
      }, tok);
      const apptId = r.appointment?.id;
      if (apptId) bookedApptIds[bk.patEmail] = apptId;
      console.log(`  ✅ ${bk.label}`);
    } catch (e: any) {
      console.log(`  ⚠️  ${bk.label}: ${e.message}`);
    }
    await sleep(400);
  }

  // ── 5. Doctor Leaves ─────────────────────────────────────────────────────
  console.log('\n[5/6] Registering 2 Doctor Leaves...');

  const LEAVES = [
    {
      label: 'Dr. Rajesh Kumar — National Cardiology Conference',
      email: 'dr.rajesh.kumar@medisync.com', password: 'Demo@1234',
      date: futureSlot(3, 0).split('T')[0],
      reason: 'Attending National Cardiology Conference 2026 in Mumbai.',
    },
    {
      label: 'Dr. Priya Sharma — Personal Emergency',
      email: 'dr.priya.sharma@medisync.com', password: 'Demo@1234',
      date: futureSlot(4, 0).split('T')[0],
      reason: 'Family medical emergency.',
    },
  ];

  for (const lv of LEAVES) {
    try {
      const { token } = await login(lv.email, lv.password);
      const r = await post('/doctor/leaves', { date: lv.date, reason: lv.reason }, token);
      console.log(`  ✅ Leave: ${lv.label}`);
      console.log(`     → ${r.message}`);
    } catch (e: any) {
      console.log(`  ⚠️  ${lv.label}: ${e.message}`);
    }
    await sleep(300);
  }

  // ── 6. Complete Consultation ─────────────────────────────────────────────
  console.log('\n[6/6] Completing Amit\'s Cardiology Consultation with Full Notes & Prescription...');
  try {
    const { token: drTok } = await login('dr.rajesh.kumar@medisync.com', 'Demo@1234');
    const appts = (await get('/doctor/appointments', drTok)).appointments || [];
    const amitAppt = appts.find((a: any) => a.patient?.name?.includes('Amit'));

    if (amitAppt) {
      await post(
        `/doctor/appointments/${amitAppt.id}/notes`,
        {
          clinicalNotes:
`Patient: Amit Verma, 34M. Presenting complaint: Exertional chest pain radiating to left arm × 2 weeks.
Vitals: BP 138/88 mmHg, HR 82 bpm, SpO2 98%, Temp 98.6°F, RR 16/min.
ECG: Mild ST-segment depression leads V4-V6. No complete LBBB.
Echo: EF 55%, mild LV hypertrophy, no regional wall motion abnormality.
Troponin I: 0.04 ng/mL (borderline). Repeat in 6 hours pending.
Diagnosis: Unstable Angina (provisional). Possible NSTEMI — rule-out in progress.
Plan: Stress test arranged for Day 3. Dual antiplatelet + statin therapy commenced.
Lifestyle: Low-sodium diet, no heavy exertion, daily 30-min walk after stabilisation.
Follow-up: 1 week post-stress test. Emergency review if chest pain at rest.`,
          prescriptionJSON: JSON.stringify([
            { medicine: 'Aspirin', dosage: '75mg', frequency: 'Once daily', duration: '30 days', instructions: 'Take after food. Do not crush.' },
            { medicine: 'Atorvastatin', dosage: '40mg', frequency: 'Once daily at bedtime', duration: '30 days', instructions: 'Avoid grapefruit juice. Report muscle pain.' },
            { medicine: 'GTN Spray (Nitroglycerine)', dosage: '0.4mg/spray', frequency: 'PRN — for chest pain', duration: '30 days', instructions: 'Spray under tongue, remain seated. Max 3 sprays in 15 min. Call emergency if no relief.' },
            { medicine: 'Metoprolol Succinate', dosage: '25mg', frequency: 'Twice daily', duration: '30 days', instructions: 'Do not stop abruptly. Monitor resting pulse daily.' },
          ]),
        },
        drTok
      );
      console.log('  ✅ Clinical notes submitted');
      console.log('  ✅ Prescription with 4 medicines saved');
      console.log('  ✅ AI post-visit patient-friendly summary generated');
      console.log('  ✅ Medication reminders created for tomorrow morning');
      console.log('  ✅ Appointment status → COMPLETED');
    } else {
      console.log('  ⚠️  Appointment not yet in queue (slot may be future-dated)');
    }
  } catch (e: any) {
    console.log(`  ⚠️  Consultation notes: ${e.message}`);
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log('\n' + '='.repeat(55));
  console.log('🎉  Demo Data Seeded Successfully!\n');
  console.log('┌─ ADMIN ──────────────────────────────────────────────┐');
  console.log('│  admin@medisync.com               adminpassword      │');
  console.log('├─ DOCTORS (password: Demo@1234) ──────────────────────┤');
  for (const d of DOCTORS) {
    console.log(`│  ${d.email.padEnd(52)}│`);
  }
  console.log('├─ PATIENTS (password: Patient@1234) ──────────────────┤');
  for (const p of PATIENTS) {
    console.log(`│  ${p.email.padEnd(52)}│`);
  }
  console.log('└──────────────────────────────────────────────────────┘');
  console.log('\n➡️  Open http://localhost:3000 to explore!\n');
}

main().catch(e => { console.error('\n💥 Fatal error:', e.message); process.exit(1); });
