import { Booking } from '../api';

export function naira(v: number | string | null | undefined) {
  const n = Number(v);
  if (!Number.isFinite(n)) return '₦0';
  const fixed = Math.abs(n % 1) < 0.005 ? Math.round(n).toString() : n.toFixed(2);
  const [int, dec] = fixed.split('.');
  return `₦${int.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}${dec ? '.' + dec : ''}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatDate(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  let h = d.getHours();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${h}:${String(d.getMinutes()).padStart(2, '0')} ${ampm}`;
}

export const km = (meters: string | number) => `${(Number(meters) / 1000).toFixed(1)} km`;

export function minutes(seconds?: number) {
  if (!seconds) return '';
  const m = Math.max(1, Math.round(seconds / 60));
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} hr ${m % 60} min`;
}

/** First 8 characters of the reference id, e.g. ODTC-3667904E. */
export function shortRef(ref?: string) {
  if (!ref) return '';
  const body = ref.replace(/^ODTC-/i, '');
  return `ODTC-${body.slice(0, 8).toUpperCase()}`;
}

export const isNgPhone = (v: string) => /^(\+?234|0)\d{10}$/.test(v.replace(/[\s-]/g, ''));
export const isEmail = (v: string) => /^\S+@\S+\.\S+$/.test(v.trim());

export function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

/* ---------------- Order status ---------------- */
export type Phase = 'awaiting' | 'confirmed' | 'picked' | 'delivered' | 'cancelled' | 'failed';

export const STAGES = ['Order placed', 'Payment confirmed', 'Package picked up', 'Delivered'];

export function phaseOf(b: Pick<Booking, 'status' | 'pickupStatus' | 'deliveryStatus'>): Phase {
  const st = String(b.status ?? '').toUpperCase().replace(/[\s-]/g, '_');
  if (b.deliveryStatus === 'COMPLETED' || ['DELIVERED', 'COMPLETED'].includes(st)) return 'delivered';
  if (['CANCELLED', 'CANCELED', 'REFUNDED'].includes(st)) return 'cancelled';
  if (st.includes('FAIL') || st === 'EXPIRED') return 'failed';
  if (st === 'AWAITING_PAYMENT' || st === 'PENDING') return 'awaiting';
  if (b.pickupStatus === 'COMPLETED' || ['PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(st)) return 'picked';
  return 'confirmed';
}

/** How many of STAGES are done (1 = only "Order placed"). */
export function stageCount(p: Phase) {
  return p === 'awaiting' ? 1 : p === 'confirmed' ? 2 : p === 'picked' ? 3 : p === 'delivered' ? 4 : 1;
}

export const phaseInfo: Record<Phase, { label: string; headline: string; sub: string; tone: 'blue' | 'orange' | 'green' | 'red' }> = {
  awaiting: { label: 'Awaiting payment', headline: 'Complete your payment', sub: 'Your rider is assigned once payment is confirmed.', tone: 'orange' },
  confirmed: { label: 'Confirmed', headline: 'Your order is confirmed', sub: 'A rider will collect the package. Give the sender’s pickup code at collection.', tone: 'blue' },
  picked: { label: 'On the way', headline: 'Your package is on the way', sub: 'The rider has the package. The recipient shares the delivery code on arrival.', tone: 'blue' },
  delivered: { label: 'Delivered', headline: 'Delivered', sub: 'The recipient confirmed the handover. Thanks for sending with ODTC.', tone: 'green' },
  cancelled: { label: 'Cancelled', headline: 'This order was cancelled', sub: 'If you were charged, contact support and we will help.', tone: 'red' },
  failed: { label: 'Payment failed', headline: 'Payment did not go through', sub: 'You can try paying again for this order.', tone: 'red' },
};

export const isActivePhase = (p: Phase) => p === 'awaiting' || p === 'confirmed' || p === 'picked';
