'use client';

import React, { useEffect, useState } from 'react';
import { Download, X, Sparkles, Smartphone, ShieldCheck } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // 1. Check if user already dismissed the prompt in this session/localStorage
    if (typeof window !== 'undefined') {
      const dismissed = localStorage.getItem('aeroflight-pwa-prompt-dismissed');
      if (dismissed === 'true') {
        setIsDismissed(true);
      }
    }

    // 2. Listen to PWA installation offer event
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the default browser mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Update UI to show the install promotion banner if not dismissed before
      if (!isDismissed) {
        setIsVisible(true);
      }
    };

    // 3. Listen to successful installation event
    const handleAppInstalled = () => {
      console.log('AeroFlight PWA was successfully installed natively.');
      setIsVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isDismissed]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the browser install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the native install prompt: ${outcome}`);

    // We no longer need the prompt, clear it
    setDeferredPrompt(null);
    setIsVisible(false);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    // Remember dismissal for 7 days to avoid bothering the user too frequently
    if (typeof window !== 'undefined') {
      localStorage.setItem('aeroflight-pwa-prompt-dismissed', 'true');
    }
  };

  // If the app is already installed or is not installable, or was dismissed, don't show prompt
  if (!isVisible || isDismissed) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full mx-auto px-4 sm:px-0 animate-in slide-in-from-bottom-12 duration-500">
      <div className="glass-panel border-white/10 shadow-[0_20px_50px_rgba(59,130,246,0.15)] bg-slate-950/70 backdrop-blur-xl p-5 rounded-3xl relative overflow-hidden">
        
        {/* Visual Premium Ambient Light Effect */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl pointer-events-none"></div>
        
        {/* Dismiss Icon */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1.5 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition-all"
        >
          <X size={14} />
        </button>

        {/* Content Details */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.15)] shrink-0">
              <Smartphone size={20} className="animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest flex items-center gap-1">
                <Sparkles size={10} className="text-blue-400" />
                <span>PWA Capable</span>
              </span>
              <h3 className="text-sm font-black text-white leading-tight">Install AeroFlight App</h3>
            </div>
          </div>

          <p className="text-[11px] text-gray-400 leading-relaxed">
            Add AeroFlight to your home screen for desktop/mobile instant reservations, real-time live seat tracking, and full offline bookings dashboard.
          </p>

          <div className="flex gap-2.5 pt-1">
            <button
              onClick={handleInstallClick}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-2xs font-bold text-white shadow-[0_4px_15px_rgba(59,130,246,0.25)] transition-all"
            >
              <Download size={12} />
              <span>Install App</span>
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2.5 rounded-xl border border-white/5 hover:bg-white/5 text-2xs font-bold text-gray-400 hover:text-white transition-all text-center"
            >
              Later
            </button>
          </div>
        </div>

        {/* Brand Assurance Badge */}
        <div className="mt-3.5 pt-3 border-t border-white/5 flex items-center gap-1.5 text-[9px] text-gray-500 font-bold uppercase tracking-wider justify-center select-none">
          <ShieldCheck size={11} className="text-emerald-500" />
          <span>Standalone Secure Application</span>
        </div>

      </div>
    </div>
  );
}
