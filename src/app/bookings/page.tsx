'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/store/useUserStore';
import {
  Plane,
  ArrowRight,
  ArrowLeft,
  XCircle,
  AlertTriangle,
  Loader2,
  ShieldAlert,
  Ticket,
  Clock,
  RefreshCw,
  Info,
  Lock
} from 'lucide-react';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// Type definitions
interface Flight {
  id: string;
  flight_number: string;
  origin: string;
  destination: string;
  departure_time: string;
  arrival_time: string;
  price: number;
  status: 'scheduled' | 'delayed' | 'cancelled' | 'completed';
}

interface Seat {
  id: string;
  flight_id: string;
  seat_number: string;
  class: 'business' | 'economy';
  is_locked: boolean;
  locked_at: string | null;
  locked_by: string | null;
  booking_id: string | null;
}

interface Passenger {
  first_name: string;
  last_name: string;
  seat: Seat;
}

interface Booking {
  id: string;
  status: 'confirmed' | 'cancelled' | 'rescheduled';
  total_price: number;
  created_at: string;
  flight: Flight;
  passengers: Passenger[];
}

// Database query interfaces to satisfy strict ESLint Rules
interface DbSeat {
  id: string;
  flight_id: string;
  seat_number: string;
  class: 'business' | 'economy';
  booking_id: string | null;
}

interface DbPassenger {
  first_name: string;
  last_name: string;
  seat: DbSeat | null;
}

interface DbBooking {
  id: string;
  status: 'confirmed' | 'cancelled' | 'rescheduled';
  total_price: number;
  created_at: string;
  flight: Flight | null;
  passengers: DbPassenger[] | null;
}

export default function BookingsPage() {
  const { user } = useUserStore();

  // Booking list states
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'cancelled'>('active');

  // Cancellation modal states
  const [cancellingBooking, setCancellingBooking] = useState<Booking | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Rescheduling wizard states
  const [reschedulingBooking, setReschedulingBooking] = useState<Booking | null>(null);
  const [altFlights, setAltFlights] = useState<Flight[]>([]);
  const [loadingAltFlights, setLoadingAltFlights] = useState(false);
  const [selectedAltFlight, setSelectedAltFlight] = useState<Flight | null>(null);
  const [seatsList, setSeatsList] = useState<Seat[]>([]);
  const [loadingSeats, setLoadingSeats] = useState(false);
  const [selectedSeatNumber, setSelectedSeatNumber] = useState<string | null>(null);
  const [rescheduling, setRescheduling] = useState(false);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);

  // 1. Fetch user bookings (wrapped in useCallback for hook dependency sanity)
  const fetchBookings = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          status,
          total_price,
          created_at,
          flight:flights (
            id,
            flight_number,
            origin,
            destination,
            departure_time,
            arrival_time,
            price,
            status
          ),
          passengers (
            first_name,
            last_name,
            seat:seats (
              id,
              flight_id,
              seat_number,
              class,
              booking_id
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      if (data) {
        // Map raw DB response strictly
        const rawList = data as unknown as DbBooking[];
        const mappedBookings: Booking[] = rawList.map((b) => ({
          id: b.id,
          status: b.status,
          total_price: Number(b.total_price),
          created_at: b.created_at,
          flight: b.flight || {
            id: '',
            flight_number: 'N/A',
            origin: 'Unknown',
            destination: 'Unknown',
            departure_time: new Date().toISOString(),
            arrival_time: new Date().toISOString(),
            price: 0,
            status: 'scheduled'
          },
          passengers: (b.passengers || []).map((p) => ({
            first_name: p.first_name,
            last_name: p.last_name,
            seat: p.seat
              ? {
                id: p.seat.id,
                flight_id: p.seat.flight_id,
                seat_number: p.seat.seat_number,
                class: p.seat.class,
                is_locked: false,
                locked_at: null,
                locked_by: null,
                booking_id: p.seat.booking_id
              }
              : {
                id: '',
                flight_id: '',
                seat_number: 'Unassigned',
                class: 'economy',
                is_locked: false,
                locked_at: null,
                locked_by: null,
                booking_id: null
              }
          }))
        }));
        setBookings(mappedBookings);
      }
    } catch (err: unknown) {
      console.error('Failed to load bookings:', err);
      const msg = err instanceof Error ? err.message : 'An error occurred while fetching your bookings.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchBookings();
    } else {
      setLoading(false);
    }
  }, [user, fetchBookings]);

  // 2. Fetch alternative flights for rescheduling
  const handleStartReschedule = async (booking: Booking) => {
    setReschedulingBooking(booking);
    setSelectedAltFlight(null);
    setSelectedSeatNumber(null);
    setRescheduleError(null);
    setLoadingAltFlights(true);

    try {
      // Find flights with same origin/destination but different flight ID
      const { data, error } = await supabase
        .from('flights')
        .select('*')
        .eq('origin', booking.flight.origin)
        .eq('destination', booking.flight.destination)
        .neq('id', booking.flight.id)
        .gte('departure_time', new Date().toISOString())
        .order('departure_time', { ascending: true });

      if (error) throw error;
      setAltFlights((data || []) as Flight[]);
    } catch (err: unknown) {
      console.error('Failed to load alternate flights:', err);
      const msg = err instanceof Error ? err.message : 'Could not fetch alternative flights.';
      setRescheduleError(msg);
    } finally {
      setLoadingAltFlights(false);
    }
  };

  // 3. Load seats for the selected alternate flight & setup Realtime channel
  useEffect(() => {
    if (!selectedAltFlight) return;

    const fetchSeats = async () => {
      setLoadingSeats(true);
      try {
        const { data, error } = await supabase
          .from('seats')
          .select('*')
          .eq('flight_id', selectedAltFlight.id)
          .order('seat_number');
        if (!error && data) {
          setSeatsList(data as Seat[]);
        }
      } catch (err) {
        console.error('Error fetching alternate seats:', err);
      } finally {
        setLoadingSeats(false);
      }
    };

    fetchSeats();

    // Enable Supabase Realtime channel subscription for concurrent seat updates on rescheduling flight
    const channel = supabase
      .channel(`reschedule_seats_${selectedAltFlight.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'seats',
          filter: `flight_id=eq.${selectedAltFlight.id}`,
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
  }, [selectedAltFlight]);

  // 4. Group seats by Row for visual grid layout
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

    Object.keys(rows).forEach((r) => {
      rows[Number(r)].sort((a, b) => a.seat_number.localeCompare(b.seat_number));
    });

    return rows;
  }, [seatsList]);

  // 5. Execute atomic reschedule booking via Postgres RPC
  const handleConfirmReschedule = async () => {
    if (!reschedulingBooking || !selectedAltFlight || !selectedSeatNumber) return;

    setRescheduling(true);
    setRescheduleError(null);

    // Calculate final rescheduled price (matches new flight fare)
    const newPrice = Number(selectedAltFlight.price);

    try {
      const { data, error } = await supabase.rpc('reschedule_booking', {
        p_booking_id: reschedulingBooking.id,
        p_new_flight_id: selectedAltFlight.id,
        p_new_seat_number: selectedSeatNumber,
        p_new_price: newPrice
      });

      if (error) {
        setRescheduleError(error.message);
      } else if (data) {
        setReschedulingBooking(null);
        setSelectedAltFlight(null);
        setSelectedSeatNumber(null);
        await fetchBookings();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred during rescheduling.';
      setRescheduleError(msg);
    } finally {
      setRescheduling(false);
    }
  };

  // 6. Execute atomic cancellation via Postgres RPC
  const handleConfirmCancellation = async () => {
    if (!cancellingBooking) return;

    setCancelling(true);
    setCancelError(null);

    try {
      const { data, error } = await supabase.rpc('cancel_booking', {
        p_booking_id: cancellingBooking.id
      });

      if (error) {
        setCancelError(error.message);
      } else if (data) {
        setCancellingBooking(null);
        await fetchBookings();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred during cancellation.';
      setCancelError(msg);
    } finally {
      setCancelling(false);
    }
  };

  // Helper: check if flight departure is within 2 hours
  const isWithin2Hours = (departureTimeStr: string) => {
    const departureTime = new Date(departureTimeStr).getTime();
    const now = new Date().getTime();
    const diffMs = departureTime - now;
    return diffMs < 2 * 60 * 60 * 1000; // 2 hours in ms
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

  // Filter bookings based on tab
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (activeTab === 'active') {
        return b.status === 'confirmed' || b.status === 'rescheduled';
      } else {
        return b.status === 'cancelled';
      }
    });
  }, [bookings, activeTab]);

  return (
    <div className="flex flex-col gap-8 py-6 md:py-12 max-w-6xl mx-auto px-4">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in duration-500">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Ticket className="h-7 w-7 text-blue-500 rotate-45" />
            <span>My Bookings Dashboard</span>
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Manage your active flight schedules, process cancellations, or reschedule seats dynamically.
          </p>
        </div>
        <button
          onClick={fetchBookings}
          disabled={loading || !user}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-xs font-semibold text-gray-300 hover:text-white transition-all disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Sync Status</span>
        </button>
      </div>

      {/* Auth Guard Banner */}
      {!user ? (
        <div className="glass-panel p-12 rounded-3xl border border-white/5 text-center space-y-6 animate-in slide-in-from-bottom-6 duration-500 max-w-md mx-auto">
          <Lock className="h-12 w-12 text-blue-500 mx-auto" />
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-white">Authentication Required</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Please sign in or register to pull your booked tickets, track flights, or perform safety cancellations.
            </p>
          </div>
          <div className="flex gap-4 justify-center">
            <Link
              href="/login"
              className="px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-all"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="px-6 py-2.5 text-xs font-bold text-gray-300 hover:text-white border border-white/5 bg-white/5 hover:bg-white/10 rounded-xl transition-all"
            >
              Register
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Tabs Control */}
          <div className="flex border-b border-white/5 gap-6 text-sm font-semibold select-none animate-in fade-in duration-500">
            <button
              onClick={() => setActiveTab('active')}
              className={`pb-3 relative transition-all ${activeTab === 'active' ? 'text-blue-500' : 'text-gray-500 hover:text-gray-300'
                }`}
            >
              <span>Active Trips</span>
              {activeTab === 'active' && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-500 rounded-full"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab('cancelled')}
              className={`pb-3 relative transition-all ${activeTab === 'cancelled' ? 'text-blue-500' : 'text-gray-500 hover:text-gray-300'
                }`}
            >
              <span>Past & Cancelled</span>
              {activeTab === 'cancelled' && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-500 rounded-full"></div>
              )}
            </button>
          </div>

          {/* Bookings View Grid */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 animate-in fade-in">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <p className="text-sm text-gray-400 font-medium">Querying reservation details...</p>
            </div>
          ) : errorMsg ? (
            <div className="glass-panel p-6 rounded-2xl border border-red-500/10 bg-red-500/5 text-center max-w-lg mx-auto space-y-4">
              <AlertTriangle className="h-10 w-10 text-red-500 mx-auto" />
              <div>
                <h4 className="text-base font-bold text-white">Database Query Failure</h4>
                <p className="text-xs text-gray-400 mt-1">{errorMsg}</p>
              </div>
              <button
                onClick={fetchBookings}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl"
              >
                Retry Request
              </button>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="glass-panel p-16 rounded-3xl border border-white/5 text-center space-y-4 animate-in fade-in duration-500">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600/10 border border-blue-500/20 text-blue-400">
                <Plane size={24} className="rotate-45" />
              </div>
              <h3 className="text-lg font-bold text-white">No Bookings Found</h3>
              <p className="text-sm text-gray-500 max-w-sm mx-auto leading-relaxed">
                {activeTab === 'active'
                  ? "You don't have any upcoming confirmed flights scheduled. Search routes on the main flight screen to book tickets."
                  : "You don't have any past or cancelled bookings on this account."}
              </p>
              {activeTab === 'active' && (
                <Link
                  href="/"
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-lg transition-all"
                >
                  <span>Search Flights</span>
                  <ArrowRight size={12} />
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 animate-in fade-in duration-500">
              {filteredBookings.map((booking) => {
                const isLocked = isWithin2Hours(booking.flight.departure_time);
                const isCancelled = booking.status === 'cancelled';
                const passenger = booking.passengers[0];

                return (
                  <div
                    key={booking.id}
                    className="glass-panel rounded-3xl border border-white/5 overflow-hidden shadow-xl hover:border-white/10 transition-all duration-300 relative"
                  >
                    {/* Status accent bars */}
                    <div
                      className={`absolute top-0 left-0 right-0 h-[3px] ${isCancelled
                          ? 'bg-red-500'
                          : booking.status === 'rescheduled'
                            ? 'bg-purple-500'
                            : 'bg-emerald-500'
                        }`}
                    ></div>

                    <div className="p-6 md:p-8 flex flex-col lg:flex-row justify-between items-stretch gap-8">
                      {/* Ticket Flight Segment Info */}
                      <div className="flex-1 space-y-6">

                        {/* Upper card row */}
                        <div className="flex items-center gap-4 flex-wrap">
                          <span className="text-xs font-bold text-white bg-blue-600/10 border border-blue-500/20 px-3 py-1 rounded-lg">
                            {booking.flight.flight_number}
                          </span>
                          <span
                            className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${isCancelled
                                ? 'bg-red-500/10 border-red-500/20 text-red-400'
                                : booking.status === 'rescheduled'
                                  ? 'bg-purple-500/10 border-purple-500/20 text-purple-400'
                                  : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                              }`}
                          >
                            {booking.status}
                          </span>
                          <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider flex items-center gap-1">
                            <Clock size={11} className="text-blue-400" />
                            <span>Booked {new Date(booking.created_at).toLocaleDateString()}</span>
                          </span>
                        </div>

                        {/* Route Nodes Display */}
                        <div className="flex items-center gap-4 sm:gap-6 max-w-md">
                          <div>
                            <h3 className="text-2xl sm:text-3xl font-black text-white">
                              {booking.flight.origin.match(/\(([^)]+)\)/)?.[1] || booking.flight.origin}
                            </h3>
                            <p className="text-[10px] text-gray-500 uppercase font-bold mt-1">Origin</p>
                          </div>
                          <div className="flex-1 flex flex-col items-center gap-1 px-2">
                            <span className="text-[8px] text-gray-500 font-bold tracking-widest uppercase">
                              12h Flight
                            </span>
                            <div className="w-full relative flex items-center">
                              <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                              <Plane size={10} className="text-blue-500 absolute left-1/2 -translate-x-1/2 rotate-90" />
                            </div>
                            <span className="text-[8px] text-gray-600 font-semibold uppercase tracking-wider">
                              Non-stop
                            </span>
                          </div>
                          <div>
                            <h3 className="text-2xl sm:text-3xl font-black text-white">
                              {booking.flight.destination.match(/\(([^)]+)\)/)?.[1] || booking.flight.destination}
                            </h3>
                            <p className="text-[10px] text-gray-500 uppercase font-bold mt-1">Destination</p>
                          </div>
                        </div>

                        {/* Passenger profile and metadata grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-white/5">
                          <div>
                            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider block">Passenger</span>
                            <span className="text-xs font-semibold text-white mt-1 block truncate max-w-[130px]">
                              {passenger ? `${passenger.first_name} ${passenger.last_name}` : 'Declined'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider block">Seat choice</span>
                            <span className="text-xs font-bold text-blue-400 mt-1 block">
                              {passenger?.seat ? passenger.seat.seat_number : 'None'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider block">Class Tier</span>
                            <span className="text-xs font-semibold text-white mt-1 block uppercase">
                              {passenger?.seat?.class || 'Economy'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider block">Departure</span>
                            <span className="text-xs font-semibold text-white mt-1 block">
                              {formatDate(booking.flight.departure_time)}
                            </span>
                          </div>
                        </div>

                      </div>

                      {/* Right Panel Actions & Barcode */}
                      <div className="lg:w-64 border-t lg:border-t-0 lg:border-l border-white/5 pt-6 lg:pt-0 lg:pl-6 flex flex-col justify-between gap-6">

                        <div className="space-y-4">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-gray-500 font-bold uppercase tracking-wider">Fare Price</span>
                            <span className="text-lg font-black text-white">${booking.total_price.toFixed(2)}</span>
                          </div>

                          {/* Action Buttons */}
                          {!isCancelled && (
                            <div className="flex flex-col gap-2">
                              {isLocked ? (
                                <div className="p-3 rounded-xl border border-amber-500/10 bg-amber-500/5 flex gap-2 text-[10px] text-amber-400 font-semibold leading-relaxed">
                                  <Info size={14} className="shrink-0" />
                                  <span>Departure is in under 2 hours. This flight can no longer be cancelled or rescheduled.</span>
                                </div>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleStartReschedule(booking)}
                                    className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-blue-600 border border-white/5 hover:border-blue-500/30 text-xs font-semibold text-white transition-all"
                                  >
                                    <span>Reschedule Flight</span>
                                  </button>
                                  <button
                                    onClick={() => setCancellingBooking(booking)}
                                    className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-red-500/10 bg-red-500/5 hover:bg-red-500/15 text-xs font-semibold text-red-400 hover:text-red-300 transition-all"
                                  >
                                    <span>Cancel Reservation</span>
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Visual Barcode strip on booking pass card */}
                        <div className="w-full h-8 bg-white/5 rounded flex items-center justify-around px-2 select-none relative overflow-hidden opacity-50">
                          {Array.from({ length: 32 }).map((_, idx) => (
                            <div
                              key={idx}
                              className="bg-white/40 h-6"
                              style={{
                                width: idx % 4 === 0 ? '3px' : idx % 3 === 0 ? '1px' : '2px',
                                opacity: idx % 5 === 0 ? 0.2 : 0.4
                              }}
                            ></div>
                          ))}
                        </div>

                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* -------------------- RESCHEDULING WIZARD MODAL Overlay -------------------- */}
      {reschedulingBooking && (
        <div className="fixed inset-0 z-50 bg-[#0B0F19]/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-4xl bg-[#0F1422] border border-white/5 rounded-3xl shadow-2xl p-6 md:p-8 space-y-6 my-8 animate-in zoom-in-95 duration-300 relative">

            <button
              onClick={() => {
                setReschedulingBooking(null);
                setSelectedAltFlight(null);
                setSelectedSeatNumber(null);
              }}
              className="absolute top-4 right-4 p-2 rounded-xl text-gray-500 hover:bg-white/5 hover:text-white transition-all"
            >
              <XCircle size={24} />
            </button>

            <div className="space-y-1">
              <span className="text-[10px] text-blue-500 font-bold uppercase tracking-wider block">Reschedule Process</span>
              <h2 className="text-xl md:text-2xl font-black text-white">Change Booking - {reschedulingBooking.flight.flight_number}</h2>
              <p className="text-xs text-gray-400">
                Reschedule from {reschedulingBooking.flight.origin} to {reschedulingBooking.flight.destination} below.
              </p>
            </div>

            {rescheduleError && (
              <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-xs font-semibold text-red-400 flex items-center gap-2">
                <ShieldAlert size={16} />
                <span>{rescheduleError}</span>
              </div>
            )}

            <div className="flex flex-col lg:flex-row gap-6">

              {/* Left side: Alternative flights listing or Seat selector */}
              <div className="flex-1 space-y-4">
                {!selectedAltFlight ? (
                  <>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Plane className="h-4 w-4 rotate-45 text-blue-400" />
                      <span>Select Alternative Flight</span>
                    </h3>

                    {loadingAltFlights ? (
                      <div className="flex flex-col items-center justify-center py-12 gap-2">
                        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                        <span className="text-xs text-gray-500">Searching alternative departures...</span>
                      </div>
                    ) : altFlights.length === 0 ? (
                      <div className="p-8 border border-white/5 bg-white/5 rounded-2xl text-center space-y-2">
                        <Info className="h-8 w-8 text-blue-400 mx-auto" />
                        <h4 className="text-xs font-bold text-white">No Alternates Found</h4>
                        <p className="text-2xs text-gray-500 max-w-xs mx-auto">
                          There are no other scheduled flights currently listed for this specific route.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3 max-h-80 overflow-y-auto pr-1">
                        {altFlights.map((alt) => (
                          <div
                            key={alt.id}
                            className="p-4 rounded-xl border border-white/5 bg-white/5 hover:border-blue-500/20 flex items-center justify-between gap-4 transition-all"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-white">{alt.flight_number}</span>
                                <span className="text-[9px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider">
                                  {alt.status}
                                </span>
                              </div>
                              <p className="text-[10px] text-gray-400 mt-1">{formatDate(alt.departure_time)}</p>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <span className="text-[9px] text-gray-500 uppercase tracking-wider block">Base Fare</span>
                                <span className="text-sm font-black text-white">${Number(alt.price).toFixed(2)}</span>
                              </div>
                              <button
                                onClick={() => setSelectedAltFlight(alt)}
                                className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-2xs font-bold text-white"
                              >
                                Select
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setSelectedAltFlight(null);
                        setSelectedSeatNumber(null);
                      }}
                      className="inline-flex items-center gap-1.5 text-xs text-blue-400 font-bold hover:underline"
                    >
                      <ArrowLeft size={12} />
                      <span>Back to Flights</span>
                    </button>

                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <h3 className="text-sm font-bold text-white">Choose New Seat</h3>
                      <span className="text-[10px] text-gray-500 font-medium">Flight: {selectedAltFlight.flight_number}</span>
                    </div>

                    {loadingSeats ? (
                      <div className="flex flex-col items-center justify-center py-16 gap-2">
                        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                        <span className="text-xs text-gray-500">Retrieving new seat layout...</span>
                      </div>
                    ) : (
                      /* Seat Map fuselage container with mobile responsive scrolling wrapper */
                      <div className="p-4 rounded-2xl border border-white/5 bg-[#080B12] flex flex-col items-center max-h-[300px] overflow-y-auto">
                        <div className="w-full overflow-x-auto pb-2 scrollbar-thin flex justify-center">
                          <div className="space-y-3 min-w-[280px] max-w-sm px-2">
                            {Object.keys(seatsByRow).map((rowNumStr) => {
                              const rowNum = Number(rowNumStr);
                              const seats = seatsByRow[rowNum];
                              const isBusiness = rowNum <= 3;

                              return (
                                <div key={rowNum} className="flex items-center justify-between gap-1 sm:gap-2">

                                  {/* Left Seat Group */}
                                  <div className="flex gap-1 flex-1 justify-end">
                                    {seats.slice(0, isBusiness ? 2 : 3).map((seat) => {
                                      const isOccupied = seat.booking_id !== null;
                                      const isSelected = selectedSeatNumber === seat.seat_number;
                                      return (
                                        <button
                                          key={seat.id}
                                          disabled={isOccupied}
                                          onClick={() => setSelectedSeatNumber(seat.seat_number)}
                                          className={`h-7 w-7 sm:h-8 sm:w-8 rounded-md text-[10px] font-bold transition-all border ${isOccupied
                                              ? 'bg-slate-900 border-slate-950 text-gray-800 cursor-not-allowed opacity-20'
                                              : isSelected
                                                ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_8px_rgba(59,130,246,0.6)] scale-105'
                                                : isBusiness
                                                  ? 'bg-indigo-600/10 border-indigo-500/20 text-indigo-300 hover:border-indigo-400'
                                                  : 'bg-white/5 border-white/5 text-gray-300 hover:border-white/20'
                                            }`}
                                        >
                                          {seat.seat_number.slice(-1)}
                                        </button>
                                      );
                                    })}
                                  </div>

                                  {/* Row label / aisle */}
                                  <div className="w-6 text-center text-[9px] text-gray-600 font-extrabold select-none py-1 bg-slate-950/40 rounded border border-white/5">
                                    {rowNum}
                                  </div>

                                  {/* Right Seat Group */}
                                  <div className="flex gap-1 flex-1 justify-start">
                                    {seats.slice(isBusiness ? 2 : 3).map((seat) => {
                                      const isOccupied = seat.booking_id !== null;
                                      const isSelected = selectedSeatNumber === seat.seat_number;
                                      return (
                                        <button
                                          key={seat.id}
                                          disabled={isOccupied}
                                          onClick={() => setSelectedSeatNumber(seat.seat_number)}
                                          className={`h-7 w-7 sm:h-8 sm:w-8 rounded-md text-[10px] font-bold transition-all border ${isOccupied
                                              ? 'bg-slate-900 border-slate-950 text-gray-800 cursor-not-allowed opacity-20'
                                              : isSelected
                                                ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_8px_rgba(59,130,246,0.6)] scale-105'
                                                : isBusiness
                                                  ? 'bg-indigo-600/10 border-indigo-500/20 text-indigo-300 hover:border-indigo-400'
                                                  : 'bg-white/5 border-white/5 text-gray-300 hover:border-white/20'
                                            }`}
                                        >
                                          {seat.seat_number.slice(-1)}
                                        </button>
                                      );
                                    })}
                                  </div>

                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Mini Legend */}
                        <div className="pt-4 border-t border-white/5 flex gap-3 text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-2 justify-center">
                          <div className="flex items-center gap-1">
                            <div className="h-2 w-2 bg-indigo-600/20 border border-indigo-500/30 rounded"></div>
                            <span>Biz</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="h-2 w-2 bg-blue-600 rounded"></div>
                            <span>Selected</span>
                          </div>
                          <div className="flex items-center gap-1 opacity-20">
                            <div className="h-2 w-2 bg-slate-900 rounded"></div>
                            <span>Booked</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Right side: Reschedule Price and calculations */}
              <div className="w-full lg:w-80 glass-panel p-6 rounded-2xl border border-white/5 flex flex-col justify-between gap-6">

                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-white">Summary of Adjustments</h3>

                  <div className="space-y-3.5 text-xs border-y border-white/5 py-4">
                    <div className="flex justify-between items-center text-gray-400">
                      <span>Original Booking Fare</span>
                      <span className="font-semibold text-white">${reschedulingBooking.total_price.toFixed(2)}</span>
                    </div>

                    {selectedAltFlight && (
                      <div className="flex justify-between items-center text-gray-400">
                        <span>New Flight Fare</span>
                        <span className="font-semibold text-white">${Number(selectedAltFlight.price).toFixed(2)}</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center text-gray-400">
                      <span>Rescheduling Service Fee</span>
                      <span className="font-semibold text-white">$50.00</span>
                    </div>

                    {selectedAltFlight && (
                      <div className="flex justify-between items-center pt-2 border-t border-white/5 text-gray-300">
                        <span className="font-bold">Total adjustment cost</span>
                        <span className="font-black text-blue-400 text-sm">
                          ${(
                            50.00 +
                            Math.max(0, Number(selectedAltFlight.price) - Number(reschedulingBooking.total_price))
                          ).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={handleConfirmReschedule}
                    disabled={rescheduling || !selectedAltFlight || !selectedSeatNumber}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-[0_4px_20px_rgba(59,130,246,0.2)] transition-all disabled:opacity-50"
                  >
                    {rescheduling ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <span>Approve & Reschedule</span>
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setReschedulingBooking(null);
                      setSelectedAltFlight(null);
                      setSelectedSeatNumber(null);
                    }}
                    className="w-full px-6 py-2.5 rounded-xl border border-white/5 hover:bg-white/5 text-xs text-gray-400 font-bold hover:text-white text-center transition-all"
                  >
                    Cancel Action
                  </button>
                </div>

              </div>

            </div>

          </div>
        </div>
      )}

      {/* -------------------- CANCELLATION CONFIRMATION MODAL -------------------- */}
      {cancellingBooking && (
        <div className="fixed inset-0 z-50 bg-[#0B0F19]/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0F1422] border border-white/5 rounded-3xl shadow-2xl p-6 md:p-8 space-y-6 animate-in zoom-in-95 duration-200">

            <div className="flex items-center gap-3 text-red-400">
              <AlertTriangle size={28} className="shrink-0" />
              <h3 className="text-lg font-black text-white">Confirm Cancellation</h3>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed">
              Are you sure you wish to cancel your scheduled trip {cancellingBooking.flight.flight_number} to {cancellingBooking.flight.destination}?
              This action is irreversible. The seat will be released immediately for other flyers, and your ticket status will transition to Cancelled.
            </p>

            {cancelError && (
              <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-xs font-semibold text-red-400 flex items-center gap-2">
                <ShieldAlert size={16} />
                <span>{cancelError}</span>
              </div>
            )}

            <div className="flex gap-4 pt-2">
              <button
                onClick={() => setCancellingBooking(null)}
                className="flex-1 px-4 py-3 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 text-xs font-bold text-gray-300 hover:text-white transition-all text-center"
              >
                Go Back
              </button>
              <button
                onClick={handleConfirmCancellation}
                disabled={cancelling}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-red-600 hover:bg-red-500 active:scale-[0.98] text-xs font-bold text-white shadow-[0_4px_20px_rgba(239,68,68,0.2)] transition-all disabled:opacity-50"
              >
                {cancelling ? (
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                ) : (
                  <span>Cancel Flight</span>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
