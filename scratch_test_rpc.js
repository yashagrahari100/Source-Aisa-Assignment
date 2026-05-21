const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://spbmkcmcdtqebammaarf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwYm1rY21jZHRxZWJhbW1hYXJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2ODI5MTcsImV4cCI6MjA4ODI1ODkxN30.NlwkAx0Nkyu_tG8mCgSUgRx5qc5zCTXQZyrm0TKNb9k';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  try {
    // 1. Sign up/in a temp user
    const email = `temp_${Math.floor(Math.random() * 1000000)}@gmail.com`;
    const password = 'Password123!';
    console.log('Signing up user:', email);
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password
    });

    if (authError) {
      console.error('Sign up failed:', authError);
      return;
    }
    console.log('User signed up successfully. ID:', authData.user.id);

    // 2. Insert a JIT flight
    const randomNum = Math.floor(100 + Math.random() * 900);
    const flightNum = `AF-${randomNum}`;
    const dateStr = '2026-05-27';
    const depTime = `${dateStr}T08:00:00.000Z`;
    const arrTime = `${dateStr}T20:00:00.000Z`;
    const price = '500.00'; // string price!

    console.log('Inserting flight with string price...');
    const { data: flight, error: flightError } = await supabase
      .from('flights')
      .insert({
        flight_number: flightNum,
        origin: 'Paris (CDG)',
        destination: 'London (LHR)',
        departure_time: depTime,
        arrival_time: arrTime,
        price: price,
        status: 'scheduled'
      })
      .select()
      .single();

    if (flightError) {
      console.error('Flight insert failed:', flightError);
      return;
    }
    console.log('Flight inserted successfully. ID:', flight.id, 'Price:', flight.price, 'Price type:', typeof flight.price);

    // 3. Call book_seat RPC with string price
    console.log('Calling book_seat RPC with string price...');
    const { data: bookingId, error: rpcError } = await supabase.rpc('book_seat', {
      p_flight_id: flight.id,
      p_seat_number: '4B',
      p_first_name: 'John',
      p_last_name: 'Doe',
      p_passport_number: 'AB123456',
      p_price: flight.price // This is returned as a string from select()!
    });

    if (rpcError) {
      console.error('RPC book_seat failed with string price:', rpcError);
    } else {
      console.log('RPC book_seat succeeded! Booking ID:', bookingId);
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

run();
