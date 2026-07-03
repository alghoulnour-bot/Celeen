const express = require('express');
const { getGuestNames } = require('../guestStore');

const router = express.Router();

router.get('/', (req, res) => {
  res.json(getGuestNames());
});

module.exports = router;
