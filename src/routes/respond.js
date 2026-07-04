const express = require('express');
const { findGuestByName } = require('../guestStore');
const responseStore = require('../responseStore');

const router = express.Router();

// Lightweight in-memory rate limit (per IP) to blunt mass/scripted tampering.
// This is an open, name-based wedding RSVP by design — no per-guest login — so
// this is the proportionate control rather than authenticating every guest.
const HITS = new Map();
const WINDOW_MS = 60 * 1000;
const MAX_HITS = 30;
function rateLimit(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  const rec = HITS.get(ip) || { count: 0, reset: now + WINDOW_MS };
  if (now > rec.reset) { rec.count = 0; rec.reset = now + WINDOW_MS; }
  rec.count += 1;
  HITS.set(ip, rec);
  if (rec.count > MAX_HITS) {
    return res.status(429).json({ error: 'Too many requests — please try again shortly.' });
  }
  next();
}
router.use(rateLimit);

// Look up a guest + any prior response, so a returning guest who already
// RSVP'd can skip straight to nqoot instead of re-confirming attendance.
router.get('/status', (req, res) => {
  const name = req.query.name;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }
  const guest = findGuestByName(name);
  if (!guest) {
    return res.status(404).json({ error: 'Name not found on the guest list' });
  }
  const rec = responseStore.get(guest.name);
  res.json({
    name: guest.name,
    table: guest.table,
    partySize: guest.partySize,
    responded: !!rec,
    attending: rec ? rec.attending === true : null,
    hasGift: !!(rec && rec.giftAmount != null),
  });
});

// Step: attendance. Looks the guest up so table/party come from the server,
// not the client, and records whether they're coming.
router.post('/attend', (req, res) => {
  const { name, attending } = req.body || {};
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }
  if (typeof attending !== 'boolean') {
    return res.status(400).json({ error: 'attending must be true or false' });
  }
  const guest = findGuestByName(name);
  if (!guest) {
    return res.status(404).json({ error: 'Name not found on the guest list' });
  }
  responseStore.upsert(guest.name, {
    attending,
    table: guest.table,
    partySize: guest.partySize,
  });
  res.json({ table: guest.table, partySize: guest.partySize });
});

// Step: gift (nqoot). Records the chosen method + self-reported amount.
// The name is validated against the guest list (same as /attend) and the
// canonical list value — not the raw client string — is what gets stored,
// so untrusted free text never reaches the admin dashboard.
router.post('/gift', (req, res) => {
  const { name, method, amount } = req.body || {};
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }
  const guest = findGuestByName(name);
  if (!guest) {
    return res.status(404).json({ error: 'Name not found on the guest list' });
  }
  if (method !== 'zelle' && method !== 'card') {
    return res.status(400).json({ error: 'Choose a payment method' });
  }
  const parsed = Number(amount);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return res.status(400).json({ error: 'Enter a valid amount' });
  }
  responseStore.upsert(guest.name, {
    giftMethod: method,
    giftAmount: parsed,
    giftReportedAt: new Date().toISOString(),
  });
  res.json({ ok: true });
});

module.exports = router;
