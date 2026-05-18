import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Lock, Mail, Loader2, ShieldCheck, Eye } from 'lucide-react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { cn } from '../lib/utils';
import { firebaseService } from '../services/firebaseService';
import { UserRole } from '../types';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [role, setRole] = useState<UserRole>('viewer');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      if (isRegisterMode) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await firebaseService.createUserProfile(userCredential.user.uid, email, role);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-credential') {
        setError('Invalid email or password.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('This email is already in use.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password must be at least 6 characters.');
      } else {
        setError(isRegisterMode ? 'Failed to create account. Please try again.' : 'Failed to login. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-[2rem] p-8 shadow-xl shadow-slate-200/50 border border-slate-100"
      >
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-[1.25rem] flex items-center justify-center mb-4">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-slate-900">R.K Biotech</h1>
          <p className="text-slate-500 mt-2 text-sm">
            {isRegisterMode ? 'Create an account to manage undertakings.' : 'Sign in to manage patient undertakings.'}
          </p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-6 p-4 bg-red-50 text-red-600 text-sm font-bold rounded-2xl border border-red-100 text-center"
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-12 pr-4 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-medium text-slate-900"
                placeholder="admin@hospital.com"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-12 pr-4 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-medium text-slate-900"
                placeholder="••••••••"
              />
            </div>
          </div>

          {isRegisterMode && (
            <div className="space-y-2 pt-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">Choose Role</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setRole('admin')}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 text-center transition-all cursor-pointer",
                    role === 'admin'
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-slate-200 bg-white hover:border-slate-300 text-slate-500"
                  )}
                >
                  <ShieldCheck className="w-6 h-6" />
                  <span className="text-sm font-black uppercase tracking-wider">Admin</span>
                  <span className="text-[10px] opacity-70 leading-tight">Full access (Generate & Upload)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('viewer')}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 text-center transition-all cursor-pointer",
                    role === 'viewer'
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-slate-200 bg-white hover:border-slate-300 text-slate-500"
                  )}
                >
                  <Eye className="w-6 h-6" />
                  <span className="text-sm font-black uppercase tracking-wider">Viewer</span>
                  <span className="text-[10px] opacity-70 leading-tight">Read-only (No generate or upload)</span>
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className={cn(
              "w-full bg-primary text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all mt-4 cursor-pointer",
              isSubmitting ? "opacity-70 cursor-not-allowed" : "hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5 active:translate-y-0"
            )}
          >
            {isSubmitting ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
            ) : (
              isRegisterMode ? "Create Account" : "Secure Login"
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => {
              setIsRegisterMode(!isRegisterMode);
              setError('');
            }}
            className="text-xs font-bold text-slate-500 hover:text-primary transition-colors uppercase tracking-widest cursor-pointer pl-1"
          >
            {isRegisterMode ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
 