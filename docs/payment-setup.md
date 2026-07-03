# Nqoot (Gift) Setup — Stripe Payment Link + Zelle

Two gifting options side by side, both with no custom checkout code required.

## Stripe Payment Link (card / Apple Pay)

Created directly from the Stripe Dashboard (Payments → Payment Links) — no API code needed. It's linked in `public/index.html` as the `#stripe-pay-link` button.

- The current link is a **test-mode** link (`buy.stripe.com/test_...`) — fine for trying the flow, but guests can't pay real money through it.
- Once your Stripe account is fully verified, switch to **live mode** in the Dashboard, create a live Payment Link with the same settings, and swap that URL into the `href` of `#stripe-pay-link`.
- There's no webhook wired up, so a Stripe payment doesn't auto-log to the `Gifts` sheet — guests use the same "I've Sent My Gift" form below it to self-report either way (Zelle or Stripe).

## Zelle

1. The Nqoot section shows your Zelle number (`469-349-3827`), tap-to-copy.
2. The guest sends the gift themselves, from their own banking app.
3. They then enter their name + amount and tap "I've Sent My Gift" — this calls `POST /api/log-gift`, which appends a row to the `Gifts` tab in your Google Sheet.

Neither Zelle nor the un-webhooked Stripe link can be verified automatically by the website — both log lines in the `Gifts` tab are self-reported by the guest, which mirrors how Nqoot is normally handled in person anyway.

## Changing the numbers/links

- Zelle number: `public/index.html`, `<button id="zelle-number">`.
- Stripe link: `public/index.html`, `<a id="stripe-pay-link">` `href`.
