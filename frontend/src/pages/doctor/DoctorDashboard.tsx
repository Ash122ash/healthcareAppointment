import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Clock, User, Plus, Trash2, AlertTriangle, FileText, Save, 
  CalendarDays, Loader2, Settings, Share2, Copy, Download, Check, 
  LogOut, ListOrdered, Mic, Video, Activity, Pill, Stethoscope, VideoOff, MicOff, PhoneOff
} from 'lucide-react';

interface Patient {
  id: string;
  name: string;
  email: string;
  phone: string | null;
}

interface Appointment {
  id: string;
  slotStart: string;
  slotEnd: string;
  status: string;
  patient: Patient;
  symptomForm: {
    symptomsText: string;
  } | null;
  preVisitSummary: {
    urgencyLevel: string;
    chiefComplaint: string;
    suggestedQuestions: string[];
    status: string;
  } | null;
  postVisitNote: {
    clinicalNotes: string;
    prescriptionJSON: any;
  } | null;
  postVisitSummary: {
    patientFriendlyText: string;
    medicationSchedule: any;
    followUpSteps: string[];
  } | null;
}

interface DoctorLeave {
  id: string;
  date: string;
  reason: string | null;
}

interface LrnaValue {
  param: string;
  result: string;
  flag: string;
}

interface LrnaPatient {
  id: string;
  name: string;
  email: string;
  phone: string;
  testType: string;
  dateTime: string;
  status: 'NORMAL' | 'AWAITING REVIEW' | 'CRITICAL';
  reason: string;
  values: LrnaValue[];
  impression: string;
  flagText: string;
  notes: string;
  frequency: string;
  durationDays: string;
}

const INITIAL_LRNA: LrnaPatient[] = [
  {
    id: 'sneha-patel-1',
    name: 'Sneha Patel',
    email: 'sneha.patel@gmail.com',
    phone: '+919811223344',
    testType: 'CBC',
    dateTime: '8/24/2026 10:15 AM',
    status: 'NORMAL',
    reason: 'Routine annual check-up',
    values: [
      { param: 'White Blood Cell (WBC)', result: '6.5', flag: '' },
      { param: 'Red Blood Cell (RBC)', result: '4.8', flag: '' },
      { param: 'Hemoglobin', result: '13.8', flag: '' },
      { param: 'Platelets', result: '240', flag: '' },
    ],
    impression: 'Complete Blood Count parameters are normal. No critical indicators.',
    flagText: 'LRNA INTERPRETATION FLAG: NORMAL',
    notes: 'Continue healthy diet. Annual re-test advised.',
    frequency: 'Once daily',
    durationDays: '30',
  },
  {
    id: 'rahul-singh-1',
    name: 'Rahul Singh',
    email: 'rahul.singh@gmail.com',
    phone: '+919922334455',
    testType: 'Urine Culture',
    dateTime: '8/23/2026 3:30 PM',
    status: 'AWAITING REVIEW',
    reason: 'Suspected UTI',
    values: [
      { param: 'Colony Count', result: '80,000 CFU/mL', flag: 'H' },
      { param: 'Gram Stain', result: 'Gram-negative bacilli', flag: '' },
    ],
    impression: 'Colony count indicates potential urinary tract infection (UTI). Review clinical symptoms to decide action.',
    flagText: 'LRNA INTERPRETATION FLAG: AWAITING CLINICAL RE-EVALUATION',
    notes: 'Follow up with patient. Discuss antibiotic therapy if symptomatic.',
    frequency: 'Twice daily',
    durationDays: '7',
  },
  {
    id: 'amit-verma',
    name: 'Amit Verma',
    email: 'amit.verma@gmail.com',
    phone: '+919700001001',
    testType: 'Lipid Panel',
    dateTime: '8/24/2026 11:30 AM',
    status: 'CRITICAL',
    reason: 'Routine check-up',
    values: [
      { param: 'Total Cholesterol', result: '245', flag: 'H' },
      { param: 'LDL Cholesterol', result: '168', flag: 'H' },
      { param: 'HDL Cholesterol', result: '42', flag: '' },
      { param: 'Triglycerides', result: '180', flag: 'H' },
    ],
    impression: 'Impression of elevated lipid profile (hyperlipidemia). Patient requires initiation of statin therapy and lifestyle modifications.',
    flagText: 'LRNA INTERPRETATION FLAG: CRITICAL (HIGH CHOLESTEROL)',
    notes: 'Prescribe Atorvastatin 20 mg daily. Re-test Lipid Panel in 3 months. Discuss dietary changes with patient.',
    frequency: 'Once daily',
    durationDays: '90',
  },
];

type NavKey = 'queue' | 'lrna' | 'telehealth' | 'profile' | 'leaves';

const NAV = [
  { key: 'queue' as NavKey,       icon: ListOrdered,   label: 'Patient Queue' },
  { key: 'lrna' as NavKey,        icon: FileText,      label: 'LRNA Results'  },
  { key: 'telehealth' as NavKey,  icon: Video,         label: 'Telehealth'    },
  { key: 'profile' as NavKey,     icon: Settings,      label: 'Profile Config'},
  { key: 'leaves' as NavKey,      icon: Calendar,      label: 'Schedule Leave'},
];

const ONLINE_PATIENTS = [
  { id: 't1', name: 'Alok Kumar', symptom: 'Fever and severe cough', waitTime: '4 mins', avatar: 'A' },
  { id: 't2', name: 'Neha Gupta', symptom: 'Post-op Follow-up', waitTime: '1 min', avatar: 'N' }
];

export default function DoctorDashboard() {
  const { user, logout, apiFetch } = useAuth();
  const [activeNav, setActiveNav] = useState<NavKey>('queue');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [leaves, setLeaves] = useState<DoctorLeave[]>([]);
  const [loading, setLoading] = useState(true);

  // Profile states
  const [profile, setProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  // Leave scheduling states
  const [leaveDate, setLeaveDate] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveLoading, setLeaveLoading] = useState(false);

  // Active selected appointment for note submission
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [prescription, setPrescription] = useState<{ medicine: string; dosage: string; frequency: string; durationDays: string }[]>([
    { medicine: '', dosage: '', frequency: 'Once daily', durationDays: '7' },
  ]);
  const [submitNotesLoading, setSubmitNotesLoading] = useState(false);
  const [careTrack, setCareTrack] = useState<string>('');

  // Timeline toggle
  const [showTimeline, setShowTimeline] = useState(false);

  // Telehealth State
  const [activeCall, setActiveCall] = useState<any>(null);

  // AI Voice Dictation State
  const [isDictating, setIsDictating] = useState(false);
  const handleStartDictation = () => {
    setIsDictating(true);
    // Mock 3 seconds of dictation
    setTimeout(() => {
      setIsDictating(false);
      setClinicalNotes("Patient presents with acute bronchitis symptoms. Oxygen saturation is stable. Prescribed broad-spectrum antibiotics to clear infection.");
      setPrescription([{ medicine: 'Amoxicillin', dosage: '500mg', frequency: 'Twice daily', durationDays: '7' }]);
    }, 3000);
  };

  const checkDrugInteractions = () => {
    const meds = prescription.map(p => p.medicine.toLowerCase().trim()).filter(Boolean);
    
    const hasAspirin = meds.includes('aspirin');
    const hasWarfarin = meds.includes('warfarin');
    if (hasAspirin && hasWarfarin) {
      return "DANGEROUS INTERACTION: [Aspirin] + [Warfarin] increases risk of severe gastrointestinal or systemic bleeding.";
    }

    const hasLisinopril = meds.includes('lisinopril');
    const hasSpironolactone = meds.includes('spironolactone');
    if (hasLisinopril && hasSpironolactone) {
      return "HIGH RISK INTERACTION: [Lisinopril] + [Spironolactone] increases risk of severe Hyperkalemia (critically elevated blood potassium).";
    }

    const hasAtorvastatin = meds.includes('atorvastatin');
    const hasClarithromycin = meds.includes('clarithromycin');
    if (hasAtorvastatin && hasClarithromycin) {
      return "HIGH RISK INTERACTION: [Atorvastatin] + [Clarithromycin] increases risk of rhabdomyolysis (severe skeletal muscle breakdown).";
    }

    const hasSildenafil = meds.includes('sildenafil');
    const hasNitroglycerin = meds.includes('nitroglycerin');
    if (hasSildenafil && hasNitroglycerin) {
      return "CRITICAL CONTRAINDICATION: [Sildenafil] + [Nitroglycerin] causes a precipitous, life-threatening drop in blood pressure.";
    }

    return null;
  };

  // LRNA specific states
  const lrnaPatients = INITIAL_LRNA;
  const [selectedLrnaId, setSelectedLrnaId] = useState<string>('amit-verma');
  const [draftedNotes, setDraftedNotes] = useState<{[key: string]: string}>({});

  const selectedLrnaPatient = lrnaPatients.find(p => p.id === selectedLrnaId) || lrnaPatients[2];

  const handleAutoDraft = () => {
    let draft = "";
    if (selectedLrnaPatient.id === 'amit-verma') {
      draft = "Prescribe Atorvastatin 20mg daily. Re-test Lipid Panel in 3 months. Advised low-fat diet and moderate cardio exercises.";
    } else if (selectedLrnaPatient.id === 'sneha-patel-1') {
      draft = "CBC results are normal. Baseline hemoglobin level is 13.8 g/dL. No treatment required. Advised routine annual screen.";
    } else if (selectedLrnaPatient.id === 'rahul-singh-1') {
      draft = "Colony count at 80,000 CFU/mL suggests early UTI. Prescribed Nitrofurantoin 100mg twice daily for 5 days. Increase hydration.";
    }
    setDraftedNotes(prev => ({ ...prev, [selectedLrnaPatient.id]: draft }));
  };

  useEffect(() => {
    fetchData();
  }, [activeNav]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeNav === 'queue') {
        const res = await apiFetch('/doctor/appointments');
        const data = await res.json();
        if (res.ok) setAppointments(data.appointments);
      } else if (activeNav === 'profile') {
        setProfileLoading(true);
        const res = await apiFetch('/doctor/profile');
        const data = await res.json();
        if (res.ok) setProfile(data.profile);
        setProfileLoading(false);
      } else if (activeNav === 'leaves') {
        const res = await apiFetch('/doctor/leaves');
        const data = await res.json();
        if (res.ok) setLeaves(data.leaves);
      }
    } catch (err) {
      console.error('Error fetching doctor dashboard details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMessage(null);
    setProfileLoading(true);

    try {
      const res = await apiFetch('/doctor/profile', {
        method: 'PUT',
        body: JSON.stringify({
          specialization: profile.specialization,
          bio: profile.bio,
          slotDurationMinutes: profile.slotDurationMinutes,
          consultationFee: profile.consultationFee,
        }),
      });

      if (res.ok) {
        setProfileMessage('Profile settings updated successfully!');
      } else {
        setProfileMessage('Failed to update profile settings.');
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      setProfileMessage('An error occurred during save.');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleScheduleLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLeaveLoading(true);

    try {
      const res = await apiFetch('/doctor/leaves', {
        method: 'POST',
        body: JSON.stringify({
          date: leaveDate,
          reason: leaveReason,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        setLeaveDate('');
        setLeaveReason('');
        fetchData();
      } else {
        alert(data.message || 'Failed to request leave.');
      }
    } catch (err) {
      console.error('Error scheduling leave:', err);
    } finally {
      setLeaveLoading(false);
    }
  };

  const handleAddMedicine = () => {
    setPrescription([...prescription, { medicine: '', dosage: '', frequency: 'Once daily', durationDays: '7' }]);
  };

  const handleRemoveMedicine = (index: number) => {
    const next = [...prescription];
    next.splice(index, 1);
    setPrescription(next);
  };

  const handlePrescriptionChange = (index: number, field: string, val: string) => {
    const next = [...prescription];
    (next[index] as any)[field] = val;
    setPrescription(next);
  };

  const handleSubmitConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppt) return;
    setSubmitNotesLoading(true);

    try {
      const formattedPrescription = prescription.map((med) => ({
        medicine: med.medicine,
        dosage: med.dosage,
        frequency: med.frequency,
        durationDays: parseInt(med.durationDays) || 7,
      }));

      const res = await apiFetch(`/doctor/appointments/${selectedAppt.id}/notes`, {
        method: 'POST',
        body: JSON.stringify({
          clinicalNotes: clinicalNotes + (careTrack ? `\n\nEnrolled in Care Track: ${careTrack}` : ''),
          prescription: formattedPrescription,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert('Consultation finalized successfully!');
        setSelectedAppt(null);
        setClinicalNotes('');
        setPrescription([{ medicine: '', dosage: '', frequency: 'Once daily', durationDays: '7' }]);
        setCareTrack('');
        fetchData();
      } else {
        alert(data.message || 'Failed to submit consultation details.');
      }
    } catch (err) {
      console.error('Error submitting consultation notes:', err);
    } finally {
      setSubmitNotesLoading(false);
    }
  };

  const downloadICS = async (appointmentId: string) => {
    try {
      const res = await apiFetch(`/calendar/ics/${appointmentId}`);
      if (!res.ok) throw new Error('Failed to download calendar file');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `appointment-${appointmentId}.ics`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error downloading ICS:', err);
      alert('Failed to download calendar invite.');
    }
  };

  const getUrgencyBadgeColor = (urgency: string) => {
    switch (urgency?.toUpperCase()) {
      case 'HIGH':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'MEDIUM':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      default:
        return 'bg-green-50 text-green-700 border-green-200';
    }
  };

  const getLrnaBadgeClass = (status: 'NORMAL' | 'AWAITING REVIEW' | 'CRITICAL') => {
    switch (status) {
      case 'CRITICAL':
        return 'bg-red-50 text-red-700 border border-red-100';
      case 'AWAITING REVIEW':
        return 'bg-blue-50 text-blue-700 border border-blue-100';
      default:
        return 'bg-teal-50 text-teal-700 border border-teal-100';
    }
  };

  return (
    <div className="fixed inset-0 flex text-slate-800 select-none overflow-hidden bg-[#f7f6f0]">
      {/* LEFT SIDEBAR (Dark Theme matching PatientDashboard) */}
      <aside className="w-64 flex-shrink-0 flex flex-col justify-between py-6 px-4 z-40 bg-[#0d2a20] text-[#a3b899]">
        <div className="space-y-8">
          {/* Logo */}
          <div className="flex items-center gap-2.5 px-2">
            <div className="w-7 h-7 rounded flex items-center justify-center font-extrabold text-sm bg-[#c58739] text-[#0d2a20] shadow-sm">
              +
            </div>
            <span className="text-lg font-black tracking-tight text-white font-serif">MediSync</span>
          </div>

          {/* Navigation Links */}
          <div className="space-y-1">
            {NAV.map(({ key, icon: Icon, label }) => {
              const active = activeNav === key;
              return (
                <button
                  key={key}
                  onClick={() => {
                    setActiveNav(key);
                    if (key === 'queue') setSelectedAppt(null);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all"
                  style={{
                    background: active ? '#1c3e34' : 'transparent',
                    color: active ? 'white' : '#a3b899',
                  }}
                >
                  <Icon size={16} />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Doctor profile card */}
        <div className="flex items-center gap-3 px-2 pt-4 border-t border-emerald-950/60">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-[#c58739] text-[#0d2a20]">
            {user?.name?.charAt(0) || 'D'}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-white truncate">{user?.name || 'Priya Sharma'}</div>
            <div className="text-[10px] text-[#a3b899]">Doctor</div>
          </div>
          <button onClick={() => logout()} className="ml-auto text-[#a3b899] hover:text-red-400 transition-colors" title="Logout">
            <LogOut size={14} />
          </button>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <main className="flex-1 flex flex-col overflow-hidden relative bg-[#fcfbfa]">
        {loading ? (
          <div className="flex-grow flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#0d2a20]" />
          </div>
        ) : (
          <AnimatePresence mode="wait">

            {/* TELEHEALTH WAITING ROOM */}
            {activeNav === 'telehealth' && (
              <motion.div
                key="telehealth"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex-grow p-8 overflow-y-auto"
              >
                <div className="mb-8">
                  <h2 className="text-2xl font-bold font-serif text-slate-800 tracking-tight">Telehealth Waiting Room</h2>
                  <p className="text-sm text-slate-500 mt-1">Patients currently online and ready for virtual consultation.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {ONLINE_PATIENTS.map(p => (
                    <div key={p.id} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col items-center text-center space-y-4">
                      <div className="relative">
                        <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center text-2xl font-black text-slate-400 border border-slate-200">
                          {p.avatar}
                        </div>
                        <div className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></div>
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-bold text-slate-800">{p.name}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">{p.symptom}</p>
                      </div>
                      
                      <div className="text-[11px] font-bold text-orange-600 bg-orange-50 px-3 py-1 rounded-full border border-orange-100">
                        Waiting: {p.waitTime}
                      </div>

                      <button onClick={() => setActiveCall(p)} className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-all flex justify-center items-center gap-2 mt-2">
                        <Video size={16} /> Start Video Call
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* LRNA Results Dashboard */}
            {activeNav === 'lrna' && (
              <motion.div
                key="lrna-tab"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex-grow flex p-6 gap-6 overflow-hidden"
              >
                {/* Left Patient list */}
                <div className="w-1/3 flex flex-col gap-3 overflow-y-auto pr-1">
                  <h3 className="text-xs font-extrabold tracking-wider text-slate-500 uppercase px-1">
                    Laboratory Results (LRNA)
                  </h3>

                  <div className="space-y-3">
                    {lrnaPatients.map((patient, idx) => {
                      const isSelected = selectedLrnaId === patient.id;
                      return (
                        <div
                          key={`${patient.id}-${idx}`}
                          onClick={() => setSelectedLrnaId(patient.id)}
                          className="p-4 rounded-2xl cursor-pointer border transition-all duration-200 flex flex-col gap-3 bg-white shadow-sm hover:border-[#0d2a20]/30"
                          style={{
                            borderColor: isSelected ? '#0d2a20' : '#f1f5f9', // slate-100 equivalent
                            borderLeft: isSelected ? '4px solid #0d2a20' : '1px solid #f1f5f9',
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400">
                                <User className="w-4.5 h-4.5" />
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-800 text-xs">{patient.name}</h4>
                                <p className="text-[10px] text-slate-400 mt-0.5">{patient.testType}</p>
                              </div>
                            </div>

                            <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${getLrnaBadgeClass(patient.status)}`}>
                              {patient.status}
                            </span>
                          </div>

                          <div className="text-[9px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <Clock size={12} />
                            <span>{patient.dateTime}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right Details Panel */}
                <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1">
                  
                  {/* Circle Action Buttons */}
                  <div className="flex justify-end gap-2 shrink-0">
                    <button className="w-8.5 h-8.5 rounded-full bg-white border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-500 hover:text-[#0d2a20] shadow-sm transition-all">
                      <Share2 size={14} />
                    </button>
                    <button className="w-8.5 h-8.5 rounded-full bg-white border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-500 hover:text-[#0d2a20] shadow-sm transition-all">
                      <Copy size={14} />
                    </button>
                    <button className="w-8.5 h-8.5 rounded-full bg-white border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-500 hover:text-[#0d2a20] shadow-sm transition-all">
                      <Download size={14} />
                    </button>
                  </div>

                  {/* Main Details Panel */}
                  <div className="p-6 rounded-3xl space-y-6 bg-white border border-slate-100 shadow-sm relative">
                    {localStorage.getItem('medisync_ai_fallback') === 'true' && (
                      <div className="bg-red-50 border border-red-100 text-red-700 text-[10px] px-3 py-1.5 rounded-xl flex items-center gap-1.5 shrink-0 animate-fadeIn">
                        <AlertTriangle size={12} className="text-red-500" />
                        <span><strong>AI Scribe Offline:</strong> Summaries generated via static heuristic templates.</span>
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-slate-100">
                      
                      {/* Left Column values table */}
                      <div className="space-y-4">
                        <h3 className="text-sm font-extrabold text-slate-800">LRNA Analysis</h3>

                        <div className="space-y-1">
                          <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Test Reason</label>
                          <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 font-medium leading-relaxed h-12 overflow-y-auto">
                            Test Reason: {selectedLrnaPatient.reason}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h4 className="text-[10px] font-bold text-slate-400">Values ({selectedLrnaPatient.testType})</h4>
                          <div className="rounded-xl border border-slate-100 overflow-hidden bg-white shadow-sm">
                            <table className="w-full text-left text-xs">
                              <thead>
                                <tr className="border-b border-slate-200 bg-slate-50 text-[8px] font-extrabold uppercase text-slate-500 tracking-wider">
                                  <th className="px-3 py-1.5">Parameter</th>
                                  <th className="px-3 py-1.5 text-right">Result</th>
                                  <th className="px-3 py-1.5 text-center w-12">Flag</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 text-[10px] text-slate-600 bg-white">
                                {selectedLrnaPatient.values.map((v, i) => (
                                  <tr key={i} className="hover:bg-slate-50/50">
                                    <td className="px-3 py-1.5 font-medium">{v.param}</td>
                                    <td className={`px-3 py-1.5 text-right font-bold ${v.flag === 'H' ? 'text-red-500' : 'text-slate-800'}`}>
                                      {v.result}
                                    </td>
                                    <td className="px-3 py-1.5 text-center">
                                      {v.flag === 'H' ? (
                                        <span className="font-extrabold text-red-500 text-[10px]">H</span>
                                      ) : (
                                        <span className="text-slate-300">-</span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>

                      {/* Right Column patient info & acknowledge */}
                      <div className="flex flex-col justify-between space-y-4">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <h2 className="text-xl font-bold font-serif text-[#0d2a20] tracking-tight">{selectedLrnaPatient.name}</h2>
                            <p className="text-[11px] text-slate-400">{selectedLrnaPatient.email}</p>
                            <p className="text-[11px] text-slate-400">{selectedLrnaPatient.phone}</p>
                          </div>
                          
                          <div className="w-10 h-10 rounded-2xl bg-[#c58739]/10 border border-[#c58739]/20 flex items-center justify-center text-[#c58739]">
                            <User className="w-5 h-5" />
                          </div>
                        </div>

                        <div>
                          <button className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#0d2a20] text-white hover:bg-emerald-950 transition-colors w-full md:w-auto shadow-sm">
                            <Check size={14} />
                            <span>Acknowledge Result</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Section 2: Interpretation */}
                    <div className="p-4 rounded-2xl space-y-2 bg-slate-50 border border-slate-100">
                      <h4 className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500">
                        LRNA DOCTOR INTERPRETATION & ACTION
                      </h4>
                      <div className="space-y-2 text-xs">
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 block">Clinical Impression:</span>
                          <p className="text-slate-700 font-medium leading-relaxed mt-0.5">{selectedLrnaPatient.impression}</p>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 block">Suggested Diagnostic Questions:</span>
                          <p className="text-[10px] font-extrabold text-red-700 bg-red-50 border border-red-100 rounded-lg px-2.5 py-1 mt-1 inline-block">
                            {selectedLrnaPatient.flagText}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Section 3: Consultation */}
                    <div className="space-y-4">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                        <h4 className="font-extrabold text-sm text-[#0d2a20] flex items-center gap-1.5 font-serif">
                          <FileText size={14} />
                          <span>Clinical Consultation</span>
                        </h4>
                        
                        <div className="flex gap-3">
                          <button
                            onClick={handleAutoDraft}
                            type="button"
                            className="text-[10px] font-bold text-[#c58739] hover:text-[#0d2a20] transition-colors flex items-center gap-1 bg-[#c58739]/10 border border-[#c58739]/20 px-2 py-0.5 rounded"
                          >
                            <span>✨ Auto-Draft Scribe</span>
                          </button>
                          <button className="text-[10px] font-bold text-slate-700 hover:text-[#0d2a20] transition-colors flex items-center gap-0.5">
                            <Plus size={12} />
                            <span>Add Medicine</span>
                          </button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Clinical Action Plan / Prescription Notes</label>
                          <textarea
                            value={draftedNotes[selectedLrnaPatient.id] !== undefined ? draftedNotes[selectedLrnaPatient.id] : selectedLrnaPatient.notes}
                            onChange={(e) => setDraftedNotes(prev => ({ ...prev, [selectedLrnaPatient.id]: e.target.value }))}
                            rows={3}
                            className="w-full px-3 py-2 bg-white border border-slate-200 outline-none rounded-2xl text-xs text-slate-700 leading-relaxed focus:border-[#0d2a20] transition-colors resize-none shadow-sm"
                          />
                        </div>

                        <div className="flex gap-4">
                          <div className="w-1/2 space-y-1">
                            <label className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">Frequency</label>
                            <select
                              defaultValue={selectedLrnaPatient.frequency}
                              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl outline-none text-xs text-slate-700 focus:border-[#0d2a20] transition-colors shadow-sm"
                            >
                              <option>Once daily</option>
                              <option>Twice daily</option>
                              <option>Three times daily</option>
                              <option>As needed</option>
                            </select>
                          </div>

                          <div className="w-1/2 space-y-1">
                            <label className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">Duration (Days)</label>
                            <input
                              type="number"
                              defaultValue={selectedLrnaPatient.durationDays}
                              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl outline-none text-xs text-slate-700 focus:border-[#0d2a20] transition-colors shadow-sm"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              </motion.div>
            )}

            {/* PATIENT QUEUE */}
            {activeNav === 'queue' && (
              <motion.div
                key="queue"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex-grow flex p-6 gap-6 overflow-hidden"
              >
                {/* Queue list */}
                <div className="w-2/3 flex flex-col gap-3 overflow-y-auto pr-1">
                  <h3 className="text-xs font-extrabold tracking-wider text-slate-500 uppercase px-1">
                    Appointment Queue
                  </h3>

                  <div className="space-y-3">
                    {appointments.map(appt => (
                      <div
                        key={appt.id}
                        onClick={() => { setSelectedAppt(appt); setShowTimeline(false); }}
                        className="p-4 rounded-2xl cursor-pointer border transition-all duration-200 flex justify-between items-center bg-white shadow-sm hover:border-[#0d2a20]/30"
                        style={{
                          borderColor: selectedAppt?.id === appt.id ? '#0d2a20' : '#f1f5f9',
                          borderLeft: selectedAppt?.id === appt.id ? '4px solid #0d2a20' : '1px solid #f1f5f9',
                        }}
                      >
                        <div className="flex gap-4 items-center">
                          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 shadow-sm relative">
                            <User size={18} />
                            {/* Feature 2: Triage Badge Marker on Avatar */}
                            {appt.preVisitSummary && (
                              <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${
                                appt.preVisitSummary.urgencyLevel === 'HIGH' ? 'bg-red-500' :
                                appt.preVisitSummary.urgencyLevel === 'MEDIUM' ? 'bg-orange-400' : 'bg-green-500'
                              }`}></div>
                            )}
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-800 text-sm">{appt.patient.name}</h4>
                            <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-1 font-medium">
                              <span className="flex items-center gap-1"><Calendar size={12} />{new Date(appt.slotStart).toLocaleDateString()}</span>
                              <span className="flex items-center gap-1"><Clock size={12} />{new Date(appt.slotStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end gap-1.5">
                          <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-full border ${
                            appt.status === 'COMPLETED' ? 'bg-green-50 text-green-700 border-green-100' :
                            appt.status === 'CANCELLED' ? 'bg-red-50 text-red-700 border-red-100' :
                            'bg-blue-50 text-blue-700 border-blue-100'
                          }`}>
                            {appt.status}
                          </span>
                          
                          {/* Feature 2: Display Text Triage Score for easy reading */}
                          {appt.preVisitSummary && (
                            <span className={`px-2 py-0.5 text-[8px] font-extrabold uppercase rounded border ${getUrgencyBadgeColor(appt.preVisitSummary.urgencyLevel)}`}>
                              Triage: {appt.preVisitSummary.urgencyLevel}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    {appointments.length === 0 && <p className="text-slate-400 text-xs px-1">No appointments scheduled.</p>}
                  </div>
                </div>

                {/* Queue Details consultation form */}
                <div className="flex-1 overflow-y-auto pr-1">
                  <AnimatePresence mode="wait">
                    {selectedAppt ? (
                      <motion.div
                        key={selectedAppt.id}
                        initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                        className="p-6 rounded-3xl space-y-6 bg-white border border-slate-100 shadow-sm relative overflow-hidden"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-lg font-extrabold text-[#0d2a20] font-serif tracking-tight">{selectedAppt.patient.name}</h3>
                            <p className="text-[10px] text-slate-400 mt-0.5">{selectedAppt.patient.email}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{selectedAppt.patient.phone || 'No phone number.'}</p>
                          </div>
                          
                          {/* Feature 4 toggle: Health Timeline */}
                          <button 
                            onClick={() => setShowTimeline(!showTimeline)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 border ${showTimeline ? 'bg-[#0d2a20] text-white border-transparent' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                          >
                            <Activity size={14} />
                            {showTimeline ? 'View Current Visit' : 'View Health Timeline'}
                          </button>
                        </div>
                        
                        {/* FEATURE 4: Longitudinal Health Timeline View */}
                        {showTimeline ? (
                          <div className="space-y-6 pt-4 border-t border-slate-100 animate-fadeIn">
                            <h4 className="font-extrabold text-sm text-[#0d2a20] font-serif">Patient Health Timeline</h4>
                            
                            <div className="relative border-l-2 border-slate-100 ml-4 space-y-8 pb-4">
                              {/* Event 1 */}
                              <div className="relative pl-6">
                                <div className="absolute -left-3.5 top-0 w-7 h-7 bg-blue-50 border-2 border-white rounded-full flex items-center justify-center text-blue-500 shadow-sm">
                                  <Stethoscope size={12} />
                                </div>
                                <div className="text-[10px] font-extrabold text-slate-400 mb-0.5">3 Months Ago (May 12, 2026)</div>
                                <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl shadow-sm">
                                  <div className="text-xs font-bold text-slate-800 mb-1">Routine Cardiology Check</div>
                                  <div className="text-[10px] text-slate-500">Blood pressure slightly elevated (135/85). Recommended diet modifications.</div>
                                </div>
                              </div>
                              {/* Event 2 */}
                              <div className="relative pl-6">
                                <div className="absolute -left-3.5 top-0 w-7 h-7 bg-orange-50 border-2 border-white rounded-full flex items-center justify-center text-orange-500 shadow-sm">
                                  <Activity size={12} />
                                </div>
                                <div className="text-[10px] font-extrabold text-slate-400 mb-0.5">1 Month Ago (July 20, 2026)</div>
                                <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl shadow-sm">
                                  <div className="text-xs font-bold text-slate-800 mb-1">Vitals Spike Alert</div>
                                  <div className="text-[10px] text-slate-500">Home monitoring device flagged sustained BP at 145/90 for 3 days. Patient notified to book appointment.</div>
                                </div>
                              </div>
                              {/* Event 3 */}
                              <div className="relative pl-6">
                                <div className="absolute -left-3.5 top-0 w-7 h-7 bg-emerald-50 border-2 border-white rounded-full flex items-center justify-center text-emerald-500 shadow-sm">
                                  <Pill size={12} />
                                </div>
                                <div className="text-[10px] font-extrabold text-slate-400 mb-0.5">Present (Today)</div>
                                <div className="bg-emerald-50/50 border border-emerald-100 p-3 rounded-2xl shadow-sm">
                                  <div className="text-xs font-bold text-emerald-800 mb-1">Current Appointment</div>
                                  <div className="text-[10px] text-emerald-600 font-medium">Re-evaluating hypertension medication protocol.</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <>
                            {/* Standard Appointment View */}
                            <button onClick={() => downloadICS(selectedAppt.id)} className="mt-0 inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-[10px] font-bold transition-all shadow-sm">
                              <Calendar size={12} />
                              <span>Download Calendar Invite</span>
                            </button>

                            {selectedAppt.symptomForm && (
                              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Symptoms Description</span>
                                <p className="text-[11px] leading-relaxed text-slate-700 font-medium">{selectedAppt.symptomForm.symptomsText}</p>
                              </div>
                            )}

                            {selectedAppt.preVisitSummary && (
                              <div className="p-4 rounded-xl bg-orange-50 border border-orange-100 space-y-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">AI Pre-Visit Assessment</span>
                                  <span className={`px-2 py-0.5 text-[8px] font-black uppercase rounded border ${getUrgencyBadgeColor(selectedAppt.preVisitSummary.urgencyLevel)}`}>
                                    Urgency: {selectedAppt.preVisitSummary.urgencyLevel}
                                  </span>
                                </div>
                                <div className="text-xs text-slate-700 font-medium leading-relaxed">
                                  <div>Chief Complaint: <strong className="text-slate-900">{selectedAppt.preVisitSummary.chiefComplaint}</strong></div>
                                </div>
                              </div>
                            )}

                            {selectedAppt.status === 'CONFIRMED' ? (
                              <form onSubmit={handleSubmitConsultation} className="space-y-6 pt-6 border-t border-slate-100">
                                
                                <div className="flex justify-between items-center">
                                  <h4 className="font-extrabold text-sm text-[#0d2a20] flex items-center gap-1.5 font-serif">
                                    <FileText size={14} />
                                    <span>Clinical Consultation</span>
                                  </h4>
                                </div>

                                {/* Feature 1: AI Voice Dictation Scribe */}
                                <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl space-y-3 relative overflow-hidden">
                                  <div className="flex justify-between items-start relative z-10">
                                    <div>
                                      <label className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600 flex items-center gap-1.5 block">
                                        <Mic size={12} /> AI Voice Scribe
                                      </label>
                                      <p className="text-[10px] text-blue-500 mt-0.5">Dictate your clinical notes and prescriptions. AI will structure it automatically.</p>
                                    </div>
                                    <button 
                                      type="button"
                                      onClick={handleStartDictation}
                                      disabled={isDictating}
                                      className={`w-10 h-10 rounded-full flex items-center justify-center text-white shadow-md transition-all ${isDictating ? 'bg-red-500 animate-pulse' : 'bg-blue-600 hover:bg-blue-700'}`}
                                    >
                                      {isDictating ? <span className="w-3 h-3 bg-white rounded-sm"></span> : <Mic size={16} />}
                                    </button>
                                  </div>
                                  
                                  {isDictating && (
                                    <div className="absolute bottom-0 left-0 h-1 bg-red-500 animate-pulse" style={{ width: '100%' }}></div>
                                  )}
                                </div>

                                <div className="space-y-1.5">
                                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Clinical Notes</label>
                                  <textarea
                                    required rows={3} value={clinicalNotes} onChange={e => setClinicalNotes(e.target.value)}
                                    placeholder="Consultation findings will appear here..."
                                    className="w-full p-4 bg-white border border-slate-200 outline-none rounded-2xl text-xs text-slate-700 focus:border-[#0d2a20] transition-colors resize-none shadow-sm"
                                  />
                                </div>

                                {/* Feature 3: Smart Prescription Builder */}
                                <div className="space-y-3 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                                  <div className="flex justify-between items-center mb-2">
                                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Smart Prescription Builder</label>
                                    <button type="button" onClick={handleAddMedicine} className="text-[10px] text-blue-600 hover:text-blue-700 hover:underline font-bold flex items-center gap-1 bg-blue-50 px-2 py-1 rounded border border-blue-100">
                                      <Plus size={11} /> Add Drug
                                    </button>
                                  </div>

                                  <div className="space-y-3">
                                    {prescription.map((med, idx) => (
                                      <div key={idx} className="p-3 bg-white border border-slate-200 rounded-xl space-y-2 relative shadow-sm">
                                        {prescription.length > 1 && (
                                          <button type="button" onClick={() => handleRemoveMedicine(idx)} className="absolute top-2.5 right-2.5 text-slate-300 hover:text-red-500 transition-colors">
                                            <Trash2 size={13} />
                                          </button>
                                        )}
                                        <div className="grid grid-cols-2 gap-3 pr-6">
                                          <div className="space-y-1">
                                            <label className="text-[8px] font-bold uppercase text-slate-400">Drug Name</label>
                                            <input type="text" required placeholder="e.g. Amoxicillin" value={med.medicine} onChange={e => handlePrescriptionChange(idx, 'medicine', e.target.value)} className="w-full px-2 py-1.5 border-b border-slate-200 text-xs bg-transparent focus:border-[#0d2a20] outline-none font-bold text-slate-800" />
                                          </div>
                                          <div className="space-y-1">
                                            <label className="text-[8px] font-bold uppercase text-slate-400">Dosage</label>
                                            <input type="text" required placeholder="e.g. 500mg" value={med.dosage} onChange={e => handlePrescriptionChange(idx, 'dosage', e.target.value)} className="w-full px-2 py-1.5 border-b border-slate-200 text-xs bg-transparent focus:border-[#0d2a20] outline-none" />
                                          </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                          <div className="space-y-1">
                                            <label className="text-[8px] font-bold uppercase text-slate-400">Frequency</label>
                                            <select value={med.frequency} onChange={e => handlePrescriptionChange(idx, 'frequency', e.target.value)} className="w-full px-2 py-1.5 border-b border-slate-200 text-xs bg-transparent focus:border-[#0d2a20] outline-none text-slate-700">
                                              <option>Once daily</option>
                                              <option>Twice daily</option>
                                              <option>Three times daily</option>
                                              <option>As needed</option>
                                            </select>
                                          </div>
                                          <div className="space-y-1">
                                            <label className="text-[8px] font-bold uppercase text-slate-400">Duration (Days)</label>
                                            <input type="number" required placeholder="Days" value={med.durationDays} onChange={e => handlePrescriptionChange(idx, 'durationDays', e.target.value)} className="w-full px-2 py-1.5 border-b border-slate-200 text-xs bg-transparent focus:border-[#0d2a20] outline-none" />
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>

                                  {/* Feature 3: Drug Interaction Warning Alert */}
                                  {checkDrugInteractions() && (
                                    <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl flex gap-2 shadow-sm animate-fadeIn">
                                      <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
                                      <span>{checkDrugInteractions()}</span>
                                    </div>
                                  )}
                                </div>

                                {/* Feature 5: Automated Follow-Up Care Tracks */}
                                <div className="space-y-2 pt-2 border-t border-slate-100">
                                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Enroll in Automated Care Track (Optional)</label>
                                  <div className="grid grid-cols-2 gap-3">
                                    {['Hypertension 30-Day Check-in', 'Post-Op Infection Watch', 'Routine Annual Reminder'].map(track => (
                                      <button
                                        key={track}
                                        type="button"
                                        onClick={() => setCareTrack(careTrack === track ? '' : track)}
                                        className={`px-3 py-2 border rounded-xl text-xs font-bold text-left transition-all ${careTrack === track ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-inner' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 shadow-sm'}`}
                                      >
                                        {track}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                <button type="submit" disabled={submitNotesLoading} className="w-full py-3 mt-4 bg-[#0d2a20] hover:bg-emerald-950 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-900/10 transition-all">
                                  {submitNotesLoading ? <Loader2 size={16} className="animate-spin text-white" /> : <Save size={16} />}
                                  <span>Finalize & Sign Consultation</span>
                                </button>
                              </form>
                            ) : selectedAppt.status === 'COMPLETED' && selectedAppt.postVisitSummary ? (
                              <div className="space-y-3 pt-6 border-t border-slate-100">
                                <h4 className="font-extrabold text-sm text-green-700 flex items-center gap-1.5 font-serif">
                                  <FileText size={14} />
                                  <span>AI Patient-Friendly Summary Generated</span>
                                </h4>
                                <div className="bg-green-50/50 p-4 rounded-2xl border border-green-100">
                                  <p className="text-xs text-slate-700 leading-relaxed font-medium">{selectedAppt.postVisitSummary.patientFriendlyText}</p>
                                </div>
                              </div>
                            ) : (
                              <div className="pt-6 border-t border-slate-100 text-xs text-slate-400 font-medium">No further actions available for this appointment status.</div>
                            )}
                          </>
                        )}
                      </motion.div>
                    ) : (
                      <div className="rounded-3xl p-8 flex flex-col items-center justify-center gap-3 text-center h-64 bg-white border border-slate-100 shadow-sm">
                        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center border border-slate-200">
                          <FileText size={20} className="text-slate-400" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-800">Select an Appointment</h3>
                          <p className="text-xs text-slate-500 mt-1">Click on a patient in the queue to view details and dictate notes.</p>
                        </div>
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}

            {/* PROFILE CONFIG */}
            {activeNav === 'profile' && profile && (
              <motion.div
                key="profile"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex-grow p-6 overflow-y-auto"
              >
                <form onSubmit={handleUpdateProfile} className="max-w-xl p-8 space-y-6 bg-white border border-slate-100 rounded-3xl shadow-sm">
                  <h3 className="font-bold font-serif text-[#0d2a20] text-lg flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    <span>Working Settings</span>
                  </h3>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Specialization</label>
                      <input type="text" required value={profile.specialization} onChange={e => setProfile({ ...profile, specialization: e.target.value })} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs text-slate-700 focus:border-[#0d2a20] transition-colors shadow-sm" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Consultation Fee (₹)</label>
                      <input type="number" required value={profile.consultationFee} onChange={e => setProfile({ ...profile, consultationFee: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs text-slate-700 focus:border-[#0d2a20] transition-colors shadow-sm" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Slot Duration (Minutes)</label>
                      <input type="number" required value={profile.slotDurationMinutes} onChange={e => setProfile({ ...profile, slotDurationMinutes: parseInt(e.target.value) || 30 })} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs text-slate-700 focus:border-[#0d2a20] transition-colors shadow-sm" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Biography Profile</label>
                    <textarea rows={3} value={profile.bio} onChange={e => setProfile({ ...profile, bio: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs text-slate-700 focus:border-[#0d2a20] transition-colors resize-none leading-relaxed shadow-sm" />
                  </div>

                  {profileMessage && <div className="p-3 bg-green-50 border border-green-100 rounded-xl text-green-700 text-xs font-bold">{profileMessage}</div>}

                  <button type="submit" disabled={profileLoading} className="px-5 py-2.5 bg-[#0d2a20] hover:bg-emerald-950 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-900/10 transition-all">
                    {profileLoading ? <Loader2 size={14} className="animate-spin text-white" /> : <Save size={14} />}
                    <span>Save Profile</span>
                  </button>
                </form>
              </motion.div>
            )}

            {/* SCHEDULE LEAVE */}
            {activeNav === 'leaves' && (
              <motion.div
                key="leaves"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex-grow p-6 overflow-y-auto"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  
                  <form onSubmit={handleScheduleLeave} className="p-6 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-4 flex flex-col justify-between" style={{ minHeight: '320px' }}>
                    <div className="space-y-4">
                      <h3 className="text-lg font-extrabold text-[#0d2a20] font-serif flex items-center gap-2">
                        <CalendarDays size={18} />
                        <span>Schedule Leave</span>
                      </h3>

                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Leave Date</label>
                        <input type="date" required value={leaveDate} onChange={e => setLeaveDate(e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:border-[#0d2a20] outline-none shadow-sm" />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Reason (Optional)</label>
                        <input type="text" value={leaveReason} onChange={e => setLeaveReason(e.target.value)} placeholder="Attending medical conference..." className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:border-[#0d2a20] outline-none shadow-sm" />
                      </div>
                    </div>

                    <div className="pt-4 space-y-3">
                      <div className="p-3 bg-orange-50 border border-orange-100 rounded-xl text-orange-700 text-[10px] font-medium leading-relaxed flex gap-2 shadow-sm">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>Conflicting appointments will be auto-cancelled and patients notified.</span>
                      </div>

                      <button type="submit" disabled={leaveLoading} className="w-full py-2.5 bg-[#0d2a20] hover:bg-emerald-950 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-900/10 transition-all">
                        {leaveLoading ? <Loader2 size={14} className="animate-spin text-white" /> : <span>Register Leave</span>}
                      </button>
                    </div>
                  </form>

                  <div className="md:col-span-2 space-y-4">
                    <h3 className="text-lg font-extrabold text-[#0d2a20] font-serif tracking-wider">Leave Schedule</h3>
                    
                    <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 text-[9px] font-extrabold uppercase tracking-wider">
                            <th className="px-6 py-4">Date</th>
                            <th className="px-6 py-4">Reason</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-600 bg-white">
                          {leaves.map(l => (
                            <tr key={l.id} className="hover:bg-slate-50/50">
                              <td className="px-6 py-4 font-bold text-slate-800">
                                {new Date(l.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                              </td>
                              <td className="px-6 py-4 font-medium">{l.reason || 'No reason provided.'}</td>
                            </tr>
                          ))}
                          {leaves.length === 0 && (
                            <tr>
                              <td colSpan={2} className="px-6 py-8 text-center text-slate-400 font-medium">No leave schedules registered.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* Feature 6: Telehealth Modal Overlay */}
        <AnimatePresence>
          {activeCall && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-8"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                className="w-full max-w-5xl h-[80vh] bg-slate-800 rounded-3xl border border-slate-700 overflow-hidden flex flex-col shadow-2xl"
              >
                {/* Header */}
                <div className="h-16 border-b border-slate-700 flex items-center justify-between px-6 shrink-0 bg-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></div>
                    <span className="text-white font-bold text-sm">Secure Video Call</span>
                    <span className="text-slate-400 text-xs px-2 py-0.5 bg-slate-700 rounded-full">{activeCall.name}</span>
                  </div>
                  <div className="text-slate-400 text-xs font-mono">00:00:00</div>
                </div>

                {/* Video Area */}
                <div className="flex-1 bg-slate-900 relative flex items-center justify-center">
                  {/* Mock Patient Video */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="w-32 h-32 bg-slate-700 rounded-full flex items-center justify-center text-4xl text-slate-500 mb-4 shadow-inner">
                      {activeCall.avatar}
                    </div>
                    <span className="text-slate-400 font-bold">{activeCall.name} is connected.</span>
                  </div>
                  
                  {/* Mock Doctor Pip */}
                  <div className="absolute bottom-6 right-6 w-48 h-32 bg-slate-800 rounded-2xl border-2 border-slate-600 shadow-xl flex items-center justify-center text-slate-500 overflow-hidden">
                    <User size={32} />
                  </div>
                </div>

                {/* Controls */}
                <div className="h-20 bg-slate-800 border-t border-slate-700 flex items-center justify-center gap-6 shrink-0">
                  <button className="w-12 h-12 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-white transition-colors">
                    <MicOff size={20} />
                  </button>
                  <button className="w-12 h-12 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-white transition-colors">
                    <VideoOff size={20} />
                  </button>
                  <button 
                    onClick={() => setActiveCall(null)}
                    className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white shadow-lg transition-colors"
                  >
                    <PhoneOff size={24} />
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </main>
    </div>
  );
}
