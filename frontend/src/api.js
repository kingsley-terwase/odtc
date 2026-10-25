// ODTC Logistics API client. In dev, /api is proxied by Vite (no CORS). In production it calls VITE_API_URL.
// API root without a trailing slash or /api/v1 (the code adds /api/v1). Works whether VITE_API_URL is
// https://odtc-logistics-api.onrender.com or https://odtc-logistics-api.onrender.com/api/v1.
const ROOT = String(import.meta.env.VITE_API_URL || 'https://odtc-logistics-api.onrender.com').trim().replace(/\/+$/, '').replace(/\/api\/v1$/i, '').replace(/\/+$/, '');
const BASE = import.meta.env.DEV ? '' : ROOT; // in dev, Vite proxies /api to the same server (no CORS)
const V1 = `${BASE}/api/v1`;
// One sign-in for every role (CLIENT, COURIER, ADMIN): a single session token.
const TOKEN_KEY = 'odtc_session';
const CLIENT_KEY = TOKEN_KEY;

const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* ignore */ } },
};

export class ApiError extends Error {
  constructor(message, status = 0, code) { super(message); this.status = status; this.code = code; }
}
export const needsSignIn = (e) => e?.code === 'AUTH_REQUIRED';

// admin: true = admin call (token required, cleared on 401). optAuth = attach the admin token if one exists, but never require it.
async function call(path, { method = 'GET', body, admin = false, client = false, optAuth = false, guest } = {}) {
  const headers = { Accept: 'application/json' };
  if (body) headers['Content-Type'] = 'application/json';
  if ((admin || optAuth) && store.get(TOKEN_KEY)) headers.Authorization = `Bearer ${store.get(TOKEN_KEY)}`;
  if (client && store.get(CLIENT_KEY)) headers.Authorization = `Bearer ${store.get(CLIENT_KEY)}`;
  if (path.startsWith('/guest/') && store.get(CLIENT_KEY)) headers.Authorization = `Bearer ${store.get(CLIENT_KEY)}`; // booking needs a signed-in customer
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
    if (client && res.status === 401) store.set(CLIENT_KEY, null);
    const e = data.error;
    const msg = (typeof e === 'string' ? e : e?.message) || data.message || (res.status === 401 ? 'Please sign in again.' : 'Something went wrong. Please try again.');
    // The server says "A bearer session token is required." when nobody is signed in. Say it in plain words instead.
    if (res.status === 401 && /bearer|session token|token is required|not authenticated|unauthori[sz]ed|authorization/i.test(msg)) {
      const hadSession = !!store.get(CLIENT_KEY);
      if (path.startsWith('/guest/')) {
        if (hadSession) store.set(CLIENT_KEY, null); // the saved session is no longer valid
        throw new ApiError(hadSession ? 'Your session has expired. Please sign in again to continue with your booking.' : 'You need an account to book a delivery. Please sign up or sign in first.', 401, 'AUTH_REQUIRED');
      }
      throw new ApiError('Please sign in to continue.', 401, 'AUTH_REQUIRED');
    }
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

/* ---------------- Public rate, VAT and base fare ---------------- */
// GET /pricing (public). Returns { ratePerKm, minimumFare, currency }.
export const getRate = async () => (await call('/pricing')).pricing;
export const getPricing = getRate;

const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
// Reads { delivery fare, base fare, VAT, total } off a quote or booking. The server's totalFare is the full amount to pay.
// deliveryFare is the distance charge. baseFare is the flat fee for the trip's distance band (UP_TO_4_99_KM, FROM_5_TO_9_99_KM, FROM_10_KM).
function serverBreakdown(q) {
  if (!q || (q.vatAmount ?? q.vat?.amount ?? q.baseFare) == null) return null;
  const baseFare = Number(q.baseFare?.amount ?? q.baseFare ?? 0) || 0;
  const vat = Number(q.vatAmount ?? q.vat?.amount ?? 0) || 0;
  const total = Number(q.grandTotal ?? q.totalAmount ?? q.totalFare ?? 0) || 0;
  const delivery = Number(q.deliveryFare ?? q.subtotalFare);
  return { fare: Number.isFinite(delivery) && delivery > 0 ? r2(delivery) : r2(total - baseFare - vat), baseFare, vat, vatRate: Number(q.vatRate ?? q.vat?.rate ?? 0) || 0, total: r2(total) };
}

const num = (v) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : null; };
// Public GET /vat -> { vat: { rate } }. It can fail on its own without breaking the checkout, so it comes back as a number or null.
export const getVat = async () => { try { return num((d => d.vat?.rate ?? d.vat ?? d.rate)(await call('/vat'))); } catch { return null; } };
// The base fare for a trip comes from the quote itself (it depends on the distance), so only VAT is read ahead of time.
export async function getCharges() {
  let vatRate = await getVat();
  if (vatRate == null) {
    try { const p = (await call('/pricing')).pricing || {}; vatRate = num(p.vatRate ?? p.vat?.rate ?? p.vat); } catch { /* keep null */ }
  }
  return { vatRate, baseFare: null };
}

export const warmUp = () => { fetch(`${BASE}/health`).catch(() => { }); }; // wakes a sleeping Render server (GET /health)
export const wakeApi = warmUp;

/* ---------------- Guest booking (Google Places) ---------------- */
// Autocomplete session: one token per search-then-pick, passed to both the search and the details call so Google bills them as one session.
export const newSession = () => (globalThis.crypto?.randomUUID ? crypto.randomUUID() : `s${Date.now()}${Math.random().toString(36).slice(2)}`);

// GET /guest/locations?q= -> { locations: [{ placeId, address }] }
// Business, plaza and landmark names are matched by Google itself. If a long query finds nothing
// (e.g. "worldgate plaza karu nassarawa"), we retry with fewer trailing words so the place still comes up.
// The sessionToken query param is optional. If the API rejects it (strict validation), we drop it and retry once, and stop sending it.
let sendSession = true;
const withSession = async (path, sessionToken) => {
  const url = (tok) => `${path}${tok ? `${path.includes('?') ? '&' : '?'}sessionToken=${encodeURIComponent(tok)}` : ''}`;
  try { return await call(url(sendSession ? sessionToken : null)); } catch (e) {
    if (sendSession && sessionToken && (e.status === 400 || e.status === 422)) { sendSession = false; return call(url(null)); }
    throw e;
  }
};
const findPlaces = async (q, sessionToken) => (await withSession(`/guest/locations?q=${encodeURIComponent(q)}`, sessionToken)).locations || [];
export async function searchPlaces(q, sessionToken) {
  const words = q.trim().split(/\s+/);
  let rows = await findPlaces(q.trim(), sessionToken);
  for (let n = words.length - 1; !rows.length && n >= 2 && n >= words.length - 3; n--) rows = await findPlaces(words.slice(0, n).join(' '), sessionToken);
  if (rows.length && !rows.some((l) => l.placeId)) throw new ApiError('The API you are connected to is returning addresses in an old format (no placeId). Point VITE_API_URL (or the dev proxy) at the deployment that uses Google Places.');
  const seen = new Set();
  return rows.filter((l) => l.placeId && !seen.has(l.placeId) && seen.add(l.placeId)).map((l) => ({ ...l, id: l.placeId, label: l.address }));
}

// GET /guest/locations/:placeId -> full details (coordinates, state, city, LGAs). Called once a suggestion is picked.
export async function getPlace(place, sessionToken) {
  const d = await withSession(`/guest/locations/${encodeURIComponent(place.id)}`, sessionToken);
  const l = d.location || {};
  return {
    ...place, label: place.label, address: l.address || place.label,
    placeId: l.placeId, // from the Place Details response (location.placeId); this is what the quote uses
    lat: l.latitude, lng: l.longitude, state: l.state, countryCode: l.countryCode,
    city: (l.cities && l.cities[0]) || '', lga: (l.lgas && l.lgas[0]) || '', kind: l.featureType,
  };
}

// Takes two places returned by getPlace (each carries location.placeId from Place Details). Returns numbers plus the private booking token the later calls need.
export async function getQuote(pickup, dropoff) {
  if (!pickup?.placeId || !dropoff?.placeId) throw new ApiError('Pick both addresses from the suggestions so we can confirm them.');
  const { quote, bookingToken } = await call('/guest/quotes', { method: 'POST', body: { pickupId: pickup.placeId, deliveryId: dropoff.placeId } });
  return {
    id: quote.id, bookingToken, expiresAt: quote.expiresAt,
    distanceKm: Math.round(Number(quote.distanceMeters) / 10) / 100,
    durationMin: quote.estimatedDurationSeconds ? Math.max(1, Math.round(Number(quote.estimatedDurationSeconds) / 60)) : null,
    fare: Number(quote.deliveryFare ?? quote.totalFare), ratePerKm: Number(quote.ratePerKm), minimumFare: Number(quote.minimumFare),
    // totalFare already includes the base fare and VAT.
    serverCharges: serverBreakdown(quote),
    pickup: quote.pickup?.address, dropoff: quote.delivery?.address,
  };
}

// The booking id and private token are kept in this browser so the confirmation and tracking pages can read it later.
const INDEX_KEY = 'odtc_booking_index';
const readIndex = () => { try { return JSON.parse(store.get(INDEX_KEY)) || []; } catch { return []; } };
export const saveBooking = (s) => {
  const v = JSON.stringify(s);
  [s.reference, s.paymentReference].filter(Boolean).forEach((r) => store.set(`odtc_booking_${r}`, v));
  store.set('odtc_last_booking', v);
  if (s.id && s.reference) {
    const idx = readIndex().filter((x) => x.id !== s.id);
    idx.unshift({ id: s.id, reference: s.reference, at: Date.now() });
    store.set(INDEX_KEY, JSON.stringify(idx.slice(0, 20)));
  }
};
export const loadBooking = (ref) => { try { return JSON.parse(store.get(`odtc_booking_${ref}`) || store.get('odtc_last_booking')); } catch { return null; } };
export const savedBookings = () => readIndex();

const PACKAGE_SIZES = { small: 'SMALL', medium: 'MEDIUM', large: 'LARGE' };
export const sizeCode = (label) => PACKAGE_SIZES[String(label || '').trim().toLowerCase().split(/[\s(]/)[0]] || undefined;
const party = (p) => (!p || p.sameAsBooker ? { sameAsBooker: true } : { sameAsBooker: false, fullName: p.name.trim(), phone: p.phone.replace(/[\s-]/g, ''), email: p.email.trim() });

const made = new Map(); // a retry with the same quote and details reuses the booking instead of creating a duplicate
export async function createBooking({ quote, customer, pkg, sender, recipient, breakdown }) {
  const desc = pkg.description.trim();
  const key = [quote.id, customer.name, customer.phone, customer.email, desc, pkg.size, JSON.stringify(sender || {}), JSON.stringify(recipient || {})].join('|');
  let booking = made.get(key);
  if (!booking) {
    const body = {
      quoteId: quote.id, fullName: customer.name.trim(), phone: customer.phone.replace(/[\s-]/g, ''), email: customer.email.trim(),
      sender: party(sender), recipient: party(recipient), packageDescription: desc,
    };
    const size = sizeCode(pkg.size);
    if (size) body.packageSize = size;
    const d = await call('/guest/bookings', { method: 'POST', guest: quote.bookingToken, body });
    booking = d.booking;
    made.set(key, booking);
    saveBooking({ id: booking.id, token: quote.bookingToken, reference: booking.reference, breakdown });
  }
  const pay = await call(`/guest/bookings/${booking.id}/payment`, { method: 'POST', guest: quote.bookingToken });
  saveBooking({ id: booking.id, token: quote.bookingToken, reference: booking.reference, paymentReference: pay.reference, breakdown });
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
  if (!b.pickup || !b.reference) b = normalizeBooking(await read()); // the verify reply has no route details
  if (!b.breakdown && s.breakdown) b.breakdown = s.breakdown; // the base fare and VAT shown at checkout
  return b;
}

// Read-only look-up used by the tracking page (no payment verification call).
export async function trackBooking(ref) {
  const s = loadBooking(ref);
  if (!s || (s.reference !== ref && s.paymentReference !== ref)) throw new ApiError('We could not find that reference in this browser. Tracking works on the device you booked from. Check your email for the receipt.');
  const b = normalizeBooking(await call(`/guest/bookings/${s.id}`, { guest: s.token }));
  if (!b.breakdown && s.breakdown) b.breakdown = s.breakdown;
  return b;
}

// Resends the pickup code to the sender or the delivery code to the recipient. The API enforces a cooldown (429).
export async function resendCode(kind, ref) {
  const s = loadBooking(ref);
  if (!s) throw new ApiError('We could not find this booking in this browser.');
  await call(`/guest/bookings/${s.id}/${kind === 'delivery' ? 'delivery-code' : 'pickup-code'}`, { method: 'POST', guest: s.token });
  return true;
}

// Turns an API booking into the shape the pages use.
export function normalizeBooking(raw) {
  const b = raw?.booking ?? raw ?? {};
  const q = b.quote ?? {};
  const st = String(b.status ?? '').toUpperCase().replace(/[\s-]/g, '_');
  const cancelled = ['CANCELLED', 'CANCELED', 'REFUNDED'].includes(st);
  const paid = ['PAID', 'CONFIRMED', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED'].includes(st) || (cancelled && !!b.paidAt);
  const failed = !paid && (st.includes('FAIL') || st === 'EXPIRED' || cancelled);
  const pickedUp = b.pickupStatus === 'COMPLETED';
  const delivered = b.deliveryStatus === 'COMPLETED' || ['DELIVERED', 'COMPLETED'].includes(st);
  const status = cancelled ? 'cancelled' : delivered ? 'delivered' : pickedUp || ['PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(st) ? 'picked up' : paid ? 'confirmed' : failed ? 'payment failed' : 'awaiting payment';
  return {
    id: b.id, reference: b.reference, paymentReference: b.reference,
    paymentStatus: paid ? 'paid' : failed ? 'failed' : 'pending', status,
    pickupStatus: b.pickupStatus || 'PENDING', deliveryStatus: b.deliveryStatus || 'PENDING',
    pickupCompletedAt: b.pickupCompletedAt || null, deliveryCompletedAt: b.deliveryCompletedAt || null, receiptStatus: b.receiptStatus || '',
    customer: { name: b.fullName || '', phone: b.phone || '', email: b.email || '' },
    sender: { sameAsBooker: b.senderSameAsBooker !== false, name: b.senderName || b.fullName || '', phone: b.senderPhone || b.phone || '', email: b.senderEmail || b.email || '' },
    recipient: { sameAsBooker: !!b.recipientSameAsBooker, name: b.recipientName || b.fullName || '', phone: b.recipientPhone || b.phone || '', email: b.recipientEmail || b.email || '' },
    pickup: q.pickup?.address || '', dropoff: q.delivery?.address || '',
    distanceKm: Math.round(Number(q.distanceMeters || 0) / 10) / 100,
    durationMin: q.estimatedDurationSeconds ? Math.max(1, Math.round(Number(q.estimatedDurationSeconds) / 60)) : null,
    fare: Number(q.totalFare || 0), // total paid (admin earnings use this)
    deliveryFare: Number(q.deliveryFare ?? q.totalFare ?? 0),
    ratePerKm: Number(q.ratePerKm) || undefined, minimumFare: Number(q.minimumFare) || undefined,
    // The charges as the API returns them on the quote.
    breakdown: serverBreakdown(q) || undefined,
    package: { description: b.packageDescription || '', size: b.packageSize || '' },
    createdAt: b.createdAt || new Date().toISOString(),
  };
}

/* ---------------- Client accounts, courier onboarding ---------------- */
const clientSession = (d) => { if (d.token) store.set(CLIENT_KEY, d.token); return d.user; };
export const hasClientSession = () => !!store.get(CLIENT_KEY);
export const clientRegister = async ({ name, email, password }) => clientSession(await call('/auth/register', { method: 'POST', body: { name: name.trim(), email: email.trim(), password } }));
// Sign in for any role. The returned user has role CLIENT, COURIER or ADMIN.
export const clientLogin = async (email, password) => clientSession(await call('/auth/login', { method: 'POST', body: { email: email.trim(), password } }));
export const clientGoogle = async (idToken) => clientSession(await call('/auth/google', { method: 'POST', body: { idToken } }));
export async function clientMe() {
  if (!store.get(CLIENT_KEY)) throw new ApiError('Not signed in.', 401);
  return (await call('/auth/me', { client: true })).user;
}
export async function clientLogout() {
  try { await call('/auth/logout', { method: 'POST', client: true }); } catch { /* ignore */ }
  store.set(CLIENT_KEY, null);
}
// Forgot / reset password
export const requestPasswordReset = (email) => call('/auth/request-password-reset', { method: 'POST', body: { email: email.trim() } });
export const resetPassword = (token, password) => call('/auth/reset-password', { method: 'POST', body: { token, password } });
export const requestVerification = (email) => call('/auth/request-verification', { method: 'POST', body: { email: email.trim() } });
export const verifyEmail = (token) => call('/auth/verify-email', { method: 'POST', body: { token } });
export const resendVerification = () => call('/auth/resend-verification', { method: 'POST', client: true });

export async function courierRegister({ name, email, password, phone }) {
  const d = (await call('/auth/register/courier', { method: 'POST', body: { name: name.trim(), email: email.trim(), password, phone: phone.replace(/[\s-]/g, '') } }));
  return { user: clientSession(d), application: d.courierApplication || null, verification: d.verification || null };
}
export const courierApplication = async () => {
  try { return (await call('/couriers/application', { client: true })).application || null; } catch (e) { if (e.status === 404) return null; throw e; }
};
export const courierApply = async (phone) => (await call('/couriers/application', { method: 'POST', client: true, body: { phone: phone.replace(/[\s-]/g, '') } })).application;
export const courierConfirm = (kind, bookingId, code) =>
  call(`/couriers/bookings/${encodeURIComponent(bookingId)}/${kind === 'delivery' ? 'confirm-delivery' : 'confirm-pickup'}`, { method: 'POST', client: true, body: { code: String(code).trim() } });

/* ---------------- Admin ---------------- */
export async function adminLogin(email, password) {
  const u = await clientLogin(email, password);
  if (u?.role !== 'ADMIN') { store.set(TOKEN_KEY, null); throw new ApiError('This account does not have admin access.', 403); }
  return u;
}
export async function adminMe() {
  if (!store.get(TOKEN_KEY)) throw new ApiError('Not signed in.', 401);
  const d = await call('/auth/me', { admin: true });
  if (d.user?.role !== 'ADMIN') throw new ApiError('Not an admin.', 403); // keep the session: it may be a courier or customer
  return d.user;
}
export const adminLogout = clientLogout;

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

// Base fares: GET/PATCH /admin/base-fares. Three distance bands, each a flat naira amount (decimal strings).
//   GET   -> { baseFares: { currency, bands: [{ code, minKm, maxKm, amount }] } }
//   PATCH -> { baseFareUpTo4_99Km?, baseFareFrom5To9_99Km?, baseFareFrom10Km? }  (send only the bands you change)
export const BAND_FIELDS = { UP_TO_4_99_KM: 'baseFareUpTo4_99Km', FROM_5_TO_9_99_KM: 'baseFareFrom5To9_99Km', FROM_10_KM: 'baseFareFrom10Km' };
export const adminBaseFares = async () => (await call('/admin/base-fares', { admin: true })).baseFares;
export const adminSetBaseFares = async (changes) => (await call('/admin/base-fares', { method: 'PATCH', admin: true, body: changes })).baseFares;
// VAT: GET/PATCH /admin/vat  { rate: "7.50" } (a percentage)
export const adminVat = async () => (await call('/admin/vat', { admin: true })).vat;
export const adminSetVat = async (rate) => (await call('/admin/vat', { method: 'PATCH', admin: true, body: { rate } })).vat;

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

/* ---------------- Admin: courier applications ---------------- */
export const adminCourierApplications = (status = 'PENDING') => fetchAll(`/admin/courier-applications?status=${encodeURIComponent(status)}`, ['applications'], { admin: true });
export const adminDecideCourier = async (id, decision, reason) =>
  call(`/admin/courier-applications/${id}`, { method: 'PATCH', admin: true, body: decision === 'REJECT' ? { decision, reason } : { decision } });

/* ---------------- Courier assignments ---------------- */
// An assignment is an offer from an admin. Flow: OFFERED -> accept (or decline) -> confirm pickup code -> confirm delivery code -> completed.
export function normalizeAssignment(a) {
  const b = a.booking || {};
  const q = b.quote || {};
  const pickedUp = b.pickupStatus === 'COMPLETED';
  const delivered = b.deliveryStatus === 'COMPLETED' || a.status === 'COMPLETED';
  const st = String(a.status || '').toUpperCase();
  const stage = delivered ? 'completed'
    : st === 'DECLINED' || st === 'REJECTED' ? 'declined'
    : st === 'REVOKED' || st === 'REASSIGNED' || st === 'CANCELLED' ? 'revoked'
    : st === 'OFFERED' || st === 'PENDING' ? 'offer'
    : pickedUp ? 'to-deliver' : 'to-pickup';
  return {
    id: a.id, bookingId: a.bookingId || b.id, status: st, stage,
    offeredAt: a.offeredAt, respondedAt: a.respondedAt, completedAt: a.completedAt || b.deliveryCompletedAt || null,
    reference: b.reference || '', booker: b.fullName || '', phone: b.phone || '',
    item: b.packageDescription || '', size: b.packageSize || '',
    senderName: b.senderName || b.fullName || '', senderPhone: b.senderPhone || b.phone || '',
    recipientName: b.recipientName || '', recipientPhone: b.recipientPhone || '',
    pickup: q.pickup?.address || '', dropoff: q.delivery?.address || '',
    durationMin: q.estimatedDurationSeconds ? Math.max(1, Math.round(Number(q.estimatedDurationSeconds) / 60)) : null,
    pickupDone: pickedUp, pickupAt: b.pickupCompletedAt || null, deliveryDone: delivered, deliveryAt: b.deliveryCompletedAt || null,
  };
}
// Loads every status the API might hold so accepted and finished jobs stay visible; a status the server rejects is skipped.
export async function courierAssignments() {
  const seen = new Map();
  let failed = 0;
  for (const status of ['OFFERED', 'ACCEPTED', 'COMPLETED']) {
    try { (await fetchAll(`/couriers/assignments?status=${status}`, ['assignments'], { client: true })).forEach((a) => seen.set(a.id, a)); } catch (e) { if (e.status === 401 || e.status === 403) throw e; failed += 1; }
  }
  if (failed === 3) throw new ApiError('Could not load your assignments. Please try again.');
  return [...seen.values()].map(normalizeAssignment).sort((x, y) => String(y.offeredAt).localeCompare(String(x.offeredAt)));
}
export const courierAccept = (id) => call(`/couriers/assignments/${encodeURIComponent(id)}/accept`, { method: 'POST', client: true });
export const courierDecline = (id, reason) => call(`/couriers/assignments/${encodeURIComponent(id)}/decline`, { method: 'POST', client: true, body: { reason } });
export const courierConfirmPickup = (bookingId, code) => courierConfirm('pickup', bookingId, code);
export const courierConfirmDelivery = (bookingId, code) => courierConfirm('delivery', bookingId, code);

/* ---------------- Admin dispatch ---------------- */
export async function adminUnassigned() {
  const rows = await fetchAll('/admin/bookings/unassigned', ['bookings'], { admin: true });
  return rows.map(normalizeBooking).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}
export async function adminApprovedCouriers() {
  const rows = await fetchAll('/admin/courier-applications?status=APPROVED', ['applications'], { admin: true });
  return rows.filter((a) => a.user?.id).map((a) => ({ id: a.user.id, name: a.user.name, email: a.user.email, phone: a.phone }));
}
export const adminAssign = async (bookingId, courierId) => (await call(`/admin/bookings/${encodeURIComponent(bookingId)}/assignment`, { method: 'POST', admin: true, body: { courierId } }));
export const adminReassign = async (bookingId, courierId, reason) => (await call(`/admin/bookings/${encodeURIComponent(bookingId)}/reassign`, { method: 'POST', admin: true, body: { courierId, reason } }));
export const adminBookingAssignments = async (bookingId) => (await call(`/admin/bookings/${encodeURIComponent(bookingId)}/assignments`, { admin: true })).assignments || [];