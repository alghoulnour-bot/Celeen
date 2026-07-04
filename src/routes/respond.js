const express = require('express');
const { findPartyByMemberName, findGuestByName } = require('../guestStore');
const responseStore = require('../responseStore');

const router = express.Router();

// Lightweight in-memory rate limit (per IP) to blunt mass/scripted tampering.
const HITS = new Map();
const WINDOW_MS = 60 * 1000;
const MAX_HITS = 40;
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

function norm(s) { return String(s || '').trim().toLowerCase(); }

// Look up a whole party by any member's name — returns every member with their
// table and any prior attendance, so one person can RSVP for the household.
router.get('/party', (req, res) => {
  const party = findPartyByMemberName(req.query.name);
  if (!party) {
    return res.status(404).json({ error: 'Name not found on the guest list' });
  }
  const responded = {};
  responseStore.all().forEach((r) => { responded[norm(r.name)] = r; });
  const members = party.members.map((m) => {
    const rec = responded[norm(m)];
    return { name: m, attending: rec ? rec.attending === true : null, responded: !!rec };
  });
  res.json({ table: party.table, size: party.members.length, members });
});

// Record attendance for one or more members of a single party.
router.post('/party', (req, res) => {
  const submitted = (req.body || {}).members;
  if (!Array.isArray(submitted) || !submitted.length) {
    return res.status(400).json({ error: 'No members provided' });
  }
  // All submitted names must belong to ONE party (prevents marking arbitrary people).
  const party = findPartyByMemberName(submitted[0].name);
  if (!party) return res.status(404).json({ error: 'Name not found on the guest list' });
  const partyNames = new Set(party.members.map(norm));

  for (const m of submitted) {
    if (!m || !partyNames.has(norm(m.name))) {
      return res.status(400).json({ error: 'A name is not part of this party' });
    }
    if (typeof m.attending !== 'boolean') {
      return res.status(400).json({ error: 'attending must be true or false' });
    }
  }
  submitted.forEach((m) => {
    const guest = findGuestByName(m.name);
    responseStore.upsert(guest.name, {
      attending: m.attending,
      table: guest.table,
      partySize: guest.partySize,
      party: guest.party,
    });
  });
  res.json({ table: party.table });
});

// Whether a single person already responded (for the returning-guest fast path).
router.get('/status', (req, res) => {
  const guest = findGuestByName(req.query.name);
  if (!guest) return res.status(404).json({ error: 'Name not found on the guest list' });
  const rec = responseStore.get(guest.name);
  res.json({
    name: guest.name,
    table: guest.table,
    responded: !!rec,
    attending: rec ? rec.attending === true : null,
  });
});

// Gift (nqoot) — accumulates onto any previous amount.
router.post('/gift', (req, res) => {
  const { name, method, amount } = req.body || {};
  const guest = findGuestByName(name);
  if (!guest) return res.status(404).json({ error: 'Name not found on the guest list' });
  if (method !== 'zelle' && method !== 'card') {
    return res.status(400).json({ error: 'Choose a payment method' });
  }
  const parsed = Number(amount);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return res.status(400).json({ error: 'Enter a valid amount' });
  }
  responseStore.addGift(guest.name, method, parsed);
  res.json({ ok: true });
});

module.exports = router;
