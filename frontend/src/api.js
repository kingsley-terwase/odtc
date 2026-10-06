import { API_URL } from './config';

const BASE = `${API_URL}/api/v1`;
const ADMIN_KEY = 'odtc_admin_token';
const BOOKINGS_KEY = 'odtc_bookings';

/* ---------- storage (safe if blocked) ---------- */
const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } },
  del: (k) => { try { localStorage.removeItem(k); } catch { /* ignore */ } },
};

/* ---------- http ---------- */
export class ApiError extends Error {
  constructor(message, status, code) { super(message); this.status = status; this.code = code; }
}

const errorText = (data) => {
  const e = data?.error;
  if (typeof e === 'string') return e;
  return e?.message || data?.message || '';
};

async function call(path, { method = 'GET', body, headers = {}, token } = {}) {
  const h = { Accept: 'application/json', ...headers };
  if (body !== undefined) h['Content-Type'] = 'application/json';
  if (token) h.Authorization = `Bearer ${token}`;
  let res;
  try {
    res = await fetch(BASE + path, { method, headers: h, body: body !== undefined ? JSON.stringify(body) : undefined });
  } catch {
    throw new ApiError('Cannot reach the server. Check your connection and try again.', 0);
  }
  const data = res.status === 204 ? {} : await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(errorText(data) || 'Something went wrong. Please try again.', res.status, data?.error?.code);
  return data;
}

// The API runs on a host that sleeps when idle. Ping it early so the first real request is quick.
export const wakeApi = () => { fetch(`${BASE}/health`).catch(() => {}); };

/* ---------- shared formatting ---------- */
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const km = (meters) => Math.round((num(meters) / 1000) * 10) / 10;

/* ---------- guest: locations, quote, booking, payment ---------- */
export const searchPlaces = async (q) => {
  const { locations = [] } = await call(`/guest/locations?q=${encodeURIComponent(q)}`);
  return locations.map((l) => ({ ...l, id: l.mapboxId, label: l.address }));
};

// Returns the display quote plus the one-time token the booking call needs.
export const getQuote = async (pickup, dropoff) => {
  const { quote, bookingToken } = await call('/guest/quotes', { method: 'POST', body: { pickupId: pickup.id, deliveryId: dropoff.id } });
  return {
    id: quote.id,
    token: bookingToken,
    distanceKm: km(quote.distanceMeters),
    fare: num(quote.totalFare),
    ratePerKm: num(quote.ratePerKm),
    minimumFare: num(quote.minimumFare),
    expiresAt: quote.expiresAt,
  };
};

// Booking token + id are kept so the confirmation page can verify payment after Paystack sends the customer back.
const rememberBooking = (reference, info) => {
  let all = {};
  try { all = JSON.parse(store.get(BOOKINGS_KEY)) || {}; } catch { all = {}; }
  all[reference] = { ...info, savedAt: Date.now() };
  all.last = reference;
  const keep = Object.entries(all).filter(([k]) => k !== 'last').sort((a, b) => b[1].savedAt - a[1].savedAt).slice(0, 10);
  store.set(BOOKINGS_KEY, JSON.stringify({ ...Object.fromEntries(keep), last: reference }));
};
export const savedBooking = (reference) => {
  try {
    const all = JSON.parse(store.get(BOOKINGS_KEY)) || {};
    const ref = reference || all.last;
    return ref && all[ref] ? { reference: ref, ...all[ref] } : null;
  } catch { return null; }
};

// Creates the booking, starts Paystack checkout and returns the payment page address.
export const createBooking = async ({ quote, customer, pkg }) => {
  const { booking } = await call('/guest/bookings', {
    method: 'POST',
    headers: { 'X-Booking-Token': quote.token },
    body: {
      quoteId: quote.id,
      fullName: customer.name,
      phone: customer.phone,
      email: customer.email,
      packageDescription: pkg.description,
      ...(pkg.size ? { packageSize: pkg.size } : {}),
    },
  });
  rememberBooking(booking.reference, { id: booking.id, token: quote.token });
  const pay = await call(`/guest/bookings/${encodeURIComponent(booking.id)}/payment`, { method: 'POST', headers: { 'X-Booking-Token': quote.token } });
  return { authorizationUrl: pay.authorizationUrl, reference: booking.reference };
};

const PENDING = ['AWAITING_PAYMENT', 'PENDING', 'PENDING_PAYMENT'];
const payState = (b, raw) => {
  const p = String(raw?.paymentStatus || b.paymentStatus || raw?.payment?.status || '').toLowerCase();
  if (['paid', 'success', 'successful'].includes(p)) return 'paid';
  if (['failed', 'abandoned', 'reversed'].includes(p)) return 'failed';
  const s = String(b.status || '').toUpperCase();
  if (s.includes('FAIL')) return 'failed';
  return PENDING.includes(s) || !s ? 'pending' : 'paid';
};
const words = (s) => String(s || '').toLowerCase().replace(/_/g, ' ');

// One shape for every screen: customer, route, fare, package, payment and booking status.
const shape = (b, raw = {}) => ({
  id: b.id,
  reference: b.reference,
  customer: { name: b.fullName, phone: b.phone, email: b.email },
  pickup: b.quote?.pickup?.address,
  dropoff: b.quote?.delivery?.address,
  distanceKm: km(b.quote?.distanceMeters),
  ratePerKm: num(b.quote?.ratePerKm),
  fare: num(b.quote?.totalFare),
  package: { description: b.packageDescription, size: b.packageSize || '' },
  paymentReference: b.reference,
  paymentStatus: payState(b, raw),
  status: words(b.status),
  receiptStatus: words(b.receiptStatus),
  createdAt: b.createdAt,
});

// Asks the server to check Paystack, then loads the full booking for display.
export const verifyBooking = async (reference) => {
  const saved = savedBooking(reference);
  if (!saved) throw new ApiError('We could not find this booking on this device. Open the link on the phone or computer you booked with, or contact us with your reference.', 404);
  const headers = { 'X-Booking-Token': saved.token };
  const verified = await call(`/guest/bookings/${encodeURIComponent(saved.id)}/verify-payment`, { method: 'POST', headers });
  let full = verified.booking || (verified.reference ? verified : null);
  try {
    const g = await call(`/guest/bookings/${encodeURIComponent(saved.id)}`, { headers });
    full = g.booking || g;
  } catch { /* fall back to the verify response */ }
  if (!full?.reference) throw new ApiError('Payment check finished but the booking could not be loaded. Please try again.', 502);
  return shape(full, verified);
};

/* ---------- admin: session ---------- */
const adminToken = () => store.get(ADMIN_KEY);
const admin = (path, opts = {}) => {
  const token = adminToken();
  if (!token) return Promise.reject(new ApiError('Please sign in.', 401));
  return call(path, { ...opts, token }).catch((e) => { if (e.status === 401) store.del(ADMIN_KEY); throw e; });
};

export const adminLogin = async (email, password) => {
  const { token, user } = await call('/auth/login', { method: 'POST', body: { email, password } });
  if (user?.role !== 'ADMIN') throw new ApiError('This account does not have admin access.', 403);
  store.set(ADMIN_KEY, token);
  return user;
};
export const adminMe = async () => (await admin('/auth/me')).user;
export const adminLogout = async () => {
  try { await admin('/auth/logout', { method: 'POST' }); } finally { store.del(ADMIN_KEY); }
};

/* ---------- admin: bookings ---------- */
export const adminOrders = async () => {
  const data = await admin('/admin/bookings?limit=100&offset=0');
  const list = data.bookings || data.items || data.data || (Array.isArray(data) ? data : []);
  return list.map((b) => shape(b));
};

/* ---------- admin: pricing ---------- */
const price = (p) => p && ({ id: p.id, ratePerKm: p.ratePerKm, minimumFare: p.minimumFare, currency: p.currency, createdAt: p.createdAt });
export const adminPricing = async () => {
  try { return price((await admin('/admin/pricing')).pricing); } catch (e) { if (e.status === 404) return null; throw e; }
};
export const adminPricingHistory = async () => ((await admin('/admin/pricing/history')).pricing || []).map(price);
export const adminSetPricing = async (ratePerKm, minimumFare) =>
  price((await admin('/admin/pricing', { method: 'POST', body: { ratePerKm, minimumFare } })).pricing);

/* ---------- admin: service areas ---------- */
export const adminAreas = async () => (await admin('/admin/service-areas?limit=100&offset=0')).areas || [];
export const adminUpdateArea = async (id, patch) => (await admin(`/admin/service-areas/${encodeURIComponent(id)}`, { method: 'PATCH', body: patch })).area;
export const adminSubdivisions = async (areaId) => (await admin(`/admin/service-areas/${encodeURIComponent(areaId)}/subdivisions?limit=100&offset=0`)).subdivisions || [];
export const adminAddSubdivision = async (areaId, name) =>
  (await admin(`/admin/service-areas/${encodeURIComponent(areaId)}/subdivisions`, { method: 'POST', body: { name } })).subdivision;
