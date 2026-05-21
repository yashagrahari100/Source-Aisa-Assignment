'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useFlightStore, Flight } from '@/store/useFlightStore';
import { useUserStore } from '@/store/useUserStore';
import {
  Search,
  Calendar,
  MapPin,
  Sparkles,
  ShieldCheck,
  Clock,
  Users,
  Plane,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Lock,
  User as UserIcon,
  CheckCircle2,
  Ticket,
  ChevronRight,
  ShieldAlert,
  Globe
} from 'lucide-react';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// Strict typing for Airplane Seats
interface Seat {
  id: string;
  flight_id: string;
  seat_number: string;
  class: 'economy' | 'business' | 'first';
  is_available: boolean;
  extra_fee: number;
}

const DEFAULT_AIRPORTS = [
  'New York (JFK)',
  'London (LHR)',
  'Paris (CDG)',
  'Dubai (DXB)',
  'Singapore (SIN)',
  'Sydney (SYD)',
  'Tokyo (HND)',
  'Los Angeles (LAX)',
  'Frankfurt (FRA)',
  'San Francisco (SFO)',
  'Hong Kong (HKG)',
  'Mumbai (BOM)',
  'Delhi (DEL)'
];

export default function Home() {
  // Zustand State bindings
  const {
    searchParams,
    selectedFlight,
    selectedSeat,
    passenger,
    searchResults,
    isSearching,
    setSearchParams,
    setSelectedFlight,
    setSelectedSeat,
    setPassenger,
    setSearchResults,
    setIsSearching,
    clearBookingFlow
  } = useFlightStore();

  const { user, clearSession } = useUserStore();

  // Component UI state
  const [currentStep, setCurrentStep] = useState<'search' | 'seat' | 'passenger' | 'success'>('search');
  const [pnrCode, setPnrCode] = useState('');
  const [seatsList, setSeatsList] = useState<Seat[]>([]);
  const [loadingSeats, setLoadingSeats] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Scraped route listings with robust, pre-populated defaults to keep searches flexible
  const [origins, setOrigins] = useState<string[]>(DEFAULT_AIRPORTS);
  const [destinations, setDestinations] = useState<string[]>(DEFAULT_AIRPORTS);

  // Search input bindings with standard default fallbacks
  const [searchOrigin, setSearchOrigin] = useState(searchParams.origin || DEFAULT_AIRPORTS[0]);
  const [searchDestination, setSearchDestination] = useState(searchParams.destination || DEFAULT_AIRPORTS[1]);
  const [searchDate, setSearchDate] = useState(searchParams.date || new Date().toISOString().split('T')[0]);

  // Passenger form input bindings
  const [fullName, setFullName] = useState(passenger?.full_name || '');
  const [passportNo, setPassportNo] = useState(passenger?.passport_no || '');
  const [nationality, setNationality] = useState(passenger?.nationality || '');
  const [dob, setDob] = useState(passenger?.dob || '');

  // 1. Fetch dynamic route values on mount and merge them cleanly
  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        const { data, error } = await supabase.from('flights').select('origin, destination');
        if (!error && data) {
          const uniqueOrigins = Array.from(new Set([
            ...DEFAULT_AIRPORTS,
            ...data.map((f) => f.origin)
          ]));
          const uniqueDestinations = Array.from(new Set([
            ...DEFAULT_AIRPORTS,
            ...data.map((f) => f.destination)
          ]));
          setOrigins(uniqueOrigins);
          setDestinations(uniqueDestinations);

          // Functional updates completely remove direct state dependencies from the effect body
          setSearchOrigin((prev) => prev || uniqueOrigins[0] || '');
          setSearchDestination((prev) => prev || uniqueDestinations[1] || '');
        }
      } catch (err) {
        console.error('Error listing routes:', err);
      }
    };
    fetchRoutes();
  }, []);

  // 2. Query Flights inside database
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    setSearchResults([]);

    console.log('AeroFlight Search Triggered. Criteria:', {
      searchOrigin,
      searchDestination,
      searchDate
    });

    try {
      let query = supabase.from('flights').select('*');

      if (searchOrigin) query = query.eq('origin', searchOrigin);
      if (searchDestination) query = query.eq('destination', searchDestination);
      if (searchDate) {
        query = query
          .gte('departs_at', `${searchDate}T00:00:00.000Z`)
          .lte('departs_at', `${searchDate}T23:59:59.999Z`);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Flight search error:', error.message);
      } else {
        let flightsData = (data || []) as Flight[];

        // If no flights exist for the selected route, dynamically register one on-demand (JIT)!
        if (flightsData.length === 0 && searchOrigin && searchDestination) {
          console.log(`No flights found for route: ${searchOrigin} -> ${searchDestination}. Registering JIT flight...`);
          const randomNum = Math.floor(100 + Math.random() * 900);
          const flightNum = `AF-${randomNum}`;
          const dateStr = searchDate || new Date().toISOString().split('T')[0];

          const depTime = `${dateStr}T08:00:00.000Z`;
          const arrTime = `${dateStr}T20:00:00.000Z`;
          const basePrice = 450.00 + Math.floor(Math.random() * 300);

          const { data: newFlight, error: insertError } = await supabase
            .from('flights')
            .insert({
              flight_no: flightNum,
              origin: searchOrigin,
              destination: searchDestination,
              departs_at: depTime,
              arrives_at: arrTime,
              base_price: basePrice,
              aircraft_type: 'Boeing 787-9 Dreamliner',
              status: 'scheduled'
            })
            .select()
            .single();

          if (insertError) {
            console.error('JIT Flight registration failed:', insertError.message);
          } else if (newFlight) {
            console.log('JIT Flight registered successfully with seats:', newFlight);
            flightsData = [newFlight as Flight];
          }
        }

        console.log('Final Flight Search Results:', flightsData);
        setSearchResults(flightsData);
        setSearchParams({ origin: searchOrigin, destination: searchDestination, date: searchDate });
      }
    } catch (err) {
      console.error('Failed to run flight search:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // 3. Load Seat mappings and establish Real-time listeners
  useEffect(() => {
    if (!selectedFlight) return;

    const fetchSeats = async () => {
      setLoadingSeats(true);
      const { data, error } = await supabase
        .from('seats')
        .select('*')
        .eq('flight_id', selectedFlight.id)
        .order('seat_number');
      if (!error && data) {
        setSeatsList(data as Seat[]);
      }
      setLoadingSeats(false);
    };

    fetchSeats();

    // Enable Supabase Realtime channel subscription for concurrent seat updates
    const channel = supabase
      .channel(`seats_flight_${selectedFlight.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'seats',
          filter: `flight_id=eq.${selectedFlight.id}`,
        },
        (payload: RealtimePostgresChangesPayload<Seat>) => {
          if (payload.eventType === 'UPDATE') {
            setSeatsList((prev) =>
              prev.map((s) => (s.id === payload.new.id ? { ...s, ...payload.new } : s))
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedFlight]);

  // 4. Group seats by Row for visual mapping
  const seatsByRow = useMemo(() => {
    const rows: { [key: number]: Seat[] } = {};
    seatsList.forEach((seat) => {
      const match = seat.seat_number.match(/^(\d+)([A-F])$/);
      if (match) {
        const rowNum = parseInt(match[1], 10);
        if (!rows[rowNum]) rows[rowNum] = [];
        rows[rowNum].push(seat);
      }
    });

    // Sort column alphabetical
    Object.keys(rows).forEach((r) => {
      rows[Number(r)].sort((a, b) => a.seat_number.localeCompare(b.seat_number));
    });

    return rows;
  }, [seatsList]);

  // 5. Atomic Seat Booking RPC invocation
  const handleBookingCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFlight || !selectedSeat || !user) return;

    if (!fullName || !passportNo || !nationality || !dob) {
      setBookingError('Please fill in all passenger details.');
      return;
    }

    setIsBooking(true);
    setBookingError(null);

    // Active session validation
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setBookingError('Your authentication session has expired or is invalid. Please log in again to reserve a seat.');
        clearSession();
        setIsBooking(false);
        return;
      }
    } catch (sessionErr) {
      console.error('Session sync verification failed:', sessionErr);
      setBookingError('Failed to verify active authentication session. Please try logging in again.');
      setIsBooking(false);
      return;
    }

    // Find the seat object to get its ID
    const selectedSeatObj = seatsList.find((s) => s.seat_number === selectedSeat);
    if (!selectedSeatObj) {
      setBookingError('Selected seat could not be found.');
      setIsBooking(false);
      return;
    }

    // Save temporary details in Zustand (Stripped inside partialize before localStorage saves)
    setPassenger({
      full_name: fullName,
      passport_no: passportNo,
      nationality: nationality,
      dob: dob
    });

    // Generate alphanumeric 6 uppercase character boarding pass code
    const generatedPnr = Array.from({ length: 6 }, () =>
      'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.charAt(Math.floor(Math.random() * 36))
    ).join('');

    try {
      const finalPrice = Number(selectedFlight.base_price) + Number(selectedSeatObj.extra_fee);

      const { data: bookingId, error } = await supabase.rpc('book_seat', {
        p_flight_id: selectedFlight.id,
        p_seat_id: selectedSeatObj.id,
        p_full_name: fullName,
        p_passport_no: passportNo,
        p_nationality: nationality,
        p_dob: dob,
        p_price: finalPrice,
        p_pnr_code: generatedPnr
      });

      if (error) {
        setBookingError(error.message);
      } else if (bookingId) {
        setPnrCode(generatedPnr);
        setCurrentStep('success');
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'An unexpected error occurred during reservation checkout.';
      setBookingError(errMsg);
    } finally {
      setIsBooking(false);
    }
  };

  const handleSelectFlight = (flight: Flight) => {
    setSelectedFlight(flight);
    setSelectedSeat(null);
    setBookingError(null);
    setCurrentStep('seat');
  };

  const handleBackToSearch = () => {
    setSelectedFlight(null);
    setSelectedSeat(null);
    setCurrentStep('search');
  };

  const handleResetFlow = () => {
    clearBookingFlow();
    setFullName('');
    setPassportNo('');
    setNationality('');
    setDob('');
    setBookingError(null);
    setCurrentStep('search');
  };

  // Helper: Format ISO date string nicely
  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC'
    });
  };

  return (
    <div className="flex flex-col gap-12 py-6 md:py-12">

      {/* -------------------- STEP 1: FLIGHT SEARCH & RESULTS -------------------- */}
      {currentStep === 'search' && (
        <div className="space-y-12">
          {/* Hero Branding */}
          <div className="text-center max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider animate-pulse-glow">
              <Sparkles size={14} />
              <span>Next-Generation Flight Management</span>
            </div>
            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-none">
              Cruise the Skies in <span className="text-blue-500 text-glow-blue animate-gradient-shift">Ultimate Comfort</span>
            </h1>
            <p className="text-base sm:text-xl text-gray-400 max-w-xl mx-auto leading-relaxed">
              Book instantly, select seats, and experience ultra-premium seat customization. Fully functional even offline.
            </p>
          </div>

          {/* Interactive Search Panel */}
          <div className="w-full max-w-4xl mx-auto glass-panel p-6 rounded-3xl border border-white/5 shadow-[0_20px_50px_rgba(3,7,18,0.4)] animate-in slide-in-from-bottom-6 duration-700">
            <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-4 gap-4">

              {/* Origin */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin size={12} className="text-blue-400" />
                  <span>Origin</span>
                </label>
                <select
                  value={searchOrigin}
                  onChange={(e) => setSearchOrigin(e.target.value)}
                  className="w-full bg-white/5 border border-white/5 focus:border-blue-500/30 focus:bg-slate-900/60 rounded-xl px-4 py-3 text-sm text-white outline-none transition-all cursor-pointer"
                >
                  {origins.map((o) => (
                    <option key={o} value={o} className="bg-[#0B0F19] text-white">{o}</option>
                  ))}
                  {origins.length === 0 && <option className="bg-[#0B0F19] text-white">Loading airports...</option>}
                </select>
              </div>

              {/* Destination */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin size={12} className="text-blue-400" />
                  <span>Destination</span>
                </label>
                <select
                  value={searchDestination}
                  onChange={(e) => setSearchDestination(e.target.value)}
                  className="w-full bg-white/5 border border-white/5 focus:border-blue-500/30 focus:bg-slate-900/60 rounded-xl px-4 py-3 text-sm text-white outline-none transition-all cursor-pointer"
                >
                  {destinations.map((d) => (
                    <option key={d} value={d} className="bg-[#0B0F19] text-white">{d}</option>
                  ))}
                  {destinations.length === 0 && <option className="bg-[#0B0F19] text-white">Loading airports...</option>}
                </select>
              </div>

              {/* Date */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar size={12} className="text-blue-400" />
                  <span>Departure Date</span>
                </label>
                <input
                  type="date"
                  value={searchDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setSearchDate(e.target.value)}
                  className="w-full bg-white/5 border border-white/5 focus:border-blue-500/30 rounded-xl px-4 py-3 text-sm text-white outline-none transition-all cursor-pointer"
                />
              </div>

              {/* Submit Button */}
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={isSearching}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white font-semibold border border-blue-500/20 hover:border-blue-400/40 shadow-[0_4px_20px_rgba(59,130,246,0.2)] transition-all duration-200 disabled:opacity-50"
                >
                  {isSearching ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Search size={18} />
                      <span>Search Flights</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Flight Search Results */}
          <div className="w-full max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Plane className="h-4 w-4 text-blue-400 rotate-45" />
                <span>Available Flights ({searchResults.length})</span>
              </h2>
            </div>

            {searchResults.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {searchResults.map((flight) => (
                  <div
                      key={flight.id}
                      className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 hover:border-blue-500/20 transition-all duration-300 relative group overflow-hidden"
                  >
                    {/* Visual Hover Glow */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                    {/* Flight Detail */}
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.1)]">
                        <Plane size={20} className="rotate-45" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">{flight.flight_no}</span>
                          <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-semibold uppercase tracking-wide">
                            {flight.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{flight.aircraft_type}</p>
                      </div>
                    </div>

                    {/* Route Timeline */}
                    <div className="flex items-center gap-4 sm:gap-6 flex-1 justify-center max-w-sm">
                      <div className="text-center">
                        <h3 className="text-lg font-bold text-white">{flight.origin.match(/\(([^)]+)\)/)?.[1] || flight.origin}</h3>
                        <p className="text-[10px] text-gray-500 uppercase mt-0.5">Origin</p>
                      </div>
                      <div className="flex-1 flex flex-col items-center gap-1.5 px-2">
                        <span className="text-[10px] text-gray-400 font-semibold tracking-wider">12 hrs</span>
                        <div className="w-full relative flex items-center">
                          <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                          <Plane size={10} className="text-blue-400 absolute left-1/2 -translate-x-1/2 rotate-90" />
                        </div>
                        <span className="text-[9px] text-gray-600 font-medium">Non-stop</span>
                      </div>
                      <div className="text-center">
                        <h3 className="text-lg font-bold text-white">{flight.destination.match(/\(([^)]+)\)/)?.[1] || flight.destination}</h3>
                        <p className="text-[10px] text-gray-500 uppercase mt-0.5">Destination</p>
                      </div>
                    </div>

                    {/* Price and Action */}
                    <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto border-t md:border-t-0 border-white/5 pt-4 md:pt-0">
                      <div className="text-left md:text-right">
                        <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider">From</p>
                        <h3 className="text-2xl font-black text-blue-400 mt-0.5">${Number(flight.base_price).toFixed(2)}</h3>
                      </div>
                      <button
                          onClick={() => handleSelectFlight(flight)}
                          className="flex items-center gap-1.5 px-5 py-3 rounded-xl bg-white/5 hover:bg-blue-600 border border-white/5 hover:border-blue-400/30 text-sm font-semibold text-white transition-all duration-300"
                      >
                        <span>Book Seat</span>
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="glass-panel p-12 rounded-3xl border border-white/5 text-center space-y-4 animate-in fade-in duration-500">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600/10 border border-blue-500/20 text-blue-400 mb-2">
                  <Plane size={24} className="rotate-45" />
                </div>
                <h3 className="text-lg font-bold text-white">Find Your Flight Route</h3>
                <p className="text-sm text-gray-500 max-w-sm mx-auto">
                  Select your origin, destination, and date in the panel above to list available international flights and reserve your premium seat.
                </p>
              </div>
            )}
          </div>

          {/* Value Propositions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-4xl mx-auto pt-6">
            <div className="glass-panel p-6 rounded-2xl border border-white/5">
              <div className="h-10 w-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4 shadow-[0_0_15px_rgba(59,130,246,0.1)]">
                <ShieldCheck size={20} />
              </div>
              <h3 className="text-base font-bold text-white mb-1.5">Atomic Seat Locking</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                State-of-the-art concurrency protection using SQL row locking and transaction RPCs to protect seat maps.
              </p>
            </div>

            <div className="glass-panel p-6 rounded-2xl border border-white/5">
              <div className="h-10 w-10 rounded-xl bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                <Clock size={20} />
              </div>
              <h3 className="text-base font-bold text-white mb-1.5">2-Hour Grace Cancellation</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Strict database triggers safeguard tickets automatically blocking cancellations within 2 hours of departure.
              </p>
            </div>

            <div className="glass-panel p-6 rounded-2xl border border-white/5">
              <div className="h-10 w-10 rounded-xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4 shadow-[0_0_15px_rgba(168,85,247,0.1)]">
                <Users size={20} />
              </div>
              <h3 className="text-base font-bold text-white mb-1.5">Standalone PWA Capabilities</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Add to your home screen. Fully functional cache stores keep layouts accessible even high up in Airplane Mode.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- STEP 2: INTERACTIVE SEAT MAP -------------------- */}
      {currentStep === 'seat' && selectedFlight && (
        <div className="w-full max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">

          {/* Progress Tracker */}
          <div className="flex items-center gap-1.5 text-xs text-gray-500 font-bold px-2 uppercase tracking-widest">
            <span>Search</span>
            <ChevronRight size={12} className="text-gray-700" />
            <span className="text-blue-500">Select Seat</span>
            <ChevronRight size={12} className="text-gray-700" />
            <span>Passenger details</span>
            <ChevronRight size={12} className="text-gray-700" />
            <span>Confirmation</span>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Seat Selection Panel */}
            <div className="flex-1 glass-panel p-6 sm:p-8 rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden flex flex-col items-center">

              {/* Cockpit Curve Overlay */}
              <div className="w-48 h-10 border-b-2 border-dashed border-white/10 rounded-b-full flex items-center justify-center text-[10px] text-gray-600 font-extrabold uppercase tracking-widest mb-8 bg-slate-950/20">
                Cockpit / Nose
              </div>

              {loadingSeats ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  <p className="text-sm text-gray-400 font-medium">Assembling live seat charts...</p>
                </div>
              ) : (
                <div className="w-full max-w-md space-y-6">

                  {/* Seat Map fuselage container with touch responsive scrolling */}
                  <div className="w-full overflow-x-auto pb-4 scrollbar-thin flex justify-center">
                    <div className="flex flex-col gap-2 min-w-[280px]">
                      {Object.keys(seatsByRow).map((rowNumStr) => {
                        const rowNum = Number(rowNumStr);
                        const seats = seatsByRow[rowNum];
                        
                        // Cabin zones checks
                        const isFirstClass = rowNum <= 2;
                        const isBusinessClass = rowNum === 3 || rowNum === 4;
                        
                        return (
                          <div key={rowNum} className="space-y-1">
                            {/* Class separation titles in grid */}
                            {rowNum === 1 && (
                              <div className="text-[10px] text-center font-bold tracking-widest text-amber-400/80 uppercase py-1 border-b border-amber-500/10 mb-2">
                                ★ First Class Zone
                              </div>
                            )}
                            {rowNum === 3 && (
                              <div className="text-[10px] text-center font-bold tracking-widest text-indigo-400/80 uppercase py-1 border-b border-indigo-500/10 mt-2 mb-2">
                                Business Cabin
                              </div>
                            )}
                            {rowNum === 5 && (
                              <div className="text-[10px] text-center font-bold tracking-widest text-gray-500/80 uppercase py-1 border-b border-white/5 mt-2 mb-2">
                                Economy Cabin
                              </div>
                            )}

                            <div className="flex items-center justify-between gap-2">
                              {/* Left Seats */}
                              <div className="flex gap-1.5 flex-1 justify-end">
                                {isFirstClass ? (
                                  // First Class has A only (B, C empty)
                                  seats.slice(0, 1).map((seat) => renderSeatButton(seat))
                                ) : isBusinessClass ? (
                                  // Business has A, B (C empty)
                                  seats.slice(0, 2).map((seat) => renderSeatButton(seat))
                                ) : (
                                  // Economy has A, B, C
                                  seats.slice(0, 3).map((seat) => renderSeatButton(seat))
                                )}
                              </div>

                              {/* Aisle */}
                              <div className="w-8 text-center text-[10px] text-gray-500 font-extrabold flex items-center justify-center select-none py-1 bg-slate-950/40 rounded border border-white/5">
                                {rowNum}
                              </div>

                              {/* Right Seats */}
                              <div className="flex gap-1.5 flex-1 justify-start">
                                {isFirstClass ? (
                                  // First Class has F only (D, E empty)
                                  seats.slice(1, 2).map((seat) => renderSeatButton(seat))
                                ) : isBusinessClass ? (
                                  // Business has E, F (D empty)
                                  seats.slice(2, 4).map((seat) => renderSeatButton(seat))
                                ) : (
                                  // Economy has D, E, F
                                  seats.slice(3, 6).map((seat) => renderSeatButton(seat))
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Seat Map Legend */}
                  <div className="pt-6 border-t border-white/5 flex flex-wrap items-center justify-center gap-4 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                    <div className="flex items-center gap-1.5">
                      <div className="h-3 w-3 bg-amber-500/10 border border-amber-500/20 rounded"></div>
                      <span>First (+$300)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-3 w-3 bg-indigo-600/10 border border-indigo-500/20 rounded"></div>
                      <span>Business (+$150)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-3 w-3 bg-white/5 border border-white/5 rounded"></div>
                      <span>Economy</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-3 w-3 bg-blue-600 border border-blue-400 rounded"></div>
                      <span>Selected</span>
                    </div>
                    <div className="flex items-center gap-1.5 opacity-40">
                      <div className="h-3 w-3 bg-slate-900 border border-slate-950 border-dashed rounded"></div>
                      <span>Booked</span>
                    </div>
                  </div>

                </div>
              )}
            </div>

            {/* Selection Overview Sidebar */}
            <div className="w-full lg:w-80 space-y-6">

              {/* Selected Flight Card */}
              <div className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4 relative overflow-hidden">
                <button
                  onClick={handleBackToSearch}
                  className="inline-flex items-center gap-1.5 text-xs text-blue-400 font-bold hover:underline mb-2"
                >
                  <ArrowLeft size={12} />
                  <span>Choose Another Flight</span>
                </button>

                <div className="space-y-1">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Your Flight Selection</span>
                  <h3 className="text-lg font-bold text-white">{selectedFlight.flight_no}</h3>
                </div>

                <div className="py-3 border-y border-white/5 space-y-2.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500">Departure</span>
                    <span className="text-white font-medium">{formatDate(selectedFlight.departs_at)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500">Arrival</span>
                    <span className="text-white font-medium">{formatDate(selectedFlight.arrives_at)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500">Route</span>
                    <span className="text-white font-medium truncate max-w-[150px]">
                      {selectedFlight.origin.split(' ')[0]} ➔ {selectedFlight.destination.split(' ')[0]}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500">Aircraft</span>
                    <span className="text-white font-medium truncate max-w-[150px]">
                      {selectedFlight.aircraft_type}
                    </span>
                  </div>
                </div>

                {selectedSeat ? (
                  <div className="pt-2 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Selected Seat</span>
                        <span className="text-xl font-black text-blue-400">{selectedSeat}</span>
                        <span className="text-[10px] text-gray-500 ml-1.5 uppercase font-semibold">
                          ({seatsList.find(s => s.seat_number === selectedSeat)?.class || 'Economy'})
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Ticket Fare</span>
                        <span className="text-xl font-black text-white">
                          ${(
                            Number(selectedFlight.base_price) +
                            Number(seatsList.find(s => s.seat_number === selectedSeat)?.extra_fee || 0)
                          ).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => setCurrentStep('passenger')}
                      className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white font-semibold shadow-[0_4px_20px_rgba(59,130,246,0.2)] transition-all duration-200"
                    >
                      <span>Proceed to Checkout</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="pt-2 text-center p-4 rounded-xl border border-white/5 bg-white/5 text-xs text-gray-400">
                    Select an available seat on the grid to unlock checkout.
                  </div>
                )}
              </div>

              {/* Realtime Safety Assurance */}
              <div className="glass-panel p-5 rounded-2xl border border-white/5 flex gap-3 text-xs text-gray-500">
                <Sparkles size={16} className="text-blue-400 shrink-0" />
                <div>
                  <h4 className="font-bold text-white mb-0.5">Real-time Updates Active</h4>
                  <p className="leading-relaxed">This seat chart is connected to Supabase Realtime channels. Concurrent seat selections by other flyers update live on your screen instantly.</p>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* -------------------- STEP 3: PASSENGER FORM & CHECKOUT -------------------- */}
      {currentStep === 'passenger' && selectedFlight && selectedSeat && (
        <div className="w-full max-w-xl mx-auto space-y-8 animate-in fade-in duration-500">
          {/* Progress Tracker */}
          <div className="flex items-center gap-1.5 text-xs text-gray-500 font-bold px-2 uppercase tracking-widest">
            <span>Search</span>
            <ChevronRight size={12} className="text-gray-700" />
            <span>Select Seat</span>
            <ChevronRight size={12} className="text-gray-700" />
            <span className="text-blue-500">Passenger details</span>
            <ChevronRight size={12} className="text-gray-700" />
            <span>Confirmation</span>
          </div>

          <div className="glass-panel p-8 rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden">
            {/* Glow Highlights */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-50/10 rounded-full blur-2xl"></div>
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-50/5 rounded-full blur-2xl"></div>

            <button
              onClick={() => setCurrentStep('seat')}
              className="inline-flex items-center gap-1.5 text-xs text-blue-400 font-bold hover:underline mb-6"
            >
              <ArrowLeft size={12} />
              <span>Back to Seat Chart</span>
            </button>

            <div className="space-y-2 mb-8">
              <h2 className="text-2xl font-black text-white">Passenger Credentials</h2>
              <p className="text-xs text-gray-400">
                Please enter traveler details matching your passport documents to complete the flight reservation.
              </p>
            </div>

            {/* Security Banner */}
            <div className="mb-6 p-4 rounded-xl border border-white/5 bg-white/5 flex gap-3 text-xs text-gray-400">
              <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0" />
              <div>
                <span className="font-bold text-white block">Strict Privacy Protection</span>
                Passport document details are secured using client-side partialize filters and will never be cached on localStorage.
              </div>
            </div>

            {bookingError && (
              <div className="mb-6 p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-xs font-semibold text-red-400 flex items-center gap-2">
                <ShieldAlert size={16} />
                <span>{bookingError}</span>
              </div>
            )}

            {!user ? (
              <div className="text-center p-8 border border-white/5 bg-white/5 rounded-2xl space-y-4">
                <Lock className="h-10 w-10 text-blue-400 mx-auto" />
                <h4 className="text-sm font-bold text-white">Authentication Required</h4>
                <p className="text-xs text-gray-500 max-w-xs mx-auto">
                  You must be registered and signed in to execute seat locking and finalize your airline booking.
                </p>
                <div className="pt-2 flex gap-4 justify-center">
                  <Link
                    href="/login"
                    className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 border border-blue-500/20 rounded-xl transition-all"
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    className="px-4 py-2 text-xs font-bold text-gray-300 hover:text-white border border-white/5 bg-white/5 hover:bg-white/10 rounded-xl transition-all"
                  >
                    Register
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleBookingCheckout} className="space-y-6">

                {/* Full Name */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                    <UserIcon size={10} className="text-blue-400" />
                    <span>Full Name</span>
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    required
                    placeholder="Traveler's full name as on passport"
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-white/5 border border-white/5 focus:border-blue-500/30 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 outline-none transition-colors"
                  />
                </div>

                {/* Passport Number */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                    <Lock size={10} className="text-blue-400" />
                    <span>Passport Number</span>
                  </label>
                  <input
                    type="text"
                    value={passportNo}
                    required
                    placeholder="e.g. A12345678"
                    onChange={(e) => setPassportNo(e.target.value)}
                    className="w-full bg-white/5 border border-white/5 focus:border-blue-500/30 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 outline-none transition-colors"
                  />
                </div>

                {/* Nationality */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                    <Globe size={10} className="text-blue-400" />
                    <span>Nationality</span>
                  </label>
                  <input
                    type="text"
                    value={nationality}
                    required
                    placeholder="e.g. United States"
                    onChange={(e) => setNationality(e.target.value)}
                    className="w-full bg-white/5 border border-white/5 focus:border-blue-500/30 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 outline-none transition-colors"
                  />
                </div>

                {/* Date of Birth */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                    <Calendar size={10} className="text-blue-400" />
                    <span>Date of Birth</span>
                  </label>
                  <input
                    type="date"
                    value={dob}
                    required
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full bg-white/5 border border-white/5 focus:border-blue-500/30 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 outline-none transition-colors cursor-pointer"
                  />
                </div>

                {/* Purchase Button */}
                <button
                  type="submit"
                  disabled={isBooking}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white font-bold transition-all duration-200 border border-blue-500/20 hover:border-blue-400/40 shadow-[0_4px_20px_rgba(59,130,246,0.2)] disabled:opacity-50"
                >
                  {isBooking ? (
                    <Loader2 className="h-5 w-5 animate-spin text-white" />
                  ) : (
                    <>
                      <span>Secure Seat & Reserve</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* -------------------- STEP 4: SUCCESS & DIGITAL BOARDING PASS -------------------- */}
      {currentStep === 'success' && selectedFlight && selectedSeat && (
        <div className="w-full max-w-lg mx-auto space-y-8 animate-in fade-in duration-500">

          {/* Confetti simulation graphic */}
          <div className="text-center space-y-4">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.25)] animate-bounce">
              <CheckCircle2 size={32} />
            </div>
            <h2 className="text-3xl font-extrabold text-white tracking-tight">Seat Secured Successfully!</h2>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              Your transaction is confirmed atomically. Below is your official flight PNR boarding credential.
            </p>
          </div>

          {/* Premium Digital Boarding Pass */}
          <div className="glass-panel rounded-3xl border border-white/5 overflow-hidden shadow-2xl relative select-none">
            {/* Top Pass Half */}
            <div className="p-6 sm:p-8 space-y-6 relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl"></div>

              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Plane className="h-5 w-5 text-blue-400 rotate-45" />
                  <span className="text-sm font-black text-white tracking-wider">AeroFlight Airlines</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider block">Reservation</span>
                  <span className="text-sm font-bold text-white">{selectedFlight.flight_no}</span>
                </div>
              </div>

              {/* Dynamic Flight Nodes */}
              <div className="flex items-center justify-between pt-2">
                <div>
                  <h3 className="text-3xl font-black text-white">{selectedFlight.origin.match(/\(([^)]+)\)/)?.[1] || selectedFlight.origin}</h3>
                  <p className="text-[10px] text-gray-500 font-bold uppercase mt-1">Origin</p>
                </div>
                <div className="flex-1 flex flex-col items-center gap-1.5 px-4">
                  <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">12h Non-Stop</span>
                  <div className="w-full relative flex items-center">
                    <div className="w-full h-[1px] bg-white/20"></div>
                    <Plane size={10} className="text-blue-400 absolute left-1/2 -translate-x-1/2 rotate-90" />
                  </div>
                </div>
                <div className="text-right">
                  <h3 className="text-3xl font-black text-white">{selectedFlight.destination.match(/\(([^)]+)\)/)?.[1] || selectedFlight.destination}</h3>
                  <p className="text-[10px] text-gray-500 font-bold uppercase mt-1">Destination</p>
                </div>
              </div>

              {/* Passenger and Seat metadata */}
              <div className="grid grid-cols-2 gap-y-4 pt-4 border-t border-white/5">
                <div>
                  <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider block">Passenger Name</span>
                  <span className="text-sm font-semibold text-white truncate block max-w-[180px]">
                    {fullName}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider block">Seat Number</span>
                  <span className="text-sm font-black text-blue-400 block">{selectedSeat}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider block">Departure Time</span>
                  <span className="text-xs text-white font-medium block">
                    {formatDate(selectedFlight.departs_at)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider block">Class Tier</span>
                  <span className="text-xs text-white font-semibold block uppercase">
                    {seatsList.find(s => s.seat_number === selectedSeat)?.class || 'economy'}
                  </span>
                </div>
              </div>

            </div>

            {/* Boarding Pass Tear Divider */}
            <div className="relative h-4 w-full flex items-center justify-between">
              <div className="h-6 w-3 bg-[#0B0F19] rounded-r-full -ml-1 border-r border-white/5"></div>
              <div className="flex-1 border-t border-dashed border-white/10 mx-2"></div>
              <div className="h-6 w-3 bg-[#0B0F19] rounded-l-full -mr-1 border-l border-white/5"></div>
            </div>

            {/* Bottom Pass Half */}
            <div className="p-6 sm:p-8 pt-4 space-y-6 bg-slate-950/20">

              <div className="flex justify-between items-center">
                <div>
                  <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider block">Official PNR Code</span>
                  <span className="text-2xl font-black tracking-widest text-blue-400 select-text">{pnrCode}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider block">Gate Closes</span>
                  <span className="text-sm font-bold text-white">45m before dept</span>
                </div>
              </div>

              {/* Barcode Mockup */}
              <div className="flex flex-col items-center gap-1.5 pt-2">
                <div className="w-full h-12 bg-white/5 border border-white/5 rounded-lg flex items-center justify-around px-4 select-none relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse-glow"></div>
                  {/* Generated Bars */}
                  {Array.from({ length: 48 }).map((_, idx) => (
                    <div
                      key={idx}
                      className="bg-white/40 h-8"
                      style={{
                        width: idx % 3 === 0 ? '3px' : idx % 5 === 0 ? '1px' : '2px',
                        opacity: idx % 7 === 0 ? 0.15 : 0.4
                      }}
                    ></div>
                  ))}
                </div>
                <span className="text-[9px] text-gray-600 font-extrabold uppercase tracking-widest">
                  Scan for Boarding Gate Passes
                </span>
              </div>

            </div>
          </div>

          {/* Core Actions */}
          <div className="pt-2 flex flex-col sm:flex-row gap-4 w-full">
            <Link
              href="/bookings"
              className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 text-sm font-bold text-white transition-all duration-200 active:scale-[0.98]"
            >
              <Ticket size={16} className="text-blue-400" />
              <span>View My Bookings</span>
            </Link>

            <button
              onClick={handleResetFlow}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white font-bold transition-all duration-200 shadow-[0_4px_20px_rgba(59,130,246,0.2)]"
            >
              <span>Book Another Flight</span>
              <ArrowRight size={16} />
            </button>
          </div>

        </div>
      )}

    </div>
  );

  // Seat Button rendering with premium interactive CSS tooltips
  function renderSeatButton(seat: Seat) {
    const isOccupied = !seat.is_available;
    const isCurrentSelect = selectedSeat === seat.seat_number;
    
    // Theme colors
    const classColorClass = 
      seat.class === 'first' 
        ? 'bg-amber-600/10 border-amber-500/20 hover:border-amber-400/40 text-amber-300' 
        : seat.class === 'business'
          ? 'bg-indigo-600/10 border-indigo-500/20 hover:border-indigo-400/40 text-indigo-300'
          : 'bg-white/5 border-white/5 hover:border-white/20 text-gray-300';

    return (
      <div key={seat.id} className="relative group/seat">
        <button
          type="button"
          disabled={isOccupied}
          onClick={() => setSelectedSeat(seat.seat_number)}
          className={`h-9 w-9 sm:h-10 sm:w-10 rounded-lg text-[11px] font-bold transition-all duration-200 flex items-center justify-center border ${
            isOccupied
              ? 'bg-slate-900/40 border-slate-950/30 text-gray-700 cursor-not-allowed border-dashed opacity-30'
              : isCurrentSelect
                ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_12px_rgba(59,130,246,0.6)] scale-105 active:scale-95'
                : classColorClass
          }`}
        >
          {seat.seat_number.slice(-1)}
        </button>

        {/* Premium Tooltip on hover (both mouse & touch responsive) */}
        <div className="absolute z-30 bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none opacity-0 group-hover/seat:opacity-100 transition-all duration-300 w-28 bg-[#0F1422] border border-white/10 rounded-xl p-2 shadow-2xl text-center space-y-0.5">
          <span className="text-[10px] font-black text-white block uppercase">{seat.seat_number}</span>
          <span className="text-[8px] font-bold text-blue-400 block uppercase">{seat.class} Class</span>
          <span className="text-[8px] font-medium text-gray-500 block">
            {isOccupied 
              ? 'Occupied' 
              : seat.extra_fee > 0 
                ? `+$${Number(seat.extra_fee).toFixed(0)} Fee` 
                : 'No Extra Fee'}
          </span>
          {/* Tooltip triangle tail */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-top-[#0F1422] w-0 h-0"></div>
        </div>
      </div>
    );
  }
}
