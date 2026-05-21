-- Migration: Add transactional RPC booking function
-- Implements race condition protection using Row-Level locks (SELECT FOR UPDATE)
-- to secure seat selections atomically in the new schema.

CREATE OR REPLACE FUNCTION book_seat(
  p_flight_id UUID,
  p_seat_id UUID,
  p_full_name TEXT,
  p_passport_no TEXT,
  p_nationality TEXT,
  p_dob DATE,
  p_price NUMERIC,
  p_pnr_code TEXT
)
RETURNS UUID AS $$
DECLARE
  v_booking_id UUID;
  v_seat_locked_id UUID;
  v_user_id UUID;
BEGIN
  -- Get current authenticated user ID from Supabase context
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized: You must be logged in to book a seat.';
  END IF;

  -- Find the seat and lock it for update to prevent simultaneous bookings on the exact same seat
  SELECT id INTO v_seat_locked_id
  FROM seats
  WHERE id = p_seat_id
    AND flight_id = p_flight_id
    AND is_available = true
  FOR UPDATE;

  IF v_seat_locked_id IS NULL THEN
    RAISE EXCEPTION 'seat_occupied: Seat is already booked or does not exist.';
  END IF;

  -- 1. Mark the seat as occupied
  UPDATE seats
  SET is_available = false
  WHERE id = v_seat_locked_id;

  -- 2. Create the booking record linked to user
  INSERT INTO bookings (user_id, flight_id, seat_id, total_price, status, pnr_code)
  VALUES (v_user_id, p_flight_id, v_seat_locked_id, p_price, 'confirmed', p_pnr_code)
  RETURNING id INTO v_booking_id;

  -- 3. Create the passenger record
  INSERT INTO passengers (booking_id, full_name, passport_no, nationality, dob)
  VALUES (v_booking_id, p_full_name, p_passport_no, p_nationality, p_dob);

  RETURN v_booking_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
