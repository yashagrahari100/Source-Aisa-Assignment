-- Seed Flights across 4 routes (8 flights total)
-- Route 1: JFK (New York) <-> LHR (London)
-- Route 2: LAX (Los Angeles) <-> HND (Tokyo)
-- Route 3: CDG (Paris) <-> DXB (Dubai)
-- Route 4: SIN (Singapore) <-> SYD (Sydney)

INSERT INTO flights (flight_no, origin, destination, departs_at, arrives_at, base_price, aircraft_type, status)
VALUES
  (
    'AF-101', 
    'New York (JFK)', 
    'London (LHR)', 
    '2026-05-25 08:00:00+00', 
    '2026-05-25 20:00:00+00', 
    550.00, 
    'Boeing 777-300ER',
    'scheduled'
  ),
  (
    'AF-102', 
    'London (LHR)', 
    'New York (JFK)', 
    '2026-05-26 14:00:00+00', 
    '2026-05-27 02:00:00+00', 
    620.00, 
    'Boeing 777-300ER',
    'scheduled'
  ),
  (
    'AF-201', 
    'Los Angeles (LAX)', 
    'Tokyo (HND)', 
    '2026-05-28 11:30:00+00', 
    '2026-05-29 13:00:00+00', 
    950.00, 
    'Airbus A350-1000',
    'scheduled'
  ),
  (
    'AF-202', 
    'Tokyo (HND)', 
    'Los Angeles (LAX)', 
    '2026-05-30 22:00:00+00', 
    '2026-05-31 08:30:00+00', 
    890.00, 
    'Airbus A350-1000',
    'scheduled'
  ),
  (
    'AF-301', 
    'Paris (CDG)', 
    'Dubai (DXB)', 
    '2026-06-02 16:45:00+00', 
    '2026-06-03 01:00:00+00', 
    480.00, 
    'Boeing 787-9 Dreamliner',
    'scheduled'
  ),
  (
    'AF-302', 
    'Dubai (DXB)', 
    'Paris (CDG)', 
    '2026-06-03 09:15:00+00', 
    '2026-06-03 16:30:00+00', 
    520.00, 
    'Boeing 787-9 Dreamliner',
    'scheduled'
  ),
  (
    'AF-401', 
    'Singapore (SIN)', 
    'Sydney (SYD)', 
    '2026-06-05 20:00:00+00', 
    '2026-06-06 04:00:00+00', 
    680.00, 
    'Airbus A380-800',
    'scheduled'
  ),
  (
    'AF-402', 
    'Sydney (SYD)', 
    'Singapore (SIN)', 
    '2026-06-07 10:30:00+00', 
    '2026-06-07 18:30:00+00', 
    710.00, 
    'Airbus A380-800',
    'scheduled'
  );

-- Note: Seats are automatically generated for each flight by the auto_generate_flight_seats_trigger trigger
-- which generates 60 seats (First Class, Business Class, and Economy Class) per inserted flight.
