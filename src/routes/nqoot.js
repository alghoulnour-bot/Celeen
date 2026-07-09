const express = require('express');
const { sql } = require('../db');
const { findGuestByName } = require('../guestStore');
const responseStore = require('../responseStore');

const router = express.Router();

// Stripe is optional at boot: if the key isn't set yet, the endpoints answer
// 503 instead of crashing the app.
const stripe = process.env.STRIPE_SECRET_KEY
  ? require('stripe')(process.env.STRIPE_SECRET_KEY)
  : null;

// Create a Stripe Checkout session for a card nqoot gift, then hand the
// browser the hosted-checkout URL to redirect to.
router.post('/checkout', async (req, res, next) => {
  try {
    if (!stripe) return res.status(503).json({ error: 'Card gifts aren’t set up yet.' });
    const { name, amount } = req.body || {};
    const guest = await findGuestByName(name);
    if (!guest) return res.status(404).json({ error: 'Name not found on the guest list' });
    const dollars = Math.round(Number(amount));
    if (!Number.isFinite(dollars) || dollars < 1 || dollars > 100000) {
      return res.status(400).json({ error: 'Enter a valid amount' });
    }
    const base = process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'], // card + Apple/Google Pay wallets
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: dollars * 100,
          product_data: { name: 'Nqoot — wedding gift for Omar & Celeen' },
        },
      }],
      metadata: { guest: guest.name, kind: 'nqoot' },
      success_url: `${base}/?nqoot=paid&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/?nqoot=cancel#nqoot`,
    });
    res.json({ url: session.url });
  } catch (err) { next(err); }
});

// On return from Checkout, verify the session was actually paid and record the
// gift exactly once (guarded by the gift_payments table).
router.get('/confirm', async (req, res, next) => {
  try {
    if (!stripe) return res.status(503).json({ error: 'Card gifts aren’t set up yet.' });
    const id = String(req.query.session_id || '');
    if (!id) return res.status(400).json({ error: 'Missing session' });
    let session;
    try {
      session = await stripe.checkout.sessions.retrieve(id);
    } catch (e) {
      return res.json({ ok: false }); // unknown/expired session — nothing to record
    }
    if (!session || session.payment_status !== 'paid') return res.json({ ok: false });

    const guest = await findGuestByName(session.metadata && session.metadata.guest);
    const dollars = Number(session.amount_total) / 100;
    if (guest && Number.isFinite(dollars)) {
      const inserted = await sql`
        INSERT INTO gift_payments (session_id, name_key, amount)
        VALUES (${id}, ${guest.name.trim().toLowerCase()}, ${Math.round(dollars)})
        ON CONFLICT (session_id) DO NOTHING
        RETURNING session_id`;
      if (inserted.length) await responseStore.addGift(guest.name, 'card', dollars);
    }
    res.json({ ok: true, name: guest ? guest.name : null, amount: dollars });
  } catch (err) { next(err); }
});

module.exports = router;
