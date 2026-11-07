// Scanner backend
// Sign-in: add a DRIVERS tab with columns  Name | PIN | Role  (Role = admin or driver).
// Assignments: add an ASSIGNMENTS tab with columns  InvoiceNumber | Driver | Stop  (the app fills it in).
// Invoices not listed in ASSIGNMENTS go to the first driver in DRIVERS (driver 1).
// Come-backs (broken / missing pieces, services to redo, $0) are saved to a COMEBACKS tab the app creates.
// After pasting: run "authorize" once, then Deploy → Manage deployments → New version.

const SHEETS = {
  invoices: ['INVOICE', 'INVOICES'],
  items: ['INVOICEITEMS', 'INVOICE ITEMS', 'INVOICE_ITEMS'],
  upcs: ['UPCS', 'UPC'],
  servicesold: ['SERVICESOLD', 'SERVICESSOLD', 'SERVICES SOLD'],
  services: ['SERVICES', 'SERVICE'],
  chargers: ['CHARGERS', 'SUPERCHARGERS', 'CHARGER'],
  deliveries: ['DELIVERIES'],
  drivers: ['DRIVERS'],
  assignments: ['ASSIGNMENTS', 'ASSIGNMENT'],
  locations: ['DRIVER LOCATIONS'],
  log: ['SCAN LOG'],
  comebacks: ['COMEBACKS', 'COME BACKS', 'COME-BACKS', 'COMEBACK']
};
const LOG_NAME = 'SCAN LOG';

const key_ = s => String(s == null ? '' : s).trim().toLowerCase();
function col_(row, re) { const k = Object.keys(row).find(k => re.test(k)); return k ? row[k] : ''; }
function invId_(r) {
  const k = Object.keys(r).find(k => /^invoice/i.test(k)) || Object.keys(r).find(k => /inv/i.test(k));
  return k ? String(r[k]).trim() : '';
}

function findSheet_(ss, names) {
  const want = names.map(n => n.toUpperCase());
  return ss.getSheets().find(s => want.indexOf(s.getName().trim().toUpperCase()) > -1) || null;
}

function ensureCol_(sh, name) {
  const lc = Math.max(1, sh.getLastColumn());
  const h = sh.getRange(1, 1, 1, lc).getValues()[0].map(key_);
  const i = h.findIndex(x => x && x.indexOf(key_(name)) > -1);
  if (i > -1) return i + 1;
  sh.getRange(1, lc + 1).setValue(name);
  return lc + 1;
}

function read_(ss, names) {
  const sh = findSheet_(ss, names);
  if (!sh) return [];
  const v = sh.getDataRange().getDisplayValues();
  const h = (v.shift() || []).map(k => String(k).trim());
  return v.filter(r => r.join('') !== '').map(r => {
    const o = {};
    h.forEach((k, i) => { if (k) o[k] = r[i]; });
    return o;
  });
}

// ---------- drivers & PIN sign-in ----------
function drivers_(ss) {
  return read_(ss, SHEETS.drivers).map(r => ({
    name: String(col_(r, /name/i)).trim(),
    pin: String(col_(r, /pin|code/i)).trim(),
    role: /admin/i.test(col_(r, /role/i)) ? 'admin' : 'driver'
  })).filter(d => d.name);
}
const authOn_ = ss => drivers_(ss).some(d => d.pin);
function defaultDriver_(list) { return (list.find(d => d.role === 'driver') || list[0] || { name: '' }).name; }

function login_(ss, p) {
  const name = key_(p.name), cache = CacheService.getScriptCache(), fk = 'fail_' + name;
  const fails = +(cache.get(fk) || 0);
  if (fails >= 5) return { ok: false, error: 'Too many wrong PINs. Wait 15 minutes and try again.' };
  const d = drivers_(ss).find(x => key_(x.name) === name);
  if (!d || !d.pin || String(p.pin).trim() !== d.pin) {
    cache.put(fk, String(fails + 1), 900);
    return { ok: false, error: 'Wrong name or PIN.' + (fails + 1 >= 3 ? ' ' + (5 - fails - 1) + ' tries left.' : '') };
  }
  cache.remove(fk);
  const s = Utilities.getUuid();
  PropertiesService.getScriptProperties().setProperty('s_' + s, JSON.stringify({ name: d.name, exp: Date.now() + 30 * 864e5 }));
  return { ok: true, session: s, name: d.name, role: d.role };
}

function user_(ss, p) {
  if (!p.session) return null;
  const v = PropertiesService.getScriptProperties().getProperty('s_' + p.session);
  if (!v) return null;
  const s = JSON.parse(v);
  if (s.exp < Date.now()) return null;
  const d = drivers_(ss).find(x => key_(x.name) === key_(s.name));
  return d && d.pin ? { name: d.name, role: d.role } : null;
}

// ---------- data ----------
function allData_(ss, u) {
  const out = {};
  Object.keys(SHEETS).forEach(k => out[k] = read_(ss, SHEETS[k]));
  out.tabs = ss.getSheets().map(s => s.getName());
  out.me = u;
  const list = drivers_(ss), def = defaultDriver_(list), amap = {};
  const smap = {};
  out.assignments.forEach(r => {
    const id = String(col_(r, /inv/i)).trim(), dr = String(col_(r, /driver/i)).trim(), st = String(col_(r, /^\s*stop/i)).replace(/\D/g, '');
    if (id && dr) amap[id] = dr;
    if (id && st) smap[id] = st;
  });
  out.invoices.forEach(r => {
    const id = invId_(r);
    const old = Object.keys(r).find(k => /driver/i.test(k));
    const cur = amap[id] || (old ? String(r[old]).trim() : '') || def;
    if (old) delete r[old];
    r['Driver'] = cur;
    if (smap[id]) { const sk = Object.keys(r).find(k => /^\s*stop/i.test(k)) || 'Stop'; r[sk] = smap[id]; }
  });
  out.comebacks.forEach(r => {
    const id = String(col_(r, /come.?back.?id|^cb.?id/i)).trim(); if (!id) return;
    const dk = Object.keys(r).find(k => /driver/i.test(k)) || 'Driver';
    if (amap[id]) r[dk] = amap[id];
    if (!String(r[dk] || '').trim()) r[dk] = def;
    if (smap[id]) { const sk = Object.keys(r).find(k => /^\s*stop/i.test(k)) || 'Stop'; r[sk] = smap[id]; }
  });
  out.drivers = list.map(d => ({ Name: d.name, Role: d.role }));
  delete out.assignments;
  if (u && u.role !== 'admin') {
    out.invoices = out.invoices.filter(r => key_(r['Driver']) === key_(u.name));
    const ids = {};
    out.invoices.forEach(r => ids[invId_(r)] = 1);
    out.comebacks = out.comebacks.filter(r => key_(col_(r, /driver/i)) === key_(u.name) || ids[String(col_(r, /^invoice/i)).trim()]);
    out.comebacks.forEach(r => { const id = String(col_(r, /come.?back.?id|^cb.?id/i)).trim(); if (id) ids[id] = 1; });
    ['items', 'servicesold', 'log', 'deliveries'].forEach(k => out[k] = out[k].filter(r => ids[String(col_(r, /inv/i)).trim()]));
    out.drivers = [];
    out.locations = [];
  }
  return out;
}

function writeLog_(ss, rows, u) {
  let sh = findSheet_(ss, [LOG_NAME]);
  if (!sh) {
    sh = ss.insertSheet(LOG_NAME);
    sh.appendRow(['Timestamp', 'Invoice', 'UPC', 'Model', 'Result', 'Device', 'Driver']);
  }
  const dc = ensureCol_(sh, 'Driver'), w = Math.max(6, dc);
  const vals = (rows || []).map(r => {
    const a = [new Date(r.ts || Date.now()), r.invoice || '', "'" + (r.upc || ''), r.model || '', r.result || '', r.device || ''];
    while (a.length < w) a.push('');
    a[dc - 1] = u ? u.name : '';
    return a;
  });
  if (vals.length) sh.getRange(sh.getLastRow() + 1, 1, vals.length, w).setValues(vals);
  return { ok: true, written: vals.length };
}

function upsertUpc_(ss, b) {
  const sh = findSheet_(ss, SHEETS.upcs);
  if (!sh) return { ok: false, error: 'UPCS tab not found' };
  const v = sh.getDataRange().getValues();
  const h = v[0].map(x => String(x).trim());
  const col = re => h.findIndex(x => re.test(x));
  const cU = col(/upc/i), cM = col(/model/i), cD = col(/desc/i), cT = col(/date/i);
  const n = s => String(s).replace(/\D/g, '').replace(/^0+/, '');
  const target = n(b.upc);
  for (let i = 1; i < v.length; i++) {
    if (n(v[i][cU]) === target) {
      if (cM > -1) sh.getRange(i + 1, cM + 1).setValue(b.model);
      if (cD > -1 && b.desc) sh.getRange(i + 1, cD + 1).setValue(b.desc);
      return { ok: true, updated: true };
    }
  }
  const row = h.map(() => '');
  if (cU > -1) row[cU] = "'" + String(b.upc).replace(/\D/g, '');
  if (cM > -1) row[cM] = b.model;
  if (cD > -1) row[cD] = b.desc || '';
  if (cT > -1) row[cT] = new Date();
  sh.appendRow(row);
  return { ok: true, added: true };
}

function service_(ss, p) {
  const sh = findSheet_(ss, SHEETS.servicesold);
  if (!sh) return { ok: false, error: 'SERVICESSOLD tab not found' };
  const v = sh.getDataRange().getValues();
  const h = v[0].map(x => String(x).trim());
  const col = re => h.findIndex(x => re.test(x));
  const cId = col(/^id$/i), cInv = col(/inv/i), cS = col(/serv/i), cA = col(/amount|price|total/i), cD = col(/date/i), cSt = col(/status/i);
  if (cId < 0) return { ok: false, error: 'SERVICESSOLD needs an ID column' };
  if (p.op === 'add') {
    let max = 0;
    for (let i = 1; i < v.length; i++) { const n = parseFloat(v[i][cId]); if (!isNaN(n) && n > max) max = n; }
    const row = h.map(() => '');
    row[cId] = max + 1;
    if (cInv > -1) row[cInv] = p.invoice;
    if (cS > -1) row[cS] = p.serviceId;
    if (cA > -1) row[cA] = p.amount || '';
    if (cD > -1) row[cD] = new Date();
    if (cSt > -1) row[cSt] = p.status || '';
    sh.appendRow(row);
    return { ok: true, id: String(max + 1) };
  }
  for (let i = 1; i < v.length; i++) {
    if (String(v[i][cId]).trim() !== String(p.id).trim()) continue;
    if (cInv > -1 && String(v[i][cInv]).trim() !== String(p.invoice).trim()) continue;
    if (p.op === 'delete') { sh.deleteRow(i + 1); return { ok: true, deleted: true }; }
    if (cS > -1) sh.getRange(i + 1, cS + 1).setValue(p.serviceId);
    if (cA > -1) sh.getRange(i + 1, cA + 1).setValue(p.amount || '');
    if (cSt > -1) sh.getRange(i + 1, cSt + 1).setValue(p.status || '');
    return { ok: true, updated: true };
  }
  return { ok: false, error: 'Service row not found. Tap Refresh and try again.' };
}

function proof_(ss, b, u) {
  const it = DriveApp.getFoldersByName('Delivery Proofs');
  const folder = it.hasNext() ? it.next() : DriveApp.createFolder('Delivery Proofs');
  const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss');
  const save = (dataUrl, name) => {
    const m = String(dataUrl || '').match(/^data:(image\/[\w+]+);base64,(.+)$/);
    if (!m) return '';
    return folder.createFile(Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], name)).getUrl();
  };
  const photo = save(b.photo, b.invoice + '-photo-' + stamp + '.jpg');
  const sig = save(b.signature, b.invoice + '-signature-' + stamp + '.png');
  let sh = findSheet_(ss, SHEETS.deliveries);
  if (!sh) { sh = ss.insertSheet('DELIVERIES'); sh.appendRow(['Timestamp', 'Invoice', 'Customer', 'Received by', 'Photo', 'Signature', 'Driver']); }
  const dc = ensureCol_(sh, 'Driver'), w = Math.max(6, dc);
  const row = [new Date(), b.invoice, b.customer || '', b.receiver || '', photo, sig];
  while (row.length < w) row.push('');
  row[dc - 1] = u ? u.name : '';
  sh.appendRow(row);
  writeLog_(ss, [{ invoice: b.invoice, result: 'DELIVERY_COMPLETE', device: b.device || '' }], u);
  return { ok: true, photo, sig };
}

function hasProof_(ss, p) {
  const r = read_(ss, SHEETS.deliveries).filter(x => String(x['Invoice']).trim() === String(p.invoice).trim()).pop();
  return { ok: true, found: !!r, photo: r ? r['Photo'] : '', sig: r ? r['Signature'] : '' };
}

function loc_(ss, p, u) {
  if (!u) return { ok: false, error: 'Sign-in is not set up' };
  let sh = findSheet_(ss, SHEETS.locations);
  if (!sh) { sh = ss.insertSheet('DRIVER LOCATIONS'); sh.appendRow(['Name', 'Lat', 'Lon', 'Updated']); }
  const v = sh.getDataRange().getValues();
  const row = [u.name, +p.lat, +p.lon, "'" + new Date().toISOString()];
  for (let i = 1; i < v.length; i++) {
    if (key_(v[i][0]) === key_(u.name)) { sh.getRange(i + 1, 1, 1, 4).setValues([row]); return { ok: true }; }
  }
  sh.appendRow(row);
  return { ok: true };
}

function assign_(ss, p) {
  let sh = findSheet_(ss, SHEETS.assignments);
  if (!sh) { sh = ss.insertSheet('ASSIGNMENTS'); sh.appendRow(['InvoiceNumber', 'Driver']); }
  const v = sh.getDataRange().getValues();
  const h = v[0].map(x => String(x).trim());
  let ic = h.findIndex(x => /inv/i.test(x)), dc = h.findIndex(x => /driver/i.test(x));
  if (ic < 0) ic = 0;
  if (dc < 0) dc = 1;
  for (let i = 1; i < v.length; i++) {
    if (String(v[i][ic]).trim() === String(p.invoice).trim()) {
      if (!p.driver) sh.deleteRow(i + 1); else sh.getRange(i + 1, dc + 1).setValue(p.driver);
      return { ok: true };
    }
  }
  if (p.driver) { const row = h.map(() => ''); row[ic] = p.invoice; row[dc] = p.driver; sh.appendRow(row); }
  return { ok: true };
}

function stops_(ss, p) {
  const rows = JSON.parse(p.rows || '[]');
  let sh = findSheet_(ss, SHEETS.assignments);
  if (!sh) { sh = ss.insertSheet('ASSIGNMENTS'); sh.appendRow(['InvoiceNumber', 'Driver', 'Stop']); }
  const lc = Math.max(1, sh.getLastColumn());
  const h = sh.getRange(1, 1, 1, lc).getValues()[0].map(x => String(x).trim());
  let ic = h.findIndex(x => /inv/i.test(x)), dc = h.findIndex(x => /driver/i.test(x));
  if (ic < 0) { ic = 0; sh.getRange(1, 1).setValue('InvoiceNumber'); }
  if (dc < 0) { dc = ensureCol_(sh, 'Driver') - 1; }
  const sc = ensureCol_(sh, 'Stop') - 1;
  const w = Math.max(sh.getLastColumn(), ic + 1, dc + 1, sc + 1);
  const v = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, w).getValues() : [];
  const at = {};
  v.forEach((r, i) => { const id = String(r[ic]).trim(); if (id) at[id] = i; });
  const add = [];
  rows.forEach(r => {
    const id = String(r.invoice || '').trim(); if (!id) return;
    if (id in at) {
      const row = v[at[id]];
      if (r.driver) row[dc] = r.driver;
      row[sc] = r.stop === '' || r.stop == null ? '' : +r.stop;
    } else {
      const row = new Array(w).fill('');
      row[ic] = id; row[dc] = r.driver || ''; row[sc] = r.stop === '' || r.stop == null ? '' : +r.stop;
      add.push(row);
    }
  });
  if (v.length) sh.getRange(2, 1, v.length, w).setValues(v);
  if (add.length) sh.getRange(sh.getLastRow() + 1, 1, add.length, w).setValues(add);
  return { ok: true, saved: rows.length };
}

function comeback_(ss, p, u) {
  if (!p.invoice) return { ok: false, error: 'Missing invoice number' };
  let sh = findSheet_(ss, SHEETS.comebacks);
  const head = ['Timestamp', 'ComebackID', 'Invoice', 'Date', 'Customer', 'Address', 'Items', 'Services', 'Reason', 'Note', 'Driver', 'Amount', 'CreatedBy'];
  if (!sh) { sh = ss.insertSheet('COMEBACKS'); sh.appendRow(head); }
  const cols = {};
  head.forEach(h => cols[h] = ensureCol_(sh, h));
  const w = sh.getLastColumn();
  const n = read_(ss, SHEETS.comebacks).filter(r => String(col_(r, /^invoice/i)).trim() === String(p.invoice).trim()).length;
  const id = String(p.invoice).trim() + '-CB' + (n + 1);
  const row = new Array(w).fill('');
  const put = (h, v) => { row[cols[h] - 1] = v; };
  put('Timestamp', new Date()); put('ComebackID', id); put('Invoice', p.invoice); put('Date', p.date || '');
  put('Customer', p.customer || ''); put('Address', p.address || ''); put('Items', p.items || ''); put('Services', p.services || '');
  put('Reason', p.reason || ''); put('Note', p.note || ''); put('Driver', p.driver || ''); put('Amount', 0); put('CreatedBy', u ? u.name : '');
  sh.getRange(sh.getLastRow() + 1, 1, 1, w).setValues([row]);
  writeLog_(ss, [{ invoice: p.invoice, model: p.items || '', result: 'COMEBACK ' + id + (p.reason ? ' · ' + p.reason : '') }], u);
  return { ok: true, id };
}

function authorize() {
  DriveApp.createFolder('scanner-permission-test').setTrashed(true);
  PropertiesService.getScriptProperties().getKeys();
  CacheService.getScriptCache().get('x');
  SpreadsheetApp.getActiveSpreadsheet();
}

// ---------- routing ----------
function respond_(out, cb) {
  if (cb) return ContentService.createTextOutput(cb + '(' + JSON.stringify(out) + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function handle_(p) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  try {
    const on = authOn_(ss);
    if (p.action === 'config') return { ok: true, config: true, auth: on, drivers: on ? drivers_(ss).filter(d => d.pin).map(d => d.name) : [] };
    if (p.action === 'login') return login_(ss, p);
    let u = null;
    if (on) {
      u = user_(ss, p);
      if (!u) return { ok: false, auth: true, error: 'Please sign in again.' };
    }
    const admin = !u || u.role === 'admin';
    if (p.action === 'upsertUpc') return upsertUpc_(ss, p);
    if (p.action === 'service') return service_(ss, p);
    if (p.action === 'proof') return proof_(ss, p, u);
    if (p.action === 'hasProof') return hasProof_(ss, p);
    if (p.action === 'log') return writeLog_(ss, JSON.parse(p.rows || '[]'), u);
    if (p.action === 'loc') return loc_(ss, p, u);
    if (p.action === 'assign') return admin ? assign_(ss, p) : { ok: false, error: 'Only admins can reassign invoices.' };
    if (p.action === 'comeback') return comeback_(ss, p, u);
    if (p.action === 'stops') return admin ? stops_(ss, p) : { ok: false, error: 'Only admins can change stop order.' };
    return allData_(ss, u);
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

function doGet(e) {
  const p = (e && e.parameter) || {};
  return respond_(handle_(p), p.callback);
}

function doPost(e) {
  const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  if (body.rows) body.rows = JSON.stringify(body.rows);
  if (!body.action) body.action = 'log';
  return respond_(handle_(body));
}
