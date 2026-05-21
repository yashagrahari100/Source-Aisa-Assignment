'use client';

import React, { useState } from 'react';
import { WifiOff, RotateCw, BookOpen, ShieldCheck, Map } from 'lucide-react';

export default function OfflinePage() {
  const [checking, setChecking] = useState(false);
  const [failed, setFailed] = useState(false);

  const handleRetry = () => {
    setChecking(true);
    setFailed(false);
    
    // Simulate connection check
    setTimeout(() => {
      if (navigator.onLine) {
        window.location.reload();
      } else {
        setChecking(false);
        setFailed(true);
      }
    }, 1500);
  };

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-4 py-12">
      {/* Holographic Radar Glow Illustration */}
      <div className="relative mb-8 flex h-32 w-32 items-center justify-center">
        {/* Animated radar rings */}
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-500/10 opacity-75"></span>
        <div className="absolute h-24 w-24 rounded-full border border-blue-500/20 bg-blue-500/5 animate-pulse"></div>
        <div className="absolute h-16 w-16 rounded-full border border-blue-500/30 bg-blue-500/10"></div>
        
        {/* Main Icon */}
        <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/20 border border-blue-500/30 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
          <WifiOff size={28} className="animate-pulse" />
        </div>
      </div>

      {/* Headings */}
      <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
        You are currently <span className="text-blue-500 text-glow-blue">Offline</span>
      </h1>
      <p className="mt-4 max-w-md text-base text-gray-400 leading-relaxed">
        It looks like you&apos;ve lost your connection. Don&apos;t worry, AeroFlight is designed to keep you cruising even when disconnected!
      </p>

      {/* Actions */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row justify-center w-full max-w-xs">
        <button
          onClick={handleRetry}
          disabled={checking}
          className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-semibold transition-all duration-200 border border-blue-500/20 hover:border-blue-400/40 shadow-[0_4px_20px_rgba(59,130,246,0.25)] disabled:opacity-50"
        >
          <RotateCw size={18} className={`transition-transform duration-1000 ${checking ? 'animate-spin' : ''}`} />
          <span>{checking ? 'Testing Signal...' : 'Try Reconnecting'}</span>
        </button>
      </div>

      {/* Fail state warning */}
      {failed && (
        <p className="mt-3 text-sm font-medium text-red-400 animate-pulse">
          Still offline. Please check your network settings.
        </p>
      )}

      {/* Offline Features Info Cards */}
      <div className="mt-16 w-full max-w-3xl">
        <div className="relative border-t border-white/5 pt-8">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 bg-[#0B0F19] text-xs font-semibold uppercase tracking-wider text-blue-500">
            Cruising Features in Offline Mode
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
            <div className="glass-panel p-5 rounded-2xl text-left border border-white/5">
              <div className="h-9 w-9 rounded-lg bg-blue-600/10 border border-blue-500/15 flex items-center justify-center text-blue-400 mb-3.5">
                <BookOpen size={18} />
              </div>
              <h3 className="text-sm font-semibold text-white">Cached Flights</h3>
              <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                Browse previously searched flights and cached airline routes seamlessly.
              </p>
            </div>

            <div className="glass-panel p-5 rounded-2xl text-left border border-white/5">
              <div className="h-9 w-9 rounded-lg bg-emerald-600/10 border border-emerald-500/15 flex items-center justify-center text-emerald-400 mb-3.5">
                <ShieldCheck size={18} />
              </div>
              <h3 className="text-sm font-semibold text-white">Saved Reservations</h3>
              <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                Access your boarding tickets and flight reservations securely from device storage.
              </p>
            </div>

            <div className="glass-panel p-5 rounded-2xl text-left border border-white/5">
              <div className="h-9 w-9 rounded-lg bg-purple-600/10 border border-purple-500/15 flex items-center justify-center text-purple-400 mb-3.5">
                <Map size={18} />
              </div>
              <h3 className="text-sm font-semibold text-white">Local Diagnostics</h3>
              <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                Interact with the flight interface locally; sync changes instantly when connection returns.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
