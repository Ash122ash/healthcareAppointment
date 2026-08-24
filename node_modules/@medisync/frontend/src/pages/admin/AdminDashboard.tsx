import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Stethoscope, Calendar, AlertOctagon, Plus, Loader2,
  Trash2, LogOut, ShieldAlert, Sliders, Database, LayoutGrid, Check, Ban
} from 'lucide-react';

interface Stats {
  totalPatients: number;
  totalDoctors: number;
  todayAppointments: number;
  pendingFailedNotifications: number;
}

interface Patient {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
}

interface Doctor {
  userId: string;
  specialization: string;
  bio: string;
  workingHours: any;
  slotDurationMinutes: number;
  consultationFee: number;
  user: {
    name: string;
    email: string;
    phone: string | null;
  };
}

interface FailedLog {
  id: string;
  toEmail: string;
  type: string;
  status: string;
  retryCount: number;
  payload: any;
  createdAt: string;
}

interface Appointment {
  id: string;
  patient: { name: string; email: string };
  doctor: { user: { name: string } };
  slotStart: string;
  status: string;
}

type NavKey = 'overview' | 'doctors' | 'patients' | 'appointments' | 'resources' | 'moderation' | 'failed-alerts';

const NAV = [
  { key: 'overview' as NavKey,      icon: Users,        label: 'Overview'           },
  { key: 'appointments' as NavKey,  icon: Calendar,     label: 'All Appointments'   },
  { key: 'doctors' as NavKey,       icon: Stethoscope,  label: 'Doctor Profiles'    },
  { key: 'patients' as NavKey,      icon: Users,        label: 'Patient Directory'  },
  { key: 'resources' as NavKey,     icon: LayoutGrid,   label: 'Live Resources'     },
  { key: 'moderation' as NavKey,    icon: ShieldAlert,  label: 'Spam Moderation'    },
  { key: 'failed-alerts' as NavKey, icon: AlertOctagon, label: 'Failed Alerts'      },
];

// MOCK DATA for new features
const MOCK_RESOURCES = [
  { id: 'r1', name: 'MRI Machine 1', type: 'Equipment', status: 'IN USE', department: 'Radiology' },
  { id: 'r2', name: 'Consultation Rm A', type: 'Room', status: 'AVAILABLE', department: 'Cardiology' },
  { id: 'r3', name: 'Consultation Rm B', type: 'Room', status: 'MAINTENANCE', department: 'Pediatrics' },
  { id: 'r4', name: 'Ultrasound', type: 'Equipment', status: 'IN USE', department: 'OBGYN' },
  { id: 'r5', name: 'Operating Theater 1', type: 'Room', status: 'IN USE', department: 'Surgery' },
  { id: 'r6', name: 'Blood Draw Station', type: 'Room', status: 'AVAILABLE', department: 'Pathology' }
];

const MOCK_SPAM = [
  { id: 's1', type: 'SUSPICIOUS_BOOKING', user: 'johndoe_fake@xyz.com', reason: 'High velocity booking attempt (5 in 1 min)', risk: 'HIGH' },
  { id: 's2', type: 'INAPPROPRIATE_TEXT', user: 'anon991@mail.com', reason: 'Symptom description contains profanity/spam links', risk: 'MEDIUM' },
  { id: 's3', type: 'BOT_ACCOUNT', user: 'bot_test_x@crypto.com', reason: 'Failed CAPTCHA pattern analysis during signup', risk: 'HIGH' }
];

export default function AdminDashboard() {
  const { logout, apiFetch } = useAuth();
  const [activeNav, setActiveNav] = useState<NavKey>('overview');
  const [stats, setStats] = useState<Stats | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [failedLogs, setFailedLogs] = useState<FailedLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Spam Moderation State
  const [spamQueue, setSpamQueue] = useState(MOCK_SPAM);

  // Form states for creating a doctor
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDoc, setNewDoc] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    specialization: 'Cardiology',
    bio: '',
    consultationFee: '100',
    slotDurationMinutes: '30',
  });
  const [createError, setCreateError] = useState<string | null>(null);
  const [createLoading, setCreateLoading] = useState(false);

  // System Configuration States
  const [maintenanceMode, setMaintenanceMode] = useState<boolean>(() => {
    return localStorage.getItem('medisync_maintenance_mode') === 'true';
  });
  const [holdTimeout, setHoldTimeout] = useState<number>(() => {
    return parseInt(localStorage.getItem('medisync_hold_timeout') || '90');
  });
  const [aiFallback, setAiFallback] = useState<boolean>(() => {
    return localStorage.getItem('medisync_ai_fallback') === 'true';
  });

  useEffect(() => {
    fetchData();
  }, [activeNav]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeNav === 'overview') {
        const res = await apiFetch('/admin/stats');
        const data = await res.json();
        if (res.ok) setStats(data.stats);
      } else if (activeNav === 'patients') {
        const res = await apiFetch('/admin/patients');
        const data = await res.json();
        if (res.ok) setPatients(data.patients);
      } else if (activeNav === 'doctors') {
        const res = await apiFetch('/admin/doctors');
        const data = await res.json();
        if (res.ok) setDoctors(data.doctors);
      } else if (activeNav === 'failed-alerts') {
        const res = await apiFetch('/admin/notifications/failed');
        const data = await res.json();
        if (res.ok) setFailedLogs(data.logs);
      } else if (activeNav === 'appointments') {
        const res = await apiFetch('/admin/appointments');
        const data = await res.json();
        if (res.ok) setAppointments(data.appointments);
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleMaintenance = () => {
    const next = !maintenanceMode;
    setMaintenanceMode(next);
    localStorage.setItem('medisync_maintenance_mode', String(next));
  };

  const handleTimeoutChange = (val: number) => {
    setHoldTimeout(val);
    localStorage.setItem('medisync_hold_timeout', String(val));
  };

  const toggleAiFallback = () => {
    const next = !aiFallback;
    setAiFallback(next);
    localStorage.setItem('medisync_ai_fallback', String(next));
  };

  const deleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this user and all associated records?')) {
      return;
    }
    try {
      // Optimistic update
      setDoctors((prev) => prev.filter((d) => d.userId !== userId));
      setPatients((prev) => prev.filter((p) => p.id !== userId));
      
      const res = await apiFetch(`/admin/users/${userId}`, { method: 'DELETE' });
      if (!res.ok) {
        const errorData = await res.json();
        alert(`Failed to delete user: ${errorData.message || 'Unknown error'}`);
        fetchData(); // Revert optimistic update
      }
    } catch (err) {
      console.error('Error deleting user:', err);
      alert('An error occurred while deleting the user.');
      fetchData(); // Revert optimistic update
    }
  };

  const handleCreateDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreateLoading(true);
    try {
      const mockWorkingHours = [
        { weekday: 1, start: '09:00', end: '17:00' },
        { weekday: 2, start: '09:00', end: '17:00' },
        { weekday: 3, start: '09:00', end: '17:00' },
        { weekday: 4, start: '09:00', end: '17:00' },
        { weekday: 5, start: '09:00', end: '17:00' },
      ];
      const res = await apiFetch('/admin/doctors', {
        method: 'POST',
        body: JSON.stringify({ ...newDoc, workingHours: mockWorkingHours }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create doctor profile.');
      
      setShowCreateModal(false);
      setNewDoc({ name: '', email: '', password: '', phone: '', specialization: 'Cardiology', bio: '', consultationFee: '100', slotDurationMinutes: '30' });
      fetchData();
    } catch (err: any) {
      setCreateError(err.message || 'An error occurred.');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleRetryEmail = async (logId: string) => {
    try {
      const res = await apiFetch(`/admin/notifications/failed/${logId}/retry`, { method: 'POST' });
      if (res.ok) {
        alert('Email resent successfully!');
        fetchData();
      } else {
        alert('Email retry failed.');
      }
    } catch (err) {
      console.error('Error retrying email:', err);
    }
  };

  const handleDismissSpam = (id: string) => {
    setSpamQueue(spamQueue.filter(s => s.id !== id));
  };

  return (
    <div className="fixed inset-0 flex text-slate-800 select-none overflow-hidden bg-[#f7f6f0]">
      {/* LEFT SIDEBAR */}
      <aside className="w-64 flex-shrink-0 flex flex-col justify-between py-6 px-4 z-40 bg-[#0d2a20] text-[#a3b899]">
        <div className="space-y-8">
          <div className="flex items-center gap-2.5 px-2">
            <div className="w-7 h-7 rounded flex items-center justify-center font-extrabold text-sm bg-[#c58739] text-[#0d2a20] shadow-sm">+</div>
            <span className="text-lg font-black tracking-tight text-white font-serif">MediSync Admin</span>
          </div>

          <div className="space-y-1">
            {NAV.map(({ key, icon: Icon, label }) => {
              const active = activeNav === key;
              return (
                <button
                  key={key}
                  onClick={() => setActiveNav(key)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all"
                  style={{ background: active ? '#1c3e34' : 'transparent', color: active ? 'white' : '#a3b899' }}
                >
                  <Icon size={16} />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3 px-2 pt-4 border-t border-emerald-950/60">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-[#c58739] text-[#0d2a20]">A</div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-white truncate">System Admin</div>
            <div className="text-[10px] text-[#a3b899]">Administrator</div>
          </div>
          <button onClick={() => logout()} className="ml-auto text-[#a3b899] hover:text-red-400 transition-colors" title="Logout">
            <LogOut size={14} />
          </button>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {loading ? (
          <div className="flex-grow flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#0d2a20]" />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            
            {/* OVERVIEW TAB */}
            {activeNav === 'overview' && stats && (
              <motion.div
                key="overview-tab"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex-grow p-6 flex flex-col gap-6 overflow-y-auto"
              >
                {/* Feature 2: Automated Revenue & Anomaly Detection */}
                <div className="bg-red-50 border border-red-200 p-4 rounded-2xl flex items-start gap-3 shadow-sm animate-fadeIn">
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0 mt-0.5">
                    <ShieldAlert size={16} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-red-800">AI Anomaly Detected</h4>
                    <p className="text-xs text-red-600 mt-1">Warning: 15% spike in unpaid invoices from the Cardiology department over the last 48 hours. Recommend reviewing billing logs.</p>
                  </div>
                </div>

                {/* Stats Widgets */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0">
                  <div className="p-4 rounded-2xl flex items-center gap-3 bg-white border border-slate-100 shadow-sm">
                    <div className="w-10 h-10 flex items-center justify-center bg-violet-50 text-violet-600 rounded-xl"><Stethoscope size={18} /></div>
                    <div>
                      <h4 className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Total Doctors</h4>
                      <p className="text-xl font-bold text-slate-800 mt-0.5">{stats.totalDoctors}</p>
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl flex items-center gap-3 bg-white border border-slate-100 shadow-sm">
                    <div className="w-10 h-10 flex items-center justify-center bg-teal-50 text-teal-600 rounded-xl"><Users size={18} /></div>
                    <div>
                      <h4 className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Total Patients</h4>
                      <p className="text-xl font-bold text-slate-800 mt-0.5">{stats.totalPatients}</p>
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl flex items-center gap-3 bg-white border border-slate-100 shadow-sm">
                    <div className="w-10 h-10 flex items-center justify-center bg-blue-50 text-blue-600 rounded-xl"><Calendar size={18} /></div>
                    <div>
                      <h4 className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Today's Bookings</h4>
                      <p className="text-xl font-bold text-slate-800 mt-0.5">{stats.todayAppointments}</p>
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl flex items-center gap-3 bg-white border border-slate-100 shadow-sm">
                    <div className="w-10 h-10 flex items-center justify-center bg-orange-50 text-orange-600 rounded-xl"><AlertOctagon size={18} /></div>
                    <div>
                      <h4 className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Failed Alerts</h4>
                      <p className="text-xl font-bold text-slate-800 mt-0.5">{stats.pendingFailedNotifications}</p>
                    </div>
                  </div>
                </div>

                {/* Feature 1: AI Predictive Staffing & Heatmap */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-6">
                    <div className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-sm font-extrabold text-[#0d2a20] font-serif tracking-wider">Predictive Staffing Heatmap</h3>
                          <p className="text-xs text-slate-500 mt-1">AI forecast of clinic traffic based on historical data.</p>
                        </div>
                        <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-100">Live Forecast</span>
                      </div>
                      
                      {/* Heatmap Grid */}
                      <div className="overflow-x-auto">
                        <div className="min-w-[500px]">
                          <div className="flex text-[9px] font-bold text-slate-400 mb-2">
                            <div className="w-16"></div>
                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} className="flex-1 text-center">{d}</div>)}
                          </div>
                          {['Morning (8A-12P)', 'Afternoon (12P-4P)', 'Evening (4P-8P)'].map(shift => (
                            <div key={shift} className="flex items-center mb-2">
                              <div className="w-16 text-[9px] font-bold text-slate-500 text-right pr-3">{shift}</div>
                              <div className="flex-1 flex gap-2">
                                {/* Randomize shades for the heatmap mock */}
                                {[0.3, 0.8, 0.4, 0.6, 0.9, 0.2].map((intensity, i) => (
                                  <div 
                                    key={i} 
                                    className="flex-1 h-8 rounded-md transition-all hover:scale-105 cursor-pointer flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
                                    style={{ backgroundColor: `rgba(13, 42, 32, ${intensity})` }}
                                    title={`Expected volume: ${Math.floor(intensity * 100)} patients`}
                                  >
                                    {intensity > 0.7 && 'Surge'}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl flex gap-3 text-xs">
                        <span className="text-blue-600">💡</span>
                        <span className="text-blue-800 font-medium">Recommendation: Add 2 extra doctors to the Friday Morning shift to accommodate a predicted 90% traffic surge.</span>
                      </div>
                    </div>
                  </div>

                  {/* Config Settings */}
                  <div className="space-y-6">
                    <div className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm space-y-4">
                      <h3 className="text-xs font-extrabold text-[#0d2a20] uppercase tracking-wider flex items-center gap-1.5"><Sliders size={14} /><span>System Configurations</span></h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div><span className="text-xs font-bold text-slate-800 block">Maintenance Mode</span><span className="text-[9px] text-slate-400">Halts non-admin transactions</span></div>
                          <button onClick={toggleMaintenance} className={`w-10 h-5.5 rounded-full p-0.5 transition-colors ${maintenanceMode ? 'bg-[#0d2a20]' : 'bg-slate-200'}`}><div className={`w-4.5 h-4.5 rounded-full bg-white transition-transform ${maintenanceMode ? 'translate-x-4.5' : 'translate-x-0'}`} /></button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div><span className="text-xs font-bold text-slate-800 block">AI Scribe Offline Fallback</span><span className="text-[9px] text-slate-400">Forces simple static templates</span></div>
                          <button onClick={toggleAiFallback} className={`w-10 h-5.5 rounded-full p-0.5 transition-colors ${aiFallback ? 'bg-[#0d2a20]' : 'bg-slate-200'}`}><div className={`w-4.5 h-4.5 rounded-full bg-white transition-transform ${aiFallback ? 'translate-x-4.5' : 'translate-x-0'}`} /></button>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs font-bold"><span className="text-slate-800">Booking Hold Lock</span><span className="text-[#c58739] font-mono">{holdTimeout}s</span></div>
                          <input type="range" min="30" max="180" step="10" value={holdTimeout} onChange={(e) => handleTimeoutChange(parseInt(e.target.value))} className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0d2a20]" />
                        </div>
                      </div>
                    </div>

                    <div className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm space-y-3.5">
                      <h3 className="text-xs font-extrabold text-[#0d2a20] uppercase tracking-wider flex items-center gap-1.5"><Database size={14} /><span>Background Queue Status</span></h3>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between items-center py-1 border-b border-slate-100"><span className="text-slate-500">BullMQ Active Alerts Scheduler</span><span className="px-2 py-0.5 rounded text-[9px] font-bold bg-green-50 text-green-700 border border-green-100">HEALTHY</span></div>
                        <div className="flex justify-between items-center py-1 border-b border-slate-100"><span className="text-slate-500">Redis Memory Occupied</span><span className="font-mono text-slate-700 font-bold">1.28 MB</span></div>
                        <div className="flex justify-between items-center py-1"><span className="text-slate-500">Email Retries Workers</span><span className="font-mono text-[#c58739] font-bold">2 active</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* DOCTORS TAB with Feature 4: Doctor Performance Matrix */}
            {activeNav === 'doctors' && (
              <motion.div
                key="doctors-tab"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex-grow flex flex-col gap-4 overflow-hidden p-6"
              >
                <div className="flex justify-between items-center shrink-0">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">Doctor Profiles & Performance</h3>
                  <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-1.5 px-4 py-2 bg-[#0d2a20] hover:bg-emerald-950 font-bold rounded-xl text-xs transition-all duration-300 shadow-md text-white">
                    <Plus size={14} /><span>Create Doctor</span>
                  </button>
                </div>

                <div className="flex-grow overflow-y-auto grid grid-cols-1 xl:grid-cols-2 gap-6 pr-1">
                  {doctors.map((doc, idx) => {
                    const mockSentiment = 98 - (idx * 3); // Fake dynamic score
                    const mockTier = mockSentiment > 90 ? 'S-Tier' : 'A-Tier';
                    const mockTime = 12 + idx;
                    
                    return (
                    <div key={doc.userId} className="p-6 rounded-3xl flex flex-col justify-between space-y-4 bg-white border border-slate-100 shadow-sm relative overflow-hidden">
                      <div className="flex gap-4">
                        <div className="w-12 h-12 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-center text-xl font-black text-slate-300 shrink-0">
                          {doc.user.name.charAt(0)}
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex justify-between items-start">
                            <h4 className="text-sm font-extrabold text-slate-800 font-serif">{doc.user.name}</h4>
                            <span className="px-2 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-100">
                              {doc.specialization}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-mono">{doc.user.email}</p>
                          <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 pt-1">{doc.bio || 'No bio provided.'}</p>
                        </div>
                      </div>

                      {/* Performance Matrix */}
                      <div className="grid grid-cols-3 gap-3 pt-3">
                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-center">
                          <div className="text-[9px] font-extrabold text-slate-400 uppercase mb-1">Sentiment</div>
                          <div className={`text-sm font-black ${mockSentiment > 90 ? 'text-green-600' : 'text-orange-500'}`}>{mockSentiment}%</div>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-center">
                          <div className="text-[9px] font-extrabold text-slate-400 uppercase mb-1">Avg Time</div>
                          <div className="text-sm font-black text-slate-700">{mockTime}m</div>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-center">
                          <div className="text-[9px] font-extrabold text-slate-400 uppercase mb-1">Efficiency</div>
                          <div className="text-sm font-black text-blue-600">{mockTier}</div>
                        </div>
                      </div>

                      <div className="border-t border-slate-100 pt-4 flex justify-between items-center text-xs text-slate-500">
                        <div className="flex gap-4 font-medium">
                          <span>Fee: <strong className="text-slate-800">₹{doc.consultationFee}</strong></span>
                          <span>Slot: <strong className="text-slate-800">{doc.slotDurationMinutes}m</strong></span>
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteUser(doc.userId);
                          }} 
                          className="flex items-center gap-1.5 px-3 py-1.5 text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors shadow-sm" 
                          title="Delete Doctor"
                        >
                          <Trash2 size={14} />
                          <span className="font-bold text-[10px] uppercase tracking-wider">Delete</span>
                        </button>
                      </div>
                    </div>
                  )})}
                  {doctors.length === 0 && <p className="text-slate-400 text-xs">No doctor profiles found.</p>}
                </div>
              </motion.div>
            )}

            {/* Feature 3: LIVE CLINIC RESOURCES TAB */}
            {activeNav === 'resources' && (
              <motion.div
                key="resources-tab"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex-grow flex flex-col gap-6 overflow-hidden p-6"
              >
                <div>
                  <h3 className="text-2xl font-bold font-serif text-[#0d2a20] tracking-tight">Live Clinic Assets Tracker</h3>
                  <p className="text-sm text-slate-500 mt-1">Real-time status of physical rooms and high-value equipment.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pr-1">
                  {MOCK_RESOURCES.map(res => (
                    <div key={res.id} className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between h-40 relative">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-sm font-extrabold text-slate-800">{res.name}</h4>
                          <p className="text-xs text-slate-500 mt-0.5">{res.department} • {res.type}</p>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400">
                          <LayoutGrid size={14} />
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${
                          res.status === 'AVAILABLE' ? 'bg-green-500' :
                          res.status === 'IN USE' ? 'bg-red-500 animate-pulse' : 'bg-orange-500'
                        }`}></div>
                        <span className={`text-[10px] font-black uppercase tracking-wider ${
                          res.status === 'AVAILABLE' ? 'text-green-600' :
                          res.status === 'IN USE' ? 'text-red-600' : 'text-orange-600'
                        }`}>{res.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Feature 5: SPAM MODERATION TAB */}
            {activeNav === 'moderation' && (
              <motion.div
                key="moderation-tab"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex-grow flex flex-col gap-6 overflow-hidden p-6"
              >
                <div>
                  <h3 className="text-2xl font-bold font-serif text-[#0d2a20] tracking-tight">AI Security & Moderation Queue</h3>
                  <p className="text-sm text-slate-500 mt-1">Suspicious accounts and bookings flagged by the automated firewall.</p>
                </div>

                <div className="flex-grow overflow-y-auto bg-white rounded-3xl border border-slate-100 shadow-sm p-2">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 bg-[#fcfbfa] text-slate-500 text-[9px] font-extrabold uppercase tracking-wider">
                        <th className="px-6 py-4 rounded-tl-2xl">Flag Type</th>
                        <th className="px-6 py-4">User Details</th>
                        <th className="px-6 py-4">AI Reasoning</th>
                        <th className="px-6 py-4 text-right rounded-tr-2xl">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-600">
                      {spamQueue.map((spam) => (
                        <tr key={spam.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded text-[9px] font-black border ${spam.risk === 'HIGH' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-orange-50 text-orange-600 border-orange-200'}`}>
                              {spam.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-800">{spam.user}</td>
                          <td className="px-6 py-4 text-[11px] font-medium leading-relaxed max-w-xs">{spam.reason}</td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button onClick={() => handleDismissSpam(spam.id)} className="w-8 h-8 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 flex items-center justify-center border border-green-200 transition-colors" title="Approve/Dismiss">
                                <Check size={14} />
                              </button>
                              <button onClick={() => handleDismissSpam(spam.id)} className="w-8 h-8 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center border border-red-200 transition-colors" title="Block User & IP">
                                <Ban size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {spamQueue.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                            <div className="flex flex-col items-center justify-center gap-2">
                              <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center text-green-500 mb-2"><Check size={20} /></div>
                              <span className="font-bold text-slate-800">Queue Clear</span>
                              <span>No suspicious activity detected.</span>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* PATIENTS TAB */}
            {activeNav === 'patients' && (
              <motion.div
                key="patients-tab"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex-grow flex flex-col gap-4 overflow-hidden p-6"
              >
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 shrink-0">Patient Directory</h3>
                <div className="flex-grow overflow-y-auto border border-slate-100 rounded-3xl shadow-sm bg-white p-2">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 bg-[#fcfbfa] text-slate-500 text-[9px] font-extrabold uppercase tracking-wider">
                        <th className="px-6 py-4 rounded-tl-2xl">Name</th>
                        <th className="px-6 py-4">Email</th>
                        <th className="px-6 py-4">Phone</th>
                        <th className="px-6 py-4">Joined Date</th>
                        <th className="px-6 py-4 text-right rounded-tr-2xl">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-600">
                      {patients.map((pat) => (
                        <tr key={pat.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 font-bold text-slate-800">{pat.name}</td>
                          <td className="px-6 py-4">{pat.email}</td>
                          <td className="px-6 py-4">{pat.phone || 'N/A'}</td>
                          <td className="px-6 py-4 text-slate-400">{new Date(pat.createdAt).toLocaleDateString()}</td>
                          <td className="px-6 py-4 text-right">
                            <button onClick={() => deleteUser(pat.id)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-bold border border-red-100 bg-red-50/40 text-red-500 hover:bg-red-50" title="Delete Patient">
                              <Trash2 size={12} /><span>Delete</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                      {patients.length === 0 && (
                        <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">No patient records found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* APPOINTMENTS TAB */}
            {activeNav === 'appointments' && (
              <motion.div
                key="appointments-tab"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex-grow flex flex-col gap-4 overflow-hidden p-6"
              >
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 shrink-0">All System Appointments</h3>
                <div className="flex-grow overflow-y-auto border border-slate-100 rounded-3xl shadow-sm bg-white p-2">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 bg-[#fcfbfa] text-slate-500 text-[9px] font-extrabold uppercase tracking-wider">
                        <th className="px-6 py-4 rounded-tl-2xl">Patient</th>
                        <th className="px-6 py-4">Doctor</th>
                        <th className="px-6 py-4">Date & Time</th>
                        <th className="px-6 py-4 rounded-tr-2xl">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-600">
                      {appointments.map((app) => (
                        <tr key={app.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-800">{app.patient?.name}</div>
                            <div className="text-[10px] text-slate-400">{app.patient?.email}</div>
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-800">{app.doctor?.user?.name}</td>
                          <td className="px-6 py-4 text-slate-500">{new Date(app.slotStart).toLocaleString()}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 text-[9px] font-black uppercase tracking-wider rounded ${
                              app.status === 'CONFIRMED' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                              app.status === 'COMPLETED' ? 'bg-green-50 text-green-700 border border-green-100' :
                              app.status === 'CANCELLED' ? 'bg-red-50 text-red-700 border border-red-100' :
                              'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}>
                              {app.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {appointments.length === 0 && (
                        <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400">No appointments found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* FAILED ALERTS TAB */}
            {activeNav === 'failed-alerts' && (
              <motion.div
                key="failed-alerts-tab"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex-grow flex flex-col gap-4 overflow-hidden p-6"
              >
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 shrink-0">Failed Deliveries</h3>
                <div className="flex-grow overflow-y-auto border border-slate-100 rounded-3xl shadow-sm bg-white p-2">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 bg-[#fcfbfa] text-slate-500 text-[9px] font-extrabold uppercase tracking-wider">
                        <th className="px-6 py-4 rounded-tl-2xl">Email</th>
                        <th className="px-6 py-4">Type</th>
                        <th className="px-6 py-4 text-center">Retries</th>
                        <th className="px-6 py-4 text-right rounded-tr-2xl">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-600">
                      {failedLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 font-bold text-slate-800">{log.toEmail}</td>
                          <td className="px-6 py-4"><span className="px-2 py-0.5 text-[8px] font-black uppercase tracking-wider rounded bg-orange-50 text-orange-700 border border-orange-100">{log.type}</span></td>
                          <td className="px-6 py-4 text-center"><span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-mono">{log.retryCount}</span></td>
                          <td className="px-6 py-4 text-right">
                            <button onClick={() => handleRetryEmail(log.id)} className="px-3 py-1.5 bg-[#0d2a20] hover:bg-emerald-950 text-white font-bold rounded-lg text-[9px] transition-colors shadow-sm">
                              Retry Now
                            </button>
                          </td>
                        </tr>
                      ))}
                      {failedLogs.length === 0 && (
                        <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400">No failed notifications.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        )}
      </main>

      {/* CREATE DOCTOR MODAL */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl border border-slate-100"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-[#fcfbfa]">
                <h3 className="font-bold text-slate-800 font-serif">Create New Doctor</h3>
                <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors text-xl leading-none">&times;</button>
              </div>

              <div className="p-6 max-h-[70vh] overflow-y-auto">
                {createError && (
                  <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-100 flex gap-2 font-bold">
                    <AlertOctagon size={14} className="mt-0.5 shrink-0" />
                    <p>{createError}</p>
                  </div>
                )}
                
                <form id="create-doctor-form" onSubmit={handleCreateDoctor} className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1"><label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Full Name</label><input type="text" required value={newDoc.name} onChange={e => setNewDoc({ ...newDoc, name: e.target.value })} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs focus:border-[#0d2a20] transition-colors" /></div>
                    <div className="space-y-1"><label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Email Address</label><input type="email" required value={newDoc.email} onChange={e => setNewDoc({ ...newDoc, email: e.target.value })} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs focus:border-[#0d2a20] transition-colors" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1"><label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Temporary Password</label><input type="text" required value={newDoc.password} onChange={e => setNewDoc({ ...newDoc, password: e.target.value })} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs focus:border-[#0d2a20] transition-colors" /></div>
                    <div className="space-y-1"><label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Phone (Optional)</label><input type="text" value={newDoc.phone} onChange={e => setNewDoc({ ...newDoc, phone: e.target.value })} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs focus:border-[#0d2a20] transition-colors" /></div>
                  </div>
                  <div className="space-y-1"><label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Department / Specialization</label><select value={newDoc.specialization} onChange={e => setNewDoc({ ...newDoc, specialization: e.target.value })} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs focus:border-[#0d2a20] transition-colors text-slate-700">
                    <option>Cardiology</option><option>Pediatrics</option><option>Orthopedics</option><option>Dermatology</option><option>General Medicine</option>
                  </select></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1"><label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Consultation Fee (₹)</label><input type="number" required value={newDoc.consultationFee} onChange={e => setNewDoc({ ...newDoc, consultationFee: e.target.value })} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs focus:border-[#0d2a20] transition-colors" /></div>
                    <div className="space-y-1"><label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Slot Duration (Mins)</label><input type="number" required value={newDoc.slotDurationMinutes} onChange={e => setNewDoc({ ...newDoc, slotDurationMinutes: e.target.value })} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs focus:border-[#0d2a20] transition-colors" /></div>
                  </div>
                  <div className="space-y-1"><label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Short Biography</label><textarea rows={3} value={newDoc.bio} onChange={e => setNewDoc({ ...newDoc, bio: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs focus:border-[#0d2a20] transition-colors resize-none leading-relaxed" /></div>
                </form>
              </div>

              <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-[#fcfbfa]">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors">Cancel</button>
                <button type="submit" form="create-doctor-form" disabled={createLoading} className="px-6 py-2 bg-[#0d2a20] hover:bg-emerald-950 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md">
                  {createLoading ? <Loader2 size={14} className="animate-spin text-white" /> : <span>Create Doctor</span>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
