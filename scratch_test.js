const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://spbmkcmcdtqebammaarf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwYm1rY21jZHRxZWJhbW1hYXJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2ODI5MTcsImV4cCI6MjA4ODI1ODkxN30.NlwkAx0Nkyu_tG8mCgSUgRx5qc5zCTXQZyrm0TKNb9k';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const randomNum = Math.floor(100 + Math.random() * 900);
  const flightNum = `AF-${randomNum}`;
  const dateStr = '2026-05-27';
  const depTime = `${dateStr}T08:00:00.000Z`;
  const arrTime = `${dateStr}T20:00:00.000Z`;
  const price = 500;

  console.log('Testing JIT flight insert with anon key...');
  const { data, error } = await supabase
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

  if (error) {
    console.error('Insert flight error:', error);
  } else {
    console.log('Insert flight success:', data);
  }
}

run();
