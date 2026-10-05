import assert from 'node:assert/strict';
import test from 'node:test';

process.env.MAPBOX_ACCESS_TOKEN = 'mock-mapbox-key';
process.env.PAYSTACK_SECRET_KEY = 'sk_test_mock';
process.env.PAYSTACK_ALLOW_LIVE = 'false';
const { providers } = await import('../src/modules/guest/providers.js');

test('Mapbox and Paystack adapters use expected contracts without network calls', async t => {
  const calls: { url: URL; options: RequestInit }[] = [];
  let reply: unknown;
  let queued: unknown[] = [];
  t.mock.method(globalThis, 'fetch', async (url: string, options: RequestInit) => {
    calls.push({ url: new URL(url), options });
    return new Response(JSON.stringify(queued.length ? queued.shift() : reply), { status: 200, headers: { 'Content-Type': 'application/json' } });
  });
  reply = { features: [{ properties: { mapbox_id: 'selected-id', name: 'Selected Street', feature_type: 'address', full_address: 'Selected Street, Ikeja, Lagos', coordinates: { longitude: 3.3, latitude: 6.6 }, context: { country: { country_code: 'ng' }, region: { name: 'Lagos' }, place: { name: 'Ikeja', mapbox_id: 'area-ikeja' }, district: { name: 'Ikeja' } } } }] };
  const [location] = await providers.geocode('Selected Street', ['ng'], false);
  assert.ok(location);
  assert.equal(location.countryCode, 'NG');
  assert.deepEqual(location.lgas, ['Ikeja']);
  assert.deepEqual(location.areaFeatures, [{ mapboxId: 'area-ikeja', name: 'Ikeja', type: 'place' }]);
  assert.equal(calls.at(-1)!.url.searchParams.get('permanent'), 'false');
  await providers.geocode('selected-id', ['ng'], true);
  assert.equal(calls.at(-1)!.url.searchParams.get('q'), 'selected-id');
  assert.equal(calls.at(-1)!.url.searchParams.get('permanent'), 'true');
  const fullContext = reply;
  queued = [{ features: [{ properties: { mapbox_id: 'street-id', name: 'Selected Street', feature_type: 'street', coordinates: { longitude: 3.3, latitude: 6.6 }, context: { street: { name: 'Selected Street' } } } }] }, fullContext];
  const [resolved] = await providers.geocode('street-id', ['ng'], true);
  assert.equal(resolved!.mapboxId, 'street-id');
  assert.equal(resolved!.state, 'Lagos');
  assert.equal(resolved!.longitude, 3.3);
  assert.deepEqual(resolved!.areaFeatures, [{ mapboxId: 'area-ikeja', name: 'Ikeja', type: 'place' }]);
  assert.equal(calls.at(-1)!.url.pathname, '/search/geocode/v6/reverse');
  assert.equal(calls.at(-1)!.url.searchParams.get('permanent'), 'true');
  queued = [{ features: [{ properties: { mapbox_id: 'missing-area', name: 'Street', feature_type: 'street', coordinates: { longitude: 3.3, latitude: 6.6 }, context: {} } }] }, { features: [] }];
  await assert.rejects(providers.geocode('missing-area', ['ng'], true), { code: 'LOCATION_CONTEXT_UNAVAILABLE' });
  reply = { code: 'Ok', routes: [{ distance: 18000 }] };
  assert.equal(await providers.distance(location, { ...location, longitude: 3.4 }), 18000);
  assert.match(calls.at(-1)!.url.pathname, /3.3,6.6;3.4,6.6/);
  reply = { status: true, data: { reference: 'ODTC-test', authorization_url: 'https://checkout.paystack.com/mock' } };
  assert.equal(await providers.initialize('guest@example.com', 90000, 'ODTC-test'), 'https://checkout.paystack.com/mock');
  const sent = JSON.parse(calls.at(-1)!.options.body as string);
  assert.equal(sent.amount, 90000);
  assert.equal(sent.currency, 'NGN');
  assert.equal(sent.reference, 'ODTC-test');
  reply = { status: true, data: { reference: 'ODTC-test', status: 'success', amount: 90000, currency: 'NGN', customer: { email: 'guest@example.com' } } };
  assert.equal((await providers.verify('ODTC-test')).email, 'guest@example.com');
  reply = { features: [{ properties: {} }] };
  await assert.rejects(providers.geocode('invalid', ['ng'], false), { code: 'INVALID_MAPBOX_RESPONSE' });
  reply = { code: 'NoRoute', routes: [] };
  await assert.rejects(providers.distance(location, location), { code: 'NO_DRIVING_ROUTE' });
  reply = { status: true, data: { reference: 'wrong', authorization_url: 'http://unsafe.test' } };
  await assert.rejects(providers.initialize('guest@example.com', 90000, 'ODTC-test'), { code: 'INVALID_PAYMENT_RESPONSE' });
});

test('provider failures distinguish access, rate limits and timeouts without leaking secrets', async t => {
  const logs: unknown[][] = [];
  t.mock.method(console, 'error', (...args: unknown[]) => logs.push(args));
  let status = 401;
  let timeout = false;
  t.mock.method(globalThis, 'fetch', async () => {
    if (timeout) throw new DOMException('Sensitive URL with mock-mapbox-key', 'TimeoutError');
    return new Response('Sensitive provider body mock-mapbox-key', {status});
  });
  await assert.rejects(providers.geocode('Selected address', ['ng'], true), {code: 'MAPBOX_ACCESS_DENIED', status: 502});
  status = 403;
  await assert.rejects(providers.geocode('Selected address', ['ng'], true), {code: 'MAPBOX_ACCESS_DENIED'});
  status = 429;
  await assert.rejects(providers.geocode('Selected address', ['ng'], true), {code: 'MAPBOX_RATE_LIMITED', status: 503});
  status = 500;
  await assert.rejects(providers.geocode('Selected address', ['ng'], true), {code: 'PROVIDER_UNAVAILABLE'});
  timeout = true;
  await assert.rejects(providers.geocode('Selected address', ['ng'], true), {code: 'PROVIDER_TIMEOUT', status: 504});
  assert.ok(!JSON.stringify(logs).includes('mock-mapbox-key'));
  assert.ok(!JSON.stringify(logs).includes('Selected address'));
  assert.ok(!JSON.stringify(logs).includes('Sensitive'));
});
