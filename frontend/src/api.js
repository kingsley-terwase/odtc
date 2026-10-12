// ODTC Logistics API client. In dev, /api is proxied by Vite (no CORS). In production it calls VITE_API_URL.
const BASE = import.meta.env.DEV ? '' : import.meta.env.VITE_API_URL || 'https://odtc-logistics-api.onrender.com';
const V1 = `${BASE}/api/v1`;
const TOKEN_KEY = 'odtc_admin_token';

const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* ignore */ } },
};

export class ApiError extends Error {
  constructor(message, status = 0, code) { super(message); this.status = status; this.code = code; }
}

async function call(path, { method = 'GET', body, admin = false, guest } = {}) {
  const headers = { Accept: 'application/json' };
  if (body) headers['Content-Type'] = 'application/json';
  if (admin && store.get(TOKEN_KEY)) headers.Authorization = `Bearer ${store.get(TOKEN_KEY)}`;
  if (guest) headers['X-Booking-Token'] = guest;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 60000);
  let res;
  try {
    res = await fetch(V1 + path, { method, headers, body: body ? JSON.stringify(body) : undefined, signal: ctl.signal });
  } catch {
    throw new ApiError('Cannot reach the server. It may be waking up, so wait a few seconds and try again.');
  } finally {
    clearTimeout(timer);
  }
  const data = res.status === 204 ? {} : await res.json().catch(() => ({}));
  if (!res.ok) {
    if (admin && res.status === 401) store.set(TOKEN_KEY, null);
    const e = data.error;
    const msg = (typeof e === 'string' ? e : e?.message) || data.message || (res.status === 401 ? 'Please sign in again.' : 'Something went wrong. Please try again.');
    throw new ApiError(msg, res.status, typeof e === 'object' ? e?.code : undefined);
  }
  return data;
}

// Pages through a paginated list until everything is loaded.
async function fetchAll(path, keys, opts) {
  const out = [];
  for (let i = 0; i < 40; i++) {
    const d = await call(`${path}${path.includes('?') ? '&' : '?'}limit=50&offset=${out.length}`, opts);
    const rows = keys.map((k) => d[k]).find(Array.isArray) ?? (Array.isArray(d) ? d : []);
    out.push(...rows);
    if (!rows.length || (d.total != null ? out.length >= d.total : rows.length < 50)) break;
  }
  return out;
}

export const warmUp = () => { fetch(`${V1}/health`).catch(() => { }); }; // wakes a sleeping Render server
export const wakeApi = warmUp;

/* ---------------- Guest booking (shaped for the Book and Confirmation pages) ---------------- */
export const searchPlaces = async (q) =>
  ((await call(`/guest/locations?q=${encodeURIComponent(q)}`)).locations || []).map((l) => ({ ...l, id: l.mapboxId, label: l.address }));

// Takes two places from searchPlaces. Returns numbers plus the private booking token the later calls need.
export async function getQuote(pickup, dropoff) {
  const { quote, bookingToken } = await call('/guest/quotes', { method: 'POST', body: { pickupId: pickup.id, deliveryId: dropoff.id } });
  return {
    id: quote.id, bookingToken, expiresAt: quote.expiresAt,
    distanceKm: Math.round(Number(quote.distanceMeters) / 10) / 100,
    fare: Number(quote.totalFare), ratePerKm: Number(quote.ratePerKm), minimumFare: Number(quote.minimumFare),
    pickup: quote.pickup?.address, dropoff: quote.delivery?.address,
  };
}

// The booking id and private token are kept in this browser so the confirmation page can verify after Paystack.
export const saveBooking = (s) => {
  const v = JSON.stringify(s);
  [s.reference, s.paymentReference].filter(Boolean).forEach((r) => store.set(`odtc_booking_${r}`, v));
  store.set('odtc_last_booking', v);
};
export const loadBooking = (ref) => { try { return JSON.parse(store.get(`odtc_booking_${ref}`) || store.get('odtc_last_booking')); } catch { return null; } };

const made = new Map(); // a retry with the same quote and details reuses the booking instead of creating a duplicate
export async function createBooking({ quote, customer, pkg }) {
  const desc = pkg.description.trim();
  const key = [quote.id, customer.name, customer.phone, customer.email, desc, pkg.size].join('|');
  let booking = made.get(key);
  if (!booking) {
    const d = await call('/guest/bookings', {
      method: 'POST', guest: quote.bookingToken,
      body: {
        quoteId: quote.id, fullName: customer.name.trim(), phone: customer.phone.replace(/[\s-]/g, ''), email: customer.email.trim(),
        packageDescription: pkg.size ? `${desc} (Size: ${pkg.size})` : desc,
      },
    });
    booking = d.booking;
    made.set(key, booking);
    saveBooking({ id: booking.id, token: quote.bookingToken, reference: booking.reference });
  }
  const pay = await call(`/guest/bookings/${booking.id}/payment`, { method: 'POST', guest: quote.bookingToken });
  saveBooking({ id: booking.id, token: quote.bookingToken, reference: booking.reference, paymentReference: pay.reference });
  return { authorizationUrl: pay.authorizationUrl, reference: booking.reference };
}

// Verifies the payment with the API and returns the booking in the shape the pages use.
export async function verifyBooking(ref) {
  const s = loadBooking(ref);
  if (!s) throw new ApiError('We could not find this booking in this browser. If you already paid, your receipt was emailed to you.');
  const read = () => call(`/guest/bookings/${s.id}`, { guest: s.token });
  let raw;
  try { raw = await call(`/guest/bookings/${s.id}/verify-payment`, { method: 'POST', guest: s.token }); } catch { raw = await read(); }
  let b = normalizeBooking(raw);
  if (!b.pickup || !b.reference) b = normalizeBooking(await read()); // the verify reply had no route details
  return b;
}

// Turns an API booking into the shape the pages use.
export function normalizeBooking(raw) {
  const b = raw?.booking ?? raw ?? {};
  const q = b.quote ?? {};
  const st = String(b.status ?? '').toUpperCase().replace(/[\s-]/g, '_');
  const cancelled = ['CANCELLED', 'CANCELED', 'REFUNDED'].includes(st);
  const paid = ['PAID', 'CONFIRMED', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED'].includes(st) || (cancelled && !!b.paidAt);
  const failed = !paid && (st.includes('FAIL') || st === 'EXPIRED' || cancelled);
  const status = cancelled ? 'cancelled' : ['DELIVERED', 'COMPLETED'].includes(st) ? 'delivered' : ['PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(st) ? 'picked up' : paid ? 'confirmed' : failed ? 'payment failed' : 'awaiting payment';
  return {
    id: b.id, reference: b.reference, paymentReference: b.reference,
    paymentStatus: paid ? 'paid' : failed ? 'failed' : 'pending', status,
    customer: { name: b.fullName || '', phone: b.phone || '', email: b.email || '' },
    pickup: q.pickup?.address || '', dropoff: q.delivery?.address || '',
    distanceKm: Math.round(Number(q.distanceMeters || 0) / 10) / 100, fare: Number(q.totalFare || 0),
    package: { description: b.packageDescription || '', size: b.packageSize || '' },
    createdAt: b.createdAt || new Date().toISOString(),
  };
}

/* ---------------- Admin ---------------- */
export async function adminLogin(email, password) {
  const d = await call('/auth/login', { method: 'POST', body: { email, password } });
  if (d.user?.role !== 'ADMIN') throw new ApiError('This account does not have admin access.', 403);
  store.set(TOKEN_KEY, d.token);
  return d.user;
}
export async function adminMe() {
  if (!store.get(TOKEN_KEY)) throw new ApiError('Not signed in.', 401);
  const d = await call('/auth/me', { admin: true });
  if (d.user?.role !== 'ADMIN') { store.set(TOKEN_KEY, null); throw new ApiError('Not an admin.', 403); }
  return d.user;
}
export async function adminLogout() {
  try { await call('/auth/logout', { method: 'POST', admin: true }); } catch { /* ignore */ }
  store.set(TOKEN_KEY, null);
}

export async function adminOrders() {
  const rows = await fetchAll('/admin/bookings', ['bookings', 'items', 'data'], { admin: true });
  return rows.map(normalizeBooking).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

export async function adminPricing() {
  try { return (await call('/admin/pricing', { admin: true })).pricing; } catch (e) { if (e.status === 404) return null; throw e; }
}
export const adminPricingHistory = async () => (await call('/admin/pricing/history', { admin: true })).pricing || [];
export const adminSetPricing = async (ratePerKm, minimumFare) =>
  (await call('/admin/pricing', { method: 'POST', admin: true, body: { ratePerKm, minimumFare } })).pricing;

export const adminAreas = () => fetchAll('/admin/service-areas', ['areas'], { admin: true });
export const adminCreateArea = async (body) => (await call('/admin/service-areas', { method: 'POST', admin: true, body })).area;
export const adminUpdateArea = async (id, patch) => (await call(`/admin/service-areas/${id}`, { method: 'PATCH', admin: true, body: patch })).area;
export const adminSubdivisions = (id) => fetchAll(`/admin/service-areas/${id}/subdivisions`, ['subdivisions'], { admin: true });
export const adminAvailableSubdivisions = (id, { limit = 50, offset = 0 } = {}) =>
  call(`/admin/service-areas/${id}/available-subdivisions?limit=${limit}&offset=${offset}`, { admin: true });
export const adminAddSubdivision = async (id, name) => (await call(`/admin/service-areas/${id}/subdivisions`, { method: 'POST', admin: true, body: { name } })).subdivision;
// ASSUMED endpoint (the collection's "Update subdivision" request is blank): PATCH .../subdivisions/:subId
export const adminUpdateSubdivision = async (id, subId, patch) => {
  const d = await call(`/admin/service-areas/${id}/subdivisions/${subId}`, { method: 'PATCH', admin: true, body: patch });
  return d.subdivision ?? patch;
};