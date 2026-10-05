import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RATE = 50; // ₦ per km: the single source of truth for pricing
const { PORT = 4000, CLIENT_URL = 'http://localhost:5173', PAYSTACK_SECRET_KEY, DEMO_PAYMENTS } = process.env;
const DEMO = !PAYSTACK_SECRET_KEY && DEMO_PAYMENTS === 'true';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB = path.join(__dirname, 'data.json');

const readDb = () => (fs.existsSync(DB) ? JSON.parse(fs.readFileSync(DB, 'utf8')) : {});
const writeDb = (d) => fs.writeFileSync(DB, JSON.stringify(d, null, 2));
const clean = (s, n = 200) => String(s ?? '').trim().slice(0, n);
const bad = (res, msg, code = 400) => res.status(code).json({ error: msg });
const makeRef = () => 'ODTC-' + Array.from(crypto.randomBytes(8), (b) => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 32]).join('');

async function routeKm(a, b) {
  const ok = (p) => p && Number.isFinite(+p.lat) && Number.isFinite(+p.lon);
  if (!ok(a) || !ok(b)) throw Object.assign(new Error('Choose both locations from the suggestions.'), { code: 400 });
  const url = `https://router.project-osrm.org/route/v1/driving/${a.lon},${a.lat};${b.lon},${b.lat}?overview=false`;
  const r = await fetch(url).catch(() => null);
  const d = r && (await r.json().catch(() => null));
  if (!d?.routes?.[0]) throw Object.assign(new Error('We could not find a driving route between those places. Try more specific locations.'), { code: 422 });
  const km = Math.max(0.1, Math.round(d.routes[0].distance / 100) / 10);
  return { distanceKm: km, fare: Math.round(km * RATE) };
}

const mask = (s, keep = 3) => (s.length > keep * 2 ? s.slice(0, keep) + '•••' + s.slice(-keep) : s);
const publicView = (b) => ({ ...b, customer: { name: b.customer.name, phone: mask(b.customer.phone) }, demo: DEMO });

const app = express();
app.use(cors({ origin: CLIENT_URL }));
app.use(express.json({ limit: '20kb' }));

app.get('/api/places', async (req, res) => {
  const q = clean(req.query.q, 120);
  if (q.length < 3) return res.json([]);
  const r = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=ng&limit=6&q=${encodeURIComponent(q)}`, { headers: { 'User-Agent': 'ODTC-Logistics/1.0' } }).catch(() => null);
  const d = r?.ok ? await r.json().catch(() => []) : [];
  res.json(d.map((p) => ({ label: p.display_name, lat: +p.lat, lon: +p.lon })));
});

app.post('/api/quote', async (req, res) => {
  try { res.json({ ...(await routeKm(req.body.pickup, req.body.dropoff)), rate: RATE }); }
  catch (e) { bad(res, e.message, e.code || 500); }
});

app.post('/api/bookings', async (req, res) => {
  try {
    const { customer = {}, pickup, dropoff, pkg = {} } = req.body;
    const c = { name: clean(customer.name, 80), phone: clean(customer.phone, 20), email: clean(customer.email, 120) };
    const p = { description: clean(pkg.description, 300), size: clean(pkg.size, 40) };
    if (c.name.length < 2 || !/^(\+?234|0)\d{10}$/.test(c.phone.replace(/[\s-]/g, '')) || !/^\S+@\S+\.\S+$/.test(c.email) || p.description.length < 3)
      return bad(res, 'Please check your name, phone, email and package description.');

    const { distanceKm, fare } = await routeKm(pickup, dropoff); // recomputed here. The browser's numbers are never trusted
    const reference = makeRef();
    const booking = {
      reference, customer: c, pickup: clean(pickup.label, 300), dropoff: clean(dropoff.label, 300), distanceKm, ratePerKm: RATE, fare,
      package: p, paymentReference: reference, paymentStatus: 'pending', status: 'awaiting payment', createdAt: new Date().toISOString(),
    };
    const db = readDb(); db[reference] = booking; writeDb(db);

    if (DEMO) return res.json({ reference, authorizationUrl: `${CLIENT_URL}/confirmation/${reference}` });
    if (!PAYSTACK_SECRET_KEY) return bad(res, 'Payments are not configured yet.', 503);

    const r = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST', headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: c.email, amount: fare * 100, currency: 'NGN', reference, callback_url: `${CLIENT_URL}/confirmation/${reference}`, metadata: { distanceKm, ratePerKm: RATE } }),
    });
    const d = await r.json();
    if (!d.status) return bad(res, 'We could not start your payment. Please try again.', 502);
    res.json({ reference, authorizationUrl: d.data.authorization_url });
  } catch (e) { bad(res, e.message || 'Server error', e.code || 500); }
});

// The ONLY place a booking becomes "paid": after the provider confirms it and the amount matches our own fare.
app.get('/api/bookings/:ref/verify', async (req, res) => {
  const db = readDb();
  const b = db[clean(req.params.ref, 40)];
  if (!b) return bad(res, 'We could not find that booking. Check your reference.', 404);
  if (b.paymentStatus === 'pending') {
    if (DEMO) { b.paymentStatus = 'paid'; }
    else if (PAYSTACK_SECRET_KEY) {
      const r = await fetch(`https://api.paystack.co/transaction/verify/${b.paymentReference}`, { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } }).catch(() => null);
      const d = r && (await r.json().catch(() => null));
      if (d?.status && d.data?.status === 'success' && d.data.amount === b.fare * 100 && d.data.currency === 'NGN') b.paymentStatus = 'paid';
      else if (d?.data?.status === 'failed' || d?.data?.status === 'abandoned') b.paymentStatus = 'failed';
    }
    if (b.paymentStatus === 'paid') b.status = 'confirmed';
    writeDb(db);
  }
  res.json(publicView(b));
});

const dist = path.join(__dirname, '../dist');
if (process.env.NODE_ENV === 'production' && fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (_, res) => res.sendFile(path.join(dist, 'index.html')));
}
app.listen(PORT, () => console.log(`ODTC API on :${PORT} ${DEMO ? '(DEMO payments)' : ''}`));
