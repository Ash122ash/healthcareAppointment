import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, AlertCircle, FileText, Activity,
  CheckCircle, Loader2, Stethoscope, Pill, User,
  Home, BookOpen, LogOut, Info, Download, Calendar, BarChart2,
  ChevronRight, Mic, MicOff, CreditCard, Car, HeartPulse, MessageSquare
} from 'lucide-react';

interface Doctor {
  userId: string;
  specialization: string;
  bio: string;
  consultationFee: number;
  slotDurationMinutes: number;
  user: { id: string; name: string; email: string; phone: string | null };
}

interface Appointment {
  id: string;
  slotStart: string;
  slotEnd: string;
  status: string;
  doctor: { user: { name: string; email: string } };
  symptomForm: { symptomsText: string } | null;
  preVisitSummary: { urgencyLevel: string; chiefComplaint: string; suggestedQuestions: string[]; status: string } | null;
  postVisitNote: { clinicalNotes: string; prescriptionJSON: any } | null;
  postVisitSummary: { patientFriendlyText: string; medicationSchedule: any; followUpSteps: string[] } | null;
}

interface Reminder {
  id: string;
  medicine: string;
  scheduledTime: string;
  sent: boolean;
  sentAt: string | null;
}

type NavKey = 'overview' | 'bookings' | 'medications' | 'calendar' | 'find-doctor' | 'billing' | 'analytics' | 'profile';

const NAV = [
  { key: 'overview' as NavKey,    icon: Home,       label: 'Overview'      },
  { key: 'bookings' as NavKey,    icon: BookOpen,   label: 'My Bookings'   },
  { key: 'medications' as NavKey, icon: Pill,       label: 'Medications'   },
  { key: 'calendar' as NavKey,    icon: Calendar,   label: 'Calendar'      },
  { key: 'find-doctor' as NavKey, icon: Search,     label: 'Find a doctor' },
  { key: 'billing' as NavKey,     icon: CreditCard, label: 'Billing & Invoices' },
  { key: 'analytics' as NavKey,   icon: BarChart2,  label: 'Analytics'     },
  { key: 'profile' as NavKey,     icon: User,       label: 'Profile'       },
];

export default function PatientDashboard() {
  const { user, logout, apiFetch } = useAuth();
  const [activeNav, setActiveNav] = useState<NavKey>('overview');
  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [availableSlots, setAvailableSlots] = useState<{ start: string; end: string }[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ start: string; end: string } | null>(null);
  const [holdDetails, setHoldDetails] = useState<any>(null);
  const [remainingTime, setRemainingTime] = useState(0);
  const [symptomsText, setSymptomsText] = useState('');

  // Interactive 3D Heatmap State
  const [heatmapLevels, setHeatmapLevels] = useState<Record<string, number>>({ Head: 0, Chest: 0, Abdomen: 0, Arms: 0, Legs: 0 });
  const toggleHeatmap = (region: string) => setHeatmapLevels(p => ({ ...p, [region]: (p[region] + 1) % 4 }));
  const getHeatmapColor = (lvl: number) => lvl === 1 ? '#fde047' : lvl === 2 ? '#f97316' : lvl === 3 ? '#ef4444' : '#e2e8f0';

  // Smart Transit State
  const [transitTracking, setTransitTracking] = useState(false);

  // Medication Adherence tracking
  const [takenMeds, setTakenMeds] = useState<{[key: string]: boolean}>({});
  const getAdherenceRate = () => {
    const checkedCount = Object.values(takenMeds).filter(Boolean).length;
    if (reminders.length === 0) return 94;
    const base = 80;
    const todayImpact = Math.round((checkedCount / reminders.length) * 20);
    return Math.min(100, base + todayImpact);
  };
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [activeDetailsAppt, setActiveDetailsAppt] = useState<Appointment | null>(null);

  // Speech Recognition States
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  const toggleSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please try Chrome.');
      return;
    }

    if (isRecording) {
      if (recognition) {
        recognition.stop();
      }
      setIsRecording(false);
    } else {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setIsRecording(true);
      };

      rec.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        setSymptomsText(prev => prev ? prev + ' ' + text : text);
      };

      rec.onerror = (e: any) => {
        console.error('Speech recognition error:', e);
        setIsRecording(false);
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      rec.start();
      setRecognition(rec);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  useEffect(() => {
    if (selectedDoctor && selectedDate) fetchSlots();
  }, [selectedDoctor, selectedDate]);

  useEffect(() => {
    if (remainingTime <= 0) return;
    const t = setInterval(() => {
      setRemainingTime(prev => {
        if (prev <= 1) { setHoldDetails(null); clearInterval(t); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [remainingTime]);

  async function fetchAll() {
    setLoading(true);
    try {
      const [docRes, apptRes, remRes] = await Promise.all([
        apiFetch('/patient/doctors?query='),
        apiFetch('/patient/appointments'),
        apiFetch('/patient/reminders'),
      ]);
      if (docRes.ok)  setDoctors((await docRes.json()).doctors);
      if (apptRes.ok) setAppointments((await apptRes.json()).appointments);
      if (remRes.ok)  setReminders((await remRes.json()).reminders);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function searchDoctors() {
    try {
      const r = await apiFetch(`/patient/doctors?query=${searchQuery}`);
      if (r.ok) setDoctors((await r.json()).doctors);
    } catch (e) { console.error(e); }
  }

  async function fetchSlots() {
    if (!selectedDoctor || !selectedDate) return;
    setSlotsLoading(true); setSelectedSlot(null);
    try {
      const r = await apiFetch(`/patient/doctors/${selectedDoctor.userId}/availability?date=${selectedDate}`);
      if (r.ok) setAvailableSlots((await r.json()).slots);
    } catch (e) { console.error(e); }
    finally { setSlotsLoading(false); }
  }

  async function handleHoldSlot(slot: { start: string; end: string }) {
    if (!selectedDoctor) return;
    setSelectedSlot(slot);
    try {
      const r = await apiFetch('/patient/holds', {
        method: 'POST',
        body: JSON.stringify({ doctorId: selectedDoctor.userId, slotStart: slot.start, slotEnd: slot.end }),
      });
      const data = await r.json();
      if (r.ok) { 
        setHoldDetails({ holdId: data.holdId, start: slot.start, end: slot.end }); 
        const configuredTimeout = parseInt(localStorage.getItem('medisync_hold_timeout') || '90');
        setRemainingTime(configuredTimeout); 
      }
      else { alert(data.message || 'Slot locked by another user.'); fetchSlots(); }
    } catch (e) { console.error(e); }
  }

  async function handleConfirmBooking(e: React.FormEvent) {
    e.preventDefault();
    if (!holdDetails || !selectedDoctor || !symptomsText) return;
    setConfirmLoading(true);
    try {
      const r = await apiFetch('/patient/appointments', {
        method: 'POST',
        body: JSON.stringify({ holdId: holdDetails.holdId, doctorId: selectedDoctor.userId, slotStart: holdDetails.start, slotEnd: holdDetails.end, symptomsText }),
      });
      const data = await r.json();
      if (r.ok) { setHoldDetails(null); setSymptomsText(''); setSelectedDoctor(null); setSelectedSlot(null); fetchAll(); }
      else { alert(data.message || 'Booking failed.'); }
    } catch (e) { console.error(e); }
    finally { setConfirmLoading(false); }
  }

  async function handleCancelBooking(apptId: string) {
    try {
      const r = await apiFetch(`/patient/appointments/${apptId}/cancel`, { method: 'POST' });
      if (r.ok) { setActiveDetailsAppt(null); fetchAll(); }
    } catch (e) { console.error(e); }
  }

  async function handleToggleReminder(remId: string) {
    try { await apiFetch(`/patient/reminders/${remId}/toggle`, { method: 'PATCH' }); fetchAll(); }
    catch (e) { console.error(e); }
  }

  async function downloadICS(appointmentId: string) {
    try {
      const r = await apiFetch(`/calendar/ics/${appointmentId}`);
      if (!r.ok) throw new Error();
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `appt-${appointmentId}.ics`;
      document.body.appendChild(a); a.click(); URL.revokeObjectURL(url); document.body.removeChild(a);
    } catch { alert('Failed to download calendar invite.'); }
  }

  const nextAppt = appointments
    .filter(a => a.status === 'CONFIRMED' && new Date(a.slotStart) > new Date())
    .sort((a, b) => +new Date(a.slotStart) - +new Date(b.slotStart))[0];

  const pastAppts = appointments
    .filter(a => a.status === 'COMPLETED' || a.status === 'CANCELLED' || (a.status === 'CONFIRMED' && new Date(a.slotStart) < new Date()))
    .sort((a, b) => +new Date(b.slotStart) - +new Date(a.slotStart));

  // Determine greeting based on local time
  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return 'Good morning';
    if (hr < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getDayName = () => {
    return new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase();
  };

  return (
    <div className="fixed inset-0 flex text-slate-800 select-none overflow-hidden bg-[#f7f6f0]" style={{ fontFamily: "'Inter', sans-serif" }}>
      
      {/* ── LEFT FOREST GREEN SIDEBAR ── */}
      <aside className="w-64 flex-shrink-0 flex flex-col justify-between py-6 px-4 z-40 bg-[#0d2a20] text-[#a3b899]">
        <div className="space-y-8">
          {/* Logo */}
          <div className="flex items-center gap-2.5 px-2">
            <div className="w-7 h-7 rounded flex items-center justify-center font-extrabold text-sm bg-[#c58739] text-[#0d2a20] shadow-sm">
              +
            </div>
            <span className="text-lg font-black tracking-tight text-white">MediSync</span>
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
                    if (key === 'bookings') {
                      setActiveDetailsAppt(null);
                    }
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

        {/* Patient Profile Avatar Card */}
        <div className="flex items-center gap-3 px-2 pt-4 border-t border-emerald-950/60">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-[#c58739] text-[#0d2a20]">
            {user?.name?.charAt(0) || 'M'}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-white truncate">{user?.name || 'Meera Iyer'}</div>
            <div className="text-[10px] text-[#a3b899]">Patient</div>
          </div>
          <button onClick={() => logout()} className="ml-auto text-[#a3b899] hover:text-red-400 transition-colors" title="Logout">
            <LogOut size={14} />
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT CONTAINER ── */}
      <main className="flex-grow flex flex-col overflow-hidden relative">
        {localStorage.getItem('medisync_maintenance_mode') === 'true' && (
          <div className="bg-orange-50 border-b border-orange-100 text-orange-800 text-xs px-6 py-2.5 flex items-center gap-2 shrink-0 animate-fadeIn">
            <AlertCircle size={14} className="text-orange-600" />
            <span><strong>System Alert:</strong> The clinic management dashboard is undergoing scheduled maintenance. Holds and booking times may temporarily experience latency.</span>
          </div>
        )}
        {loading ? (
          <div className="flex-grow flex items-center justify-center bg-[#f7f6f0]">
            <Loader2 className="w-8 h-8 animate-spin text-[#0d2a20]" />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            
            {/* OVERVIEW TAB */}
            {activeNav === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-grow flex p-6 gap-6 overflow-hidden"
              >
                
                {/* Center Column: Greeting, Next Appt, Past Visits */}
                <div className="flex-1 flex flex-col gap-6 overflow-y-auto pr-1">
                  
                  {/* Top Header / Greeting Bar */}
                  <div className="flex justify-between items-end shrink-0">
                    <div>
                      <div className="text-[10px] font-extrabold tracking-wider text-slate-500">{getDayName()}</div>
                      <h1 className="text-3xl font-serif text-[#0d2a20] font-bold mt-1">
                        {getGreeting()}, {user?.name?.split(' ')[0] || 'Meera'}
                      </h1>
                    </div>

                    <div className="flex gap-2">
                      <button onClick={() => alert('Feature coming soon.')} className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold bg-white text-slate-700 shadow-sm hover:bg-slate-50 transition-colors">
                        Message clinic
                      </button>
                      <button onClick={() => setActiveNav('find-doctor')} className="px-4 py-2 rounded-xl text-xs font-bold bg-[#0d2a20] text-white shadow-md hover:bg-emerald-950 transition-colors">
                        Book appointment
                      </button>
                    </div>
                  </div>

                  {/* Next Appointment Card */}
                  <div className="p-6 rounded-2xl text-white relative flex flex-col justify-between" style={{ background: '#133527', minHeight: '190px' }}>
                    <div className="absolute top-6 right-6 w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm bg-emerald-950/40 text-white border border-emerald-800/30">
                      {nextAppt ? nextAppt.doctor.user.name.split(' ').pop()?.slice(0, 2).toUpperCase() : 'MI'}
                    </div>

                    <div className="space-y-4">
                      {nextAppt ? (
                        <>
                          <div className="space-y-1">
                            <span className="text-[10px] font-black tracking-widest uppercase text-[#c58739] bg-emerald-950/40 px-2 py-0.5 rounded-full inline-block">
                              ● Next appointment · {Math.max(1, Math.ceil((+new Date(nextAppt.slotStart) - +new Date()) / 86400000))} days
                            </span>
                            <h2 className="text-xl font-bold font-serif">{nextAppt.doctor.user.name}</h2>
                            <p className="text-xs text-[#a3b899]">Cardiology · Sundaram Heart Clinic</p>
                          </div>

                          <div className="flex gap-6 text-xs border-t border-emerald-900/60 pt-4">
                            <div>
                              <div className="text-[10px] font-bold text-[#a3b899] uppercase tracking-wider">Date</div>
                              <div className="font-bold text-white mt-0.5">{new Date(nextAppt.slotStart).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
                            </div>
                            <div>
                              <div className="text-[10px] font-bold text-[#a3b899] uppercase tracking-wider">Time</div>
                              <div className="font-bold text-white mt-0.5">{new Date(nextAppt.slotStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                            </div>
                            <div>
                              <div className="text-[10px] font-bold text-[#a3b899] uppercase tracking-wider">Mode</div>
                              <div className="font-bold text-white mt-0.5">in-clinic</div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="py-6 text-center text-[#a3b899] text-xs">
                          No upcoming appointments booked. Click 'Book appointment' to schedule.
                        </div>
                      )}
                    </div>

                    {nextAppt && (
                      <div className="flex flex-col gap-3 pt-4 border-t border-emerald-900/60 mt-4">
                        {!transitTracking ? (
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-[#a3b899] font-bold">12 mins away (Normal Traffic)</span>
                            <button onClick={() => setTransitTracking(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-[#0d2a20] hover:bg-slate-100 transition-colors text-[10px] font-bold shadow-sm">
                              <Car size={12} /> Request Uber Health
                            </button>
                          </div>
                        ) : (
                          <div className="p-3 bg-white/10 rounded-xl space-y-2">
                            <div className="flex justify-between items-center text-[10px] font-bold">
                              <span className="text-white flex items-center gap-1"><Car size={12} className="text-[#c58739]"/> Uber En Route</span>
                              <span className="text-[#c58739]">Arriving in 3 mins</span>
                            </div>
                            <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
                              <div className="h-full bg-[#c58739] w-[75%] rounded-full animate-pulse" />
                            </div>
                            <div className="text-[9px] text-[#a3b899] flex justify-between">
                              <span>Pickup: Home</span>
                              <span>Dropoff: Clinic</span>
                            </div>
                          </div>
                        )}
                        <div className="flex gap-3 mt-1">
                          <button onClick={() => { setSelectedDoctor(doctors.find(d => d.user.name === nextAppt.doctor.user.name) || null); setActiveNav('find-doctor'); }} className="flex-1 py-2 text-xs font-bold rounded-lg bg-[#c58739] text-[#0d2a20] hover:bg-[#d4994d] transition-colors text-center">
                            Symptom form
                          </button>
                          <button onClick={() => downloadICS(nextAppt.id)} className="flex-1 py-2 text-xs font-bold rounded-lg border border-[#a3b899]/30 text-white hover:bg-white/5 transition-colors text-center">
                            Download Invite
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Symptom Notification Alert */}
                  {nextAppt && !nextAppt.symptomForm && (
                    <div className="p-4 rounded-xl flex items-center justify-between bg-white border border-slate-100 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-500 shrink-0">
                          <AlertCircle size={16} />
                        </div>
                        <div className="text-xs text-slate-600">
                          <strong className="text-slate-800 block">Your symptom form is still open</strong>
                          <span>Sharing this before Friday helps {nextAppt.doctor.user.name.split(' ').pop()} prepare — it takes about 2 minutes.</span>
                        </div>
                      </div>
                      <button onClick={() => { setSelectedDoctor(doctors.find(d => d.user.name === nextAppt.doctor.user.name) || null); setActiveNav('find-doctor'); }} className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#0d2a20] text-white hover:bg-emerald-950 transition-colors">
                        Fill in now
                      </button>
                    </div>
                  )}

                  {/* Past Visits Section */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-extrabold tracking-wider text-slate-500 uppercase">Past visits</h3>
                    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm divide-y divide-slate-100">
                      {pastAppts.slice(0, 4).map(appt => (
                        <div key={appt.id} className="p-4 flex items-center justify-between">
                          <div className="flex items-start gap-4">
                            <div className="text-center shrink-0">
                              <span className="text-base font-bold text-slate-800 block leading-none">{new Date(appt.slotStart).getDate()}</span>
                              <span className="text-[9px] text-slate-400 font-extrabold uppercase mt-0.5 block">{new Date(appt.slotStart).toLocaleDateString('en-US', { month: 'short' })}</span>
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-slate-800">{appt.doctor.user.name}</h4>
                              <p className="text-[10px] text-slate-500 mt-0.5">Cardiology · Consultation</p>
                            </div>
                          </div>

                          <span className={`px-2.5 py-1 text-[9px] font-extrabold rounded-full ${
                            appt.status === 'COMPLETED'
                              ? 'bg-green-50 text-green-700 border border-green-100'
                              : 'bg-slate-50 text-slate-500 border border-slate-100'
                          }`}>
                            {appt.status === 'COMPLETED' ? 'Completed' : appt.status}
                          </span>
                        </div>
                      ))}
                      {pastAppts.length === 0 && (
                        <div className="p-6 text-center text-slate-400 text-xs">No past appointment history.</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column: Pre-visit summary, medications, quick actions */}
                <div className="w-80 flex-shrink-0 flex flex-col gap-6 overflow-y-auto pr-1">

                  {/* Wearable Vitals Sync Card */}
                  <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="text-[9px] font-extrabold tracking-wider text-slate-400 uppercase">Vitals Sync</h4>
                      <span className="flex items-center gap-1 text-[8px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                        <Activity size={8} className="animate-pulse" /> Live
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-rose-50/50 border border-rose-100 rounded-xl">
                        <div className="flex justify-between items-start">
                          <HeartPulse size={14} className="text-rose-500" />
                          <span className="text-[10px] font-black text-rose-700">BPM</span>
                        </div>
                        <div className="mt-2 text-xl font-black text-slate-800">68</div>
                        <div className="text-[9px] text-slate-400 font-bold mt-1">Resting Heart Rate</div>
                      </div>
                      <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl">
                        <div className="flex justify-between items-start">
                          <Activity size={14} className="text-blue-500" />
                          <span className="text-[10px] font-black text-blue-700">SpO2</span>
                        </div>
                        <div className="mt-2 text-xl font-black text-slate-800">98%</div>
                        <div className="text-[9px] text-slate-400 font-bold mt-1">Blood Oxygen</div>
                      </div>
                    </div>
                    
                    <div className="text-[9px] text-center font-bold text-slate-400 flex items-center justify-center gap-1">
                      <CheckCircle size={10} className="text-green-500" /> Apple Health Synced: 3 mins ago
                    </div>
                  </div>
                  
                  {/* Pre-Visit Summary Card */}
                  {nextAppt && nextAppt.preVisitSummary && (
                    <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm space-y-3">
                      <h4 className="text-[9px] font-extrabold tracking-wider text-slate-400 uppercase">Pre-visit Summary Status</h4>
                      <div className="p-3 bg-red-50/50 border border-red-100 text-red-800 rounded-xl text-xs flex gap-2">
                        <span className="text-red-500 mt-0.5">●</span>
                        <span>Last symptom review flagged as <strong className="font-extrabold text-red-900">{nextAppt.preVisitSummary.urgencyLevel.toLowerCase()} urgency</strong> — visible to {nextAppt.doctor.user.name.split(' ').pop()} ahead of visit.</span>
                      </div>
                      <button onClick={() => { setActiveDetailsAppt(nextAppt); setActiveNav('bookings'); }} className="flex justify-between items-center w-full pt-1 text-[11px] font-bold text-[#0d2a20] hover:underline">
                        <span>View full summary</span>
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  )}

                  {/* Wellness Adherence Card */}
                  <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm space-y-3">
                    <h4 className="text-[9px] font-extrabold tracking-wider text-slate-400 uppercase">Wellness Tracker</h4>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-700">Medication Adherence</span>
                      <span className="text-sm font-black text-[#0d2a20] font-mono">{getAdherenceRate()}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-[#0d2a20] h-1.5 rounded-full transition-all duration-300" style={{ width: `${getAdherenceRate()}%` }} />
                    </div>
                    <p className="text-[9px] font-bold text-[#c58739] uppercase tracking-wide">
                      {getAdherenceRate() >= 90 ? '● Optimal Compliance' : '● Needs Compliance Focus'}
                    </p>
                  </div>

                  {/* Today's Medications */}
                  <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm space-y-3">
                    <h4 className="text-[9px] font-extrabold tracking-wider text-slate-400 uppercase">Today's Medication</h4>
                    <div className="space-y-3">
                      {reminders.slice(0, 3).map(rem => {
                        const isTaken = !!takenMeds[rem.id];
                        const pillColor = rem.medicine.toLowerCase().includes('atorvastatin') ? 'bg-blue-400' : 
                                          rem.medicine.toLowerCase().includes('lisinopril') ? 'bg-orange-400' : 'bg-slate-200';
                        const pillShape = rem.medicine.toLowerCase().includes('atorvastatin') ? 'rounded-full w-2.5 h-4' : 'rounded-full w-3.5 h-3.5';

                        return (
                          <div key={rem.id} className="flex justify-between items-center pb-2.5 border-b border-slate-100 last:border-0 last:pb-0">
                            <div className="flex items-center gap-2.5">
                              <button
                                type="button"
                                onClick={() => setTakenMeds(prev => ({ ...prev, [rem.id]: !isTaken }))}
                                className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                                  isTaken ? 'bg-[#0d2a20] border-[#0d2a20] text-white' : 'border-slate-300 hover:border-slate-400 bg-white'
                                }`}
                              >
                                {isTaken && <span className="text-[9px] font-bold leading-none">✓</span>}
                              </button>
                              <div className="flex items-center gap-2">
                                <div className={`shrink-0 ${pillShape} ${pillColor} shadow-inner opacity-80`} />
                                <div>
                                  <div className={`text-xs font-bold ${isTaken ? 'line-through text-slate-400' : 'text-slate-800'}`}>{rem.medicine}</div>
                                  <div className="text-[10px] text-slate-400 mt-0.5">Daily dosage · after breakfast</div>
                                </div>
                              </div>
                            </div>
                            <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-[#f7f6f0] text-slate-600 font-mono">
                              {new Date(rem.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        );
                      })}
                      {reminders.length === 0 && (
                        <div className="text-center text-[10px] text-slate-400 py-2">No active medications scheduled.</div>
                      )}
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm space-y-3">
                    <h4 className="text-[9px] font-extrabold tracking-wider text-slate-400 uppercase">Quick Actions</h4>
                    <div className="space-y-2 text-xs font-bold text-slate-700">
                      {nextAppt && (
                        <button onClick={() => downloadICS(nextAppt.id)} className="flex justify-between items-center w-full py-1.5 hover:text-[#0d2a20] border-b border-slate-100">
                          <span>Download visit summary (ICS)</span>
                          <ChevronRight size={14} className="text-slate-400" />
                        </button>
                      )}
                      <button onClick={() => setActiveNav('profile')} className="flex justify-between items-center w-full py-1.5 hover:text-[#0d2a20] border-b border-slate-100">
                        <span>Connect Google Calendar</span>
                        <ChevronRight size={14} className="text-slate-400" />
                      </button>
                      <button onClick={() => setActiveNav('profile')} className="flex justify-between items-center w-full py-1.5 hover:text-[#0d2a20] border-b border-slate-100">
                        <span>Message clinic support</span>
                        <MessageSquare size={14} className="text-slate-400" />
                      </button>
                      <button onClick={() => setActiveNav('profile')} className="flex justify-between items-center w-full py-1.5 hover:text-[#0d2a20]">
                        <span>Update contact details</span>
                        <ChevronRight size={14} className="text-slate-400" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* MY BOOKINGS TAB */}
            {activeNav === 'bookings' && (
              <motion.div
                key="bookings"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-grow flex p-6 gap-6 overflow-hidden"
              >
                {/* List */}
                <div className="flex-1 flex flex-col bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                  <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-[#fcfbfa]">
                    <span className="font-extrabold text-sm text-[#0d2a20]">Appointment History</span>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                    {appointments.map(appt => (
                      <div
                        key={appt.id}
                        onClick={() => setActiveDetailsAppt(appt)}
                        className="flex items-center justify-between px-5 py-3.5 cursor-pointer transition-all"
                        style={{
                          background: activeDetailsAppt?.id === appt.id ? '#f7f6f0' : 'transparent',
                          borderLeft: activeDetailsAppt?.id === appt.id ? '3px solid #0d2a20' : '3px solid transparent',
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-slate-50 border border-slate-200 text-[#0d2a20]">
                            <Stethoscope size={14} />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-800">{appt.doctor.user.name}</div>
                            <div className="text-[10px] flex gap-2 text-slate-400 mt-0.5">
                              <span>{new Date(appt.slotStart).toLocaleDateString('en-IN')}</span>
                              <span>·</span>
                              <span>{new Date(appt.slotStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </div>
                        </div>

                        <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-full ${
                          appt.status === 'COMPLETED' ? 'bg-green-50 text-green-700 border border-green-100' :
                          appt.status === 'CANCELLED' ? 'bg-red-50 text-red-700 border border-red-100' :
                          'bg-blue-50 text-blue-700 border border-blue-100'
                        }`}>
                          {appt.status}
                        </span>
                      </div>
                    ))}
                    {appointments.length === 0 && (
                      <div className="p-10 text-center text-slate-400 text-xs">No appointment bookings found.</div>
                    )}
                  </div>
                </div>

                {/* Details view */}
                <div className="w-80 flex-shrink-0 overflow-y-auto">
                  <AnimatePresence mode="wait">
                    {activeDetailsAppt ? (
                      <motion.div
                        key={activeDetailsAppt.id}
                        initial={{ opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        className="rounded-2xl p-5 space-y-4 bg-white border border-slate-100 shadow-sm"
                      >
                        <div>
                          <h3 className="font-bold text-sm text-[#0d2a20] font-serif">{activeDetailsAppt.doctor.user.name}</h3>
                          <p className="text-[10px] text-slate-400 mt-0.5">{activeDetailsAppt.doctor.user.email}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{new Date(activeDetailsAppt.slotStart).toLocaleString()}</p>
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={() => downloadICS(activeDetailsAppt.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                              <Download size={10} /> Calendar Invite
                            </button>
                            {activeDetailsAppt.status === 'CONFIRMED' && (
                              <button
                                onClick={() => handleCancelBooking(activeDetailsAppt.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold border border-red-100 text-red-500 hover:bg-red-50/50 transition-colors"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </div>

                        {activeDetailsAppt.symptomForm && (
                          <div className="p-3.5 rounded-xl space-y-1 bg-[#f7f6f0]/60 border border-slate-200">
                            <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Symptoms</span>
                            <p className="text-[11px] leading-relaxed text-slate-600 font-medium">{activeDetailsAppt.symptomForm.symptomsText}</p>
                          </div>
                        )}

                        {activeDetailsAppt.postVisitSummary && (
                          <div className="p-3.5 rounded-xl space-y-2.5 bg-green-50/40 border border-green-100">
                            <div className="flex items-center gap-1.5">
                              <FileText size={12} className="text-green-700" />
                              <span className="text-[9px] font-bold text-green-700">AI Patient Summary</span>
                            </div>
                            <p className="text-[10px] leading-relaxed text-slate-600">{activeDetailsAppt.postVisitSummary.patientFriendlyText}</p>
                            {activeDetailsAppt.postVisitSummary.medicationSchedule?.length > 0 && (
                              <div className="space-y-1 mt-2">
                                <span className="text-[9px] font-bold text-slate-500 uppercase">Medication Regimen</span>
                                {activeDetailsAppt.postVisitSummary.medicationSchedule.map((med: any, i: number) => (
                                  <div key={i} className="flex justify-between items-center p-1.5 rounded bg-white border border-slate-100 shadow-sm">
                                    <span className="text-[10px] font-bold text-slate-700">{med.medicine}</span>
                                    <span className="text-[10px] text-teal-600 font-semibold">{med.dosage}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </motion.div>
                    ) : (
                      <div className="rounded-2xl p-5 flex flex-col items-center justify-center gap-2 text-center h-40 bg-white border border-slate-100 shadow-sm">
                        <FileText size={18} className="text-slate-400" />
                        <p className="text-[10px] text-slate-500">Select an appointment record to inspect summaries and download files.</p>
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}

            {/* MEDICATIONS TAB */}
            {activeNav === 'medications' && (
              <motion.div
                key="medications"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-grow p-6 overflow-y-auto"
              >
                <div className="max-w-xl space-y-3">
                  <h2 className="text-base font-bold font-serif text-[#0d2a20] mb-4">Medication Reminders</h2>
                  
                  {reminders.map(rem => (
                    <div
                      key={rem.id}
                      className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm transition-all"
                      style={{ opacity: rem.sent ? 0.6 : 1 }}
                    >
                      <div className="flex items-center gap-3">
                        {rem.sent ? (
                          <CheckCircle size={16} className="text-green-600" />
                        ) : (
                          <Activity size={16} className="animate-pulse text-[#0d2a20]" />
                        )}
                        <div>
                          <p className={`text-xs font-bold ${rem.sent ? 'line-through text-slate-400' : 'text-slate-800'}`}>Take {rem.medicine}</p>
                          <p className="text-[9px] text-slate-400 mt-0.5">Scheduled: {new Date(rem.scheduledTime).toLocaleString()}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleToggleReminder(rem.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-[#f7f6f0] text-slate-700 border border-slate-200 hover:bg-slate-100"
                      >
                        {rem.sent ? 'Taken' : 'Mark Taken'}
                      </button>
                    </div>
                  ))}
                  {reminders.length === 0 && (
                    <div className="p-6 text-center text-slate-400 text-xs">No active medication logs found.</div>
                  )}
                </div>
              </motion.div>
            )}

            {/* FIND A DOCTOR TAB */}
            {activeNav === 'find-doctor' && (
              <motion.div
                key="find-doctor"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-grow flex p-6 gap-6 overflow-hidden"
              >
                {/* Doctors List */}
                <div className="flex-1 flex flex-col bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                  <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-[#fcfbfa]">
                    <span className="text-xs font-bold text-slate-800">Select a Doctor for Booking</span>
                    
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search doctor..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && searchDoctors()}
                        className="pl-8 pr-2 py-1 text-[11px] rounded-lg outline-none border border-slate-200 bg-white"
                        style={{ width: '150px' }}
                      />
                    </div>
                  </div>

                  <div className="grid text-[9px] font-extrabold uppercase tracking-wider px-5 py-2 text-slate-500 border-b border-slate-100 bg-slate-50/50">
                    <div className="grid items-center gap-2" style={{ gridTemplateColumns: '32px minmax(120px, 1fr) 100px 70px 50px 30px' }}>
                      <span>Photo</span><span>Name</span><span>Specialization</span><span>Fee</span><span>Slot</span><span></span>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                    {doctors.map(doc => {
                      const isSelected = selectedDoctor?.userId === doc.userId;
                      return (
                        <div
                          key={doc.userId}
                          onClick={() => { setSelectedDoctor(doc); setAvailableSlots([]); setSelectedSlot(null); }}
                          className="px-5 py-3 cursor-pointer transition-all hover:bg-slate-50/50"
                          style={{
                            background: isSelected ? '#f7f6f0' : 'transparent',
                            borderLeft: isSelected ? '3px solid #0d2a20' : '3px solid transparent',
                          }}
                        >
                          <div className="grid items-center gap-2 text-xs" style={{ gridTemplateColumns: '32px minmax(120px, 1fr) 100px 70px 50px 30px' }}>
                            <div className="w-6.5 h-6.5 rounded-full flex items-center justify-center text-[10px] font-bold bg-[#c58739] text-[#0d2a20] shrink-0">
                              {doc.user.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-bold text-slate-800">{doc.user.name}</div>
                              <div className="text-[9px] text-slate-400 mt-0.5">+15y AIIMS</div>
                            </div>
                            <span className="font-semibold text-slate-600">{doc.specialization}</span>
                            <span className="font-extrabold text-[#0d2a20]">₹{doc.consultationFee}</span>
                            <span className="text-slate-400">{doc.slotDurationMinutes}m</span>
                            <button className="text-slate-400 hover:text-[#0d2a20] justify-self-center">
                              <Info size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right side Detail / Date-Slot Picker */}
                <div className="w-80 flex-shrink-0 overflow-y-auto">
                  <AnimatePresence mode="wait">
                    {selectedDoctor ? (
                      <motion.div
                        key={selectedDoctor.userId}
                        initial={{ opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        className="rounded-2xl p-5 space-y-4 bg-white border border-slate-100 shadow-sm"
                      >
                        <div>
                          <h3 className="font-bold text-sm text-[#0d2a20] font-serif">{selectedDoctor.user.name}</h3>
                          <div className="flex flex-wrap gap-1 mt-1">
                            <span className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-50 text-[#0d2a20] border border-emerald-100">
                              {selectedDoctor.specialization}
                            </span>
                            <span className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-50 text-slate-500 border border-slate-100">
                              15y Exp
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">{selectedDoctor.bio || 'Experienced clinical consultation.'}</p>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Select Date</label>
                          <input
                            type="date"
                            value={selectedDate}
                            onChange={e => setSelectedDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            className="w-full px-3 py-1.5 rounded-lg text-xs outline-none border border-slate-200 bg-white"
                          />
                        </div>

                        {selectedDate && (
                          <div className="space-y-2">
                            <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Available Slots</label>
                            {slotsLoading ? (
                              <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin text-[#0d2a20]" /></div>
                            ) : (
                              <div className="grid grid-cols-3 gap-1.5 max-h-32 overflow-y-auto pr-1">
                                {availableSlots.map((slot, i) => (
                                  <button
                                    key={i}
                                    onClick={() => handleHoldSlot(slot)}
                                    className="py-1 rounded-lg text-[9px] font-bold border transition-all"
                                    style={{
                                      background: selectedSlot?.start === slot.start ? '#0d2a20' : '#f7f6f0',
                                      color: selectedSlot?.start === slot.start ? 'white' : 'text-slate-700',
                                      borderColor: selectedSlot?.start === slot.start ? '#0d2a20' : 'transparent',
                                    }}
                                  >
                                    {new Date(slot.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                                  </button>
                                ))}
                                {availableSlots.length === 0 && (
                                  <div className="col-span-3 text-center py-3 text-[10px] text-slate-400">No slots available.</div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </motion.div>
                    ) : (
                      <div className="rounded-2xl p-5 flex flex-col items-center justify-center gap-2 text-center h-40 bg-white border border-slate-100 shadow-sm">
                        <Stethoscope size={18} className="text-slate-400" />
                        <p className="text-[10px] text-slate-500 font-medium">Select a doctor from the directory table to inspect availability and book.</p>
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}

            {/* BILLING TAB */}
            {activeNav === 'billing' && (
              <motion.div
                key="billing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-grow p-6 overflow-y-auto"
              >
                <div className="max-w-2xl bg-white border border-slate-100 rounded-3xl p-6 space-y-6 shadow-sm">
                  <h3 className="font-bold font-serif text-[#0d2a20] text-sm">AI Medical Bill Explainer</h3>
                  
                  <div className="p-4 bg-[#f7f6f0] border border-slate-200 rounded-2xl flex gap-6">
                    <div className="flex-1 space-y-4">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Invoice #INV-2026-08A</span>
                        <h4 className="text-sm font-bold text-slate-800">Cardiology Checkup</h4>
                        <p className="text-[10px] text-slate-500 mt-0.5">Aug 20, 2026 · Dr. Amit Verma</p>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs border-b border-slate-200 pb-2">
                          <span className="text-slate-600 line-through">CPT 99214 (₹1500)</span>
                          <span className="font-bold text-[#0d2a20]">Translated: 25-minute checkup</span>
                        </div>
                        <div className="flex justify-between items-center text-xs border-b border-slate-200 pb-2">
                          <span className="text-slate-600 line-through">CPT 93000 (₹450)</span>
                          <span className="font-bold text-[#0d2a20]">Translated: Routine ECG Test</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="w-40 flex flex-col items-center justify-center bg-white p-4 rounded-xl border border-slate-100 shadow-sm text-center">
                      <div className="text-2xl font-black text-[#0d2a20]">₹390</div>
                      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-3">Your Responsibility</div>
                      <svg viewBox="0 0 36 36" className="w-16 h-16 transform -rotate-90">
                        <path strokeDasharray="100, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#f1f5f9" strokeWidth="4" />
                        <path strokeDasharray="80, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#22c55e" strokeWidth="4" />
                      </svg>
                      <div className="text-[9px] font-bold text-green-600 mt-2">80% Covered by Aetna</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* PROFILE TAB */}
            {activeNav === 'calendar' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="flex-grow p-6 space-y-6 overflow-y-auto"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold font-serif text-[#0d2a20]">Calendar Sync</h2>
                    <p className="text-xs text-slate-500 mt-1">Manage your appointment schedule and external calendar integrations.</p>
                  </div>
                  <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0d2a20] hover:bg-[#1a4233] text-white font-bold text-xs transition-colors shadow-sm">
                    <Calendar size={14} />
                    Sync with Google Calendar
                  </button>
                </div>
                
                <div className="bg-white border border-slate-100 rounded-3xl p-8 text-center shadow-sm">
                  <div className="w-16 h-16 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto mb-4">
                    <Calendar className="text-blue-600" size={28} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-2">Calendar Sync Active</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mb-6 leading-relaxed">
                    Your MediSync appointments are currently syncing with your external calendar. You will receive notifications before your scheduled visits.
                  </p>
                  
                  <div className="max-w-2xl mx-auto text-left mt-8 space-y-3">
                    <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-4">Upcoming Schedule</h4>
                    {appointments.filter(a => new Date(a.slotStart) > new Date()).map(appt => (
                      <div key={appt.id} className="p-4 rounded-2xl bg-slate-50/50 border border-slate-100 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-white flex flex-col items-center justify-center text-[#0d2a20] border border-slate-200 shadow-sm">
                            <span className="text-[9px] font-bold uppercase text-slate-500">{new Date(appt.slotStart).toLocaleDateString('en-US', { month: 'short' })}</span>
                            <span className="text-lg font-black leading-none mt-0.5">{new Date(appt.slotStart).getDate()}</span>
                          </div>
                          <div>
                            <div className="font-bold text-slate-800 text-sm">{appt.doctor.user.name}</div>
                            <div className="text-[10px] text-slate-400 font-medium mt-0.5">{new Date(appt.slotStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                          </div>
                        </div>
                        <button className="px-4 py-1.5 rounded-lg text-[10px] font-bold border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors bg-white shadow-sm">
                          View Details
                        </button>
                      </div>
                    ))}
                    {appointments.filter(a => new Date(a.slotStart) > new Date()).length === 0 && (
                      <div className="text-center py-8 text-[11px] text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">No upcoming appointments in your calendar.</div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeNav === 'analytics' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="flex-grow p-6 space-y-6 overflow-y-auto"
              >
                <div>
                  <h2 className="text-xl font-bold font-serif text-[#0d2a20]">Health Analytics</h2>
                  <p className="text-xs text-slate-500 mt-1">Track your vital signs, medication adherence, and wellness trends.</p>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Adherence Chart */}
                  <div className="lg:col-span-2 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
                    <div className="flex justify-between items-start mb-8">
                      <div>
                        <h3 className="text-sm font-bold text-slate-800">Medication Adherence Trend</h3>
                        <p className="text-[10px] text-slate-400 mt-0.5">Past 30 days compliance</p>
                      </div>
                      <div className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-extrabold tracking-wide border border-emerald-100">
                        {getAdherenceRate()}% Overall
                      </div>
                    </div>
                    <div className="h-40 flex items-end justify-between gap-3 px-2">
                      {/* Fake bars for adherence trend */}
                      {[60, 80, 100, 90, 70, 100, 100, 90, 80, 100].map((val, i) => (
                        <div key={i} className="w-full bg-slate-50 rounded-t-sm relative group h-full flex items-end">
                          <div 
                            className={`w-full rounded-t-sm transition-all duration-500 ${val === 100 ? 'bg-emerald-400' : val >= 80 ? 'bg-blue-400' : 'bg-rose-400'}`}
                            style={{ height: `${val}%` }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Vitals Summary */}
                  <div className="space-y-6">
                    <div className="bg-gradient-to-br from-rose-50 to-white border border-rose-100 rounded-3xl p-6 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <HeartPulse className="text-rose-500" size={20} />
                        <span className="text-[9px] text-rose-700 font-bold bg-rose-100 px-2 py-0.5 rounded tracking-wide uppercase">Stable</span>
                      </div>
                      <div className="text-3xl font-black text-slate-800 mb-1">72 <span className="text-sm text-rose-500 font-bold">bpm</span></div>
                      <div className="text-[10px] text-slate-500 font-medium">Avg Resting Heart Rate</div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-blue-50 to-white border border-blue-100 rounded-3xl p-6 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <Activity className="text-blue-500" size={20} />
                        <span className="text-[9px] text-blue-700 font-bold bg-blue-100 px-2 py-0.5 rounded tracking-wide uppercase">Optimal</span>
                      </div>
                      <div className="text-3xl font-black text-slate-800 mb-1">98<span className="text-sm text-blue-500 font-bold">%</span></div>
                      <div className="text-[10px] text-slate-500 font-medium">Avg Blood Oxygen</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeNav === 'profile' && (
              <motion.div
                key="profile"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-grow p-6 overflow-y-auto"
              >
                <div className="max-w-md bg-white border border-slate-100 rounded-3xl p-6 space-y-6 shadow-sm">
                  <h3 className="font-bold font-serif text-[#0d2a20] text-sm">Profile Details</h3>
                  <div className="space-y-4">
                    <div className="flex gap-4 items-center">
                      <div className="w-12 h-12 rounded-full bg-[#c58739] text-[#0d2a20] flex items-center justify-center text-lg font-bold">
                        {user?.name?.charAt(0) || 'M'}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-800">{user?.name}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{user?.email}</div>
                      </div>
                    </div>

                    <div className="space-y-2.5 pt-4 border-t border-slate-100">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Integrations</h4>
                      <p className="text-xs text-slate-500">Enable calendar synchronization to auto-populate scheduled consultations.</p>
                      
                      <button onClick={() => alert('Google sync connected.')} className="px-4 py-2 border border-slate-300 bg-white rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2 text-slate-700">
                        <span>Connect Google Calendar</span>
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </main>

      {/* SYMPTOM HOLD MODAL */}
      <AnimatePresence>
        {holdDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white border border-slate-100 rounded-3xl p-6 shadow-xl space-y-4 text-slate-800"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-base font-bold font-serif text-[#0d2a20]">Symptom Intake Assessment</h3>
                <span className="px-2 py-0.5 rounded bg-red-50 border border-red-100 text-red-600 font-mono text-[10px] font-bold">
                  0:{remainingTime.toString().padStart(2, '0')}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-orange-50/50 border border-orange-100 text-orange-800 text-[11px] leading-relaxed">
                Slot locked successfully! Complete the symptom assessment form below to finalize registration.
              </div>

              <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="text-[10px] font-bold text-slate-700">Interactive Symptom Heatmap</h4>
                  <p className="text-[9px] text-slate-500">Tap regions to indicate pain intensity.</p>
                </div>
                <div className="flex gap-2">
                  <svg width="60" height="90" viewBox="0 0 60 90" className="cursor-pointer">
                    <circle cx="30" cy="15" r="8" fill={getHeatmapColor(heatmapLevels.Head)} onClick={() => toggleHeatmap('Head')} />
                    <rect x="22" y="25" width="16" height="25" rx="5" fill={getHeatmapColor(heatmapLevels.Chest)} onClick={() => toggleHeatmap('Chest')} />
                    <rect x="22" y="52" width="16" height="20" rx="5" fill={getHeatmapColor(heatmapLevels.Abdomen)} onClick={() => toggleHeatmap('Abdomen')} />
                    <rect x="12" y="25" width="8" height="40" rx="4" fill={getHeatmapColor(heatmapLevels.Arms)} onClick={() => toggleHeatmap('Arms')} />
                    <rect x="40" y="25" width="8" height="40" rx="4" fill={getHeatmapColor(heatmapLevels.Arms)} onClick={() => toggleHeatmap('Arms')} />
                    <rect x="22" y="74" width="7" height="16" rx="3" fill={getHeatmapColor(heatmapLevels.Legs)} onClick={() => toggleHeatmap('Legs')} />
                    <rect x="31" y="74" width="7" height="16" rx="3" fill={getHeatmapColor(heatmapLevels.Legs)} onClick={() => toggleHeatmap('Legs')} />
                  </svg>
                </div>
              </div>

              <form onSubmit={(e) => {
                const mapStr = Object.entries(heatmapLevels).filter(([_, v]) => v > 0).map(([k, v]) => `${k}:${v === 1 ? 'Mild' : v === 2 ? 'Moderate' : 'Severe'}`).join(', ');
                if (mapStr) setSymptomsText(`[Heatmap: ${mapStr}] ` + symptomsText);
                handleConfirmBooking(e);
              }} className="space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Describe your symptoms</label>
                    <button
                      type="button"
                      onClick={toggleSpeechRecognition}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold border transition-colors ${
                        isRecording 
                          ? 'bg-red-50 text-red-600 border-red-200 animate-pulse' 
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {isRecording ? <MicOff size={10} className="text-red-500" /> : <Mic size={10} />}
                      <span>{isRecording ? 'Listening...' : 'Dictate Symptoms'}</span>
                    </button>
                  </div>
                  <textarea
                    required
                    rows={4}
                    value={symptomsText}
                    onChange={e => setSymptomsText(e.target.value)}
                    placeholder="Provide details about pain, frequency, severity..."
                    className="w-full px-3 py-2 bg-[#f7f6f0] border border-slate-200 outline-none rounded-xl text-xs leading-relaxed text-slate-700 focus:border-[#0d2a20] transition-colors resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => { setHoldDetails(null); setSelectedSlot(null); }} className="flex-1 py-2 rounded-xl text-xs font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={confirmLoading} className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-[#0d2a20] hover:bg-emerald-950 transition-all flex items-center justify-center gap-1.5 shadow-md shadow-emerald-900/10">
                    {confirmLoading ? <Loader2 size={13} className="animate-spin text-white" /> : <span>Confirm Booking</span>}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
