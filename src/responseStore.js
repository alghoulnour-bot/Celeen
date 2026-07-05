const { sql } = require('./db');
const { findGuestByName } = require('./guestStore');

function keyOf(name) {
  return String(name || '').trim().toLowerCase();
}

async function get(name) {
  const rows = await sql`SELECT record FROM responses WHERE name_key = ${keyOf(name)}`;
  return rows[0] ? rows[0].record : null;
}

async function all() {
  const rows = await sql`SELECT record FROM responses`;
  return rows.map((r) => r.record);
}

// Upsert a person's response, merging new fields into any existing record.
async function upsert(name, patch) {
  const existing = (await get(name)) || { name: String(name).trim(), createdAt: new Date().toISOString() };
  const record = { ...existing, ...patch, name: String(name).trim(), updatedAt: new Date().toISOString() };
  await sql`INSERT INTO responses (name_key, record)
            VALUES (${keyOf(name)}, ${JSON.stringify(record)}::jsonb)
            ON CONFLICT (name_key) DO UPDATE SET record = EXCLUDED.record`;
  return record;
}

// Record a (self-reported) gift, ACCUMULATING onto any previous amount.
async function addGift(name, method, amount) {
  const existing = (await get(name)) || {};
  const total = (Number(existing.giftAmount) || 0) + (Number(amount) || 0);
  const methods = existing.giftMethod ? existing.giftMethod.split(',').map((s) => s.trim()) : [];
  if (method && !methods.includes(method)) methods.push(method);
  return upsert(name, {
    giftAmount: total,
    giftMethod: methods.join(', '),
    giftCount: (Number(existing.giftCount) || 0) + 1,
    giftReportedAt: new Date().toISOString(),
  });
}

// Stripe webhook — attach the actual charged amount to a known guest, once.
async function recordActualPayment(name, actualAmount) {
  const guest = name && (await findGuestByName(name));
  if (!guest) {
    console.warn('[webhook] payment for unknown guest reference:', name);
    return null;
  }
  const existing = await get(guest.name);
  if (existing && existing.giftActualAmount != null) {
    console.warn('[webhook] actual amount already recorded for', guest.name, '— ignoring');
    return existing;
  }
  return upsert(guest.name, { giftActualAmount: actualAmount, giftPaidAt: new Date().toISOString() });
}

module.exports = { get, all, upsert, addGift, recordActualPayment, findGuestByName };
