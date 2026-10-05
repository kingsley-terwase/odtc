import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { Script } from 'node:vm';

const root = new URL('../', import.meta.url);
const variables = {
  baseUrl: 'http://127.0.0.1:3000',
  locationQuery: 'Ikeja Lagos', pickupId: '', deliveryId: '', quoteId: '', bookingToken: '', bookingId: '', paymentReference: '', authorizationUrl: '',
  bookingName: '', bookingPhone: '', bookingEmail: '', packageDescription: '',
  clientName: '', clientEmail: '', clientPassword: '',
  accessToken: '', userId: '', sessionExpiresAt: '',
  googleIdToken: '', verificationToken: '', verificationLink: '',
  adminEmail: '', adminPassword: '', adminAccessToken: '', adminUserId: '', adminSessionExpiresAt: '',
  ratePerKm: '50.00', minimumFare: '500.00', pricingVersionId: '',
  serviceAreaName: 'Ikeja', serviceAreaState: 'Lagos', serviceAreaCountryCode: 'NG', serviceAreaType: 'LGA',
  subdivisionName: 'Ibadan South West', subdivisionId: '', subdivisionMapboxId: '', serviceAreaId: '', serviceAreaNewName: 'Ikeja Updated', limit: '25', offset: '0',
};
const secretKeys = new Set(['bookingToken', 'clientPassword', 'accessToken', 'googleIdToken', 'verificationToken', 'verificationLink', 'adminPassword', 'adminAccessToken']);
const noauth = { type: 'noauth' };
const bearer = key => ({ type: 'bearer', bearer: [{ key: 'token', value: `{{${key}}}`, type: 'string' }] });
const event = (listen, source) => ({ listen, script: { type: 'text/javascript', exec: source.split('\n') } });
const statusTest = codes => `pm.test('Expected HTTP status', function () { pm.expect(pm.response.code).to.be.oneOf(${JSON.stringify(codes)}); });`;

function request(name, method, path, options = {}) {
  const pre = [];
  let required = options.required ?? [];
  if (options.bookingToken) required = [...required, 'bookingToken'];
  if (options.token) required = [...required, options.token];
  if (options.verification) {
    pre.push(`if (!pm.environment.get('verificationToken') && pm.environment.get('verificationLink')) {
  const match = pm.environment.get('verificationLink').match(/[#&]token=([^&]+)/);
  if (match) pm.environment.set('verificationToken', decodeURIComponent(match[1]));
}`);
    required = [...required, 'verificationToken'];
  }
  if (required.length) pre.push(`const missing = ${JSON.stringify(required)}.filter(key => !pm.environment.get(key));
if (missing.length) {
  console.warn('Set these ODTC Local environment variables before sending: ' + missing.join(', '));
  pm.execution.skipRequest();
}`);
  const body = options.body;
  if (body) {
    // Construct JSON from environment values so quotes/backslashes in passwords remain valid JSON.
    const entries = Object.entries(body).map(([key, value]) => {
      const binding = typeof value === 'string' && value.match(/^\{\{(\w+)\}\}$/);
      return `${JSON.stringify(key)}: ${binding ? `pm.environment.get(${JSON.stringify(binding[1])})` : Array.isArray(value) ? '[' + value.map(entry => typeof entry === 'string' && /^\{\{(\w+)\}\}$/.test(entry) ? 'pm.environment.get(' + JSON.stringify(entry.slice(2,-2)) + ')' : JSON.stringify(entry)).join(', ') + ']' : JSON.stringify(value)}`;
    });
    pre.push(`${required.length ? 'if (!missing.length) ' : ''}{ pm.variables.set('odtcRequestBody', JSON.stringify({ ${entries.join(', ')} })); }`);
  }
  const tests = [statusTest(options.codes ?? [200])];
  if (options.tests) tests.push(options.tests);
  const item = {
    name,
    request: {
      method,
      auth: options.token ? bearer(options.token) : noauth,
      header: [{ key: 'Accept', value: 'application/json' }, ...(options.bookingToken ? [{ key: 'X-Booking-Token', value: '{{bookingToken}}' }] : []), ...(body ? [{ key: 'Content-Type', value: 'application/json' }] : [])],
      url: `{{baseUrl}}${path}`,
      description: options.description ?? '',
      ...(body ? { body: { mode: 'raw', raw: '{{odtcRequestBody}}', options: { raw: { language: 'json' } } } } : {}),
    },
    event: [...(pre.length ? [event('prerequest', pre.join('\n'))] : []), event('test', tests.join('\n'))],
    response: [],
  };
  return item;
}

function saveSession(admin = false) {
  const token = admin ? 'adminAccessToken' : 'accessToken';
  const user = admin ? 'adminUserId' : 'userId';
  const expiry = admin ? 'adminSessionExpiresAt' : 'sessionExpiresAt';
  return `if (pm.response.code === 200 || pm.response.code === 201) {
  const data = pm.response.json();
  pm.test('Response contains session and safe user profile', function () {
    pm.expect(data.token).to.be.a('string');
    pm.expect(data.user.id).to.be.a('string');
    pm.expect(data.user).not.to.have.property('passwordHash');
    pm.expect(data.user).not.to.have.property('googleId');
    ${admin ? "pm.expect(data.user.role).to.eql('ADMIN');" : ''}
  });
  ${admin ? "if (data.user.role !== 'ADMIN') { pm.environment.unset('adminAccessToken'); } else " : ''}{
    if (data.token && data.user && data.user.id) {
      pm.environment.set('${token}', data.token);
      pm.environment.set('${user}', data.user.id);
      pm.environment.set('${expiry}', data.expiresAt);
    }
  }
}`;
}
const saveArea = `if (pm.response.code === 200 || pm.response.code === 201) {
  const data = pm.response.json();
  pm.test('Service area returned', function () { pm.expect(data.area.id).to.be.a('string'); });
  if (data.area && data.area.id) pm.environment.set('serviceAreaId', data.area.id);
}`;
const savePricing = `if (pm.response.code === 200 || pm.response.code === 201) {
  const data = pm.response.json();
  pm.test('Pricing uses decimal naira strings', function () {
    pm.expect(data.pricing.currency).to.eql('NGN');
    pm.expect(data.pricing.ratePerKm).to.match(/^\\d+\\.\\d{2}$/);
    pm.expect(data.pricing.minimumFare).to.match(/^\\d+\\.\\d{2}$/);
  });
  if (data.pricing) pm.environment.set('pricingVersionId', String(data.pricing.id));
}`;
const areaBody = { name: '{{serviceAreaName}}', state: '{{serviceAreaState}}', countryCode: '{{serviceAreaCountryCode}}', type: '{{serviceAreaType}}' };
const areaRequired = ['serviceAreaName', 'serviceAreaState', 'serviceAreaCountryCode', 'serviceAreaType'];
const folders = [
  { name: '01 - Health', item: [request('Health check', 'GET', '/api/v1/health', {
    tests: "pm.test('API is healthy', function () { pm.expect(pm.response.json().status).to.eql('ok'); });",
  })] },
  { name: '02 - Client authentication', description: 'Set clientName, clientEmail and clientPassword. Registration may send a real verification email when Sendlib is configured. Use Login for existing accounts.', item: [
    request('Register client', 'POST', '/api/v1/auth/register', {
      body: { email: '{{clientEmail}}', name: '{{clientName}}', password: '{{clientPassword}}' }, required: ['clientEmail', 'clientName', 'clientPassword'], codes: [201], tests: saveSession(),
      description: 'Creates a real CLIENT account and attempts an email. Password: 12–128 characters. Saves accessToken/userId/sessionExpiresAt. A 409 means use Login instead. verification.status=unavailable means the account exists but email sending failed.',
    }),
    request('Login client', 'POST', '/api/v1/auth/login', { body: { email: '{{clientEmail}}', password: '{{clientPassword}}' }, required: ['clientEmail', 'clientPassword'], tests: saveSession() }),
    request('Google sign-in', 'POST', '/api/v1/auth/google', {
      body: { idToken: '{{googleIdToken}}' }, required: ['googleIdToken'], tests: saveSession(),
      description: 'Supply a real Google Identity Services ID token. Backend GOOGLE_CLIENT_ID must be configured. This replaces the saved client session. Matching password accounts are not automatically linked.',
    }),
    request('Current client profile', 'GET', '/api/v1/auth/me', { token: 'accessToken', tests: "pm.test('Safe user profile', function () { const user = pm.response.json().user; pm.expect(user.id).to.be.a('string'); pm.expect(user).not.to.have.property('passwordHash'); });" }),
  ] },
  { name: '03 - Email verification', description: 'Use the email link manually. Tokens expire after 30 minutes and are single-use. Resend requires a session and has a 60-second cooldown plus five requests per IP per hour.', item: [
    request('Verify email', 'POST', '/api/v1/auth/verify-email', {
      body: { token: '{{verificationToken}}' }, verification: true,
      description: 'Set verificationLink to the full emailed link, or verificationToken to the value after #token=. No frontend is needed. Successful verification clears both saved values to prevent accidental reuse.',
      tests: "if (pm.response.code === 200) { pm.environment.unset('verificationToken'); pm.environment.unset('verificationLink'); }",
    }),
    request('Resend verification email', 'POST', '/api/v1/auth/resend-verification', {
      token: 'accessToken', description: 'Sends a real email to your current account if configured. Wait at least 60 seconds after registration/resend. A 429 is a cooldown/rate limit; a 503 is email unavailable. A successful resend invalidates the previous link; replace verificationLink with the latest email.',
      tests: "if (pm.response.code === 200) { const status = pm.response.json().verification.status; pm.test('Verification result', function () { pm.expect(status).to.be.oneOf(['sent', 'already_verified']); }); if (status === 'sent') { pm.environment.unset('verificationToken'); pm.environment.unset('verificationLink'); } }",
    }),
  ] },
  { name: '04 - Admin session', description: 'After registering and verifying, promote your account from the project terminal: npm run admin:bootstrap -- your-email@example.com. Set adminEmail/adminPassword locally; no HTTP bootstrap exists.', item: [
    request('Login admin', 'POST', '/api/v1/auth/login', { body: { email: '{{adminEmail}}', password: '{{adminPassword}}' }, required: ['adminEmail', 'adminPassword'], tests: saveSession(true), description: 'Only saves adminAccessToken when the returned role is ADMIN. Client credentials/tokens remain separate.' }),
    request('Current admin profile', 'GET', '/api/v1/auth/me', { token: 'adminAccessToken', tests: "pm.test('Verified administrator', function () { const user = pm.response.json().user; pm.expect(user.role).to.eql('ADMIN'); pm.expect(user.emailVerifiedAt).to.be.a('string'); });" }),
  ] },
  { name: '05 - Admin pricing', description: 'Verified ADMIN required. Example values are editable; writes create real pricing versions. Amounts are strings in naira.', item: [
    request('Current pricing', 'GET', '/api/v1/admin/pricing', { token: 'adminAccessToken', codes: [200, 404], tests: savePricing + "\nif (pm.response.code === 404) { pm.test('Pricing not configured yet', function () { pm.expect(pm.response.json().error.code).to.eql('PRICING_NOT_CONFIGURED'); }); }" }),
    request('Set pricing - new version', 'POST', '/api/v1/admin/pricing', { token: 'adminAccessToken', body: { ratePerKm: '{{ratePerKm}}', minimumFare: '{{minimumFare}}' }, required: ['ratePerKm', 'minimumFare'], codes: [201], tests: savePricing, description: 'Creates a real immutable pricing version; does not overwrite history. Rate must be positive, minimum nonnegative, at most two decimals.' }),
    request('Pricing history', 'GET', '/api/v1/admin/pricing/history', { token: 'adminAccessToken', tests: "pm.test('History is an array', function () { pm.expect(pm.response.json().pricing).to.be.an('array'); });" }),
  ] },
  { name: '06 - Admin service areas', description: 'Verified ADMIN required. Choose your own city/LGA values. Create saves serviceAreaId for later edits; repeated equivalent creates return 409.', item: [
    request('List service areas', 'GET', '/api/v1/admin/service-areas?limit={{limit}}&offset={{offset}}', { token: 'adminAccessToken', tests: "pm.test('Paginated areas returned', function () { const data = pm.response.json(); pm.expect(data.areas).to.be.an('array'); pm.expect(data.total).to.be.a('number'); });" }),
    request('List active service areas', 'GET', '/api/v1/admin/service-areas?active=true&limit={{limit}}&offset={{offset}}', { token: 'adminAccessToken' }),
    request('Create city or LGA', 'POST', '/api/v1/admin/service-areas', { token: 'adminAccessToken', body: areaBody, required: areaRequired, codes: [201], tests: saveArea }),

    request('List approved subdivisions', 'GET', '/api/v1/admin/service-areas/{{serviceAreaId}}/subdivisions?limit={{limit}}&offset={{offset}}', { token: 'adminAccessToken', required: ['serviceAreaId'] }),
    request('Approve subdivision by name', 'POST', '/api/v1/admin/service-areas/{{serviceAreaId}}/subdivisions', { token: 'adminAccessToken', required: ['serviceAreaId','subdivisionName'], body: { name: '{{subdivisionName}}' }, codes: [201], tests: "if (pm.response.code === 201) pm.environment.set('subdivisionId', pm.response.json().subdivision.id);", description: 'Creates one explicit approval with Mapbox administrative area name. Parent name alone never permits coverage.' }),
    request('Pin subdivision Mapbox area ID', 'PATCH', '/api/v1/admin/service-areas/{{serviceAreaId}}/subdivisions/{{subdivisionId}}', { token: 'adminAccessToken', required: ['serviceAreaId','subdivisionId','subdivisionMapboxId'], body: { mapboxId: '{{subdivisionMapboxId}}' }, description: 'Use an ID from areaFeatures, never the address mapboxId. Once pinned, name-only matching is disabled.' }),
    request('Deactivate subdivision', 'PATCH', '/api/v1/admin/service-areas/{{serviceAreaId}}/subdivisions/{{subdivisionId}}', { token: 'adminAccessToken', required: ['serviceAreaId','subdivisionId'], body: { active: false } }),
    request('Reactivate subdivision', 'PATCH', '/api/v1/admin/service-areas/{{serviceAreaId}}/subdivisions/{{subdivisionId}}', { token: 'adminAccessToken', required: ['serviceAreaId','subdivisionId'], body: { active: true } }),
    request('Rename service area', 'PATCH', '/api/v1/admin/service-areas/{{serviceAreaId}}', { token: 'adminAccessToken', required: ['serviceAreaId', 'serviceAreaNewName'], body: { name: '{{serviceAreaNewName}}' }, tests: saveArea }),
    request('Deactivate service area', 'PATCH', '/api/v1/admin/service-areas/{{serviceAreaId}}', { token: 'adminAccessToken', required: ['serviceAreaId'], body: { active: false }, tests: saveArea }),
    request('Reactivate service area', 'PATCH', '/api/v1/admin/service-areas/{{serviceAreaId}}', { token: 'adminAccessToken', required: ['serviceAreaId'], body: { active: true }, tests: saveArea }),
  ] },
  { name: '07 - Permission and validation checks', description: 'These requests deliberately test rejection. Use a separate CLIENT account for the client-permission check after promoting your first admin.', item: [
    request('Admin pricing without session - expect 401', 'GET', '/api/v1/admin/pricing', { codes: [401] }),
    request('Client cannot access admin pricing - expect 403', 'GET', '/api/v1/admin/pricing', { token: 'accessToken', codes: [403], description: 'accessToken must belong to a CLIENT, not your promoted admin.' }),
    request('Registration cannot request ADMIN role - expect 400', 'POST', '/api/v1/auth/register', { body: { email: 'role-check@example.com', name: 'Role Check', password: 'Not-an-actual-account-123!', role: 'ADMIN' }, codes: [400] }),
    request('Zero kilometre rate - expect 400', 'POST', '/api/v1/admin/pricing', { token: 'adminAccessToken', body: { ratePerKm: '0', minimumFare: '500.00' }, codes: [400] }),
  ] },
  { name: '08 - Session cleanup', description: 'Use these last. Logout deletes the current session and clears its saved token; records created above remain in the database.', item: [
    request('Logout client', 'POST', '/api/v1/auth/logout', { token: 'accessToken', codes: [204], tests: "if (pm.response.code === 204) { ['accessToken', 'userId', 'sessionExpiresAt'].forEach(key => pm.environment.unset(key)); }" }),
    request('Logout admin', 'POST', '/api/v1/auth/logout', { token: 'adminAccessToken', codes: [204], tests: "if (pm.response.code === 204) { ['adminAccessToken', 'adminUserId', 'adminSessionExpiresAt'].forEach(key => pm.environment.unset(key)); }" }),
  ] },
];

folders.splice(folders.length - 1, 0, { name: '08 - Guest booking and payment', description: 'No customer login. First configure admin pricing and areas. Search each address and manually copy its mapboxId into pickupId/deliveryId after checking state/country. Requests call real configured providers. Paystack defaults to test mode.', item: [
  request('Search addresses', 'GET', '/api/v1/guest/locations?q={{locationQuery}}', { required: ['locationQuery'], description: 'Edit locationQuery for pickup and delivery. Select the correct result manually; ambiguous names must not be auto-selected.' }),
  request('Get driving quote', 'POST', '/api/v1/guest/quotes', { body: { pickupId: '{{pickupId}}', deliveryId: '{{deliveryId}}' }, required: ['pickupId','deliveryId'], codes: [201], tests: "if (pm.response.code === 201) { const data = pm.response.json(); pm.environment.set('quoteId', data.quote.id); pm.environment.set('bookingToken', data.bookingToken); }" }),
  request('Create guest booking', 'POST', '/api/v1/guest/bookings', { bookingToken: true, body: { quoteId: '{{quoteId}}', fullName: '{{bookingName}}', phone: '{{bookingPhone}}', email: '{{bookingEmail}}', packageDescription: '{{packageDescription}}' }, required: ['quoteId','bookingName','bookingPhone','bookingEmail','packageDescription'], codes: [200,201], tests: "if ([200,201].includes(pm.response.code)) { const data = pm.response.json(); pm.environment.set('bookingId', data.booking.id); pm.environment.set('paymentReference', data.booking.reference); }", description: 'Package size is optional information. Add packageSize to the JSON body if desired; it never changes fare. One quote creates one booking.' }),
  request('Read private booking', 'GET', '/api/v1/guest/bookings/{{bookingId}}', { bookingToken: true, required: ['bookingId'] }),
  request('Initialize Paystack checkout', 'POST', '/api/v1/guest/bookings/{{bookingId}}/payment', { bookingToken: true, required: ['bookingId'], tests: "if (pm.response.code === 200) pm.environment.set('authorizationUrl', pm.response.json().authorizationUrl);", description: 'Open authorizationUrl in your browser and complete a Paystack test payment. Amount comes from the stored quote.' }),
  request('Verify payment', 'POST', '/api/v1/guest/bookings/{{bookingId}}/verify-payment', { bookingToken: true, required: ['bookingId'], description: 'Authoritatively verifies Paystack. Successful payment confirms booking and attempts an email receipt.' }),
  request('Admin booking list', 'GET', '/api/v1/admin/bookings?limit={{limit}}&offset={{offset}}', { token: 'adminAccessToken' }),
] });

const collection = {
  info: {
    _postman_id: '7f2a0e9d-9d4a-45a5-967b-8a51ff54b802', name: 'ODTC Logistics API',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    description: 'Import this collection and ODTC Local environment. Select the environment, set your credentials locally, and send requests manually. See postman/README.md. Registration/resend send real email when configured; pricing and area writes persist real records. The collection is not an unattended end-to-end runner because email verification and first-admin promotion require manual steps. Guest Mapbox quotes, bookings and Paystack payment are included. Customer authentication is optional; admin authentication remains required. Regenerate with npm run postman:generate as APIs grow.',
  },
  auth: noauth,
  variable: [{ key: 'baseUrl', value: variables.baseUrl, type: 'string' }],
  event: [event('test', "pm.test('Request ID returned', function () { pm.expect(pm.response.headers.get('X-Request-Id')).to.be.a('string'); });")],
  item: folders,
};
const environment = {
  id: '3f42c99d-bf99-463b-85e9-06c0a14273ca', name: 'ODTC Local',
  values: Object.entries(variables).map(([key, value]) => ({ key, value, type: secretKeys.has(key) ? 'secret' : 'default', enabled: true })),
  _postman_variable_scope: 'environment',
};

// Validate scripts, environment references and route coverage before writing artifacts.
const covered = new Set();
const items = folders.flatMap(folder => folder.item);
for (const item of [...items, collection]) {
  for (const hook of item.event ?? []) new Script(hook.script.exec.join('\n'));
  if (!item.request) continue;
  const serialized = JSON.stringify(item);
  for (const match of serialized.matchAll(/\{\{(\w+)\}\}/g)) {
    if (!(match[1] in variables) && match[1] !== 'odtcRequestBody') throw new Error(`Missing environment variable: ${match[1]}`);
  }
  const path = item.request.url.replace('{{baseUrl}}', '').split('?')[0].replace(/\{\{\w+\}\}/g, ':id');
  covered.add(`${item.request.method} ${path}`);
}
for (const [file, prefix] of [
  ['src/modules/guest/guest.routes.ts', '/api/v1/guest'],
  ['src/modules/auth/auth.routes.ts', '/api/v1/auth'],
  ['src/modules/admin/admin.routes.ts', '/api/v1/admin'],
  ['src/modules/service-areas/service-area.routes.ts', '/api/v1/admin/service-areas'],
]) {
  const source = await readFile(new URL(file, root), 'utf8');
  for (const match of source.matchAll(/router\.(get|post|patch|put|delete)\('([^']+)'/g)) {
    const endpoint = `${match[1].toUpperCase()} ${prefix}${match[2] === '/' ? '' : match[2].replace(':subdivisionId', ':id')}`;
    if (!covered.has(endpoint)) throw new Error(`Postman request needed for new route: ${endpoint}`);
  }
}
if (!covered.has('GET /api/v1/health')) throw new Error('Health request missing');
await mkdir(new URL('postman/', root), { recursive: true });
await writeFile(new URL('postman/ODTC_Logistics.postman_collection.json', root), JSON.stringify(collection, null, 2) + '\n');
await writeFile(new URL('postman/ODTC_Local.postman_environment.json', root), JSON.stringify(environment, null, 2) + '\n');
console.info(`Generated ${items.length} Postman requests; scripts and current route coverage validated. No credentials loaded or network requests made.`);
