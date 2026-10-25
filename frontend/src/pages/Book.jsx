import { useEffect, useRef, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Autocomplete, Box, Button, Checkbox, Chip, CircularProgress, Container, FormControlLabel, IconButton, InputAdornment, MenuItem, Paper, Radio, RadioGroup, Stack, TextField, Typography } from '@mui/material';
import PlaceRounded from '@mui/icons-material/PlaceRounded';
import TripOriginRounded from '@mui/icons-material/TripOriginRounded';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import ScheduleRounded from '@mui/icons-material/ScheduleRounded';
import LockRounded from '@mui/icons-material/LockRounded';
import ContentCopyRounded from '@mui/icons-material/ContentCopyRounded';
import WhatsApp from '@mui/icons-material/WhatsApp';
import { LightbulbFilament16Filled, LightbulbFilamentRegular, LightbulbRegular } from '@fluentui/react-icons'
import { Eta, FareSummary, Notice } from '../components/ui';
import { useClient } from '../client/ClientAuth';
import { createBooking, getPlace, getQuote, newSession, searchPlaces, wakeApi } from '../api';
import { isEmail, isNgPhone } from '../components/Fields';
import { naira, priceBreakdown } from '../config';
import { useCharges } from '../useRate';
import { brand } from '../theme';

const PAYSTACK_LIVE = true;

const BANKS = [
  { bank: 'OPay', number: '6146013598', name: 'ODTC Logistics', logo: '/opay.png' },
  { bank: 'Providus Bank', number: '1310948228', name: 'ODTC Logistics', logo: '/providus.png' },
];
const WHATSAPP = '2348039147577';

const makeRef = () => `ODTC-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

// Google address picker. Suggestions come from GET /guest/locations; picking one loads its full details
// (GET /guest/locations/:placeId) with the same session token so the address is exact, then we show where it landed.
function PlaceField({ label, value, onChange, error, tone, icon: Icon = PlaceRounded }) {
  const [input, setInput] = useState('');
  const [opts, setOpts] = useState([]);
  const [busy, setBusy] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [pickErr, setPickErr] = useState('');
  const [searchErr, setSearchErr] = useState('');
  const session = useRef(newSession());

  useEffect(() => {
    if (input.length < 3 || value?.label === input) {
      setOpts(value ? [value] : []);
      return undefined;
    }
    let stale = false;
    setBusy(true);
    setSearchErr('');
    const t = setTimeout(() => {
      searchPlaces(input, session.current)
        .then((r) => { if (!stale) setOpts(Array.isArray(r) ? r : []); })
        .catch((e) => { console.error('Address search failed', e); if (!stale) { setOpts([]); setSearchErr(e.message); } })
        .finally(() => { if (!stale) setBusy(false); });
    }, 350);
    return () => { stale = true; clearTimeout(t); setBusy(false); };
  }, [input, value]);

  const pick = async (v) => {
    setPickErr('');
    if (!v) { onChange(null); return; }
    setResolving(true);
    try {
      const full = await getPlace(v, session.current);
      if (full.countryCode && full.countryCode !== 'NG') throw new Error('We only deliver within Nigeria.');
      onChange(full);
    } catch (e) {
      onChange(null);
      setPickErr(e.message);
    } finally {
      setResolving(false);
      session.current = newSession(); // a finished pick closes the Google session
    }
  };

  const area = value && [value.lga || value.city, value.state].filter(Boolean).join(', ');

  return (
    <Box>
      <Autocomplete
        options={opts}
        value={value}
        filterOptions={(x) => x}
        loading={busy}
        disabled={resolving}
        getOptionLabel={(o) => o.label || ''}
        isOptionEqualToValue={(a, b) => a.id === b.id}
        onChange={(_, v) => pick(v)}
        onInputChange={(_, v) => setInput(v)}
        noOptionsText={input.length < 3 ? 'Type at least 3 letters' : busy ? 'Searching…' : searchErr ? `Search failed: ${searchErr}` : 'No match. Try the street, estate or landmark plus the city.'}
        renderOption={(props, o) => (
          <Box component="li" {...props} key={o.id} sx={{ gap: 1.5 }}>
            <Box sx={{ width: 32, height: 32, borderRadius: 1, bgcolor: 'rgba(27,143,76,.12)', display: 'grid', placeItems: 'center', flexShrink: 0 }}><PlaceRounded fontSize="small" sx={{ color: '#1B8F4C' }} /></Box>
            <Typography variant="body2">{o.label}</Typography>
          </Box>
        )}
        renderInput={(p) => (
          <TextField
            {...p}
            label={label}
            error={!!(error || pickErr || searchErr)}
            helperText={error || pickErr || searchErr || ' '}
            slotProps={{
              input: {
                ...p.InputProps,
                startAdornment: <InputAdornment position="start"><Icon sx={{ color: tone }} /></InputAdornment>,
                endAdornment: <>{(busy || resolving) && <CircularProgress size={18} />}{p.InputProps.endAdornment}</>,
              },
            }}
          />
        )}
      />
      {value && area && (
        <Chip size="small" icon={<CheckCircleRounded />} color="success" variant="outlined" label={`Address confirmed · ${area}`} sx={{ mt: -0.5, mb: 0.5, fontWeight: 600 }} />
      )}
    </Box>
  );
}

// "Who is this for?" Sender and recipient default to the person booking; switch to add someone else's details.
function PartyCard({ title, hint, value, onChange, errors }) {
  const set = (k) => (e) => onChange({ ...value, [k]: e.target.value });
  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
        <Box><Typography fontWeight={700}>{title}</Typography><Typography variant="body2" color="text.secondary">{hint}</Typography></Box>
        <FormControlLabel sx={{ mr: 0 }} control={<Checkbox checked={value.sameAsBooker} onChange={(e) => onChange({ ...value, sameAsBooker: e.target.checked })} />} label="That's me" />
      </Stack>
      {!value.sameAsBooker && (
        <Box sx={{ mt: 2, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
          <TextField label="Full name" value={value.name} onChange={set('name')} error={!!errors?.name} helperText={errors?.name} sx={{ gridColumn: { sm: '1 / -1' } }} />
          <TextField label="Phone number" type="tel" value={value.phone} onChange={set('phone')} error={!!errors?.phone} helperText={errors?.phone} />
          <TextField label="Email" type="email" value={value.email} onChange={set('email')} error={!!errors?.email} helperText={errors?.email || 'Their code is emailed here'} />
        </Box>
      )}
    </Box>
  );
}

const blankParty = { sameAsBooker: true, name: '', phone: '', email: '' };

const sizes = ['Small (fits in a bag)', 'Medium (up to a carton)', 'Large or heavy'];

export default function Book() {
  const session = useClient();
  const { vatRate, baseFare } = useCharges();
  const [pickup, setPickup] = useState(null);
  const [dropoff, setDropoff] = useState(null);
  const [quote, setQuote] = useState(null);
  const [quoting, setQuoting] = useState(false);
  const [quoteErr, setQuoteErr] = useState('');
  const [f, setF] = useState({ name: '', phone: '', email: '', description: '', size: '' });
  const [sender, setSender] = useState(blankParty);
  const [recipient, setRecipient] = useState(blankParty);
  const [errors, setErrors] = useState({});
  const [method, setMethod] = useState(PAYSTACK_LIVE ? 'paystack' : 'transfer');
  const [paying, setPaying] = useState(false);
  const [payErr, setPayErr] = useState('');
  const [order, setOrder] = useState(null);
  const [copied, setCopied] = useState('');

  useEffect(() => { wakeApi(); }, []);

  useEffect(() => {
    setQuote(null);
    setQuoteErr('');
    if (!pickup || !dropoff) return undefined;
    let stale = false;
    setQuoting(true);
    getQuote(pickup, dropoff)
      .then((q) => { if (!stale) setQuote(q); })
      .catch((e) => { if (!stale) setQuoteErr(e.message); })
      .finally(() => { if (!stale) setQuoting(false); });
    return () => { stale = true; };
  }, [pickup, dropoff]);

  // Delivery fare from the quote, plus the base fare and VAT. This is the total the customer sees and pays.
  const price = quote ? (quote.serverCharges ? quote.serverCharges : priceBreakdown(quote.fare, baseFare, vatRate)) : null;

  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!pickup) e.pickup = 'Pick the pickup address from the suggestions';
    if (!dropoff) e.dropoff = 'Pick the delivery address from the suggestions';
    if (f.name.trim().length < 2) e.name = 'Enter your full name';
    if (!/^(\+?234|0)\d{10}$/.test(f.phone.replace(/[\s-]/g, ''))) e.phone = 'Enter a valid Nigerian phone number, e.g. 08012345678';
    if (!/^\S+@\S+\.\S+$/.test(f.email)) e.email = 'Enter a valid email address';
    if (f.description.trim().length < 3) e.description = 'Tell us what we are delivering';
    [['sender', sender], ['recipient', recipient]].forEach(([k, p]) => {
      if (p.sameAsBooker) return;
      const x = {};
      if (p.name.trim().length < 2) x.name = 'Enter their full name';
      if (!isNgPhone(p.phone)) x.phone = 'Enter a valid Nigerian phone number';
      if (!isEmail(p.email)) x.email = 'Enter a valid email address';
      if (Object.keys(x).length) e[k] = x;
    });
    setErrors(e);
    return !Object.keys(e).length;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    setPayErr('');
    if (!validate()) {
      window.scrollTo({ top: 120, behavior: 'smooth' });
      return;
    }
    if (!quote) {
      setPayErr('Wait for your fare to appear, then try again.');
      return;
    }

    // Bank transfer: show account details, no server call.
    if (method === 'transfer') {
      setOrder({ ref: makeRef(), fare: price.total, pickup: pickup.label, dropoff: dropoff.label });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Paystack
    setPaying(true);
    try {
      const live = new Date(quote.expiresAt).getTime() > Date.now() + 30000 ? quote : await getQuote(pickup, dropoff);
      setQuote(live);
      const { authorizationUrl } = await createBooking({
        quote: live,
        breakdown: live.serverCharges ? live.serverCharges : priceBreakdown(live.fare, baseFare, vatRate),
        customer: { name: f.name, phone: f.phone, email: f.email.trim() },
        pkg: { description: f.description.trim(), size: f.size },
        sender, recipient,
      });
      window.location.href = authorizationUrl;
    } catch (err) {
      setPayErr(err.message);
      setPaying(false);
    }
  };

  const copy = async (key, text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(''), 1500);
    } catch { /* clipboard blocked */ }
  };

  const whatsappLink = () => {
    const msg = [
      'Hello ODTC Logistics, I have paid for a delivery.',
      `Reference: ${order.ref}`,
      `Amount: ${naira(order.fare)}`,
      `Pickup: ${order.pickup}`,
      `Delivery: ${order.dropoff}`,
      `Item: ${f.description.trim()}${f.size ? ` (${f.size})` : ''}`,
      ...(sender.sameAsBooker ? [] : [`Sender: ${sender.name.trim()}, ${sender.phone.trim()}`]),
      ...(recipient.sameAsBooker ? [] : [`Recipient: ${recipient.name.trim()}, ${recipient.phone.trim()}`]),
      `Name: ${f.name.trim()}`,
      `Phone: ${f.phone.trim()}`,
      `Email: ${f.email.trim()}`,
    ].join('\n');
    return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`;
  };

  // ---------- Transfer instructions ----------
  if (order) {
    const banks = BANKS.filter((b) => b.number);
    return (
      <Box sx={{ bgcolor: brand.paper, py: { xs: 4, md: 8 } }}>
        <Container maxWidth="sm">
          <Typography variant="h1" sx={{ fontSize: { xs: '2.2rem', md: '3rem' } }}>Complete your payment</Typography>
          <Typography color="text.secondary" sx={{ mt: 1, mb: 4 }}>Transfer the exact fare to either account below, then tell us on WhatsApp so we can confirm and dispatch your delivery.</Typography>

          <Paper elevation={0} sx={{ p: { xs: 2.5, md: 4 }, borderRadius: 2, border: '2px solid', borderColor: brand.blue }}>
            <Typography variant="overline" color="text.secondary">Amount to pay</Typography>
            <Typography variant="h3" sx={{ mb: 3 }}>{naira(order.fare)}</Typography>

            <Stack spacing={2.5}>
              {banks.map((b) => (
                <Paper
                  key={b.bank}
                  variant="outlined"
                  sx={{ p: 2, borderRadius: 2 }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      mb: 1.5,
                    }}
                  >
                    <Box
                      component="img"
                      src={b.logo}
                      alt={`${b.bank} logo`}
                      sx={{
                        width: 62,
                        height: 62,
                        objectFit: 'contain',
                        borderRadius: 1,
                      }}
                    />
                  </Box>

                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Typography variant="h5" sx={{ letterSpacing: 1 }}>
                      {b.number}
                    </Typography>

                    <IconButton
                      aria-label={`Copy ${b.bank} account number`}
                      onClick={() => copy(b.bank, b.number)}
                    >
                      {copied === b.bank ? (
                        <Typography variant="caption">Copied</Typography>
                      ) : (
                        <ContentCopyRounded fontSize="small" />
                      )}
                    </IconButton>
                  </Box>

                  <Typography fontWeight={600}>
                    {b.name}
                  </Typography>
                </Paper>
              ))}
            </Stack>

            <Box sx={{ mt: 3 }}><Notice>Send exactly {naira(order.fare)} and keep your transfer receipt.</Notice></Box>

            <Button fullWidth size="large" variant="contained" color="secondary" component="a" href={whatsappLink()} target="_blank" rel="noopener noreferrer" startIcon={<WhatsApp />} sx={{ mt: 3 }}>
              I have paid. Notify us on WhatsApp
            </Button>
            <Button fullWidth sx={{ mt: 1.5 }} onClick={() => setOrder(null)}>Edit booking</Button>
          </Paper>
        </Container>
      </Box>
    );
  }

  // ---------- Booking form ----------
  // Couriers and admins don't place bookings. Customers and signed-out visitors do.
  if (session?.user && (session.user.role !== 'CLIENT' || session.isRider)) {
    return (
      <Container maxWidth="sm" sx={{ py: { xs: 8, md: 12 }, textAlign: 'center' }}>
        <Typography variant="h3" sx={{ fontSize: { xs: '2rem', md: '2.6rem' } }}>Bookings are for customers</Typography>
        <Typography color="text.secondary" sx={{ mt: 2, mb: 4, fontSize: '1.1rem' }}>
          You're signed in as {session.user.role === 'ADMIN' ? 'an admin' : 'a courier'}, so you can't place a delivery. Open your dashboard, or sign out and book as a customer.
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
          <Button component={RouterLink} to={session.home} variant="contained" color="secondary" size="large">Go to my dashboard</Button>
          <Button size="large" color="inherit" variant="outlined" onClick={() => session.logout()}>Sign out</Button>
        </Stack>
      </Container>
    );
  }

  return (
    <Box sx={{ bgcolor: brand.paper, py: { xs: 4, md: 8 } }}>
      <Container maxWidth="lg">
        <Typography variant="h1" sx={{ fontSize: { xs: '2.4rem', md: '3.6rem' } }}>Book a delivery</Typography>
        <Typography color="text.secondary" sx={{ mt: 1, mb: 5, fontSize: '1.1rem' }}>Your fare is worked out from the driving distance and shown before you pay. It updates as soon as both addresses are set.</Typography>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 0.1,
            borderRadius: 3,
            py: 2,
            px: 2,
            backgroundColor: brand.lightblue,
            mb: 2.5,
          }}
        >
          <LightbulbFilamentRegular fontSize={22} style={{ color: brand.blue, flexShrink: 0, marginTop: 1 }} />
          <Typography variant="subtitle2" fontWeight={500} sx={{ color: brand.blue }}>
            <b>Note:</b> We only deliver within Oyo State, Nigeria currently. If your pickup or delivery
            address is outside Oyo State, Nigeria, please contact us on WhatsApp for assistance.
          </Typography>
        </Box>
        <Box component="form" onSubmit={submit} noValidate sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.3fr 1fr' }, gap: { xs: 3, md: 5 }, alignItems: 'start' }}>
          <Stack spacing={3}>
            <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 4 }, borderRadius: 2 }}>
              <Typography variant="h5" sx={{ mb: 0.5 }}>Where is it going?</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>Search for the exact street, estate or landmark and pick it from the list.</Typography>

              <Stack spacing={1}>
                <PlaceField label="Pickup address" value={pickup} onChange={setPickup} error={errors.pickup} tone={brand.blue} icon={TripOriginRounded} />
                <PlaceField label="Delivery address" value={dropoff} onChange={setDropoff} error={errors.dropoff} tone="#1B8F4C" icon={PlaceRounded} />
                {quoteErr && <Notice>{quoteErr}</Notice>}
                {quote?.durationMin && <Stack direction="row" spacing={1} alignItems="center" sx={{ color: 'text.secondary' }}><ScheduleRounded fontSize="small" sx={{ color: brand.blue }} /><Typography variant="body2" sx={{ color: 'text.secondary' }}><Box component="span" sx={{ fontWeight: 800, color: brand.blue }}>ETA </Box><Eta min={quote.durationMin} /> · {quote.distanceKm} km</Typography></Stack>}
              </Stack>
            </Paper>
            <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 4 }, borderRadius: 2 }}>
              <Typography variant="h5" sx={{ mb: 0.5 }}>Your details</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>Your receipt is sent to this email.</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5 }}>
                <TextField label="Full name" value={f.name} onChange={set('name')} error={!!errors.name} helperText={errors.name} autoComplete="name" />
                <TextField label="Phone number" type="tel" value={f.phone} onChange={set('phone')} error={!!errors.phone} helperText={errors.phone} autoComplete="tel" />
                <TextField label="Email" type="email" value={f.email} onChange={set('email')} error={!!errors.email} helperText={errors.email} autoComplete="email" sx={{ gridColumn: { sm: '1 / -1' } }} />
                <TextField label="What are we delivering?" value={f.description} onChange={set('description')} error={!!errors.description} helperText={errors.description} multiline minRows={2} sx={{ gridColumn: { sm: '1 / -1' } }} />
                <TextField select label="Package size (optional)" value={f.size} onChange={set('size')} sx={{ gridColumn: { sm: '1 / -1' } }}>
                  <MenuItem value="">Not sure</MenuItem>
                  {sizes.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </TextField>
              </Box>
            </Paper>
            <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 4 }, borderRadius: 2 }}>
              <Typography variant="h5" sx={{ mb: 0.5 }}>Who's handing over and receiving?</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>Each side gets a one-time code by email. The courier asks for it at pickup and at delivery.</Typography>
              <Stack spacing={3} divider={<Box sx={{ borderTop: '1px solid #E6ECF6' }} />}>
                <PartyCard title="Sender" hint="Gives the package to the courier" value={sender} onChange={setSender} errors={errors.sender} />
                <PartyCard title="Recipient" hint="Receives the package" value={recipient} onChange={setRecipient} errors={errors.recipient} />
              </Stack>
            </Paper>
          </Stack>

          <Paper elevation={0} sx={{ p: { xs: 2.5, md: 4 }, borderRadius: 2, border: '2px solid', borderColor: brand.blue, position: { md: 'sticky' }, top: 96 }}>
            <Typography variant="h5" sx={{ mb: 2.5 }}>Your fare</Typography>
            <FareSummary pickup={pickup?.label} dropoff={dropoff?.label} distanceKm={quote?.distanceKm} fare={price?.fare ?? quote?.fare} rate={quote?.ratePerKm} minimumFare={quote?.minimumFare} loading={quoting} baseFare={price?.baseFare} vat={price?.vat} vatRate={price?.vatRate} total={price?.total} />

            <Typography variant="subtitle1" fontWeight={700} sx={{ mt: 3 }}>Payment method</Typography>
            <RadioGroup value={method} onChange={(e) => setMethod(e.target.value)}>
              <FormControlLabel value="paystack" disabled={!PAYSTACK_LIVE} control={<Radio />} label={PAYSTACK_LIVE ? 'Pay online (card, transfer, USSD)' : 'Pay online (available soon)'} />
              <FormControlLabel value="transfer" control={<Radio />} label="Bank transfer (OPay / Providus)" />
            </RadioGroup>

            {payErr && <Box sx={{ mt: 2 }}><Notice>{payErr}</Notice></Box>}
            <Button type="submit" fullWidth size="large" variant="contained" color="secondary" disabled={paying || quoting} sx={{ mt: 2 }}
              startIcon={paying ? <CircularProgress size={20} color="inherit" /> : method === 'paystack' ? <LockRounded /> : null}>
              {paying ? 'Taking you to payment…' : method === 'paystack' ? (price ? `Pay ${naira(price.total)}` : 'Pay securely') : (price ? `Continue to pay ${naira(price.total)}` : 'Continue to payment')}
            </Button>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5, textAlign: 'center' }}>
              {method === 'paystack' ? 'Payment is verified on our server before your booking is confirmed.' : 'We confirm your booking once your transfer is received.'}
            </Typography>
          </Paper>
        </Box>
      </Container>
    </Box>
  );
}