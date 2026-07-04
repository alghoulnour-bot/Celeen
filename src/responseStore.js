const { findGuestByName } = require('./guestStore');
const { readJson, writeJson } = require('./store');

const FILE = 'responses.json';

function keyOf(name) {
  return name.trim().toLowerCase();
}

// Upsert a guest's response, merging new fields into any existing record.
// Keyed by lowercased name so the attendance step and the gift step land on
// the same row.
function upsert(name, patch) {
  const responses = readJson(FILE, {});
  const k = keyOf(name);
  const existing = responses[k] || { name: name.trim(), createdAt: new Date().toISOString() };
  responses[k] = {
    ...existing,
    ...patch,
    name: name.trim(),
    updatedAt: new Date().toISOString(),
  };
  writeJson(FILE, responses);
  return responses[k];
}

function all() {
  return Object.values(readJson(FILE, {}));
}

function get(name) {
  if (!name) return null;
  return readJson(FILE, {})[keyOf(name)] || null;
}

// Used by the Stripe webhook to attach the *actual* charged amount to whoever
// the payment link was tagged with (client_reference_id = name). Only records
// for a known guest, stores under the canonical name, and never overwrites an
// amount already captured (so a replayed/duplicate event can't tamper).
function recordActualPayment(name, actualAmount) {
  const guest = name && findGuestByName(name);
  if (!guest) {
    console.warn('[webhook] payment for unknown guest reference:', name);
    return null;
  }
  const existing = readJson(FILE, {})[keyOf(guest.name)];
  if (existing && existing.giftActualAmount != null) {
    console.warn('[webhook] actual amount already recorded for', guest.name, '— ignoring');
    return existing;
  }
  return upsert(guest.name, { giftActualAmount: actualAmount, giftPaidAt: new Date().toISOString() });
}

module.exports = { upsert, all, get, recordActualPayment, findGuestByName };
