import { z } from 'zod';
import { env } from '../../config/env.js';
import { ApiError } from '../../lib/api-error.js';

const contextName = z.object({ name: z.string(), mapbox_id: z.string().optional() });
const feature = z.object({ properties: z.object({
  mapbox_id: z.string(), name: z.string(), feature_type: z.string(),
  full_address: z.string().optional(), place_formatted: z.string().optional(),
  coordinates: z.object({ longitude: z.number().min(-180).max(180), latitude: z.number().min(-90).max(90) }),
  context: z.object({ country: z.object({ country_code: z.string() }).optional(), region: contextName.optional(), place: contextName.optional(), locality: contextName.optional(), district: contextName.optional() }),
}) });
export type Location = { mapboxId: string; address: string; longitude: number; latitude: number; countryCode: string; state: string; cities: string[]; lgas: string[]; areaFeatures?: { mapboxId: string; name: string; type: string }[] };
export type PaymentResult = { reference: string; status: string; amount: number; currency: string; email: string };
export interface GuestProviders {
  geocode(query: string, countries: string[], permanent: boolean): Promise<Location[]>;
  distance(pickup: Location, delivery: Location): Promise<number>;
  initialize(email: string, amount: number, reference: string): Promise<string>;
  verify(reference: string): Promise<PaymentResult>;
}
async function json(url: string, options: RequestInit = {}) {
  const parsedUrl = new URL(url);
  const provider = parsedUrl.hostname === 'api.mapbox.com' ? 'MAPBOX' : 'PAYSTACK';
  const operation = parsedUrl.pathname.includes('/directions/') ? 'directions' : parsedUrl.pathname.endsWith('/reverse') ? 'reverse-geocoding' : parsedUrl.pathname.endsWith('/forward') ? 'forward-geocoding' : parsedUrl.pathname.includes('/initialize') ? 'payment-initialize' : 'payment-verify';
  try {
    const response = await fetch(url, { ...options, signal: AbortSignal.timeout(10000), redirect: 'error' });
    if (!response.ok) {
      // Never log URLs, headers or provider bodies: they may contain secrets or contact data.
      console.error('Provider request failed', { provider, operation, status: response.status });
      if (response.status === 401 || response.status === 403) throw new ApiError(502, provider + '_ACCESS_DENIED', provider === 'MAPBOX' ? 'Mapbox rejected access to this location request; check backend token permissions and account configuration' : 'Paystack rejected access; check backend payment credentials');
      if (response.status === 429) throw new ApiError(503, provider + '_RATE_LIMITED', 'The provider rate limit was reached; retry later');
      throw new ApiError(502, 'PROVIDER_UNAVAILABLE', 'The location or payment provider is unavailable; please retry');
    }
    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    const timeout = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
    console.error('Provider request failed', { provider, operation, reason: timeout ? 'timeout' : 'connection-or-response' });
    throw new ApiError(timeout ? 504 : 502, timeout ? 'PROVIDER_TIMEOUT' : 'PROVIDER_UNAVAILABLE', timeout ? 'The provider request timed out; please retry' : 'The location or payment provider is unavailable; please retry');
  }
}
function paystackKey() {
  if (!env.PAYSTACK_SECRET_KEY) throw new ApiError(503, 'PAYSTACK_NOT_CONFIGURED', 'Paystack is not configured');
  if (!env.PAYSTACK_ALLOW_LIVE && !env.PAYSTACK_SECRET_KEY.startsWith('sk_test_')) throw new ApiError(503, 'PAYSTACK_TEST_MODE_REQUIRED', 'Configure a Paystack test key for MVP testing');
  return env.PAYSTACK_SECRET_KEY;
}
export const providers: GuestProviders = {
  async geocode(query, countries, permanent) {
    if (!env.MAPBOX_ACCESS_TOKEN) throw new ApiError(503, 'MAPBOX_NOT_CONFIGURED', 'Mapbox is not configured');
    const params = new URLSearchParams({ q: query, access_token: env.MAPBOX_ACCESS_TOKEN, country: countries.join(','), limit: '5', autocomplete: permanent ? 'false' : 'true', permanent: String(permanent), types: 'address,street,place,locality,neighborhood' });
    const parsed = z.object({ features: z.array(feature) }).safeParse(await json(`https://api.mapbox.com/search/geocode/v6/forward?${params}`));
    if (!parsed.success) throw new ApiError(502, 'INVALID_MAPBOX_RESPONSE', 'Mapbox returned an unusable location response');
    return Promise.all(parsed.data.features.map(async ({ properties: original }) => {
      let p = original;
      // Selected street IDs can omit administrative context even when search supplied it.
      // Resolve the actual coordinates instead of trusting client-supplied area names.
      if (!p.context.country || !p.context.region || (!p.context.place && !p.context.locality)) {
        const reverseParams = new URLSearchParams({ longitude: String(p.coordinates.longitude), latitude: String(p.coordinates.latitude), access_token: env.MAPBOX_ACCESS_TOKEN!, permanent: String(permanent) });
        const reverse = z.object({ features: z.array(feature) }).safeParse(await json(`https://api.mapbox.com/search/geocode/v6/reverse?${reverseParams}`));
        if (!reverse.success) throw new ApiError(502, 'INVALID_MAPBOX_RESPONSE', 'Mapbox returned an unusable location response');
        const match = reverse.data.features.find(item => item.properties.context.country && item.properties.context.region && (item.properties.context.place || item.properties.feature_type === 'place'))?.properties;
        if (!match) throw new ApiError(422, 'LOCATION_CONTEXT_UNAVAILABLE', 'The selected location has insufficient area information; choose a more specific address');
        p = { ...p, context: { ...match.context, ...p.context, country: match.context.country, region: match.context.region } };
        if (!p.context.place && match.feature_type === 'place') p.context.place = { name: match.name, mapbox_id: match.mapbox_id };
        if (!p.place_formatted) p = { ...p, place_formatted: match.place_formatted };
        if (!original.place_formatted) p = { ...p, full_address: [p.name, p.context.place?.name, p.context.region?.name, p.context.country?.country_code].filter(Boolean).join(', ') };
      }
      return ({
      mapboxId: p.mapbox_id, address: p.full_address || [p.name, p.place_formatted].filter(Boolean).join(', '),
      ...p.coordinates, countryCode: p.context.country!.country_code.toUpperCase(), state: p.context.region?.name || '',
      areaFeatures: [...(['place', 'locality', 'district'].includes(p.feature_type) ? [{ mapboxId: p.mapbox_id, name: p.name, type: p.feature_type }] : []), ...(['place', 'locality', 'district'] as const).flatMap(type => { const area = p.context[type]; return area?.mapbox_id ? [{ mapboxId: area.mapbox_id, name: area.name, type }] : []; })],
      cities: [p.context.place?.name, p.context.locality?.name, ...(['place', 'locality'].includes(p.feature_type) ? [p.name] : [])].filter((value): value is string => Boolean(value)),
      lgas: [p.context.district?.name, p.context.locality?.name].filter((value): value is string => Boolean(value)),
      });
    }));
  },
  async distance(a, b) {
    if (!env.MAPBOX_ACCESS_TOKEN) throw new ApiError(503, 'MAPBOX_NOT_CONFIGURED', 'Mapbox is not configured');
    const coordinates = `${a.longitude},${a.latitude};${b.longitude},${b.latitude}`;
    const result = z.object({ code: z.literal('Ok'), routes: z.array(z.object({ distance: z.number().positive().max(20000000) })).min(1) }).safeParse(await json(`https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates}?overview=false&access_token=${encodeURIComponent(env.MAPBOX_ACCESS_TOKEN)}`));
    if (!result.success) throw new ApiError(422, 'NO_DRIVING_ROUTE', 'No usable driving route was found');
    return result.data.routes[0]!.distance;
  },
  async initialize(email, amount, reference) {
    const key = paystackKey();
    const result = z.object({ status: z.literal(true), data: z.object({ reference: z.string(), authorization_url: z.url() }) }).safeParse(await json('https://api.paystack.co/transaction/initialize', {
      method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, amount, reference, currency: 'NGN', ...(env.PAYSTACK_CALLBACK_URL ? { callback_url: env.PAYSTACK_CALLBACK_URL } : {}) }),
    }));
    if (!result.success || result.data.data.reference !== reference || new URL(result.data.data.authorization_url).protocol !== 'https:') throw new ApiError(502, 'INVALID_PAYMENT_RESPONSE', 'Payment initialization could not be confirmed');
    return result.data.data.authorization_url;
  },
  async verify(reference) {
    const key = paystackKey();
    const result = z.object({ status: z.literal(true), data: z.object({ reference: z.string(), status: z.string(), amount: z.number().int().nonnegative(), currency: z.string(), customer: z.object({ email: z.email() }) }) }).safeParse(await json(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, { headers: { Authorization: `Bearer ${key}` } }));
    if (!result.success) throw new ApiError(502, 'INVALID_PAYMENT_RESPONSE', 'Payment verification returned an invalid response');
    return { ...result.data.data, email: result.data.data.customer.email };
  },
};
