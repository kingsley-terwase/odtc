const call = async (url, body) => {
  let res;
  try {
    res = await fetch(url, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : undefined);
  } catch {
    throw new Error('Cannot reach the server. Check your connection and try again.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
  return data;
};
export const searchPlaces = (q) => call('/api/places?q=' + encodeURIComponent(q));
export const getQuote = (pickup, dropoff) => call('/api/quote', { pickup, dropoff });
export const createBooking = (payload) => call('/api/bookings', payload);
export const verifyBooking = (ref) => call(`/api/bookings/${encodeURIComponent(ref)}/verify`);

// Admin
// ---------- Admin ----------
// PREVIEW = true shows the dashboard with sample orders and no backend or login.
// Set it to false when the real admin API is connected.
const PREVIEW = true;

const sample = (ref, name, phone, pickup, dropoff, km, paymentStatus, status, minsAgo, item, size) => ({
  reference: ref,
  customer: { name, phone, email: `${name.split(' ')[0].toLowerCase()}@example.com` },
  pickup, dropoff, distanceKm: km, ratePerKm: 50, fare: Math.round(km * 50),
  package: { description: item, size },
  paymentReference: ref, paymentStatus, status,
  createdAt: new Date(Date.now() - minsAgo * 60000).toISOString(),
});

let mock = [
  sample('ODTC-K7M2QX9A', 'Amina Yusuf', '08031234567', 'Wuse 2, Abuja', 'Gwarinpa Estate, Abuja', 18, 'paid', 'confirmed', 12, 'Two boxes of documents', 'Medium (up to a carton)'),
  sample('ODTC-P4TR8NZ3', 'Chidi Okafor', '08098765432', 'Maitama, Abuja', 'Kubwa, Abuja', 25, 'paid', 'picked up', 55, 'Laptop in a bag', 'Small (fits in a bag)'),
  sample('ODTC-W9LC2HB6', 'Grace Eze', '07011223344', 'Garki Area 11, Abuja', 'Jabi Lake Mall, Abuja', 10.4, 'paid', 'delivered', 380, 'Birthday cake', 'Medium (up to a carton)'),
  sample('ODTC-D3FJ6VQ8', 'Ibrahim Musa', '08155667788', 'Lugbe, Abuja', 'Asokoro, Abuja', 21.3, 'pending', 'awaiting payment', 6, 'Shoe parcel', 'Small (fits in a bag)'),
  sample('ODTC-H8YB5KN2', 'Ngozi Adeyemi', '09012345678', 'Utako, Abuja', 'Life Camp, Abuja', 7.8, 'paid', 'cancelled', 900, 'Gift hamper', 'Large or heavy'),
  sample('ODTC-R2XM7TC4', 'Samuel Bello', '08123459876', 'Nyanya, Abuja', 'Wuse Market, Abuja', 14.6, 'failed', 'awaiting payment', 1500, 'Phone accessories', ''),
  sample('ODTC-T6GA9PW1', 'Fatima Sani', '08067891234', 'Central Area, Abuja', 'Apo, Abuja', 12.2, 'paid', 'delivered', 2600, 'Medical supplies', 'Small (fits in a bag)'),
];
const fake = (v) => new Promise((r) => setTimeout(() => r(v), 350));

export const adminLogin = (email, password) => (PREVIEW ? fake({ email: email || 'admin@odtc.test' }) : call('/api/admin/login', { email, password }));
export const adminLogout = () => (PREVIEW ? fake({ ok: true }) : call('/api/admin/logout', {}));
export const adminMe = () => (PREVIEW ? fake({ email: 'preview@odtc.test' }) : call('/api/admin/me'));
export const adminOrders = () => (PREVIEW ? fake(mock.map((o) => ({ ...o }))) : call('/api/admin/bookings'));
export const adminUpdateStatus = (ref, status) => {
  if (!PREVIEW) return call(`/api/admin/bookings/${encodeURIComponent(ref)}`, { status }, 'PATCH');
  mock = mock.map((o) => (o.reference === ref ? { ...o, status } : o));
  return fake({ ...mock.find((o) => o.reference === ref) });
};