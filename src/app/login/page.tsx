'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Mail, Lock, ArrowRight, Loader2, Plane } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (!email || !password) {
      setError('Please fill in all fields.');
      setLoading(false);
      return;
    }

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
      } else if (data.user) {
        setSuccess('Login successful! Redirecting...');
        setTimeout(() => {
          router.push('/');
          router.refresh();
        }, 1200);
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-8">
      <div className="w-full max-w-md glass-panel p-8 rounded-3xl border border-white/5 shadow-[0_20px_50px_rgba(3,7,18,0.5)] relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl"></div>
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl"></div>

        {/* Branding header */}
        <div className="text-center space-y-2 mb-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600/10 border border-blue-500/20 text-blue-400 mb-2">
            <Plane className="h-6 w-6 rotate-45" />
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Welcome Back</h2>
          <p className="text-sm text-gray-400">
            Sign in to check flight bookings and manage reservations
          </p>
        </div>

        {/* Form Alerts */}
        {error && (
          <div className="mb-5 p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-xs font-semibold text-red-400 animate-shake">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-5 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-xs font-semibold text-emerald-400 animate-pulse">
            {success}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-500">
                <Mail size={16} />
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full bg-white/5 border border-white/5 focus:border-blue-500/30 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-gray-500 outline-none transition-colors"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-500">
                <Lock size={16} />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-white/5 border border-white/5 focus:border-blue-500/30 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-gray-500 outline-none transition-colors"
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white font-semibold transition-all duration-200 border border-blue-500/20 hover:border-blue-400/40 shadow-[0_4px_20px_rgba(59,130,246,0.2)] disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Redirect */}
        <div className="mt-8 text-center text-xs text-gray-500">
          <span>Don&apos;t have an account? </span>
          <Link href="/register" className="text-blue-400 font-semibold hover:underline">
            Register Here
          </Link>
        </div>
      </div>
    </div>
  );
}
