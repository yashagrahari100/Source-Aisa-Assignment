-- Migration: Add reschedule and cancellation atomic RPC functions
-- File: supabase/migrations/20260522000002_reschedule_and_cancel_triggers.sql

-- -------------------------------------------------------------
-- 1. Create reschedule_booking RPC function
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION reschedule_booking(
  p_booking_id UUID,
  p_new_flight_id UUID,
  p_new_seat_id UUID,
  p_new_price NUMERIC
)
RETURNS BOOLEAN AS $$
DECLARE
  v_old_flight_id UUID;
  v_old_seat_id UUID;
  v_old_price NUMERIC;
  v_old_flight_departure TIMESTAMPTZ;
  v_fee_charged NUMERIC;
  v_user_id UUID;
BEGIN
  -- 1. Auth and ownership checks
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized: You must be logged in to reschedule a booking.';
  END IF;

  SELECT flight_id, seat_id, total_price INTO v_old_flight_id, v_old_seat_id, v_old_price
  FROM bookings
  WHERE id = p_booking_id AND user_id = v_user_id AND status = 'confirmed';

  IF v_old_flight_id IS NULL THEN
    RAISE EXCEPTION 'not_found: Active confirmed booking not found or unauthorized.';
  END IF;

  -- 2. Enforce 2-Hour buffer cancellation/rescheduling protection
  SELECT departs_at INTO v_old_flight_departure
  FROM flights
  WHERE id = v_old_flight_id;

  IF (v_old_flight_departure - now()) < interval '2 hours' THEN
    RAISE EXCEPTION 'reschedule_failed: Reservations cannot be rescheduled within 2 hours of departure.';
  END IF;

  -- 3. Lock and update the selected seat on the target flight to prevent simultaneous booking race conditions
  -- Verify the new seat belongs to the new flight and is available
  IF NOT EXISTS (
    SELECT 1 FROM seats WHERE id = p_new_seat_id AND flight_id = p_new_flight_id AND is_available = true
  ) THEN
    RAISE EXCEPTION 'seat_occupied: Seat is already booked or does not exist.';
  END IF;

  -- Lock new seat
  PERFORM id FROM seats WHERE id = p_new_seat_id FOR UPDATE;

  -- 4. Mark old seat as available
  UPDATE seats
  SET is_available = true
  WHERE id = v_old_seat_id;

  -- 5. Mark new seat as unavailable
  UPDATE seats
  SET is_available = false
  WHERE id = p_new_seat_id;

  -- 6. Calculate fee charged (if new flight is more expensive)
  v_fee_charged := p_new_price - v_old_price;
  IF v_fee_charged < 0 THEN
    v_fee_charged := 0.00;
  END IF;

  -- 7. Update the booking's flight, seat, and price details
  UPDATE bookings
  SET flight_id = p_new_flight_id,
      seat_id = p_new_seat_id,
      total_price = p_new_price,
      status = 'confirmed'
  WHERE id = p_booking_id;

  -- 8. Log the reschedule action in the reschedule history audit
  INSERT INTO reschedules (booking_id, old_flight_id, new_flight_id, requested_at, fee_charged)
  VALUES (p_booking_id, v_old_flight_id, p_new_flight_id, now(), v_fee_charged);

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

  SELECT flight_id, seat_id INTO v_flight_id, v_seat_id
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
  IF v_seat_id IS NOT NULL THEN
    UPDATE seats
    SET is_available = true
    WHERE id = v_seat_id;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
