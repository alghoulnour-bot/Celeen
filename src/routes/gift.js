const express = require('express');
const { logGift } = require('../guestStore');

const router = express.Router();

// Zelle has no API/webhook for a website to verify a payment, so this
// just records what the guest tells us after they've sent it themselves.
router.post('/', (req, res) => {
  const { name, amount } = req.body || {};
  const parsedAmount = Number(amount);

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }
  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({ error: 'Enter a valid gift amount' });
  }

  const date = new Date().toISOString().slice(0, 10);
  logGift(name.trim(), parsedAmount, date);
  res.json({ ok: true });
});

module.exports = router;
