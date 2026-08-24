import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { RegisterSchema, RegisterInput } from '@medisync/shared';
import { useAuth } from '../context/AuthContext';
import ThreeBackground from '../components/ThreeBackground';
import { User, Mail, Lock, Phone, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';

// Custom inline Zod resolver to avoid library version mismatches
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

export default function RegisterPage() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolve(RegisterSchema),
  });

  const onSubmit = async (data: RegisterInput) => {
    setServerError(null);
    setIsSubmitting(true);
    try {
      await registerUser(data.email, data.password, data.name, data.phone);
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: any) {
      setServerError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-6 select-none overflow-hidden">
      {/* 3D background scene */}
      <ThreeBackground />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl shadow-teal-500/5"
      >
        {/* Title */}
        <div className="text-center mb-6 space-y-2">
          <div className="flex justify-center items-center gap-2">
            <span className="text-4xl">🏥</span>
            <h1 className="text-3xl font-black bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              Create Account
            </h1>
          </div>
          <p className="text-sm text-slate-400">Register as a MediSync Patient</p>
        </div>

        <AnimatePresence mode="wait">
          {success ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-8 space-y-4"
            >
              <div className="flex justify-center">
                <CheckCircle2 className="w-16 h-16 text-teal-400" />
              </div>
              <h2 className="text-xl font-bold text-white">Registration Successful!</h2>
              <p className="text-sm text-slate-400">
                Your patient account has been created. Redirecting to login portal...
              </p>
            </motion.div>
          ) : (
            <motion.form
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-4"
            >
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Full Name
                </label>
                <div
                  className={`flex items-center gap-3 px-4 py-2.5 bg-slate-950/50 rounded-xl border border-slate-800 transition-all duration-300 focus-within:border-teal-400 focus-within:ring-teal-400/20`}
                >
                  <User className="w-5 h-5 text-slate-500 shrink-0" />
                  <input
                    type="text"
                    placeholder="John Doe"
                    {...register('name')}
                    className="w-full bg-transparent border-none outline-none text-sm text-white placeholder-slate-600 focus:ring-0"
                  />
                </div>
                {errors.name && (
                  <p className="text-xs text-red-400 flex items-center gap-1 font-medium pl-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{errors.name.message}</span>
                  </p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Email Address
                </label>
                <div
                  className={`flex items-center gap-3 px-4 py-2.5 bg-slate-950/50 rounded-xl border border-slate-800 transition-all duration-300 focus-within:border-teal-400 focus-within:ring-teal-400/20`}
                >
                  <Mail className="w-5 h-5 text-slate-500 shrink-0" />
                  <input
                    type="email"
                    placeholder="john.doe@gmail.com"
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

              {/* Phone (Optional) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Phone Number (e.g. +1234567890)
                </label>
                <div
                  className={`flex items-center gap-3 px-4 py-2.5 bg-slate-950/50 rounded-xl border border-slate-800 transition-all duration-300 focus-within:border-teal-400 focus-within:ring-teal-400/20`}
                >
                  <Phone className="w-5 h-5 text-slate-500 shrink-0" />
                  <input
                    type="text"
                    placeholder="+1234567890"
                    {...register('phone')}
                    className="w-full bg-transparent border-none outline-none text-sm text-white placeholder-slate-600 focus:ring-0"
                  />
                </div>
                {errors.phone && (
                  <p className="text-xs text-red-400 flex items-center gap-1 font-medium pl-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{errors.phone.message}</span>
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Password
                </label>
                <div
                  className={`flex items-center gap-3 px-4 py-2.5 bg-slate-950/50 rounded-xl border border-slate-800 transition-all duration-300 focus-within:border-teal-400 focus-within:ring-teal-400/20`}
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

              {/* Server Errors */}
              {serverError && (
                <div className="p-3 bg-red-500/10 border border-red-500/25 rounded-xl flex gap-3 text-red-400">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <span className="text-sm font-medium leading-normal">{serverError}</span>
                </div>
              )}

              {/* Submit */}
              <motion.button
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20 disabled:opacity-50 transition-all duration-300"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <span>Sign Up</span>
                )}
              </motion.button>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Footer */}
        {!success && (
          <div className="text-center mt-6">
            <span className="text-sm text-slate-500">Already have an account? </span>
            <Link
              to="/login"
              className="text-sm font-semibold text-teal-400 hover:text-teal-300 transition-colors"
            >
              Sign In
            </Link>
          </div>
        )}
      </motion.div>
    </div>
  );
}
