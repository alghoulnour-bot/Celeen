const express = require('express');
const { markRsvp } = require('../guestStore');

const router = express.Router();

router.post('/', (req, res) => {
  const { name } = req.body || {};
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const result = markRsvp(name);
  if (!result) {
    return res.status(404).json({ error: 'Name not found on the guest list' });
  }
  res.json(result);
});

module.exports = router;
