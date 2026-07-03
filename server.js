require('dotenv').config();
const express = require('express');
const path = require('path');

const guestsRouter = require('./src/routes/guests');
const rsvpRouter = require('./src/routes/rsvp');
const giftRouter = require('./src/routes/gift');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/guests', guestsRouter);
app.use('/api/rsvp', rsvpRouter);
app.use('/api/log-gift', giftRouter);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Wedding site running at http://localhost:${port}`);
});
