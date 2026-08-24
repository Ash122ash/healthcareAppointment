import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { LoginSchema, LoginInput, UserRole } from '@medisync/shared';
import { useAuth } from '../context/AuthContext';
import ThreeBackground from '../components/ThreeBackground';
import { User, Shield, Stethoscope, Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';

// Setup resolver helper inline since @hookform/resolvers might need standard resolution
// Wait, we can implement a custom resolver helper or import it directly.
// Let's write a simple Zod resolver function manually to avoid hookform resolver import errors if dependencies differ!
// A custom resolver is very simple:
const zodResolve = (schema: any) => async (data: any) => {
  try {
    const values = schema.parse(data);
    return { values, errors: {} };
  } catch (err: any) {
    const errors: Record<string, any> = {};
    if (err.errors) {
      err.errors.forEach((e: any) => {
        errors[e.path[0]] = { message: e.message };
      });
    }
    return { values: {}, errors };
  }
};

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<UserRole>('PATIENT');
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolve(LoginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    setServerError(null);
    setIsSubmitting(true);
    try {
      const user = await login(data.email, data.password);
      
      // Verification: Make sure selected role matches logging user's role
      // In production, we'd log them in anyway, but for UX let's warn if roles differ, or auto-route based on actual role
      if (user.role !== selectedRole) {
        // Log in succeeds, we route to their actual portal
        setSelectedRole(user.role);
      }
      
      // Redirect based on actual user role
      if (user.role === 'ADMIN') {
        navigate('/admin/dashboard');
      } else if (user.role === 'DOCTOR') {
        navigate('/doctor/dashboard');
      } else {
        navigate('/patient/dashboard');
      }
    } catch (err: any) {
      setServerError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Role Theme definitions
  const themes = {
    PATIENT: {
      accentText: 'text-teal-400',
      accentBorder: 'border-teal-500/30 focus-within:border-teal-400 focus-within:ring-teal-400/20',
      buttonBg: 'bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 shadow-teal-500/20',
      ringColor: 'focus:ring-teal-400',
      glow: 'shadow-teal-500/5',
      badge: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
    },
    DOCTOR: {
      accentText: 'text-blue-400',
      accentBorder: 'border-blue-500/30 focus-within:border-blue-400 focus-within:ring-blue-400/20',
      buttonBg: 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 shadow-blue-500/20',
      ringColor: 'focus:ring-blue-400',
      glow: 'shadow-blue-500/5',
      badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    },
    ADMIN: {
      accentText: 'text-violet-400',
      accentBorder: 'border-violet-500/30 focus-within:border-violet-400 focus-within:ring-violet-400/20',
      buttonBg: 'bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 shadow-violet-500/20',
      ringColor: 'focus:ring-violet-400',
      glow: 'shadow-violet-500/5',
      badge: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    },
  };

  const activeTheme = themes[selectedRole];

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-6 select-none overflow-hidden">
      {/* 3D background scene */}
      <ThreeBackground />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className={`relative z-10 w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl transition-all duration-500 ${activeTheme.glow}`}
      >
        {/* Title */}
        <div className="text-center mb-6 space-y-2">
          <div className="flex justify-center items-center gap-2">
            <span className="text-4xl">🏥</span>
            <h1 className="text-3xl font-black bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              MediSync
            </h1>
          </div>
          <p className="text-sm text-slate-400">Welcome to your secure portal</p>
        </div>

        {/* Role Selector Tabs */}
        <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-950/80 border border-slate-800/80 rounded-2xl mb-8">
          {(['PATIENT', 'DOCTOR', 'ADMIN'] as UserRole[]).map((role) => {
            const isActive = selectedRole === role;
            const Icon = role === 'PATIENT' ? User : role === 'DOCTOR' ? Stethoscope : Shield;
            
            return (
              <button
                key={role}
                type="button"
                onClick={() => {
                  setSelectedRole(role);
                  setServerError(null);
                }}
                className={`relative flex flex-col items-center justify-center py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${
                  isActive
                    ? 'text-white'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeRoleBg"
                    className={`absolute inset-0 rounded-xl bg-slate-900 border border-slate-800 ${
                      role === 'PATIENT'
                        ? 'border-teal-500/20'
                        : role === 'DOCTOR'
                        ? 'border-blue-500/20'
                        : 'border-violet-500/20'
                    }`}
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <Icon className={`w-4 h-4 mb-1 z-10 ${isActive ? activeTheme.accentText : ''}`} />
                <span className="z-10">{role.charAt(0) + role.slice(1).toLowerCase()}</span>
              </button>
            );
          })}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Email field */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Email Address
            </label>
            <div
              className={`flex items-center gap-3 px-4 py-3 bg-slate-950/50 rounded-xl border transition-all duration-300 ${
                errors.email ? 'border-red-500/50 focus-within:border-red-500' : activeTheme.accentBorder
              }`}
            >
              <Mail className="w-5 h-5 text-slate-500 shrink-0" />
              <input
                type="email"
                placeholder="example@medisync.com"
                {...register('email')}
                className="w-full bg-transparent border-none outline-none text-sm text-white placeholder-slate-600 focus:ring-0"
              />
            </div>
            {errors.email && (
              <p className="text-xs text-red-400 flex items-center gap-1 font-medium pl-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{errors.email.message}</span>
              </p>
            )}
          </div>

          {/* Password field */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Password
            </label>
            <div
              className={`flex items-center gap-3 px-4 py-3 bg-slate-950/50 rounded-xl border transition-all duration-300 ${
                errors.password ? 'border-red-500/50 focus-within:border-red-500' : activeTheme.accentBorder
              }`}
            >
              <Lock className="w-5 h-5 text-slate-500 shrink-0" />
              <input
                type="password"
                placeholder="••••••••"
                {...register('password')}
                className="w-full bg-transparent border-none outline-none text-sm text-white placeholder-slate-600 focus:ring-0"
              />
            </div>
            {errors.password && (
              <p className="text-xs text-red-400 flex items-center gap-1 font-medium pl-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{errors.password.message}</span>
              </p>
            )}
          </div>

          {/* Server Side Errors */}
          <AnimatePresence>
            {serverError && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-3.5 bg-red-500/10 border border-red-500/25 rounded-xl flex gap-3 text-red-400"
              >
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span className="text-sm font-medium leading-normal">{serverError}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit Button */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-3.5 rounded-xl text-white font-bold flex items-center justify-center gap-2 transition-all duration-300 ${
              activeTheme.buttonBg
            } disabled:opacity-50`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Signing In...</span>
              </>
            ) : (
              <span>Sign In as {selectedRole.charAt(0) + selectedRole.slice(1).toLowerCase()}</span>
            )}
          </motion.button>
        </form>

        {/* Footer */}
        {selectedRole === 'PATIENT' && (
          <div className="text-center mt-6">
            <span className="text-sm text-slate-500">New patient? </span>
            <Link
              to="/register"
              className="text-sm font-semibold text-teal-400 hover:text-teal-300 transition-colors"
            >
              Create Account
            </Link>
          </div>
        )}
      </motion.div>
    </div>
  );
}
