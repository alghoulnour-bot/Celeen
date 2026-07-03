# Guest List Setup

No Google Sheet, no service account — the guest list lives directly in the code, and RSVP/gift records save to small local files on the server.

## Editing the guest list

Open `src/guests.js`:

```js
module.exports = [
  { name: 'Zeina', table: 1, partySize: 5 },
  { name: 'safa', table: 2, partySize: 1 },
  { name: 'besma khadim', table: 1, partySize: 1 },
];
```

- **name** — exactly how it should appear in the RSVP autocomplete.
- **table** — the table number you're assigning.
- **partySize** — total headcount this invite covers, including the named guest. `1` for just them, `5` for a family of 5.

To add a guest, add a new `{ name, table, partySize }` line to the list (don't forget the comma after the previous line). Save the file and restart the server (`npm run dev` auto-restarts on save).

## Where RSVP and gift records go

- When a guest confirms attendance, it's recorded in `data/rsvps.json` (created automatically, `{ "Guest Name": { "rsvpAt": "<timestamp>" } }`).
- When a guest logs a gift, it's appended to `data/gifts.json` (`[{ "name", "amount", "date" }, ...]`).

Both files are plain JSON — open them in any text editor to see who's responded. They live on whatever machine/server is running `node server.js`, so **back them up** (or move to a real database) before you redeploy or switch hosts, since a fresh deploy won't carry them over automatically.
