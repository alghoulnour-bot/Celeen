const seedParties = require('./guests');
const { readJson, writeJson } = require('./store');

const FILE = 'parties.json';

function norm(s) {
  return String(s || '').trim().toLowerCase();
}

// Parties are stored in data/parties.json so the list can be edited at runtime
// from the admin editor. Seeded from src/guests.js on first run.
function loadParties() {
  const existing = readJson(FILE, null);
  if (existing && Array.isArray(existing)) return existing;
  const seeded = seedParties.map((p, i) => ({
    id: 'p' + (i + 1),
    table: Number(p.table),
    members: (p.members || []).map((m) => String(m).trim()).filter(Boolean),
  }));
  writeJson(FILE, seeded);
  return seeded;
}

function saveParties(list) {
  writeJson(FILE, list);
}

function getParties() {
  return loadParties();
}

// Flat list of every member name — used for the RSVP search autocomplete.
function getGuestNames() {
  const names = [];
  loadParties().forEach((p) => p.members.forEach((m) => names.push(m)));
  return names;
}

function findPartyByMemberName(name) {
  const t = norm(name);
  return loadParties().find((p) => p.members.some((m) => norm(m) === t)) || null;
}

// Guest-like lookup (name/table/partySize) for a single member — used by the
// gift + webhook paths.
function findGuestByName(name) {
  const party = findPartyByMemberName(name);
  if (!party) return null;
  const member = party.members.find((m) => norm(m) === norm(name));
  return { name: member, table: party.table, partySize: party.members.length, party: party.id };
}

// Add a party (table + members). Used by the admin editor.
function addParty({ table, members }) {
  const t = Number(table);
  if (!Number.isFinite(t) || t <= 0) return { error: 'Table must be a positive number' };
  const list = (Array.isArray(members) ? members : String(members || '').split(/[\n,]/))
    .map((m) => String(m).trim()).filter(Boolean);
  if (!list.length) return { error: 'Add at least one name' };

  const taken = new Set(getGuestNames().map(norm));
  const dup = list.find((m) => taken.has(norm(m)));
  if (dup) return { error: `"${dup}" is already on the guest list` };

  const parties = loadParties();
  const party = { id: 'p' + Date.now(), table: t, members: list };
  parties.push(party);
  saveParties(parties);
  return { party };
}

function removeParty(id) {
  const parties = loadParties();
  const next = parties.filter((p) => p.id !== id);
  saveParties(next);
  return next.length !== parties.length;
}

module.exports = {
  getParties,
  getGuestNames,
  findPartyByMemberName,
  findGuestByName,
  addParty,
  removeParty,
};
