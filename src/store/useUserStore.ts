import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Session } from '@supabase/supabase-js';

// -------------------------------------------------------------
// 1. Zustand User State Interface
// -------------------------------------------------------------

export interface UserState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;

  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  clearSession: () => void;
}

// -------------------------------------------------------------
// 2. Zustand Store with Persist for Offline identification
// -------------------------------------------------------------

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      session: null,
      isLoading: true,

      setUser: (user) => set({ user }),
      setSession: (session) =>
        set({
          session,
          user: session?.user || null,
          isLoading: false,
        }),
      setIsLoading: (isLoading) => set({ isLoading }),
      clearSession: () => set({ user: null, session: null, isLoading: false }),
    }),
    {
      name: 'aeroflight-user-store',
      // We only store the vital parts of the session/user to allow offline verification
      // and instant initial loads without showing flicker.
      partialize: (state) => ({
        user: state.user,
        session: state.session,
      }),
    }
  )
);
