const { neon } = require('@neondatabase/serverless');

// Neon serverless driver — works both in the local Node server and inside a
// Netlify Function (HTTP-based, no persistent connection needed).
const sql = neon(process.env.DATABASE_URL);

async function init() {
  await sql`CREATE TABLE IF NOT EXISTS parties (
    id text PRIMARY KEY,
    table_no integer NOT NULL,
    members jsonb NOT NULL
  )`;
  await sql`CREATE TABLE IF NOT EXISTS responses (
    name_key text PRIMARY KEY,
    record jsonb NOT NULL
  )`;
  // One row per completed Stripe Checkout session, so a card gift is only ever
  // counted once even if the return page is reloaded.
  await sql`CREATE TABLE IF NOT EXISTS gift_payments (
    session_id text PRIMARY KEY,
    name_key text NOT NULL,
    amount integer NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )`;
}

module.exports = { sql, init };
