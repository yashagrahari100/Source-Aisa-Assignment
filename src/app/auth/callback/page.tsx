'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/store/useUserStore';
import { Loader2, CheckCircle2, ShieldAlert, Plane, ArrowRight, Home } from 'lucide-react';
import Link from 'next/link';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setSession = useUserStore((state) => state.setSession);

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const exchangeCode = async () => {
      // Supabase sends a "?code=..." parameter when verifying email
      const code = searchParams.get('code');

      if (!code) {
        // If code is missing, check if session is already established (e.g., auto-login or session cookie)
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setSession(session);
          setStatus('success');
          setTimeout(() => {
            router.push('/');
            router.refresh();
          }, 1500);
        } else {
          setStatus('error');
          setErrorMsg('Verification security code is missing from the request URL.');
        }
        return;
      }

      try {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.error('Code exchange failed:', error.message);
          setStatus('error');
          setErrorMsg(error.message || 'Verification link might have expired or already been verified.');
          return;
        }

        if (data && data.session) {
          setSession(data.session);
          setStatus('success');
          // Wait 2 seconds for a premium micro-interaction feel, then redirect home
          setTimeout(() => {
            router.push('/');
            router.refresh();
          }, 2000);
        } else {
          setStatus('error');
          setErrorMsg('Successfully processed code but failed to establish a valid flyer session.');
        }
      } catch (err: unknown) {
        console.error('Unexpected callback exchange error:', err);
        const errMsg = err instanceof Error ? err.message : 'An unexpected error occurred during email verification.';
        setStatus('error');
        setErrorMsg(errMsg);
      }
    };

    exchangeCode();
  }, [searchParams, router, setSession]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center relative px-4 overflow-hidden">
      {/* Visual Ambient Blur Backgrounds */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none"></div>

      {/* Main Glassmorphic Container */}
      <div className="w-full max-w-md glass-panel p-8 sm:p-10 rounded-3xl border border-white/10 shadow-[0_20px_50px_rgba(3,7,18,0.5)] animate-in fade-in zoom-in-95 duration-500 flex flex-col items-center text-center relative z-10">
        
        {/* Core Animated Indicator */}
        <div className="mb-8">
          {status === 'loading' && (
            <div className="relative flex items-center justify-center">
              <div className="h-16 w-16 rounded-full border border-blue-500/20 flex items-center justify-center bg-blue-500/5 shadow-[0_0_20px_rgba(59,130,246,0.1)]">
                <Plane size={24} className="text-blue-400 rotate-45 animate-pulse" />
              </div>
              <div className="absolute inset-0 rounded-full border-t-2 border-b-2 border-blue-500 animate-spin"></div>
            </div>
          )}

          {status === 'success' && (
            <div className="h-16 w-16 rounded-full border border-emerald-500/30 flex items-center justify-center bg-emerald-500/10 shadow-[0_0_25px_rgba(16,185,129,0.25)] animate-in zoom-in duration-300">
              <CheckCircle2 size={32} className="text-emerald-400" />
            </div>
          )}

          {status === 'error' && (
            <div className="h-16 w-16 rounded-full border border-rose-500/30 flex items-center justify-center bg-rose-500/10 shadow-[0_0_25px_rgba(244,63,94,0.25)] animate-in zoom-in duration-300">
              <ShieldAlert size={32} className="text-rose-400" />
            </div>
          )}
        </div>

        {/* Content & Messages */}
        {status === 'loading' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-white tracking-tight text-glow-blue">
              Verifying Security Token
            </h2>
            <p className="text-sm text-gray-400 leading-relaxed max-w-xs mx-auto">
              Exchanging secure email credentials with Supabase. Syncing your premium flyer profile...
            </p>
            <div className="pt-2 flex justify-center items-center gap-1.5 text-xs text-blue-400 font-semibold uppercase tracking-wider animate-pulse">
              <span>Establishing connection</span>
              <span className="flex gap-0.5">
                <span className="animate-bounce delay-75">.</span>
                <span className="animate-bounce delay-150">.</span>
                <span className="animate-bounce delay-300">.</span>
              </span>
            </div>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-white tracking-tight text-glow-emerald">
              Account Verified!
            </h2>
            <p className="text-sm text-gray-400 leading-relaxed max-w-xs mx-auto">
              Your email was successfully validated. Welcome aboard AeroFlight, flyer!
            </p>
            <p className="text-xs text-blue-400/80 font-medium">
              Redirecting to departures lounge...
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-6 w-full">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white tracking-tight text-glow-rose">
                Verification Failed
              </h2>
              <p className="text-sm text-gray-400 leading-relaxed max-w-xs mx-auto">
                {errorMsg || 'The verification link is invalid, expired, or has already been used.'}
              </p>
            </div>

            <div className="flex flex-col gap-3 w-full pt-4">
              <Link
                href="/login"
                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-sm text-white font-semibold shadow-[0_4px_20px_rgba(59,130,246,0.2)] transition-all duration-200"
              >
                <span>Return to Login</span>
                <ArrowRight size={14} />
              </Link>
              
              <Link
                href="/"
                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 active:scale-[0.98] text-sm text-gray-300 font-semibold border border-white/5 transition-all duration-200"
              >
                <Home size={14} />
                <span>Go to Homepage</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AuthCallback() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center">
          <div className="w-full max-w-md glass-panel p-10 rounded-3xl border border-white/10 flex flex-col items-center justify-center text-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <p className="text-sm text-gray-400 font-medium">Loading callback router...</p>
          </div>
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
