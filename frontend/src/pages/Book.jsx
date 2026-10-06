import { useEffect, useState } from 'react';
import { Autocomplete, Box, Button, CircularProgress, Container, FormControlLabel, IconButton, MenuItem, Paper, Radio, RadioGroup, Stack, TextField, Typography } from '@mui/material';
import LockRounded from '@mui/icons-material/LockRounded';
import ContentCopyRounded from '@mui/icons-material/ContentCopyRounded';
import WhatsApp from '@mui/icons-material/WhatsApp';
import { FareSummary, Notice } from '../components/ui';
import { createBooking, getQuote, searchPlaces, wakeApi } from '../api';
import { naira } from '../config';
import { brand } from '../theme';

// Set to true once Paystack is approved (about 7 business days).
const PAYSTACK_LIVE = true;

// Bank transfer accounts. An account with an empty number is hidden automatically.
const BANKS = [
  { bank: 'OPay', number: '6146013598', name: 'ODTC Logistics' },
  { bank: 'Providus Bank', number: '', name: 'ODTC Logistics' }, // <-- add the Providus account number here
];
const WHATSAPP = '2348039147577';

const makeRef = () => `ODTC-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

function PlaceField({ label, value, onChange, error }) {
  const [input, setInput] = useState('');
  const [opts, setOpts] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (input.length < 3 || value?.label === input) {
      setOpts(value ? [value] : []);
      return undefined;
    }
    let stale = false;
    setBusy(true);
    const t = setTimeout(() => {
      searchPlaces(input)
        .then((r) => {
          if (!stale) {
            const places = Array.isArray(r) ? r : Array.isArray(r?.result) ? r.result : Array.isArray(r?.data) ? r.data : [];
            setOpts(places);
          }
        })
        .catch(() => { if (!stale) setOpts([]); })
    }, 450);
    return () => {
      stale = true;
      clearTimeout(t);
      setBusy(false);
    };
  }, [input, value]);

  return (
    <Autocomplete
      options={opts}
      value={value}
      filterOptions={(x) => x}
      loading={busy}
      getOptionLabel={(o) => o.label || ''}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      onChange={(_, v) => onChange(v)}
      onInputChange={(_, v) => setInput(v)}
      noOptionsText={input.length < 3 ? 'Type at least 3 letters' : 'No match. Add the area or city, e.g. "Bodija, Ibadan".'}
      renderInput={(p) => (
        <TextField
          {...p}
          label={label}
          error={!!error}
          helperText={error || 'Start typing, then pick a match from the list'}
          slotProps={{ input: { ...p.InputProps, endAdornment: <>{busy && <CircularProgress size={18} />}{p.InputProps.endAdornment}</> } }}
        />
      )}
    />
  );
}

const sizes = ['Small (fits in a bag)', 'Medium (up to a carton)', 'Large or heavy'];

export default function Book() {
  const [pickup, setPickup] = useState(null);
  const [dropoff, setDropoff] = useState(null);
  const [quote, setQuote] = useState(null);
  const [quoting, setQuoting] = useState(false);
  const [quoteErr, setQuoteErr] = useState('');
  const [f, setF] = useState({ name: '', phone: '', email: '', description: '', size: '' });
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

  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!pickup) e.pickup = 'Choose a pickup location from the list';
    if (!dropoff) e.dropoff = 'Choose a delivery location from the list';
    if (f.name.trim().length < 2) e.name = 'Enter your full name';
    if (!/^(\+?234|0)\d{10}$/.test(f.phone.replace(/[\s-]/g, ''))) e.phone = 'Enter a valid Nigerian phone number, e.g. 08012345678';
    if (!/^\S+@\S+\.\S+$/.test(f.email)) e.email = 'Enter a valid email address';
    if (f.description.trim().length < 3) e.description = 'Tell us what we are delivering';
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
      setOrder({ ref: makeRef(), fare: quote.fare, pickup: pickup.label, dropoff: dropoff.label });
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
        customer: { name: f.name, phone: f.phone, email: f.email.trim() },
        pkg: { description: f.description.trim(), size: f.size },
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
                <Paper key={b.bank} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">{b.bank}</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="h5" sx={{ letterSpacing: 1 }}>{b.number}</Typography>
                    <IconButton aria-label={`Copy ${b.bank} account number`} onClick={() => copy(b.bank, b.number)}>
                      {copied === b.bank ? <Typography variant="caption">Copied</Typography> : <ContentCopyRounded fontSize="small" />}
                    </IconButton>
                  </Box>
                  <Typography fontWeight={600}>{b.name}</Typography>
                </Paper>
              ))}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Reference (use as narration)</Typography>
                  <Typography sx={{ fontWeight: 600 }}>{order.ref}</Typography>
                </Box>
                <IconButton aria-label="Copy reference" onClick={() => copy('ref', order.ref)}>
                  {copied === 'ref' ? <Typography variant="caption">Copied</Typography> : <ContentCopyRounded fontSize="small" />}
                </IconButton>
              </Box>
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
  return (
    <Box sx={{ bgcolor: brand.paper, py: { xs: 4, md: 8 } }}>
      <Container maxWidth="lg">
        <Typography variant="h1" sx={{ fontSize: { xs: '2.4rem', md: '3.6rem' } }}>Book a delivery</Typography>
        <Typography color="text.secondary" sx={{ mt: 1, mb: 5, fontSize: '1.1rem' }}>Your fare is worked out from the driving distance and shown before you pay. It updates as soon as both locations are set.</Typography>
        <Box component="form" onSubmit={submit} noValidate sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.3fr 1fr' }, gap: { xs: 3, md: 5 }, alignItems: 'start' }}>
          <Stack spacing={3}>
            <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 4 }, borderRadius: 2 }}>
              <Typography variant="h5" sx={{ mb: 2.5 }}>Where is it going?</Typography>
              <Stack spacing={2.5}>
                <PlaceField label="Pickup location" value={pickup} onChange={setPickup} error={errors.pickup} />
                <PlaceField label="Delivery location" value={dropoff} onChange={setDropoff} error={errors.dropoff} />
                {quoteErr && <Notice>{quoteErr}</Notice>}
              </Stack>
            </Paper>
            <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 4 }, borderRadius: 2 }}>
              <Typography variant="h5" sx={{ mb: 2.5 }}>Your details</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5 }}>
                <TextField label="Full name" value={f.name} onChange={set('name')} error={!!errors.name} helperText={errors.name} autoComplete="name" />
                <TextField label="Phone number" type="tel" value={f.phone} onChange={set('phone')} error={!!errors.phone} helperText={errors.phone} autoComplete="tel" />
                <TextField label="Email" type="email" value={f.email} onChange={set('email')} error={!!errors.email} helperText={errors.email || 'For your payment receipt'} autoComplete="email" sx={{ gridColumn: { sm: '1 / -1' } }} />
                <TextField label="What are we delivering?" value={f.description} onChange={set('description')} error={!!errors.description} helperText={errors.description} multiline minRows={2} sx={{ gridColumn: { sm: '1 / -1' } }} />
                <TextField select label="Package size (optional)" value={f.size} onChange={set('size')} sx={{ gridColumn: { sm: '1 / -1' } }}>
                  <MenuItem value="">Not sure</MenuItem>
                  {sizes.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </TextField>
              </Box>
            </Paper>
          </Stack>

          <Paper elevation={0} sx={{ p: { xs: 2.5, md: 4 }, borderRadius: 2, border: '2px solid', borderColor: brand.blue, position: { md: 'sticky' }, top: 96 }}>
            <Typography variant="h5" sx={{ mb: 2.5 }}>Your fare</Typography>
            <FareSummary pickup={pickup?.label} dropoff={dropoff?.label} distanceKm={quote?.distanceKm} fare={quote?.fare} rate={quote?.ratePerKm} minimumFare={quote?.minimumFare} loading={quoting} />

            <Typography variant="subtitle1" fontWeight={700} sx={{ mt: 3 }}>Payment method</Typography>
            <RadioGroup value={method} onChange={(e) => setMethod(e.target.value)}>
              <FormControlLabel value="paystack" disabled={!PAYSTACK_LIVE} control={<Radio />} label={PAYSTACK_LIVE ? 'Pay online (card, transfer, USSD)' : 'Pay online (available soon)'} />
              <FormControlLabel value="transfer" control={<Radio />} label="Bank transfer (OPay / Providus)" />
            </RadioGroup>

            {payErr && <Box sx={{ mt: 2 }}><Notice>{payErr}</Notice></Box>}
            <Button type="submit" fullWidth size="large" variant="contained" color="secondary" disabled={paying || quoting} sx={{ mt: 2 }}
              startIcon={paying ? <CircularProgress size={20} color="inherit" /> : method === 'paystack' ? <LockRounded /> : null}>
              {paying ? 'Taking you to payment…' : method === 'paystack' ? (quote ? `Pay ${naira(quote.fare)}` : 'Pay securely') : (quote ? `Continue to pay ${naira(quote.fare)}` : 'Continue to payment')}
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