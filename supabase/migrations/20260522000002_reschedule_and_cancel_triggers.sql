-- Migration: Add reschedule and cancellation atomic RPC functions
-- File: supabase/migrations/20260522000002_reschedule_and_cancel_triggers.sql

-- -------------------------------------------------------------
-- 1. Create reschedule_booking RPC function
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION reschedule_booking(
  p_booking_id UUID,
  p_new_flight_id UUID,
  p_new_seat_number TEXT,
  p_new_price NUMERIC
)
RETURNS BOOLEAN AS $$
DECLARE
  v_old_flight_id UUID;
  v_old_seat_id UUID;
  v_new_seat_id UUID;
  v_old_flight_departure TIMESTAMPTZ;
  v_user_id UUID;
BEGIN
  -- 1. Auth and ownership checks
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized: You must be logged in to reschedule a booking.';
  END IF;

  SELECT flight_id INTO v_old_flight_id
  FROM bookings
  WHERE id = p_booking_id AND user_id = v_user_id AND status = 'confirmed';

  IF v_old_flight_id IS NULL THEN
    RAISE EXCEPTION 'not_found: Active confirmed booking not found or unauthorized.';
  END IF;

  -- 2. Enforce 2-Hour buffer cancellation/rescheduling protection
  SELECT departure_time INTO v_old_flight_departure
  FROM flights
  WHERE id = v_old_flight_id;

  IF (v_old_flight_departure - now()) < interval '2 hours' THEN
    RAISE EXCEPTION 'reschedule_failed: Reservations cannot be rescheduled within 2 hours of departure.';
  END IF;

  -- 3. Lock the selected seat on the target flight to prevent simultaneous booking race conditions
  SELECT id INTO v_new_seat_id
  FROM seats
  WHERE flight_id = p_new_flight_id
    AND seat_number = p_new_seat_number
    AND booking_id IS NULL
  FOR UPDATE;

  IF v_new_seat_id IS NULL THEN
    RAISE EXCEPTION 'seat_occupied: Seat % on the new flight is already booked or does not exist.', p_new_seat_number;
  END IF;

  -- 4. Find and release the current seat
  SELECT id INTO v_old_seat_id
  FROM seats
  WHERE booking_id = p_booking_id;

  IF v_old_seat_id IS NOT NULL THEN
    UPDATE seats
    SET booking_id = NULL
    WHERE id = v_old_seat_id;
  END IF;

  -- 5. Update the booking's flight and price details
  UPDATE bookings
  SET flight_id = p_new_flight_id,
      total_price = p_new_price,
      status = 'confirmed'
  WHERE id = p_booking_id;

  -- 6. Link the new seat to the booking
  UPDATE seats
  SET booking_id = p_booking_id
  WHERE id = v_new_seat_id;

  -- 7. Update the passenger's seat assignment reference
  UPDATE passengers
  SET seat_id = v_new_seat_id
  WHERE booking_id = p_booking_id;

  -- 8. Log the reschedule action in the reschedule history audit
  INSERT INTO reschedules (booking_id, old_flight_id, new_flight_id, rescheduled_by)
  VALUES (p_booking_id, v_old_flight_id, p_new_flight_id, v_user_id);

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -------------------------------------------------------------
-- 2. Create cancel_booking RPC function
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION cancel_booking(
  p_booking_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
  v_flight_id UUID;
  v_seat_id UUID;
BEGIN
  -- 1. Auth and ownership checks
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized: You must be logged in to cancel a booking.';
  END IF;

  SELECT flight_id INTO v_flight_id
  FROM bookings
  WHERE id = p_booking_id AND user_id = v_user_id AND status = 'confirmed';

  IF v_flight_id IS NULL THEN
    RAISE EXCEPTION 'not_found: Active confirmed booking not found or unauthorized.';
  END IF;

  -- 2. Update booking status to cancelled. 
  -- Note: This statement will automatically fire the BEFORE UPDATE 'check_cancellation_safety' trigger
  -- on the bookings table, aborting the process if the flight departs within 2 hours.
  UPDATE bookings
  SET status = 'cancelled'
  WHERE id = p_booking_id;

  -- 3. Release the seat if the cancellation passes the 2-hour safety check successfully
  SELECT id INTO v_seat_id
  FROM seats
  WHERE booking_id = p_booking_id;

  IF v_seat_id IS NOT NULL THEN
    UPDATE seats
    SET booking_id = NULL
    WHERE id = v_seat_id;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
