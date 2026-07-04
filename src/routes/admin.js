const express = require('express');
const crypto = require('crypto');
const responseStore = require('../responseStore');

const router = express.Router();

// No default — the dashboard is disabled entirely unless a key is configured,
// so no admin credential ever ships in source.
const ADMIN_KEY = process.env.ADMIN_KEY || '';

// Constant-time key check. Prefers an Authorization: Bearer header (query keys
// leak into logs/history) but still accepts ?key= for convenience.
function guard(req, res, next) {
  if (!ADMIN_KEY) {
    return res.status(503).send('Admin dashboard disabled — set ADMIN_KEY in the environment.');
  }
  const auth = req.headers.authorization || '';
  const provided = auth.startsWith('Bearer ') ? auth.slice(7) : (req.query.key || '');
  const a = Buffer.from(String(provided));
  const b = Buffer.from(ADMIN_KEY);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).send('Unauthorized.');
  }
  next();
}

// Escape any value before it lands in the HTML dashboard.
function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const COLUMNS = [
  ['name', 'Name'],
  ['attending', 'Attending'],
  ['partySize', 'Party'],
  ['table', 'Table'],
  ['giftMethod', 'Method'],
  ['giftAmount', 'Amount ($)'],
  ['giftActualAmount', 'Actual ($)'],
  ['updatedAt', 'Updated'],
];

function cell(value, key) {
  if (value === undefined || value === null || value === '') return '—';
  if (key === 'attending') return value ? 'Yes' : 'No';
  if (key === 'updatedAt') return new Date(value).toLocaleString();
  return String(value);
}

function csvCell(value) {
  let s = value === undefined || value === null ? '' : String(value);
  // Neutralize spreadsheet formula injection (=, +, -, @, tab/CR leading char).
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
}

// Viewable dashboard: live table of every response + a CSV download link.
router.get('/', guard, (req, res) => {
  const rows = responseStore.all().sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  const attending = rows.filter((r) => r.attending).length;
  const guestsComing = rows.filter((r) => r.attending).reduce((s, r) => s + (Number(r.partySize) || 1), 0);
  const pledged = rows.reduce((s, r) => s + (Number(r.giftAmount) || 0), 0);

  const body = rows.length
    ? rows.map((r) => `<tr>${COLUMNS.map(([k]) => `<td>${esc(cell(r[k], k))}</td>`).join('')}</tr>`).join('')
    : `<tr><td colspan="${COLUMNS.length}" class="empty">No responses yet.</td></tr>`;

  res.send(`<!doctype html><html><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Omar & Celeen — Responses</title>
<style>
  :root{--green:#3C4A34;--gold:#8F7A49;--bone:#F7F1E6;--ink:#2C271C;--line:rgba(44,39,28,.14);}
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Cormorant Garamond',Georgia,serif;background:var(--bone);color:var(--ink);padding:2.5rem 1.5rem;}
  h1{font-weight:500;font-size:2rem;color:var(--green);}
  .sub{font-size:.75rem;letter-spacing:.2em;text-transform:uppercase;color:var(--gold);margin:.3rem 0 1.5rem;font-family:Arial,sans-serif;}
  .stats{display:flex;gap:1rem;flex-wrap:wrap;margin-bottom:1.5rem;}
  .stat{background:#fff;border:1px solid var(--line);border-radius:10px;padding:1rem 1.4rem;min-width:130px;}
  .stat b{display:block;font-size:1.8rem;color:var(--green);}
  .stat span{font-size:.68rem;letter-spacing:.14em;text-transform:uppercase;color:#786;font-family:Arial,sans-serif;}
  .bar{margin-bottom:1rem;}
  a.btn{display:inline-block;background:var(--green);color:var(--bone);text-decoration:none;padding:.6rem 1.2rem;border-radius:999px;font-family:Arial,sans-serif;font-size:.75rem;letter-spacing:.12em;text-transform:uppercase;}
  .wrap{overflow-x:auto;border:1px solid var(--line);border-radius:10px;background:#fff;}
  table{border-collapse:collapse;width:100%;min-width:760px;}
  th,td{text-align:left;padding:.7rem 1rem;border-bottom:1px solid var(--line);font-size:1rem;white-space:nowrap;}
  th{font-family:Arial,sans-serif;font-size:.66rem;letter-spacing:.14em;text-transform:uppercase;color:var(--gold);background:#faf6ec;}
  tr:last-child td{border-bottom:none;}
  .empty{text-align:center;color:#a99;padding:2rem;}
</style></head><body>
  <h1>Omar &amp; Celeen</h1>
  <p class="sub">Responses Dashboard</p>
  <div class="stats">
    <div class="stat"><b>${attending}</b><span>Parties attending</span></div>
    <div class="stat"><b>${guestsComing}</b><span>Guests coming</span></div>
    <div class="stat"><b>$${pledged.toLocaleString()}</b><span>Pledged (nqoot)</span></div>
    <div class="stat"><b>${rows.length}</b><span>Total responses</span></div>
  </div>
  <p class="bar"><a class="btn" href="/admin/export?key=${esc(encodeURIComponent(req.query.key || ''))}">Download CSV</a></p>
  <div class="wrap"><table>
    <thead><tr>${COLUMNS.map(([, label]) => `<th>${label}</th>`).join('')}</tr></thead>
    <tbody>${body}</tbody>
  </table></div>
</body></html>`);
});

router.get('/export', guard, (req, res) => {
  const rows = responseStore.all();
  const header = COLUMNS.map(([, label]) => label).join(',');
  const lines = rows.map((r) => COLUMNS.map(([k]) => csvCell(r[k])).join(','));
  const csv = [header, ...lines].join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="omar-celeen-responses.csv"');
  res.send(csv);
});

module.exports = router;
