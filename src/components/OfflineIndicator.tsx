'use client';

import React, { useEffect, useState } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

export default function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(false);
  const [showOnlineNotification, setShowOnlineNotification] = useState(false);

  useEffect(() => {
    // Initial check
    if (typeof window !== 'undefined') {
      setIsOffline(!navigator.onLine);
    }

    const handleOnline = () => {
      setIsOffline(false);
      setShowOnlineNotification(true);
      const timer = setTimeout(() => setShowOnlineNotification(false), 4000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOffline) {
    return (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-bounce">
        <div className="glass-panel border-red-500/30 shadow-[0_8px_32px_rgba(239,68,68,0.15)] px-5 py-3 rounded-full flex items-center gap-3 text-red-400 text-sm font-semibold max-w-max">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
          </span>
          <WifiOff size={16} className="text-red-400" />
          <span>Offline Mode. Showing cached data.</span>
        </div>
      </div>
    );
  }

  if (showOnlineNotification) {
    return (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <div className="glass-panel border-emerald-500/30 shadow-[0_8px_32px_rgba(16,185,129,0.15)] px-5 py-3 rounded-full flex items-center gap-3 text-emerald-400 text-sm font-semibold max-w-max animate-fade-in-out">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <Wifi size={16} className="text-emerald-400" />
          <span>Connection restored!</span>
        </div>
      </div>
    );
  }

  return null;
}
