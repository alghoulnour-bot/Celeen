const express = require('express');
const crypto = require('crypto');
const responseStore = require('../responseStore');
const guestStore = require('../guestStore');

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
  ['giftCount', 'Gifts'],
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
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
}

router.get('/', guard, (req, res) => {
  const rows = responseStore.all().sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  const attending = rows.filter((r) => r.attending).length;
  const guestsComing = rows.filter((r) => r.attending).reduce((s, r) => s + (Number(r.partySize) || 1), 0);
  const pledged = rows.reduce((s, r) => s + (Number(r.giftAmount) || 0), 0);

  const body = rows.length
    ? rows.map((r) => `<tr>${COLUMNS.map(([k]) => `<td>${esc(cell(r[k], k))}</td>`).join('')}</tr>`).join('')
    : `<tr><td colspan="${COLUMNS.length}" class="empty">No responses yet.</td></tr>`;

  const parties = guestStore.getParties();
  const respondedNames = new Set(rows.map((r) => String(r.name).toLowerCase()));
  const totalGuests = parties.reduce((n, p) => n + p.members.length, 0);
  const partyRows = parties.length
    ? parties.map((p) => `<tr>
        <td>${esc(p.table)}</td>
        <td>${p.members.map((m) => (respondedNames.has(String(m).toLowerCase())
          ? `<b>${esc(m)}</b>` : esc(m))).join(', ')}</td>
        <td><button class="rm" data-id="${esc(p.id)}">Remove</button></td>
      </tr>`).join('')
    : `<tr><td colspan="3" class="empty">No guests yet.</td></tr>`;

  res.send(`<!doctype html><html><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Omar & Celeen — Admin</title>
<style>
  :root{--green:#3C4A34;--gold:#8F7A49;--bone:#F7F1E6;--ink:#2C271C;--line:rgba(44,39,28,.14);}
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Cormorant Garamond',Georgia,serif;background:var(--bone);color:var(--ink);padding:2.5rem 1.5rem;max-width:1100px;margin:0 auto;}
  h1{font-weight:500;font-size:2rem;color:var(--green);}
  h2{font-weight:500;font-size:1.4rem;color:var(--green);margin:2.6rem 0 1rem;}
  .sub{font-size:.75rem;letter-spacing:.2em;text-transform:uppercase;color:var(--gold);margin:.3rem 0 1.5rem;font-family:Arial,sans-serif;}
  .stats{display:flex;gap:1rem;flex-wrap:wrap;margin-bottom:1.5rem;}
  .stat{background:#fff;border:1px solid var(--line);border-radius:10px;padding:1rem 1.4rem;min-width:130px;}
  .stat b{display:block;font-size:1.8rem;color:var(--green);}
  .stat span{font-size:.68rem;letter-spacing:.14em;text-transform:uppercase;color:#786;font-family:Arial,sans-serif;}
  .bar{margin-bottom:1rem;}
  a.btn,button{font-family:Arial,sans-serif;}
  a.btn{display:inline-block;background:var(--green);color:var(--bone);text-decoration:none;padding:.6rem 1.2rem;border-radius:999px;font-size:.75rem;letter-spacing:.12em;text-transform:uppercase;}
  .wrap{overflow-x:auto;border:1px solid var(--line);border-radius:10px;background:#fff;}
  table{border-collapse:collapse;width:100%;min-width:640px;}
  th,td{text-align:left;padding:.7rem 1rem;border-bottom:1px solid var(--line);font-size:1rem;white-space:nowrap;}
  th{font-family:Arial,sans-serif;font-size:.66rem;letter-spacing:.14em;text-transform:uppercase;color:var(--gold);background:#faf6ec;}
  tr:last-child td{border-bottom:none;}
  .empty{text-align:center;color:#a99;padding:2rem;}
  form.add{display:flex;gap:.6rem;flex-wrap:wrap;margin-bottom:1rem;align-items:center;}
  form.add input,form.add textarea{font-family:'Cormorant Garamond',serif;font-size:1rem;padding:.55rem .8rem;border:1px solid var(--line);border-radius:8px;background:#fff;}
  form.add textarea{flex:1;min-width:220px;resize:vertical;font-family:inherit;}
  form.add input[type=number]{width:100px;align-self:flex-start;}
  form.add button{background:var(--green);color:var(--bone);border:none;border-radius:8px;padding:.6rem 1.1rem;font-size:.72rem;letter-spacing:.1em;text-transform:uppercase;cursor:pointer;}
  button.rm{background:none;border:1px solid var(--line);border-radius:6px;color:#9a5a3a;font-size:.66rem;letter-spacing:.08em;text-transform:uppercase;padding:.35rem .7rem;cursor:pointer;}
  button.rm:hover{border-color:#9a5a3a;}
  .msg{font-size:.95rem;color:#9a5a3a;min-height:1.2em;margin-bottom:.6rem;}
</style></head><body>
  <h1>Omar &amp; Celeen</h1>
  <p class="sub">Admin</p>
  <div class="stats">
    <div class="stat"><b>${attending}</b><span>Parties attending</span></div>
    <div class="stat"><b>${guestsComing}</b><span>Guests coming</span></div>
    <div class="stat"><b>$${pledged.toLocaleString()}</b><span>Pledged (nqoot)</span></div>
    <div class="stat"><b>${rows.length}</b><span>Total responses</span></div>
  </div>

  <h2>Responses</h2>
  <p class="bar"><a class="btn" href="/admin/export?key=${esc(encodeURIComponent(req.query.key || ''))}">Download CSV</a></p>
  <div class="wrap"><table>
    <thead><tr>${COLUMNS.map(([, label]) => `<th>${label}</th>`).join('')}</tr></thead>
    <tbody>${body}</tbody>
  </table></div>

  <h2>Guest List <span style="color:#786;font-size:1rem;">(${parties.length} parties · ${totalGuests} guests)</span></h2>
  <p style="font-family:Arial;font-size:.8rem;color:#786;margin-bottom:.8rem;">Add a party (a household at one table). List every member — any of them can type their name to RSVP for the whole party and mark who's coming. <b>Bold</b> = already responded.</p>
  <form class="add" id="add-form">
    <input name="table" type="number" min="1" placeholder="Table #" required />
    <textarea name="members" placeholder="One name per line&#10;Layla Nassar&#10;Omar Nassar" rows="3" required></textarea>
    <button type="submit">Add party</button>
  </form>
  <p class="msg" id="msg"></p>
  <div class="wrap"><table>
    <thead><tr><th>Table</th><th>Members</th><th></th></tr></thead>
    <tbody>${partyRows}</tbody>
  </table></div>

  <script>
    var KEY = new URLSearchParams(location.search).get('key') || '';
    function api(path, data){
      return fetch('/admin/'+path+'?key='+encodeURIComponent(KEY), {
        method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data)
      }).then(function(r){ return r.json().then(function(d){ return {ok:r.ok, d:d}; }); });
    }
    document.getElementById('add-form').addEventListener('submit', function(e){
      e.preventDefault();
      var f = e.target;
      var members = f.members.value.split(/\\n/).map(function(s){return s.trim();}).filter(Boolean);
      api('party/add', { table:f.table.value, members:members })
        .then(function(res){
          if(!res.ok){ document.getElementById('msg').textContent = res.d.error || 'Could not add party.'; return; }
          location.reload();
        });
    });
    Array.prototype.forEach.call(document.querySelectorAll('.rm'), function(btn){
      btn.addEventListener('click', function(){
        if(!confirm('Remove this party from the guest list?')) return;
        api('party/remove', { id: btn.dataset.id }).then(function(){ location.reload(); });
      });
    });
  </script>
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

// Guest editor — add / remove parties at runtime (persisted to data/parties.json).
router.post('/party/add', guard, express.json(), (req, res) => {
  const { table, members } = req.body || {};
  const result = guestStore.addParty({ table, members });
  if (result.error) return res.status(400).json({ error: result.error });
  res.json({ ok: true, party: result.party });
});

router.post('/party/remove', guard, express.json(), (req, res) => {
  const removed = guestStore.removeParty((req.body || {}).id);
  res.json({ ok: removed });
});

module.exports = router;
