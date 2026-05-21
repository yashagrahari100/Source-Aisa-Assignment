const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://spbmkcmcdtqebammaarf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwYm1rY21jZHRxZWJhbW1hYXJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2ODI5MTcsImV4cCI6MjA4ODI1ODkxN30.NlwkAx0Nkyu_tG8mCgSUgRx5qc5zCTXQZyrm0TKNb9k';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
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
      .eq('user_id', 'a35f4c88-9c7d-4dcb-b4d3-9ce4b8cea226');

    if (error) {
      console.error('API Error:', error);
      return;
    }

    console.log('Query succeeded! Data count:', data.length);
    console.log('First booking JSON:', JSON.stringify(data[0], null, 2));
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

run();
