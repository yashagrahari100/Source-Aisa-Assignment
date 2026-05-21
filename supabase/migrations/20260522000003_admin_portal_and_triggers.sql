-- Migration: Admin Portal Policies & Automatic Seat Generation Triggers
-- File: supabase/migrations/20260522000003_admin_portal_and_triggers.sql

-- -------------------------------------------------------------
-- 1. Create AFTER INSERT Trigger on Flights for Seat Generation
-- -------------------------------------------------------------

CREATE OR REPLACE FUNCTION generate_flight_seats()
RETURNS TRIGGER AS $$
DECLARE
  row_num INT;
  col_char TEXT;
  seat_no TEXT;
  cols_first TEXT[] := ARRAY['A', 'F'];
  cols_business TEXT[] := ARRAY['A', 'B', 'E', 'F'];
  cols_economy TEXT[] := ARRAY['A', 'B', 'C', 'D', 'E', 'F'];
BEGIN
  -- Seeding First Class: Rows 1 to 2, Columns A, F (4 seats total per flight, extra_fee = 300.00)
  FOR row_num IN 1..2 LOOP
    FOREACH col_char IN ARRAY cols_first LOOP
      seat_no := row_num || col_char;
      INSERT INTO seats (flight_id, seat_number, class, extra_fee, is_available)
      VALUES (NEW.id, seat_no, 'first', 300.00, true);
    END LOOP;
  END LOOP;

  -- Seeding Business Class: Rows 3 to 4, Columns A, B, E, F (8 seats total per flight, extra_fee = 150.00)
  FOR row_num IN 3..4 LOOP
    FOREACH col_char IN ARRAY cols_business LOOP
      seat_no := row_num || col_char;
      INSERT INTO seats (flight_id, seat_number, class, extra_fee, is_available)
      VALUES (NEW.id, seat_no, 'business', 150.00, true);
    END LOOP;
  END LOOP;

  -- Seeding Economy Class: Rows 5 to 12, Columns A, B, C, D, E, F (48 seats total per flight, extra_fee = 0.00)
  FOR row_num IN 5..12 LOOP
    FOREACH col_char IN ARRAY cols_economy LOOP
      seat_no := row_num || col_char;
      INSERT INTO seats (flight_id, seat_number, class, extra_fee, is_available)
      VALUES (NEW.id, seat_no, 'economy', 0.00, true);
    END LOOP;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if trigger exists before creating to prevent duplicate execution errors
DROP TRIGGER IF EXISTS auto_generate_flight_seats_trigger ON flights;

CREATE TRIGGER auto_generate_flight_seats_trigger
AFTER INSERT ON flights
FOR EACH ROW
EXECUTE FUNCTION generate_flight_seats();

-- -------------------------------------------------------------
-- 2. Configure Admin Access Row-Level Security (RLS) Policies
-- -------------------------------------------------------------

-- Flights Table Admin Policies (Admins can insert and update flights)
CREATE POLICY "Allow insert access to flights for admins" ON flights
  FOR INSERT WITH CHECK (auth.jwt() ->> 'email' LIKE '%@aeroflight.com');

CREATE POLICY "Allow update access to flights for admins" ON flights
  FOR UPDATE USING (auth.jwt() ->> 'email' LIKE '%@aeroflight.com');

-- Bookings Table Admin Policies (Admins can select and update all bookings)
CREATE POLICY "Allow select access to bookings for admins" ON bookings
  FOR SELECT USING (auth.jwt() ->> 'email' LIKE '%@aeroflight.com');

CREATE POLICY "Allow update access to bookings for admins" ON bookings
  FOR UPDATE USING (auth.jwt() ->> 'email' LIKE '%@aeroflight.com');

-- Passengers Table Admin Policies (Admins can read, insert, update, delete all passengers)
CREATE POLICY "Allow select access to passengers for admins" ON passengers
  FOR SELECT USING (auth.jwt() ->> 'email' LIKE '%@aeroflight.com');

CREATE POLICY "Allow insert access to passengers for admins" ON passengers
  FOR INSERT WITH CHECK (auth.jwt() ->> 'email' LIKE '%@aeroflight.com');

CREATE POLICY "Allow update access to passengers for admins" ON passengers
  FOR UPDATE USING (auth.jwt() ->> 'email' LIKE '%@aeroflight.com');

CREATE POLICY "Allow delete access to passengers for admins" ON passengers
  FOR DELETE USING (auth.jwt() ->> 'email' LIKE '%@aeroflight.com');

-- Seats Table Admin Policies (Admins can update seats)
CREATE POLICY "Allow update access to seats for admins" ON seats
  FOR UPDATE USING (auth.jwt() ->> 'email' LIKE '%@aeroflight.com');

-- Reschedules Table Admin Policies (Admins can read/audit reschedules)
CREATE POLICY "Allow select access to reschedules for admins" ON reschedules
  FOR SELECT USING (auth.jwt() ->> 'email' LIKE '%@aeroflight.com');
