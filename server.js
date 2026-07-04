require('dotenv').config();
const express = require('express');
const path = require('path');

const guestsRouter = require('./src/routes/guests');
const respondRouter = require('./src/routes/respond');
const adminRouter = require('./src/routes/admin');
const stripeWebhookRouter = require('./src/routes/stripeWebhook');

const app = express();

// Stripe webhook needs the RAW body for signature verification, so it is
// mounted before express.json() — and only when a signing secret is set, so a
// misconfigured deploy fails closed rather than accepting anonymous payloads.
if (process.env.STRIPE_WEBHOOK_SECRET) {
  app.use('/api/stripe-webhook', express.raw({ type: 'application/json' }), stripeWebhookRouter);
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/guests', guestsRouter);
app.use('/api/respond', respondRouter);
app.use('/admin', adminRouter);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Wedding site running at http://localhost:${port}`);
});
