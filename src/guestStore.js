const seedGuests = require('./guests');
const { readJson, writeJson } = require('./store');

const FILE = 'guests.json';

// Guest list is stored in data/guests.json so it can be edited at runtime from
// the admin editor. On first run it's seeded from src/guests.js.
function loadGuests() {
  const existing = readJson(FILE, null);
  if (existing && Array.isArray(existing)) return existing;
  writeJson(FILE, seedGuests);
  return seedGuests.slice();
}

function saveGuests(list) {
  writeJson(FILE, list);
}

function norm(name) {
  return String(name || '').trim().toLowerCase();
}

function getGuests() {
  return loadGuests();
}

function getGuestNames() {
  return loadGuests().map((g) => g.name);
}

function findGuestByName(name) {
  const target = norm(name);
  return loadGuests().find((g) => norm(g.name) === target) || null;
}

// Add a guest (used by the admin editor). Returns { error } or { guest }.
function addGuest({ name, table, partySize }) {
  const cleanName = String(name || '').trim();
  if (!cleanName) return { error: 'Name is required' };
  const t = Number(table);
  const p = Number(partySize);
  if (!Number.isFinite(t) || t <= 0) return { error: 'Table must be a positive number' };
  if (!Number.isFinite(p) || p <= 0) return { error: 'Party size must be a positive number' };

  const list = loadGuests();
  if (list.some((g) => norm(g.name) === norm(cleanName))) {
    return { error: 'A guest with that name already exists' };
  }
  const guest = { name: cleanName, table: t, partySize: p };
  list.push(guest);
  saveGuests(list);
  return { guest };
}

function removeGuest(name) {
  const list = loadGuests();
  const next = list.filter((g) => norm(g.name) !== norm(name));
  saveGuests(next);
  return next.length !== list.length;
}

module.exports = {
  getGuests,
  getGuestNames,
  findGuestByName,
  addGuest,
  removeGuest,
};
