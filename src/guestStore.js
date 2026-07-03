const guests = require('./guests');
const { readJson, writeJson } = require('./store');

function getGuestNames() {
  return guests.map((g) => g.name);
}

function findGuestByName(name) {
  const target = name.trim().toLowerCase();
  return guests.find((g) => g.name.trim().toLowerCase() === target) || null;
}

function markRsvp(name) {
  const guest = findGuestByName(name);
  if (!guest) return null;

  const rsvps = readJson('rsvps.json', {});
  rsvps[guest.name] = { rsvpAt: new Date().toISOString() };
  writeJson('rsvps.json', rsvps);

  return { table: guest.table, partySize: guest.partySize };
}

function logGift(name, amount, date) {
  const gifts = readJson('gifts.json', []);
  gifts.push({ name, amount, date });
  writeJson('gifts.json', gifts);
}

module.exports = {
  getGuestNames,
  findGuestByName,
  markRsvp,
  logGift,
};
