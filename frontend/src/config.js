export const RATE = 50; // fallback shown until the live rate loads from GET /pricing. The server is the source of truth for the fare.
export const naira = (n) => '₦' + Number(n || 0).toLocaleString('en-NG', { maximumFractionDigits: 2 });

// Backend API. Override with VITE_API_URL in .env if the server moves.
export const API_URL = (import.meta.env?.VITE_API_URL || 'https://odtc-logistics-api.onrender.com').replace(/\/+$/, '');

// Fill these in. Anything left empty is hidden automatically.
export const CONTACT = {
  phone: '',      // e.g. '+2348012345678'
  whatsapp: '',   // digits only with country code, e.g. '2348012345678'
  email: '',      // e.g. 'hello@odtclogistics.com'
  address: '',
  hours: '',      // e.g. 'Mon to Sat, 8am to 7pm'
};


const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

// One place that decides how the checkout total is built:
// Fallback only: the server's quote already carries the base fare, VAT and total. total = delivery fare + base fare + VAT.
// Change it here if the business rule changes and every page follows.
export function priceBreakdown(fare, baseFare, vatRate) {
  const base = r2(fare || 0);
  const service = baseFare > 0 ? r2(baseFare) : 0;
  const rate = vatRate > 0 ? Number(vatRate) : 0;
  const vat = r2((base + service) * (rate / 100));
  return { fare: base, baseFare: service, vatRate: rate, vat, total: r2(base + service + vat) };
}
