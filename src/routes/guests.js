const express = require('express');
const { getGuestNames } = require('../guestStore');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    res.json(await getGuestNames());
  } catch (err) { next(err); }
});

module.exports = router;
