import { useEffect, useState } from 'react';
import { Autocomplete, Box, Button, CircularProgress, Container, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import LockRounded from '@mui/icons-material/LockRounded';
import { FareSummary, Notice } from '../components/ui';
import { createBooking, getQuote, searchPlaces } from '../api';
import { RATE, naira } from '../config';
import { brand } from '../theme';

function PlaceField({ label, value, onChange, error }) {
  const [input, setInput] = useState('');
  const [opts, setOpts] = useState([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (input.length < 3 || value?.label === input) return setOpts(value ? [value] : []);
    let stale = false;
    setBusy(true);
    const t = setTimeout(() => {
      searchPlaces(input).then((r) => !stale && setOpts(r)).catch(() => !stale && setOpts([])).finally(() => !stale && setBusy(false));
    }, 450);
    return () => { stale = true; clearTimeout(t); setBusy(false); };
  }, [input, value]);
  return (
    <Autocomplete
      options={opts} value={value} filterOptions={(x) => x} loading={busy}
      getOptionLabel={(o) => o.label || ''} isOptionEqualToValue={(a, b) => a.label === b.label}
      onChange={(_, v) => onChange(v)} onInputChange={(_, v) => setInput(v)}
      noOptionsText={input.length < 3 ? 'Type at least 3 letters' : 'No match. Try a street, area or landmark.'}
      renderInput={(p) => (
        <TextField {...p} label={label} error={!!error} helperText={error || 'Start typing, then pick a match from the list'}
          slotProps={{ input: { ...p.InputProps, endAdornment: <>{busy && <CircularProgress size={18} />}{p.InputProps.endAdornment}</> } }} />
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
  const [paying, setPaying] = useState(false);
  const [payErr, setPayErr] = useState('');

  useEffect(() => {
    setQuote(null); setQuoteErr('');
    if (!pickup || !dropoff) return;
    let stale = false;
    setQuoting(true);
    getQuote(pickup, dropoff).then((q) => !stale && setQuote(q)).catch((e) => !stale && setQuoteErr(e.message)).finally(() => !stale && setQuoting(false));
    return () => { stale = true; };
  }, [pickup, dropoff]);

  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!pickup) e.pickup = 'Choose a pickup location from the list';
    if (!dropoff) e.dropoff = 'Choose a delivery location from the list';
    if (f.name.trim().length < 2) e.name = 'Enter your full name';
    if (!/^(\+?234|0)\d{10}$/.test(f.phone.replace(/[\s-]/g, ''))) e.phone = 'Enter a valid Nigerian phone number, e.g. 08012345678';
    if (!/^\S+@\S+\.\S+$/.test(f.email)) e.email = 'Enter a valid email. Your payment receipt is sent here';
    if (f.description.trim().length < 3) e.description = 'Tell us what we are delivering';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    setPayErr('');
    if (!validate()) return window.scrollTo({ top: 120, behavior: 'smooth' });
    if (!quote) return setPayErr('Wait for your fare to appear, then try again.');
    setPaying(true);
    try {
      const { authorizationUrl } = await createBooking({
        customer: { name: f.name, phone: f.phone, email: f.email },
        pickup, dropoff, pkg: { description: f.description, size: f.size },
      });
      window.location.href = authorizationUrl;
    } catch (err) {
      setPayErr(err.message); setPaying(false);
    }
  };

  return (
    <Box sx={{ bgcolor: brand.paper, py: { xs: 4, md: 8 } }}>
      <Container maxWidth="lg">
        <Typography variant="h1" sx={{ fontSize: { xs: '2.4rem', md: '3.6rem' } }}>Book a delivery</Typography>
        <Typography color="text.secondary" sx={{ mt: 1, mb: 5, fontSize: '1.1rem' }}>{naira(RATE)} per kilometre. Your fare updates as soon as both locations are set.</Typography>
        <Box component="form" onSubmit={submit} noValidate sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.3fr 1fr' }, gap: { xs: 3, md: 5 }, alignItems: 'start' }}>
          <Stack spacing={3}>
            <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 4 }, borderRadius: 5 }}>
              <Typography variant="h5" sx={{ mb: 2.5 }}>Where is it going?</Typography>
              <Stack spacing={2.5}>
                <PlaceField label="Pickup location" value={pickup} onChange={setPickup} error={errors.pickup} />
                <PlaceField label="Delivery location" value={dropoff} onChange={setDropoff} error={errors.dropoff} />
                {quoteErr && <Notice>{quoteErr}</Notice>}
              </Stack>
            </Paper>
            <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 4 }, borderRadius: 5 }}>
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

          <Paper elevation={0} sx={{ p: { xs: 2.5, md: 4 }, borderRadius: 5, border: '2px solid', borderColor: brand.blue, position: { md: 'sticky' }, top: 96 }}>
            <Typography variant="h5" sx={{ mb: 2.5 }}>Your fare</Typography>
            <FareSummary pickup={pickup?.label} dropoff={dropoff?.label} distanceKm={quote?.distanceKm} fare={quote?.fare} loading={quoting} />
            {payErr && <Box sx={{ mt: 2 }}><Notice>{payErr}</Notice></Box>}
            <Button type="submit" fullWidth size="large" variant="contained" color="secondary" disabled={paying || quoting} sx={{ mt: 3 }}
              startIcon={paying ? <CircularProgress size={20} color="inherit" /> : <LockRounded />}>
              {paying ? 'Taking you to payment…' : quote ? `Pay ${naira(quote.fare)}` : 'Pay securely'}
            </Button>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5, textAlign: 'center' }}>Payment is verified on our server before your booking is confirmed.</Typography>
          </Paper>
        </Box>
      </Container>
    </Box>
  );
}
