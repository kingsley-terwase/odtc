import { call } from './client';

export { ApiError, setAuthToken, setUnauthorizedHandler, warmUp } from './client';

/* ---------------- Types ---------------- */
export type Role = 'CLIENT' | 'COURIER' | 'ADMIN';

export type User = {
  id: string;
  email: string;
  name: string;
  role: Role;
  emailVerifiedAt?: string | null;
  createdAt?: string;
};

export type Session = { user: User; token: string; expiresAt?: string; verification?: { status?: string } };

export type Place = {
  placeId: string;
  address: string;
  // Filled in after the place is selected (GET /guest/locations/:placeId).
  latitude?: number;
  longitude?: number;
  state?: string;
  cities?: string[];
  lgas?: string[];
};

/** A new id for each pick-a-place session. Google bills a search and its details lookup as one session. */
export const newSessionToken = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
  const r = (Math.random() * 16) | 0;
  return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
});

export type Quote = {
  id: string;
  pickup: Place & { latitude?: number; longitude?: number };
  delivery: Place & { latitude?: number; longitude?: number };
  distanceMeters: string;
  estimatedDurationSeconds?: number;
  ratePerKm: string;
  minimumFare: string;
  deliveryFare: string;
  vatRate: string;
  vatAmount: string;
  serviceCharge: string;
  totalFare: string;
  expiresAt: string;
  currency?: string;
};

export type Booking = {
  id: string;
  reference: string;
  fullName: string;
  phone: string;
  email: string;
  senderSameAsBooker?: boolean;
  senderName?: string;
  senderPhone?: string;
  senderEmail?: string;
  recipientSameAsBooker?: boolean;
  recipientName?: string;
  recipientPhone?: string;
  recipientEmail?: string;
  packageDescription: string;
  packageSize?: string | null;
  status: string;
  receiptStatus?: string;
  pickupStatus?: string;
  pickupCompletedAt?: string | null;
  deliveryStatus?: string;
  deliveryCompletedAt?: string | null;
  createdAt: string;
  quote: Quote;
};

export type CourierApplication = {
  id: string;
  phone: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string | null;
  reviewedAt?: string | null;
  createdAt?: string;
  user?: { name?: string; email?: string };
  name?: string;
  email?: string;
};

export type Contact = { sameAsBooker: boolean; fullName?: string; phone?: string; email?: string };

/* ---------------- Auth ---------------- */
export const register = (p: { name: string; email: string; password: string }) =>
  call<Session>('/auth/register', { method: 'POST', body: p });

export const registerCourier = (p: { name: string; email: string; password: string; phone: string }) =>
  call<Session>('/auth/register/courier', { method: 'POST', body: p });

export const login = (email: string, password: string) =>
  call<Session>('/auth/login', { method: 'POST', body: { email, password } });

export const me = async () => (await call<{ user: User }>('/auth/me', { auth: true })).user;

export const logout = () => call('/auth/logout', { method: 'POST', auth: true }).catch(() => {});

export const resendVerification = () => call('/auth/resend-verification', { method: 'POST', auth: true });

export const verifyEmail = (token: string) => call('/auth/verify-email', { method: 'POST', body: { token } });

export const requestVerification = (email: string) =>
  call('/auth/request-verification', { method: 'POST', body: { email } });

/** Pulls the token out of a pasted verification link (or returns what was pasted). */
export function extractVerificationToken(input: string) {
  const raw = input.trim();
  const m = raw.match(/[#?&]token=([^&\s]+)/);
  try {
    return m ? decodeURIComponent(m[1]) : raw;
  } catch {
    return m ? m[1] : raw;
  }
}

/* ---------------- Public pricing ---------------- */
const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

export async function getPricingSummary() {
  const [pricing, vat, charge] = await Promise.allSettled([
    call<{ pricing: { ratePerKm: string; minimumFare: string } }>('/pricing'),
    call<{ vat: { rate: string } }>('/vat'),
    call<{ serviceCharge: { amount: string } }>('/service-charge'),
  ]);
  return {
    ratePerKm: pricing.status === 'fulfilled' ? num(pricing.value.pricing?.ratePerKm) : null,
    minimumFare: pricing.status === 'fulfilled' ? num(pricing.value.pricing?.minimumFare) : null,
    vatRate: vat.status === 'fulfilled' ? num((vat.value as any).vat?.rate ?? (vat.value as any).vat) : null,
    serviceCharge:
      charge.status === 'fulfilled' ? num((charge.value as any).serviceCharge?.amount ?? (charge.value as any).serviceCharge) : null,
  };
}

/* ---------------- Guest booking ---------------- */
export const searchPlaces = async (q: string, sessionToken?: string) =>
  ((await call<{ locations?: Place[] }>(`/guest/locations?q=${encodeURIComponent(q)}${sessionToken ? `&sessionToken=${encodeURIComponent(sessionToken)}` : ''}`, { auth: 'optional' })).locations ?? []) as Place[];

/** Details for the place the customer picked: coordinates, state, cities. Pass the same sessionToken used for the search. */
export async function getPlaceDetails(placeId: string, sessionToken?: string): Promise<Place> {
  const d = await call<{ location: Place }>(`/guest/locations/${encodeURIComponent(placeId)}${sessionToken ? `?sessionToken=${encodeURIComponent(sessionToken)}` : ''}`, { auth: 'optional' });
  return { ...d.location, placeId: d.location?.placeId || placeId };
}

export async function getQuote(pickupId: string, deliveryId: string) {
  const d = await call<{ quote: Quote; bookingToken: string }>('/guest/quotes', {
    method: 'POST',
    auth: 'optional',
    body: { pickupId, deliveryId },
  });
  return { quote: d.quote, bookingToken: d.bookingToken };
}

export type CreateBookingInput = {
  quoteId: string;
  token: string;
  fullName: string;
  phone: string;
  email: string;
  sender: Contact;
  recipient: Contact;
  packageDescription: string;
  packageSize?: string;
};

export async function createBooking(i: CreateBookingInput) {
  const base = {
    quoteId: i.quoteId,
    fullName: i.fullName.trim(),
    phone: i.phone.replace(/[\s-]/g, ''),
    email: i.email.trim(),
    sender: i.sender,
    recipient: i.recipient,
  };
  const attempt = (body: object) =>
    call<{ booking: Booking }>('/guest/bookings', { method: 'POST', guest: i.token, auth: 'optional', body });

  try {
    const d = await attempt({ ...base, packageDescription: i.packageDescription.trim(), ...(i.packageSize ? { packageSize: i.packageSize } : {}) });
    return d.booking;
  } catch (e: any) {
    // If the server rejects the optional size value, send it inside the description instead.
    if (e?.status === 400 && i.packageSize) {
      const label = i.packageSize.charAt(0) + i.packageSize.slice(1).toLowerCase();
      const d = await attempt({ ...base, packageDescription: `${i.packageDescription.trim()} (Size: ${label})` });
      return d.booking;
    }
    throw e;
  }
}

export const startPayment = (id: string, token: string) =>
  call<{ authorizationUrl: string; reference: string }>(`/guest/bookings/${id}/payment`, { method: 'POST', guest: token, auth: 'optional' });

export const verifyPayment = (id: string, token: string) =>
  call<{ reference: string; status: string; paymentStatus?: string }>(`/guest/bookings/${id}/verify-payment`, {
    method: 'POST',
    guest: token,
    auth: 'optional',
  });

export const readBooking = async (id: string, token: string) =>
  (await call<{ booking: Booking }>(`/guest/bookings/${id}`, { guest: token, auth: 'optional' })).booking;

export const resendPickupCode = (id: string, token: string) =>
  call(`/guest/bookings/${id}/pickup-code`, { method: 'POST', guest: token, auth: 'optional' });

export const resendDeliveryCode = (id: string, token: string) =>
  call(`/guest/bookings/${id}/delivery-code`, { method: 'POST', guest: token, auth: 'optional' });

/* ---------------- Courier ---------------- */
export async function myCourierApplication() {
  try {
    return (await call<{ application: CourierApplication | null }>('/couriers/application', { auth: true })).application ?? null;
  } catch (e: any) {
    if (e?.status === 404) return null;
    throw e;
  }
}

export const applyAsCourier = (phone: string) =>
  call('/couriers/application', { method: 'POST', auth: true, body: { phone: phone.replace(/[\s-]/g, '') } });

export const confirmPickup = (bookingId: string, code: string) =>
  call<{ pickupStatus: string; pickupCompletedAt: string }>(`/couriers/bookings/${bookingId}/confirm-pickup`, {
    method: 'POST',
    auth: true,
    body: { code: code.trim() },
  });

export const confirmDelivery = (bookingId: string, code: string) =>
  call<{ deliveryStatus: string; deliveryCompletedAt: string }>(`/couriers/bookings/${bookingId}/confirm-delivery`, {
    method: 'POST',
    auth: true,
    body: { code: code.trim() },
  });

/* ---------------- Admin ---------------- */
async function fetchAll<T>(path: string, keys: string[]): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < 20; i++) {
    const d: any = await call(`${path}${path.includes('?') ? '&' : '?'}limit=50&offset=${out.length}`, { auth: true });
    const rows: T[] = keys.map((k) => d?.[k]).find(Array.isArray) ?? (Array.isArray(d) ? d : []);
    out.push(...rows);
    if (!rows.length || (d?.total != null ? out.length >= d.total : rows.length < 50)) break;
  }
  return out;
}

export const adminBookings = async () =>
  (await fetchAll<Booking>('/admin/bookings', ['bookings', 'items', 'data'])).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

export const adminPendingCouriers = () => fetchAll<CourierApplication>('/admin/courier-applications?status=PENDING', ['applications', 'items', 'data']);

export const adminDecideCourier = (id: string, decision: 'APPROVE' | 'REJECT', reason?: string) =>
  call(`/admin/courier-applications/${id}`, { method: 'PATCH', auth: true, body: decision === 'REJECT' ? { decision, reason } : { decision } });

export const adminGetPricing = async () => (await call<{ pricing: { ratePerKm: string; minimumFare: string } }>('/admin/pricing', { auth: true })).pricing;
export const adminSetPricing = (ratePerKm: number, minimumFare: number) =>
  call('/admin/pricing', { method: 'POST', auth: true, body: { ratePerKm, minimumFare } });
export const adminGetServiceCharge = async () => (await call<{ serviceCharge: { amount: string } }>('/admin/service-charge', { auth: true })).serviceCharge;
export const adminSetServiceCharge = (amount: string) => call('/admin/service-charge', { method: 'PATCH', auth: true, body: { amount } });
export const adminGetVat = async () => (await call<{ vat: { rate: string } }>('/admin/vat', { auth: true })).vat;
export const adminSetVat = (rate: string) => call('/admin/vat', { method: 'PATCH', auth: true, body: { rate } });
