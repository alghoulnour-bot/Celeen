require('dotenv').config();
const express = require('express');
const path = require('path');
const db = require('./db');
const guestStore = require('./guestStore');

const app = express();
app.set('trust proxy', true);

// Ensure the database tables exist (and are seeded) exactly once, before the
// first request is handled — works for both the local server and a cold
// serverless invocation.
let readyPromise = null;
function ensureReady() {
  if (!readyPromise) {
    readyPromise = (async () => {
      await db.init();
      await guestStore.seedIfEmpty();
    })().catch((err) => { readyPromise = null; throw err; });
  }
  return readyPromise;
}
app.use((req, res, next) => { ensureReady().then(() => next()).catch(next); });

// Stripe webhook needs the RAW body for signature verification (before json()).
if (process.env.STRIPE_WEBHOOK_SECRET) {
  app.use('/api/stripe-webhook', express.raw({ type: 'application/json' }), require('./routes/stripeWebhook'));
}

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api/guests', require('./routes/guests'));
app.use('/api/respond', require('./routes/respond'));
app.use('/api/nqoot', require('./routes/nqoot'));
app.use('/admin', require('./routes/admin'));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

module.exports = app;
module.exports.ensureReady = ensureReady;
