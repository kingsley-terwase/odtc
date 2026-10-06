import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink, useParams, useSearchParams } from 'react-router-dom';
import { Box, Button, CircularProgress, Container, IconButton, Paper, Stack, Tooltip, Typography } from '@mui/material';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import ErrorRounded from '@mui/icons-material/ErrorRounded';
import HourglassTopRounded from '@mui/icons-material/HourglassTopRounded';
import ContentCopyRounded from '@mui/icons-material/ContentCopyRounded';
import { FareSummary, Notice } from '../components/ui';
import { verifyBooking } from '../api';
import { brand } from '../theme';

const Line = ({ k, v }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
    <Typography color="text.secondary">{k}</Typography><Typography fontWeight={600} sx={{ textAlign: 'right' }}>{v}</Typography>
  </Box>
);

export default function Confirmation() {
  const { ref: routeRef } = useParams();
  const [params] = useSearchParams();
  // The backend callback can send the literal text ":ref" in the path, so ignore it
  // and fall back to the real reference in the query string (?reference= or ?trxref=).
  const cleanRoute = routeRef && !routeRef.startsWith(':') ? routeRef : '';
  const ref = cleanRoute || params.get('reference') || params.get('trxref') || '';
  const [b, setB] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const check = useCallback(() => {
    if (!ref) {
      setErr('We could not find a booking reference in this link.');
      setLoading(false);
      return;
    }
    setLoading(true); setErr('');
    verifyBooking(ref)
      .then((data) => {
        const booking = data?.booking || data?.data || data;
        if (!booking || !booking.reference) throw new Error('We could not find this booking. Please contact us with your payment receipt.');
        setB(booking);
      })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [ref]);
  useEffect(check, [check]);

  const copy = () => { navigator.clipboard?.writeText(b.reference); setCopied(true); setTimeout(() => setCopied(false), 1800); };

  if (loading && !b) return (
    <Container sx={{ py: 14, textAlign: 'center' }}><CircularProgress /><Typography sx={{ mt: 3 }} fontWeight={600}>Confirming your payment…</Typography></Container>
  );
  if (!b) return (
    <Container maxWidth="sm" sx={{ py: 10 }}>
      <Notice action={ref ? <Button color="inherit" onClick={check}>Try again</Button> : null}>{err || 'Something went wrong loading your booking.'}</Notice>
      <Button component={RouterLink} to="/book" sx={{ mt: 3 }}>Start a new booking</Button>
    </Container>
  );

  const customer = b.customer || {};
  const pkg = b.package || {};
  const paid = b.paymentStatus === 'paid';
  const failed = b.paymentStatus === 'failed';
  const tone = paid ? '#1B8F4C' : failed ? '#C62828' : brand.orange;
  const Icon = paid ? CheckCircleRounded : failed ? ErrorRounded : HourglassTopRounded;
  const title = paid ? 'Booking confirmed' : failed ? 'Payment did not go through' : 'We have not received your payment yet';
  const sub = paid ? 'Thank you. Keep your reference handy.' : failed ? 'You have not been charged for this booking. Please book again to retry.' : 'If you have just paid, give it a moment and check again.';

  return (
    <Box sx={{ py: { xs: 4, md: 8 } }}>
      <Container maxWidth="md">
        <Stack alignItems="center" textAlign="center" sx={{ mb: 5 }}>
          <Box sx={{ width: 84, height: 84, borderRadius: '50%', bgcolor: tone, color: '#fff', display: 'grid', placeItems: 'center', mb: 2 }}><Icon sx={{ fontSize: 48 }} /></Box>
          <Typography variant="h1" sx={{ fontSize: { xs: '2.2rem', md: '3.2rem' } }}>{title}</Typography>
          <Typography color="text.secondary" sx={{ mt: 1.5, fontSize: '1.1rem' }}>{sub}</Typography>
        </Stack>

        <Paper variant="outlined" sx={{ borderRadius: 5, overflow: 'hidden' }}>
          <Box sx={{ bgcolor: brand.deep, color: '#fff', p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box><Typography variant="caption" sx={{ opacity: 0.75 }}>Booking reference</Typography><Typography variant="h4" sx={{ letterSpacing: 1 }}>{b.reference}</Typography></Box>
            <Tooltip title={copied ? 'Copied' : 'Copy reference'}><IconButton onClick={copy} sx={{ color: '#fff' }} aria-label="Copy reference"><ContentCopyRounded /></IconButton></Tooltip>
          </Box>
          <Box sx={{ p: { xs: 2.5, md: 4 }, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: { xs: 4, md: 6 } }}>
            <FareSummary pickup={b.pickup} dropoff={b.dropoff} distanceKm={b.distanceKm} fare={b.fare} />
            <Stack spacing={1.5}>
              <Typography variant="h5">Booking details</Typography>
              <Line k="Payment" v={paid ? 'Paid' : failed ? 'Failed' : 'Pending'} />
              <Line k="Booking status" v={b.status || '-'} />
              <Line k="Customer" v={customer.name || '-'} />
              <Line k="Phone" v={customer.phone || '-'} />
              <Line k="Package" v={pkg.description || '-'} />
              {pkg.size && <Line k="Size" v={pkg.size} />}
              {b.createdAt && <Line k="Booked" v={new Date(b.createdAt).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })} />}
            </Stack>
          </Box>
          {paid && (
            <Box sx={{ bgcolor: 'rgba(249,107,15,.1)', p: { xs: 2.5, md: 4 } }}>
              <Typography variant="h5" sx={{ mb: 1 }}>What happens next</Typography>
              <Typography>We will contact you{customer.phone ? ` on ${customer.phone}` : ''} to arrange your pickup. Quote {b.reference} if you need to reach us about this delivery.</Typography>
            </Box>
          )}
        </Paper>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center" sx={{ mt: 4 }}>
          {!paid && !failed && <Button variant="contained" size="large" onClick={check} disabled={loading}>{loading ? 'Checking…' : 'Check payment again'}</Button>}
          <Button component={RouterLink} to="/book" variant={paid ? 'contained' : 'outlined'} color="secondary" size="large">Book another delivery</Button>
          <Button component={RouterLink} to="/" size="large">Back to home</Button>
        </Stack>
      </Container>
    </Box>
  );
}