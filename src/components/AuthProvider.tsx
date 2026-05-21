'use client';

import React, { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/store/useUserStore';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const setSession = useUserStore((state) => state.setSession);
  const clearSession = useUserStore((state) => state.clearSession);
  const setIsLoading = useUserStore((state) => state.setIsLoading);

  useEffect(() => {
    // 1. Get initial session
    const initializeAuth = async () => {
      setIsLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setSession(session);
        } else {
          clearSession();
        }
      } catch (err) {
        console.error('Error initializing auth session:', err);
        clearSession();
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // 2. Listen for auth changes (sign in, sign out, token refresh, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setSession(session);
      } else {
        clearSession();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setSession, clearSession, setIsLoading]);

  return <>{children}</>;
}
