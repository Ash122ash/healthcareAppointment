import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, Calendar, Sparkles, Bell } from 'lucide-react';

export default function LandingPage() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white flex flex-col justify-between">
      {/* Background visual details */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-teal-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Header / Navbar */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <span className="text-3xl">🏥</span>
          <span className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-teal-400 bg-clip-text text-transparent">
            MediSync
          </span>
        </div>
        <div className="flex gap-4">
          <Link
            to="/login"
            className="px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white transition-colors"
          >
            Sign In
          </Link>
          <Link
            to="/register"
            className="px-5 py-2 text-sm font-semibold bg-gradient-to-r from-blue-500 to-teal-500 text-white rounded-lg hover:from-blue-600 hover:to-teal-600 shadow-lg shadow-blue-500/10 transition-all duration-300 transform hover:-translate-y-0.5"
          >
            Register
          </Link>
        </div>
      </header>

      {/* Main Section */}
      <main className="w-full max-w-7xl mx-auto px-6 py-12 flex-grow flex flex-col justify-center z-10">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center"
        >
          {/* Hero Content */}
          <div className="space-y-6">
            <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Next-Gen Healthcare Management</span>
            </motion.div>
            <motion.h1
              variants={itemVariants}
              className="text-5xl md:text-6xl font-black tracking-tight leading-none"
            >
              Healthcare Appointments,{' '}
              <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-teal-400 bg-clip-text text-transparent">
                Simplified
              </span>
            </motion.h1>
            <motion.p variants={itemVariants} className="text-lg text-slate-400 max-w-lg">
              MediSync bridges the gap between doctors and patients. Experience smart AI-powered pre-visit briefings, clinical summarization, and automated double-booking prevention.
            </motion.p>
            <motion.div variants={itemVariants} className="flex gap-4 pt-2">
              <Link
                to="/login"
                className="px-8 py-3.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-teal-500 text-white font-bold rounded-xl shadow-xl shadow-blue-500/10 hover:shadow-blue-500/25 transition-all duration-300 transform hover:-translate-y-1"
              >
                Access Portal
              </Link>
              <Link
                to="/register"
                className="px-8 py-3.5 bg-slate-900/60 hover:bg-slate-900 border border-slate-800 text-slate-300 hover:text-white font-bold rounded-xl transition-all duration-300 transform hover:-translate-y-1"
              >
                Patient Sign Up
              </Link>
            </motion.div>
          </div>

          {/* Feature Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <motion.div
              variants={itemVariants}
              whileHover={{ y: -5 }}
              className="p-6 bg-slate-900/50 backdrop-blur-md border border-slate-800/80 rounded-2xl space-y-3"
            >
              <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Calendar className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Smart Booking</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                90-second temporary booking lock and transactional safety to prevent double bookings.
              </p>
            </motion.div>

            <motion.div
              variants={itemVariants}
              whileHover={{ y: -5 }}
              className="p-6 bg-slate-900/50 backdrop-blur-md border border-slate-800/80 rounded-2xl space-y-3"
            >
              <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">AI Summaries</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Automated pre-visit complaint summaries for doctors and patient-friendly post-visit briefings.
              </p>
            </motion.div>

            <motion.div
              variants={itemVariants}
              whileHover={{ y: -5 }}
              className="p-6 bg-slate-900/50 backdrop-blur-md border border-slate-800/80 rounded-2xl space-y-3"
            >
              <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
                <Bell className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Reminders</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Automated email alerts and background queue job handling for medication times.
              </p>
            </motion.div>

            <motion.div
              variants={itemVariants}
              whileHover={{ y: -5 }}
              className="p-6 bg-slate-900/50 backdrop-blur-md border border-slate-800/80 rounded-2xl space-y-3"
            >
              <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Secure Portal</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Role-based access controls protecting patient privacy, doctor queues, and admin configuration.
              </p>
            </motion.div>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto px-6 py-6 border-t border-slate-900 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500 gap-4 z-10">
        <p>&copy; {new Date().getFullYear()} MediSync Inc. All rights reserved.</p>
        <div className="flex gap-4">
          <a href="#" className="hover:text-slate-300 transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-slate-300 transition-colors">Terms of Service</a>
          <a href="#" className="hover:text-slate-300 transition-colors">Contact Support</a>
        </div>
      </footer>
    </div>
  );
}
