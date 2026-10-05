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
