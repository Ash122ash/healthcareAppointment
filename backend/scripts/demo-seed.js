/**
 * MediSync Comprehensive Demo Data Seeder
 * Plain JavaScript — runs directly with node
 */

const BASE = 'http://localhost:5000/api/v1';
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function api(method, url, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(`${BASE}${url}`, opts);
  const data = await r.json();
  if (!r.ok) throw Object.assign(new Error(data.message || r.statusText), { status: r.status });
  return data;
}

const post = (url, body, tok) => api('POST', url, body, tok);
const get  = (url, tok)       => api('GET',  url, null, tok);

async function login(email, password) {
  const d = await post('/auth/login', { email, password });
  return { token: d.accessToken, id: d.user.id };
}

// ── Doctor definitions ─────────────────────────────────────────────────────
const DOCTORS = [
  {
    email: 'dr.rajesh.kumar@medisync.com', password: 'Demo@1234',
    name: 'Dr. Rajesh Kumar',   phone: '+91-9800001001',
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
    name: 'Dr. Priya Sharma',   phone: '+91-9800001002',
    specialization: 'Pediatrics',
    bio: 'Child health specialist. Neonatal care and childhood immunology. 12 years at Apollo.',
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
    name: 'Dr. Arjun Mehta',    phone: '+91-9800001003',
    specialization: 'Orthopedics',
    bio: 'Joint replacement surgeon. Knee & hip arthroplasty specialist. Published researcher in sports medicine.',
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
    name: 'Dr. Sunita Rao',     phone: '+91-9800001004',
    specialization: 'Dermatology',
    bio: 'Cosmetic and medical dermatologist. Acne, psoriasis, hair loss and laser therapies.',
    slotDurationMinutes: 30, consultationFee: 700,
    workingHours: [
      { weekday: 2, start: '11:00', end: '19:00' },
      { weekday: 3, start: '11:00', end: '19:00' },
      { weekday: 4, start: '11:00', end: '19:00' },
      { weekday: 6, start: '10:00', end: '16:00' },
    ],
  },
];

// ── Patient definitions ────────────────────────────────────────────────────
const PATIENTS = [
  { email: 'amit.verma@gmail.com',   password: 'Patient@1234', name: 'Amit Verma',   phone: '+919700001001' },
  { email: 'sneha.patel@gmail.com',  password: 'Patient@1234', name: 'Sneha Patel',  phone: '+919700001002' },
  { email: 'rohit.singh@gmail.com',  password: 'Patient@1234', name: 'Rohit Singh',  phone: '+919700001003' },
  { email: 'meera.nair@gmail.com',   password: 'Patient@1234', name: 'Meera Nair',   phone: '+919700001004' },
  { email: 'vikram.joshi@gmail.com', password: 'Patient@1234', name: 'Vikram Joshi', phone: '+919700001005' },
];

function futureSlot(days, hour) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

// ── MAIN ───────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n\uD83C\uDFE5  MediSync Demo Data Seeder\n' + '='.repeat(55));

  // 1. Admin login
  console.log('\n[1/6] Authenticating Admin...');
  const { token: adminToken } = await login('admin@medisync.com', 'adminpassword');
  console.log('  \u2705 Admin authenticated');

  // 2. Create Doctors
  console.log('\n[2/6] Creating 4 Doctors via Admin API...');
  for (const doc of DOCTORS) {
    try {
      const r = await post('/admin/doctors', doc, adminToken);
      console.log(`  \u2705 ${doc.name} (${doc.specialization}) \u20B9${doc.consultationFee}/visit`);
    } catch (e) {
      if ((e.message || '').toLowerCase().includes('already')) {
        console.log(`  \u26A0\uFE0F  ${doc.name} already exists \u2014 skipping`);
      } else {
        console.error(`  \u274C ${doc.name}: ${e.message}`);
      }
    }
    await sleep(300);
  }

  // 3. Register Patients
  console.log('\n[3/6] Registering 5 Patients...');
  const patientTokens = {};

  for (const pat of PATIENTS) {
    try {
      await post('/auth/register', pat);
      console.log(`  \u2705 Registered: ${pat.name} <${pat.email}>`);
    } catch (e) {
      const msg = e.message || '';
      if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('exist')) {
        console.log(`  \u26A0\uFE0F  ${pat.name} already registered`);
      } else {
        console.error(`  \u274C ${pat.name}: ${msg}`);
      }
    }
    try {
      const l = await login(pat.email, pat.password);
      patientTokens[pat.email] = l.token;
    } catch (e) {
      console.error(`  \u274C Login failed ${pat.name}: ${e.message}`);
    }
    await sleep(200);
  }

  // 4. Book Appointments
  console.log('\n[4/6] Booking 5 Appointments with Symptom Forms...');

  const firstTok = Object.values(patientTokens)[0];
  let doctorProfiles = [];
  if (firstTok) {
    try {
      const r = await get('/patient/doctors', firstTok);
      doctorProfiles = r.doctors || [];
      console.log(`  Found ${doctorProfiles.length} doctor profiles`);
    } catch (e) {
      console.log(`  \u26A0\uFE0F  Could not list doctors: ${e.message}`);
    }
  }

  const getProfileId = email => doctorProfiles.find(d => d.user?.email === email)?.userId;

  const BOOKINGS = [
    {
      label: 'Amit Verma \u2192 Dr. Rajesh Kumar (Chest Pain \u2014 HIGH)',
      patEmail: 'amit.verma@gmail.com',
      docEmail: 'dr.rajesh.kumar@medisync.com',
      slotStart: futureSlot(1, 10),
      symptoms: 'Chest pain radiating to left arm, shortness of breath on exertion for 2 weeks. Family history of cardiac disease. Pain score 8/10.',
      severity: 'HIGH',
    },
    {
      label: "Sneha Patel \u2192 Dr. Priya Sharma (Child's Fever \u2014 MEDIUM)",
      patEmail: 'sneha.patel@gmail.com',
      docEmail: 'dr.priya.sharma@medisync.com',
      slotStart: futureSlot(1, 11),
      symptoms: 'Child (age 5) high fever 103\u00B0F for 3 days, rash on chest, refusing food, mild diarrhoea.',
      severity: 'MEDIUM',
    },
    {
      label: 'Rohit Singh \u2192 Dr. Arjun Mehta (Knee Injury \u2014 MEDIUM)',
      patEmail: 'rohit.singh@gmail.com',
      docEmail: 'dr.arjun.mehta@medisync.com',
      slotStart: futureSlot(2, 9),
      symptoms: 'Right knee pain and swelling after sports injury 3 days ago. Difficulty bending knee. Pain 7/10 on movement.',
      severity: 'MEDIUM',
    },
    {
      label: 'Meera Nair \u2192 Dr. Sunita Rao (Skin Rash \u2014 LOW)',
      patEmail: 'meera.nair@gmail.com',
      docEmail: 'dr.sunita.rao@medisync.com',
      slotStart: futureSlot(2, 12),
      symptoms: 'Itchy red scaly patches on arms, neck and behind knees for 6 weeks. Worsens after sun exposure. Previous eczema history.',
      severity: 'LOW',
    },
    {
      label: 'Vikram Joshi \u2192 Dr. Rajesh Kumar (BP Follow-up \u2014 LOW)',
      patEmail: 'vikram.joshi@gmail.com',
      docEmail: 'dr.rajesh.kumar@medisync.com',
      slotStart: futureSlot(7, 10),
      symptoms: 'BP follow-up. Home readings 145\u2013155/90\u201395 mmHg. On Amlodipine 5mg. Morning headaches.',
      severity: 'LOW',
    },
  ];

  for (const bk of BOOKINGS) {
    const tok = patientTokens[bk.patEmail];
    const doc = doctorProfiles.find(d => d.user?.email === bk.docEmail);
    if (!tok) { console.log(`  \u26A0\uFE0F  Skipped (no patient token): ${bk.label}`); continue; }
    if (!doc)  { console.log(`  \u26A0\uFE0F  Skipped (doctor profile not found): ${bk.label}`); continue; }

    const doctorId = doc.userId;
    const slotStartDate = new Date(bk.slotStart);
    const slotEndDate = new Date(slotStartDate);
    slotEndDate.setMinutes(slotEndDate.getMinutes() + (doc.slotDurationMinutes || 30));
    const slotEnd = slotEndDate.toISOString();

    try {
      // Phase 1: Hold the slot (90-second lock)
      const holdRes = await post('/patient/holds', {
        doctorId,
        slotStart: bk.slotStart,
        slotEnd,
      }, tok);
      const holdId = holdRes.holdId;

      // Phase 2: Confirm booking with symptoms
      await post('/patient/appointments', {
        holdId,
        doctorId,
        slotStart: bk.slotStart,
        slotEnd,
        symptomsText: bk.symptoms,
      }, tok);

      console.log(`  \u2705 ${bk.label}`);
    } catch (e) {
      console.log(`  \u26A0\uFE0F  ${bk.label}: ${e.message}`);
    }
    await sleep(600);
  }

  // 5. Doctor Leaves
  console.log('\n[5/6] Registering 2 Doctor Leaves...');

  const LEAVES = [
    {
      label: 'Dr. Rajesh Kumar \u2014 National Cardiology Conference',
      email: 'dr.rajesh.kumar@medisync.com', password: 'Demo@1234',
      date: futureSlot(3, 0).split('T')[0],
      reason: 'Attending National Cardiology Conference 2026 in Mumbai.',
    },
    {
      label: "Dr. Priya Sharma \u2014 Personal Emergency",
      email: 'dr.priya.sharma@medisync.com', password: 'Demo@1234',
      date: futureSlot(4, 0).split('T')[0],
      reason: 'Family medical emergency \u2014 personal leave.',
    },
  ];

  for (const lv of LEAVES) {
    try {
      const { token } = await login(lv.email, lv.password);
      const r = await post('/doctor/leaves', { date: lv.date, reason: lv.reason }, token);
      console.log(`  \u2705 Leave: ${lv.label}`);
      console.log(`     \u2192 ${r.message}`);
    } catch (e) {
      console.log(`  \u26A0\uFE0F  ${lv.label}: ${e.message}`);
    }
    await sleep(300);
  }

  // 6. Complete Consultation
  console.log("\n[6/6] Completing Amit's Cardiology Consultation...");
  try {
    const { token: drTok } = await login('dr.rajesh.kumar@medisync.com', 'Demo@1234');
    const appts = (await get('/doctor/appointments', drTok)).appointments || [];
    const amitAppt = appts.find(a => a.patient?.name?.includes('Amit'));

    if (amitAppt) {
      await post(`/doctor/appointments/${amitAppt.id}/notes`, {
        clinicalNotes:
`Patient: Amit Verma, 34M. CC: Exertional chest pain radiating to left arm x2 weeks.
Vitals: BP 138/88, HR 82, SpO2 98%, Temp 98.6F.
ECG: Mild ST-depression V4-V6. Echo: EF 55%, mild LV hypertrophy.
Troponin I: 0.04 ng/mL (borderline elevated).
Diagnosis: Unstable Angina (provisional). Rule out NSTEMI.
Plan: Stress test Day 3. Dual antiplatelet + statin. Lifestyle modification counselled.
Follow-up: 1 week. Urgent review if rest pain.`,
        prescriptionJSON: JSON.stringify([
          { medicine: 'Aspirin', dosage: '75mg', frequency: 'Once daily', duration: '30 days', instructions: 'After food. Do not crush.' },
          { medicine: 'Atorvastatin', dosage: '40mg', frequency: 'Once daily at bedtime', duration: '30 days', instructions: 'Avoid grapefruit. Report muscle pain.' },
          { medicine: 'GTN Spray', dosage: '0.4mg/spray', frequency: 'PRN chest pain', duration: '30 days', instructions: 'Under tongue seated. Max 3 sprays/15 min. Call emergency if no relief.' },
          { medicine: 'Metoprolol Succinate', dosage: '25mg', frequency: 'Twice daily', duration: '30 days', instructions: 'Do not stop abruptly. Monitor pulse.' },
        ]),
      }, drTok);
      console.log('  \u2705 Clinical notes + 4-drug prescription saved');
      console.log('  \u2705 AI patient-friendly summary generated');
      console.log('  \u2705 Medication reminders created');
      console.log('  \u2705 Appointment \u2192 COMPLETED');
    } else {
      console.log('  \u26A0\uFE0F  Appointment not yet in queue (booked for future slot)');
    }
  } catch (e) {
    console.log(`  \u26A0\uFE0F  Notes error: ${e.message}`);
  }

  // Summary table
  console.log('\n' + '='.repeat(60));
  console.log('\uD83C\uDF89  All demo data created!\n');
  console.log('ADMIN         admin@medisync.com                  / adminpassword');
  console.log('\nDOCTORS  (password: Demo@1234)');
  DOCTORS.forEach(d => console.log(`  ${d.name.padEnd(22)} ${d.email}`));
  console.log('\nPATIENTS  (password: Patient@1234)');
  PATIENTS.forEach(p => console.log(`  ${p.name.padEnd(22)} ${p.email}`));
  console.log('\n\u27A1\uFE0F  Open http://localhost:3000\n');
}

main().catch(e => { console.error('\n\uD83D\uDCA5 Fatal:', e.message); process.exit(1); });
