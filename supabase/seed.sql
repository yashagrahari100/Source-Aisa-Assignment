-- Seed Flights across 4 routes (8 flights total)
-- Route 1: JFK (New York) <-> LHR (London)
-- Route 2: LAX (Los Angeles) <-> HND (Tokyo)
-- Route 3: CDG (Paris) <-> DXB (Dubai)
-- Route 4: SIN (Singapore) <-> SYD (Sydney)

INSERT INTO flights (flight_number, origin, destination, departure_time, arrival_time, price, status)
VALUES
  (
    'AF-101', 
    'New York (JFK)', 
    'London (LHR)', 
    '2026-05-25 08:00:00+00', 
    '2026-05-25 20:00:00+00', 
    550.00, 
    'scheduled'
  ),
  (
    'AF-102', 
    'London (LHR)', 
    'New York (JFK)', 
    '2026-05-26 14:00:00+00', 
    '2026-05-27 02:00:00+00', 
    620.00, 
    'scheduled'
  ),
  (
    'AF-201', 
    'Los Angeles (LAX)', 
    'Tokyo (HND)', 
    '2026-05-28 11:30:00+00', 
    '2026-05-29 13:00:00+00', 
    950.00, 
    'scheduled'
  ),
  (
    'AF-202', 
    'Tokyo (HND)', 
    'Los Angeles (LAX)', 
    '2026-05-30 22:00:00+00', 
    '2026-05-31 08:30:00+00', 
    890.00, 
    'scheduled'
  ),
  (
    'AF-301', 
    'Paris (CDG)', 
    'Dubai (DXB)', 
    '2026-06-02 16:45:00+00', 
    '2026-06-03 01:00:00+00', 
    480.00, 
    'scheduled'
  ),
  (
    'AF-302', 
    'Dubai (DXB)', 
    'Paris (CDG)', 
    '2026-06-03 09:15:00+00', 
    '2026-06-03 16:30:00+00', 
    520.00, 
    'scheduled'
  ),
  (
    'AF-401', 
    'Singapore (SIN)', 
    'Sydney (SYD)', 
    '2026-06-05 20:00:00+00', 
    '2026-06-06 04:00:00+00', 
    680.00, 
    'scheduled'
  ),
  (
    'AF-402', 
    'Sydney (SYD)', 
    'Singapore (SIN)', 
    '2026-06-07 10:30:00+00', 
    '2026-06-07 18:30:00+00', 
    710.00, 
    'scheduled'
  );

-- Dynamic generation block to seed 60 seats (12 Business + 48 Economy) for each flight.
-- Total seats generated: 8 flights * 60 seats = 480 seats.
DO $$
DECLARE
  flight_record RECORD;
  row_index INT;
  col_char CHAR;
  seat_no TEXT;
BEGIN
  FOR flight_record IN SELECT id FROM flights LOOP
    
    -- Seeding Business Class: Rows 1 to 3, Columns A, B, E, F (12 seats total per flight)
    FOR row_index IN 1..3 LOOP
      FOR col_char IN SELECT unnest(ARRAY['A', 'B', 'E', 'F']) LOOP
        seat_no := row_index || col_char;
        INSERT INTO seats (flight_id, seat_number, class)
        VALUES (flight_record.id, seat_no, 'business');
      END LOOP;
    END LOOP;

    -- Seeding Economy Class: Rows 4 to 11, Columns A, B, C, D, E, F (48 seats total per flight)
    FOR row_index IN 4..11 LOOP
      FOR col_char IN SELECT unnest(ARRAY['A', 'B', 'C', 'D', 'E', 'F']) LOOP
        seat_no := row_index || col_char;
        INSERT INTO seats (flight_id, seat_number, class)
        VALUES (flight_record.id, seat_no, 'economy');
      END LOOP;
    END LOOP;

  END LOOP;
END $$;
