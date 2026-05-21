'use client';

import React from 'react';
import { Search, Calendar, MapPin, Sparkles, ShieldCheck, Clock, Users } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col gap-16 py-12 md:py-20">
      {/* Hero Section */}
      <div className="text-center max-w-3xl mx-auto space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider animate-pulse-glow">
          <Sparkles size={14} />
          <span>Next-Generation Flight Management</span>
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-none">
          Cruise the Skies in <span className="text-blue-500 text-glow-blue animate-gradient-shift">Ultimate Comfort</span>
        </h1>
        <p className="text-base sm:text-xl text-gray-400 max-w-xl mx-auto leading-relaxed">
          Book instantly, track schedules, and experience ultra-premium seat customization. Fully functional even when offline.
        </p>
      </div>

      {/* Mock Flight Search Bar */}
      <div className="w-full max-w-4xl mx-auto glass-panel p-6 rounded-3xl border border-white/5 shadow-[0_20px_50px_rgba(3,7,18,0.4)]">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin size={12} className="text-blue-400" />
              <span>Origin</span>
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Where from?"
                defaultValue="New York (JFK)"
                readOnly
                className="w-full bg-white/5 border border-white/5 focus:border-blue-500/30 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 cursor-not-allowed outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin size={12} className="text-blue-400" />
              <span>Destination</span>
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Where to?"
                defaultValue="London (LHR)"
                readOnly
                className="w-full bg-white/5 border border-white/5 focus:border-blue-500/30 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 cursor-not-allowed outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar size={12} className="text-blue-400" />
              <span>Departure</span>
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Date"
                defaultValue="May 25, 2026"
                readOnly
                className="w-full bg-white/5 border border-white/5 focus:border-blue-500/30 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 cursor-not-allowed outline-none"
              />
            </div>
          </div>

          <div className="flex items-end">
            <button
              disabled
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-blue-600/50 text-white/50 font-semibold cursor-not-allowed border border-blue-500/10 transition-all"
            >
              <Search size={18} />
              <span>Search Flights</span>
            </button>
          </div>
        </div>
        <div className="mt-4 text-center">
          <span className="text-xs text-gray-500">
            Interactive search and dynamic booking integration will be configured in subsequent phases.
          </span>
        </div>
      </div>

      {/* Value Propositions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl mx-auto">
        <div className="glass-panel p-6 rounded-2xl border border-white/5 glass-panel-hover">
          <div className="h-10 w-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4 shadow-[0_0_15px_rgba(59,130,246,0.1)]">
            <ShieldCheck size={20} />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Atomic Seat Locking</h3>
          <p className="text-sm text-gray-500 leading-relaxed">
            State-of-the-art concurrency management using PostgreSQL Row-Level locking and atomic RPC transactions to secure your flight seats.
          </p>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-white/5 glass-panel-hover">
          <div className="h-10 w-10 rounded-xl bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
            <Clock size={20} />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">2-Hour Grace Cancellation</h3>
          <p className="text-sm text-gray-500 leading-relaxed">
            Strict safety triggers in Supabase DB block flight reservation cancellations automatically when inside the 2-hour departure safety window.
          </p>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-white/5 glass-panel-hover">
          <div className="h-10 w-10 rounded-xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4 shadow-[0_0_15px_rgba(168,85,247,0.1)]">
            <Users size={20} />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Standalone PWA Capabilities</h3>
          <p className="text-sm text-gray-500 leading-relaxed">
            Install on any device. Service workers cache assets and schedules, letting you manage and check bookings even high above in Airplane Mode.
          </p>
        </div>
      </div>
    </div>
  );
}
