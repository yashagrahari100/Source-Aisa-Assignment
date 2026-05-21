-- Enable gen_random_uuid() for keys if not already enabled
create extension if not exists "uuid-ossp";

-- -------------------------------------------------------------
-- 1. Create Tables
-- -------------------------------------------------------------

-- Flights Table
create table flights (
  id uuid primary key default gen_random_uuid(),
  flight_number text not null unique,
  origin text not null,
  destination text not null,
  departure_time timestamptz not null,
  arrival_time timestamptz not null,
  price numeric(10, 2) not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'delayed', 'cancelled', 'completed')),
  created_at timestamptz not null default now()
);

-- Bookings Table
create table bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  flight_id uuid references flights(id) on delete cascade,
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled', 'rescheduled')),
  total_price numeric(10, 2) not null,
  created_at timestamptz not null default now()
);

-- Seats Table
create table seats (
  id uuid primary key default gen_random_uuid(),
  flight_id uuid references flights(id) on delete cascade,
  seat_number text not null,
  class text not null check (class in ('business', 'economy')),
  is_locked boolean not null default false,
  locked_at timestamptz,
  locked_by uuid,
  booking_id uuid references bookings(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint unique_flight_seat unique (flight_id, seat_number)
);

-- Passengers Table
create table passengers (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references bookings(id) on delete cascade,
  seat_id uuid references seats(id) on delete restrict,
  first_name text not null,
  last_name text not null,
  passport_number text not null,
  created_at timestamptz not null default now()
);

-- Reschedules Table
create table reschedules (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references bookings(id) on delete cascade,
  old_flight_id uuid references flights(id) on delete restrict,
  new_flight_id uuid references flights(id) on delete restrict,
  rescheduled_at timestamptz not null default now(),
  rescheduled_by uuid references auth.users(id) on delete set null
);

-- -------------------------------------------------------------
-- 2. Create Trigger: Enforce 2-Hour Cancellation Protection
-- -------------------------------------------------------------

create or replace function check_cancellation_safety()
returns trigger as $$
declare
  flight_departure timestamptz;
begin
  -- Trigger conditions: Status changes from confirmed to cancelled
  if old.status = 'confirmed' and new.status = 'cancelled' then
    -- Retrieve flight departure time
    select departure_time into flight_departure 
    from flights 
    where id = old.flight_id;
    
    -- Check if departure time is within 2 hours from now
    if (flight_departure - now()) < interval '2 hours' then
      raise exception 'cancellation_failed: Reservations cannot be cancelled within 2 hours of departure.';
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger enforce_cancellation_safety_trigger
before update on bookings
for each row
execute function check_cancellation_safety();

-- -------------------------------------------------------------
-- 3. Configure Row-Level Security (RLS)
-- -------------------------------------------------------------

alter table flights enable row level security;
alter table seats enable row level security;
alter table bookings enable row level security;
alter table passengers enable row level security;
alter table reschedules enable row level security;

-- Flights RLS (Anyone can read, nobody on frontend inserts/updates)
create policy "Allow read access to flights for everyone" on flights
  for select using (true);

-- Seats RLS (Anyone can read/view seat maps, anyone can update for lock toggles)
create policy "Allow read access to seats for everyone" on seats
  for select using (true);

create policy "Allow update access to seats for everyone" on seats
  for update using (true);

-- Bookings RLS (Users see/create/update only their own bookings)
create policy "Allow select access to bookings for own user" on bookings
  for select using (auth.uid() = user_id);

create policy "Allow insert access to bookings for authenticated users" on bookings
  for insert with check (auth.uid() = user_id);

create policy "Allow update access to bookings for own user" on bookings
  for update using (auth.uid() = user_id);

-- Passengers RLS (Users see/create passengers linked to their bookings)
create policy "Allow select access to passengers of own bookings" on passengers
  for select using (
    exists (
      select 1 from bookings
      where bookings.id = passengers.booking_id
      and bookings.user_id = auth.uid()
    )
  );

create policy "Allow insert access to passengers of own bookings" on passengers
  for insert with check (
    exists (
      select 1 from bookings
      where bookings.id = passengers.booking_id
      and bookings.user_id = auth.uid()
    )
  );

create policy "Allow update access to passengers of own bookings" on passengers
  for update using (
    exists (
      select 1 from bookings
      where bookings.id = passengers.booking_id
      and bookings.user_id = auth.uid()
    )
  );

-- Reschedules RLS (Users see/create rescheduling entries linked to their bookings)
create policy "Allow select access to reschedules of own bookings" on reschedules
  for select using (
    exists (
      select 1 from bookings
      where bookings.id = reschedules.booking_id
      and bookings.user_id = auth.uid()
    )
  );

create policy "Allow insert access to reschedules of own bookings" on reschedules
  for insert with check (
    exists (
      select 1 from bookings
      where bookings.id = reschedules.booking_id
      and bookings.user_id = auth.uid()
    )
  );
