export const RATE = 50; // display only. The server is the source of truth for the fare.
export const naira = (n) => '₦' + Number(n || 0).toLocaleString('en-NG');

// Fill these in. Anything left empty is hidden automatically.
export const CONTACT = {
  phone: '',      // e.g. '+2348012345678'
  whatsapp: '',   // digits only with country code, e.g. '2348012345678'
  email: '',      // e.g. 'hello@odtclogistics.com'
  address: '',
  hours: '',      // e.g. 'Mon to Sat, 8am to 7pm'
};
