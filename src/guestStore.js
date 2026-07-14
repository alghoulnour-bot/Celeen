const seedParties = require('./guests');
const { sql } = require('./db');

function norm(s) {
  return String(s || '').trim().toLowerCase();
}

// Seed the parties table from src/guests.js the first time (empty table).
async function seedIfEmpty() {
  const rows = await sql`SELECT count(*)::int AS n FROM parties`;
  if (rows[0].n > 0) return;
  for (let i = 0; i < seedParties.length; i++) {
    const p = seedParties[i];
    const members = (p.members || []).map((m) => String(m).trim()).filter(Boolean);
    await sql`INSERT INTO parties (id, table_no, members)
              VALUES (${'p' + (i + 1)}, ${Number(p.table)}, ${JSON.stringify(members)}::jsonb)`;
  }
}

async function getParties() {
  const rows = await sql`SELECT id, table_no, members FROM parties ORDER BY table_no`;
  return rows.map((r) => ({ id: r.id, table: r.table_no, members: r.members }));
}

async function getGuestNames() {
  const parties = await getParties();
  const names = [];
  parties.forEach((p) => p.members.forEach((m) => names.push(m)));
  return names;
}

async function findPartyByMemberName(name) {
  const t = norm(name);
  const parties = await getParties();
  return parties.find((p) => p.members.some((m) => norm(m) === t)) || null;
}

async function findGuestByName(name) {
  const party = await findPartyByMemberName(name);
  if (!party) return null;
  const member = party.members.find((m) => norm(m) === norm(name));
  return { name: member, table: party.table, partySize: party.members.length, party: party.id };
}

async function addParty({ table, members }) {
  const t = Number(table);
  if (!Number.isFinite(t) || t <= 0) return { error: 'Table must be a positive number' };
  const list = (Array.isArray(members) ? members : String(members || '').split(/[\n,]/))
    .map((m) => String(m).trim()).filter(Boolean);
  if (!list.length) return { error: 'Add at least one name' };

  const taken = new Set((await getGuestNames()).map(norm));
  const dup = list.find((m) => taken.has(norm(m)));
  if (dup) return { error: `"${dup}" is already on the guest list` };

  const party = { id: 'p' + Date.now(), table: t, members: list };
  await sql`INSERT INTO parties (id, table_no, members)
            VALUES (${party.id}, ${t}, ${JSON.stringify(list)}::jsonb)`;
  return { party };
}

// Reassign a party's table number. The guest sees the change on their card
// automatically, since it's read live from here on every page load.
async function updatePartyTable(id, table) {
  const t = Number(table);
  // Upper bound keeps it inside Postgres int range → a clean 400, not a 500.
  if (!Number.isInteger(t) || t <= 0 || t > 9999) return { error: 'Table must be a whole number from 1 to 9999' };
  const rows = await sql`UPDATE parties SET table_no = ${t} WHERE id = ${String(id)}
                         RETURNING id, table_no, members`;
  if (!rows.length) return { error: 'Party not found' };
  const r = rows[0];
  return { party: { id: r.id, table: r.table_no, members: r.members } };
}

async function removeParty(id) {
  const before = await sql`SELECT count(*)::int AS n FROM parties`;
  await sql`DELETE FROM parties WHERE id = ${id}`;
  const after = await sql`SELECT count(*)::int AS n FROM parties`;
  return after[0].n !== before[0].n;
}

module.exports = {
  seedIfEmpty,
  getParties,
  getGuestNames,
  findPartyByMemberName,
  findGuestByName,
  addParty,
  updatePartyTable,
  removeParty,
};
