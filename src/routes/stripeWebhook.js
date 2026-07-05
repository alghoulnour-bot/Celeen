const express = require('express');
const crypto = require('crypto');
const responseStore = require('../responseStore');

const router = express.Router();

// Stripe webhook. FAILS CLOSED: server.js only mounts this route when
// STRIPE_WEBHOOK_SECRET is set, and every request must carry a valid
// Stripe signature or it is rejected — no anonymous payload can write data.
//
// Uses the raw body (mounted with express.raw in server.js) so the signature
// can be verified. This implements Stripe's documented signing scheme
// (t=timestamp,v1=hmacSHA256) without requiring the stripe npm package;
// once `npm install stripe` is added you may swap in stripe.webhooks.constructEvent.
const SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
const TOLERANCE = 5 * 60 * 1000; // 5 minutes

function verify(rawBody, sigHeader) {
  if (!SECRET || !sigHeader || !Buffer.isBuffer(rawBody)) return false;
  const parts = {};
  sigHeader.split(',').forEach((kv) => {
    const [k, v] = kv.split('=');
    if (k === 't') parts.t = v;
    if (k === 'v1') parts.v1 = v;
  });
  if (!parts.t || !parts.v1) return false;
  if (Math.abs(Date.now() - Number(parts.t) * 1000) > TOLERANCE) return false;
  const expected = crypto.createHmac('sha256', SECRET)
    .update(parts.t + '.' + rawBody.toString('utf8')).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(parts.v1);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

router.post('/', async (req, res) => {
  if (!verify(req.body, req.headers['stripe-signature'])) {
    return res.status(400).json({ error: 'Invalid signature' });
  }
  let event;
  try {
    event = JSON.parse(req.body.toString('utf8'));
  } catch (err) {
    return res.status(400).json({ error: 'Invalid payload' });
  }
  try {
    if (event.type === 'checkout.session.completed') {
      const session = (event.data && event.data.object) || {};
      const name = session.client_reference_id;
      const actual = Number(session.amount_total) / 100;
      if (name && Number.isFinite(actual)) {
        await responseStore.recordActualPayment(name, actual);
      }
    }
  } catch (err) {
    return res.status(500).json({ error: 'Webhook processing error' });
  }
  res.json({ received: true });
});

module.exports = router;
