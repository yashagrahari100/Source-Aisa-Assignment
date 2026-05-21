import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// -------------------------------------------------------------
// 1. Data Interfaces
// -------------------------------------------------------------

export interface Flight {
  id: string;
  flight_no: string;
  origin: string;
  destination: string;
  departs_at: string;
  arrives_at: string;
  aircraft_type: string;
  base_price: number;
  status: 'scheduled' | 'delayed' | 'cancelled' | 'completed';
  created_at?: string;
}

export interface SearchParams {
  origin: string;
  destination: string;
  date: string;
}

export interface Passenger {
  full_name: string;
  passport_no: string;
  nationality: string;
  dob: string;
}

// -------------------------------------------------------------
// 2. Zustand State Interface
// -------------------------------------------------------------

export interface FlightState {
  searchParams: SearchParams;
  selectedFlight: Flight | null;
  selectedSeat: string | null;
  passenger: Passenger | null;
  searchResults: Flight[];
  isSearching: boolean;

  setSearchParams: (params: SearchParams) => void;
  setSelectedFlight: (flight: Flight | null) => void;
  setSelectedSeat: (seatNumber: string | null) => void;
  setPassenger: (passenger: Passenger | null) => void;
  setSearchResults: (results: Flight[]) => void;
  setIsSearching: (searching: boolean) => void;
  clearBookingFlow: () => void;
}

// -------------------------------------------------------------
// 3. Zustand Store with Persist & Secure Partialize
// -------------------------------------------------------------

export const useFlightStore = create<FlightState>()(
  persist(
    (set) => ({
      // Default States
      searchParams: { origin: '', destination: '', date: '' },
      selectedFlight: null,
      selectedSeat: null,
      passenger: null,
      searchResults: [],
      isSearching: false,

      // State Actions
      setSearchParams: (searchParams) => set({ searchParams }),
      setSelectedFlight: (selectedFlight) => set({ selectedFlight }),
      setSelectedSeat: (selectedSeat) => set({ selectedSeat }),
      setPassenger: (passenger) => set({ passenger }),
      setSearchResults: (searchResults) => set({ searchResults }),
      setIsSearching: (isSearching) => set({ isSearching }),
      
      clearBookingFlow: () => set({ 
        selectedFlight: null, 
        selectedSeat: null, 
        passenger: null 
      }),
    }),
    {
      name: 'aeroflight-flight-store',
      // partialize filters what properties of the store get saved to localStorage.
      // We safely intercept and completely strip 'passport_no' to preserve user privacy.
      partialize: (state) => {
        const { passenger, ...restOfState } = state;
        
        // Remove passport_no from passenger details before saving
        const safePassenger = passenger
          ? {
              full_name: passenger.full_name,
              passport_no: '', // Strip sensitive details from localStorage
              nationality: passenger.nationality,
              dob: passenger.dob,
            }
          : null;

        return {
          ...restOfState,
          passenger: safePassenger,
        };
      },
    }
  )
);
