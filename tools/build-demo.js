// Builds demo.html (training version) from index.html.  Run:  node tools/build-demo.js
// The training copy uses practice data only: no Firebase, no Google Sheet, nothing is saved,
// and its browser storage is kept apart from the real app's.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
let h = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const rep = (from, to, label) => {
  const n = typeof from === 'string' ? h.split(from).length - 1 : (h.match(from) || []).length;
  if (!n) throw new Error('build-demo: could not find ' + label);
  h = typeof from === 'string' ? h.split(from).join(to) : h.replace(from, to);
};

// practice UPCs with valid check digits, so the printed barcodes scan
const upc = s => { const d = s.split('').map(Number); const sum = d.reduce((a, x, i) => a + x * (i % 2 ? 1 : 3), 0); return s + ((10 - sum % 10) % 10); };
const MODELS = [
  ['QN65LS03FW', '65" Frame TV', '84000100011'], ['UN55M80H', '55" TV', '84000100022'], ['QN85QN80H', '85" Neo QLED TV', '84000100033'],
  ['QN48S90H', '48" OLED TV', '84000100044'], ['HW-S800D', 'Soundbar', '84000100055'], ['43Q651G', '43" TV', '84000100066'],
  ['5S-CP230P1', 'Surge protector', '84000100077'], ['5S4KHD2-1.5M', 'HDMI cable', '84000100088'], ['WF45B6300AW', 'Washer', '84000100099'],
  ['DVE45B6300W', 'Dryer', '84000100105']
].map(([m, d, u]) => ({ model: m, desc: d, upc: upc(u) }));


const SAMPLE = `const SAMPLE = (() => {
  const T = 'Trainee', CO = 'Coach';
  const inv = (n, day, cust, addr, drv, paid) => ({ 'Invoice': '066-90001' + n + '-001', 'Date': dAgo(day), 'Customer': cust, 'address': addr, 'Driver': drv, 'Paid': paid });
  const invoices = [
    inv('01', 0, 'Practice Stop A', '2655 Richmond Ave, Staten Island, NY 10314 1', T, 'No'),
    inv('02', 0, 'Practice Stop B', '1000 Richmond Terrace, Staten Island, NY 10301 2', T, 'Yes'),
    inv('03', 0, 'Practice Stop C', '614 Broadway, Staten Island, NY 10310 3', T, 'No'),
    inv('04', 0, 'Practice Stop D', '2800 Victory Blvd, Staten Island, NY 10314 4', T, 'Card'),
    inv('05', 0, 'Practice Stop E', '298 Satterlee St, Staten Island, NY 10307 5', T, 'No'),
    inv('06', -1, 'Practice Stop F', '1 Bay St, Staten Island, NY 10301 1', T, 'No'),
    inv('07', 0, 'Coach Stop 1', '100 Kennedy Blvd, Bayonne, NJ 07002 1', CO, 'Yes'),
    inv('08', 0, 'Coach Stop 2', '30 Hudson St, Jersey City, NJ 07302 2', CO, 'No'),
    inv('09', 1, 'Yesterday Stop', '75 Richmond Terrace, Staten Island, NY 10301 3', T, 'Cash'),
    inv('10', 3, 'Earlier Stop', '200 Clove Rd, Staten Island, NY 10310 2', CO, 'Yes'),
    inv('11', 9, 'Last Week Stop', '1 Teleport Dr, Staten Island, NY 10311 1', T, 'No')
  ];
  const I = n => '066-90001' + n + '-001';
  const it = (n, m, q) => ({ 'Invoice': I(n), 'Model': m, 'Qty': String(q || 1) });
  const items = [
    it('01', 'QN65LS03FW'), it('02', 'UN55M80H'), it('02', '5S-CP230P1'), it('03', 'QN85QN80H'),
    it('04', 'QN48S90H'), it('04', 'HW-S800D'), it('04', '5S4KHD2-1.5M', 2), it('05', '43Q651G'),
    it('06', 'WF45B6300AW'), it('06', 'DVE45B6300W'), it('07', 'UN55M80H'), it('08', '43Q651G'),
    it('09', 'QN65LS03FW'), it('10', 'HW-S800D'), it('11', 'UN55M80H')
  ];
  let sid = 0;
  const sv = (n, code, amt, st) => ({ 'ID': String(++sid), 'InvoiceNumber': I(n), 'ServiceID': code, 'Amount': String(amt), 'STATUS': st || 'DUE' });
  const servicesold = [
    sv('01', 'INSFLATINTDL', 25), sv('02', 'INSTVREPLAC1', 130, 'PAID'), sv('03', 'INSWALLTV', 185), sv('04', 'INSFLATAUD', 88, 'PAID'),
    sv('05', 'INSTVDEL', 30), sv('06', 'INSTVDEL', 30), sv('07', 'INSFLATWIFI', 65, 'PAID'), sv('08', 'INSTVDEL', 30),
    sv('09', 'INSWALLTV', 185, 'PAID'), sv('10', 'INSSOUNDBAR', 62, 'PAID'), sv('11', 'INSTVDEL', 30)
  ];
  const services = [['INSTVDEL', 'TV delivery', 30], ['INSWALLTV', 'Wall-mount TV', 185], ['INSFLATWIFI', 'TV set-up + Wi-Fi', 65], ['INSFLATINTDL', 'Inside delivery', 25],
    ['INSTVREPLAC1', 'TV replacement', 130], ['INSFLATAUD', 'TV + audio set-up', 88], ['INSSOUNDBAR', 'Soundbar install', 62]]
    .map(([c, n, p]) => ({ 'ServiceID': c, 'ServiceName': n, 'Price': String(p) }));
  return {
    invoices, items, servicesold, services,
    stores: [{ 'srt': '66', 'address': '2399 Victory Blvd, Staten Island, NY 10314' }],
    pickups: [{ 'ID': 'PU1', 'Date': dAgo(0), 'Store': '66', 'Address': '', 'Items': 'HW-S800D (practice transfer)', 'Invoice': I('04'), 'Driver': '', 'Done': '' }],
    drivers: [{ 'Name': T, 'Role': 'driver' }, { 'Name': CO, 'Role': 'driver' }],
    locations: [{ 'Name': CO, 'Lat': '40.6687', 'Lon': '-74.1143', 'Updated': new Date(Date.now() - 6 * 60000).toISOString() }],
    upcs: ${JSON.stringify(MODELS.map(m => ({ UPC: m.upc, Model: m.model, Description: m.desc })))},
    log: []
  };
})();
const TRAIN_ME = () => { let r = 'driver'; try { r = localStorage.getItem('scanchk.trainrole') || 'driver'; } catch (e) {} return r === 'admin' ? { name: 'Trainer', email: 'demo', role: 'admin' } : { name: 'Trainee', email: 'demo', role: 'driver' }; };
const TRAIN_DATA = me => { if (me.role === 'admin') return SAMPLE; const mine = SAMPLE.invoices.filter(r => r.Driver === 'Trainee'), ids = {}; mine.forEach(r => ids[r.Invoice] = 1);
  return { ...SAMPLE, invoices: mine, items: SAMPLE.items.filter(r => ids[r.Invoice]), servicesold: SAMPLE.servicesold.filter(r => ids[r.InvoiceNumber]), drivers: [], locations: [] }; };
`;
rep(/const SAMPLE = \{[\s\S]*?\n\};\n/, SAMPLE, 'SAMPLE');
if (!/const FIREBASE_CONFIG = null;/.test(h)) rep(/const FIREBASE_CONFIG = \{[\s\S]*?\n\};/, 'const FIREBASE_CONFIG = null;', 'FIREBASE_CONFIG');
rep('url: SHEET_URL0, urlDraft: SHEET_URL0,', "url: '', urlDraft: '',", 'url state');
rep('demo: !SHEET_URL0,', 'demo: true,', 'demo state');
rep("const api = qs.get('api');", 'const api = null;', 'api param');
rep("fbMode: !!fbCfg(),", 'fbMode: false,', 'fbMode');
rep("this.setState({ data: this.parse(SAMPLE), err: '', loading: false, authNeeded: false, me: { name: 'You (demo admin)', email: 'demo', role: 'admin' } });",
    "{ const tm = TRAIN_ME(); this.setState({ data: this.parse(TRAIN_DATA(tm)), err: '', loading: false, authNeeded: false, me: tm }); }", 'demo load');
rep("saveUrl: () => {", "saveUrl: () => { return this.setFlash('warn', 'Training copy', 'Connecting a sheet is turned off here'); {", 'saveUrl');
rep("connectFb: () => {", "connectFb: () => { return this.setState({ fbMsg: 'Turned off in the training copy.' }); {", 'connectFb');
h = h.replace("saveUrl: () => { return this.setFlash('warn', 'Training copy', 'Connecting a sheet is turned off here'); {", "saveUrl: () => { return this.setFlash('warn', 'Training copy', 'Connecting a sheet is turned off here'); }, saveUrlOff: () => {");
h = h.replace("connectFb: () => { return this.setState({ fbMsg: 'Turned off in the training copy.' }); {", "connectFb: () => { return this.setState({ fbMsg: 'Turned off in the training copy.' }); }, connectFbOff: () => {");
rep("'Scan-Check v' + APP_VERSION", "'TRAINING · Scan-Check v' + APP_VERSION", 'version text');
rep("st.demo ? 'Demo data · not connected'", "st.demo ? 'Training · ' + (st.me ? st.me.name + ' (' + st.me.role + ')' : 'practice data')", 'source label');
rep('<title>Invoice Scan-Check</title>', '<title>Scan-Check Training</title>', 'title');
rep('<link rel="manifest" href="manifest.json">', '', 'manifest');
rep(/[ \t]*if \('serviceWorker' in navigator\) navigator\.serviceWorker\.register\('sw\.js'\)\.catch\(\(\) => \{\}\);\n?/, '', 'sw 1');
rep("<script>if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});</script>", '', 'sw 2');

const ISOLATE = `<script>
// Training copy: keep this page's saved settings apart from the real app (same website).
(function () { var P = 'scdemo:', S = Storage.prototype, g = S.getItem, s = S.setItem, r = S.removeItem;
  S.getItem = function (k) { return g.call(this, P + k); }; S.setItem = function (k, v) { return s.call(this, P + k, v); }; S.removeItem = function (k) { return r.call(this, P + k); };
  window.scTrainRole = function (role) { try { s.call(localStorage, P + 'scanchk.trainrole', role); } catch (e) {} location.reload(); };
  window.scTrainReset = function () { try { var ks = []; for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && k.indexOf(P) === 0) ks.push(k); } ks.forEach(function (k) { r.call(localStorage, k); }); } catch (e) {} location.reload(); };
  window.scTrainIs = function (role) { try { return (g.call(localStorage, P + 'scanchk.trainrole') || 'driver') === role; } catch (e) { return role === 'driver'; } };
})();
</script>`;
rep('<script src="./support.js"></script>', ISOLATE + '\n<script src="./support.js"></script>', 'support.js');

const BANNER = `<div id="train-bar" style="background:#b4321e;color:#fff;font:500 13px/1.35 'IBM Plex Sans',system-ui,sans-serif;padding:8px 16px;display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center">
<b style="letter-spacing:.06em">TRAINING MODE</b><span style="opacity:.9">Practice data — nothing is saved.</span>
<span style="display:flex;gap:6px;align-items:center">Practice as
<button id="tb-driver" onclick="scTrainRole('driver')" style="font:600 12px 'IBM Plex Sans';border:1px solid #fff;border-radius:6px;padding:4px 10px;cursor:pointer">Driver</button>
<button id="tb-admin" onclick="scTrainRole('admin')" style="font:600 12px 'IBM Plex Sans';border:1px solid #fff;border-radius:6px;padding:4px 10px;cursor:pointer">Admin</button></span>
<a href="training-barcodes.html" target="_blank" style="color:#fff">Practice barcodes</a>
<a href="#" onclick="scTrainReset();return false" style="color:#fff">Start over</a>
</div>
<script>['driver','admin'].forEach(function(r){var b=document.getElementById('tb-'+r),on=scTrainIs(r);b.style.background=on?'#fff':'transparent';b.style.color=on?'#b4321e':'#fff';});</script>`;
rep('<body>', '<body>\n' + BANNER, 'body');

fs.writeFileSync(path.join(root, 'demo.html'), h);
console.log('demo.html written,', h.length, 'bytes');

// printable practice barcodes for the training copy
const cards = MODELS.map(m => `<figure><svg class="bc" jsbarcode-format="upc" jsbarcode-value="${m.upc}" jsbarcode-height="70" jsbarcode-width="2" jsbarcode-fontsize="16"></svg><figcaption><b>${m.model}</b> · ${m.desc}</figcaption></figure>`).join('\n');
fs.writeFileSync(path.join(root, 'training-barcodes.html'), `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Practice Barcodes</title>
<style>
:root{--bg:#f4f3ef;--ink:#1c1b18;--card:#fff;--line:#d6d2c8}
body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.45 'IBM Plex Sans',system-ui,sans-serif;padding:16px}
h1{font-size:22px;margin:0 0 4px}p{margin:0 0 16px;color:#55524a;max-width:640px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px}
figure{margin:0;background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px;text-align:center;break-inside:avoid}
svg{max-width:100%;height:auto}figcaption{font-size:13px;margin-top:4px}
button{font:600 14px 'IBM Plex Sans',system-ui;padding:10px 16px;border-radius:8px;border:1px solid var(--ink);background:var(--ink);color:#fff;cursor:pointer;margin-bottom:16px}
@media print{button,p{display:none}body{background:#fff;padding:0}figure{border-color:#999}}
</style></head><body>
<h1>Practice barcodes</h1>
<p>Print this page (or open it on a second screen) and scan the barcodes with the training app's camera. Every model below is on a practice invoice. Tip: scan one twice, or scan a model that isn't on the invoice you opened, to see the warnings.</p>
<button onclick="print()">Print</button>
<div class="grid">
${cards}
</div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jsbarcode/3.11.6/JsBarcode.all.min.js"></script>
<script>JsBarcode('.bc').init();</script>
</body></html>
`);
console.log('training-barcodes.html written');
