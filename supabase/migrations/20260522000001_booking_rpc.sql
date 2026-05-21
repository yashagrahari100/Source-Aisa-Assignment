-- Migration: Add transactional RPC booking function
-- Implements race condition protection using Row-Level locks (SELECT FOR UPDATE)
-- to secure seat selections atomically.

CREATE OR REPLACE FUNCTION book_seat(
  p_flight_id UUID,
  p_seat_number TEXT,
  p_first_name TEXT,
  p_last_name TEXT,
  p_passport_number TEXT,
  p_price NUMERIC
)
RETURNS UUID AS $$
DECLARE
  v_booking_id UUID;
  v_seat_id UUID;
  v_user_id UUID;
BEGIN
  -- Get current authenticated user ID from Supabase contexts
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized: You must be logged in to book a seat.';
  END IF;

  -- Find the seat and lock it for update to prevent simultaneous bookings on the exact same seat row
  SELECT id INTO v_seat_id
  FROM seats
  WHERE flight_id = p_flight_id
    AND seat_number = p_seat_number
    AND booking_id IS NULL
  FOR UPDATE;

  IF v_seat_id IS NULL THEN
    RAISE EXCEPTION 'seat_occupied: Seat % is already booked or does not exist.', p_seat_number;
  END IF;

  -- 1. Create the booking record linked to user
  INSERT INTO bookings (user_id, flight_id, total_price, status)
  VALUES (v_user_id, p_flight_id, p_price, 'confirmed')
  RETURNING id INTO v_booking_id;

  -- 2. Create the passenger record
  INSERT INTO passengers (booking_id, seat_id, first_name, last_name, passport_number)
  VALUES (v_booking_id, v_seat_id, p_first_name, p_last_name, p_passport_number);

  -- 3. Update the seat record with the booking reference and release any potential lock indicators
  UPDATE seats
  SET booking_id = v_booking_id,
      is_locked = false,
      locked_by = NULL,
      locked_at = NULL
  WHERE id = v_seat_id;

  RETURN v_booking_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
