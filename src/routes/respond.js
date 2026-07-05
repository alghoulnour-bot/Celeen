const express = require('express');
const { findPartyByMemberName, findGuestByName } = require('../guestStore');
const responseStore = require('../responseStore');

const router = express.Router();

// Lightweight in-memory rate limit (per IP). Note: resets per serverless cold
// start, but still blunts rapid scripted abuse within a warm instance.
const HITS = new Map();
const WINDOW_MS = 60 * 1000;
const MAX_HITS = 40;
function rateLimit(req, res, next) {
  const ip = req.ip || (req.connection && req.connection.remoteAddress) || 'unknown';
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

// Look up a whole party by any member's name.
router.get('/party', async (req, res, next) => {
  try {
    const party = await findPartyByMemberName(req.query.name);
    if (!party) return res.status(404).json({ error: 'Name not found on the guest list' });
    const responded = {};
    (await responseStore.all()).forEach((r) => { responded[norm(r.name)] = r; });
    const members = party.members.map((m) => {
      const rec = responded[norm(m)];
      return { name: m, attending: rec ? rec.attending === true : null, responded: !!rec };
    });
    res.json({ table: party.table, size: party.members.length, members });
  } catch (err) { next(err); }
});

// Record attendance for one or more members of a single party.
router.post('/party', async (req, res, next) => {
  try {
    const submitted = (req.body || {}).members;
    if (!Array.isArray(submitted) || !submitted.length) {
      return res.status(400).json({ error: 'No members provided' });
    }
    const party = await findPartyByMemberName(submitted[0].name);
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
    for (const m of submitted) {
      const guest = await findGuestByName(m.name);
      await responseStore.upsert(guest.name, {
        attending: m.attending,
        table: guest.table,
        partySize: guest.partySize,
        party: guest.party,
      });
    }
    res.json({ table: party.table });
  } catch (err) { next(err); }
});

// Whether a single person already responded (returning-guest fast path).
router.get('/status', async (req, res, next) => {
  try {
    const guest = await findGuestByName(req.query.name);
    if (!guest) return res.status(404).json({ error: 'Name not found on the guest list' });
    const rec = await responseStore.get(guest.name);
    res.json({
      name: guest.name,
      table: guest.table,
      responded: !!rec,
      attending: rec ? rec.attending === true : null,
    });
  } catch (err) { next(err); }
});

// Gift (nqoot) — accumulates onto any previous amount.
router.post('/gift', async (req, res, next) => {
  try {
    const { name, method, amount } = req.body || {};
    const guest = await findGuestByName(name);
    if (!guest) return res.status(404).json({ error: 'Name not found on the guest list' });
    if (method !== 'zelle' && method !== 'card') {
      return res.status(400).json({ error: 'Choose a payment method' });
    }
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return res.status(400).json({ error: 'Enter a valid amount' });
    }
    await responseStore.addGift(guest.name, method, parsed);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
