export const RATE = 50; // display only. The server is the source of truth for the fare.
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
