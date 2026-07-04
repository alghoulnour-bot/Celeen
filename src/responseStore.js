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

// Used by the (future) Stripe webhook to attach the *actual* charged amount
// to whoever the payment link was tagged with (client_reference_id = name).
function recordActualPayment(name, actualAmount) {
  if (!name) return null;
  return upsert(name, { giftActualAmount: actualAmount, giftPaidAt: new Date().toISOString() });
}

module.exports = { upsert, all, recordActualPayment, findGuestByName };
