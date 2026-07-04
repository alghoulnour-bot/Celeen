const express = require('express');
const { findGuestByName } = require('../guestStore');
const responseStore = require('../responseStore');

const router = express.Router();

// Step: attendance. Looks the guest up so table/party come from the server,
// not the client, and records whether they're coming.
router.post('/attend', (req, res) => {
  const { name, attending } = req.body || {};
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }
  const guest = findGuestByName(name);
  if (!guest) {
    return res.status(404).json({ error: 'Name not found on the guest list' });
  }
  responseStore.upsert(guest.name, {
    attending: attending !== false,
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
