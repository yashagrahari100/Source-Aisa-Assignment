import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Session } from '@supabase/supabase-js';

// -------------------------------------------------------------
// 1. Data Interfaces for Cache
// -------------------------------------------------------------

export interface CachedFlight {
  id: string;
  flight_no: string;
  origin: string;
  destination: string;
  departs_at: string;
  arrives_at: string;
  aircraft_type: string;
  base_price: number;
  status: 'scheduled' | 'delayed' | 'cancelled' | 'completed';
}

export interface CachedBooking {
  id: string;
  status: 'confirmed' | 'cancelled' | 'rescheduled';
  total_price: number;
  booked_at: string;
  pnr_code: string;
  flight: CachedFlight;
  passenger: {
    full_name: string;
    passport_no: string;
    nationality: string;
    dob: string;
  };
  seat: {
    id: string;
    seat_number: string;
    class: 'economy' | 'business' | 'first';
    extra_fee: number;
  };
}

// -------------------------------------------------------------
// 2. Zustand User State Interface
// -------------------------------------------------------------

export interface UserState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  bookingsCache: CachedBooking[];

  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  setBookingsCache: (bookings: CachedBooking[]) => void;
  clearSession: () => void;
}

// -------------------------------------------------------------
// 3. Zustand Store with Persist for Offline identification
// -------------------------------------------------------------

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      session: null,
      isLoading: true,
      bookingsCache: [],

      setUser: (user) => set({ user }),
      setSession: (session) =>
        set({
          session,
          user: session?.user || null,
          isLoading: false,
        }),
      setIsLoading: (isLoading) => set({ isLoading }),
      setBookingsCache: (bookingsCache) => set({ bookingsCache }),
      
      clearSession: () => set({ 
        user: null, 
        session: null, 
        isLoading: false,
        bookingsCache: [] 
      }),
    }),
    {
      name: 'aeroflight-user-store',
      // We persist only the session token details and bookingsCache to allow offline verification
      // and instant loads of bookings without network connectivity.
      partialize: (state) => ({
        session: state.session ? {
          access_token: state.session.access_token,
          refresh_token: state.session.refresh_token,
          expires_at: state.session.expires_at,
          token_type: state.session.token_type,
          user: state.session.user,
        } : null,
        bookingsCache: state.bookingsCache,
      }),
    }
  )
);
