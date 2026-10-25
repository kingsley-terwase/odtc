import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { Box, Button, Chip, CircularProgress, Container, InputAdornment, Paper, Stack, TextField, Typography } from '@mui/material';
import SearchRounded from '@mui/icons-material/SearchRounded';
import HistoryRounded from '@mui/icons-material/HistoryRounded';
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded';
import { Eta, FareSummary, Notice } from '../components/ui';
import { RouteMap } from '../components/art';
import Journey from '../components/Journey';
import { savedBookings, trackBooking } from '../api';
import { brand } from '../theme';

const card = { p: { xs: 2.5, md: 4 }, borderRadius: 2, border: '1px solid #DCE4F2', bgcolor: '#fff' };
const TONE = { confirmed: brand.blue, 'picked up': '#C2500A', delivered: '#1B8F4C', cancelled: '#6B7280', 'awaiting payment': '#B26A00', 'payment failed': '#C62828' };

export default function Track() {
  const { ref: routeRef } = useParams();
  const nav = useNavigate();
  const [q, setQ] = useState(routeRef || '');
  const [b, setB] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const recent = savedBookings();

  const load = useCallback(async (ref) => {
    if (!ref) return;
    setBusy(true); setErr('');
    try { setB(await trackBooking(ref.trim())); } catch (e) { setB(null); setErr(e.message); } finally { setBusy(false); }
  }, []);

  useEffect(() => { if (routeRef) { setQ(routeRef); load(routeRef); } }, [routeRef, load]);

  const submit = (e) => { e.preventDefault(); if (q.trim()) nav(`/track/${encodeURIComponent(q.trim())}`); };
  const bd = b?.breakdown || { fare: b?.fare };

  return (
    <Box sx={{ bgcolor: brand.paper, minHeight: '70vh', py: { xs: 4, md: 8 } }}>
      <Container maxWidth="md">
        <Typography variant="h1" sx={{ fontSize: { xs: '2.4rem', md: '3.4rem' } }}>Track your delivery</Typography>
        <Typography color="text.secondary" sx={{ mt: 1, mb: 4, fontSize: '1.1rem' }}>Enter your booking reference to see where your package is.</Typography>

        <Paper component="form" onSubmit={submit} elevation={0} sx={{ ...card, p: 1, borderRadius: 2, display: 'flex', gap: 1, alignItems: 'center' }}>
          <TextField fullWidth variant="standard" placeholder="ODTC-…" value={q} onChange={(e) => setQ(e.target.value)}
            slotProps={{ input: { disableUnderline: true, sx: { px: 2, py: 0.75, fontSize: '1.05rem' }, startAdornment: <InputAdornment position="start"><SearchRounded /></InputAdornment> } }} />
          <Button type="submit" variant="contained" color="secondary" size="large" disabled={busy} sx={{ flexShrink: 0 }}>{busy ? 'Looking…' : 'Track'}</Button>
        </Paper>

        {err && <Box sx={{ mt: 3 }}><Notice>{err}</Notice></Box>}
        {busy && !b && <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress /></Box>}

        {!b && !busy && recent.length > 0 && (
          <Box sx={{ mt: 5 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}><HistoryRounded fontSize="small" /><Typography fontWeight={700}>Recent on this device</Typography></Stack>
            <Stack spacing={1.5}>
              {recent.map((r) => (
                <Paper key={r.id} component={RouterLink} to={`/track/${encodeURIComponent(r.reference)}`} elevation={0} sx={{ ...card, p: 2, display: 'flex', alignItems: 'center', gap: 2, textDecoration: 'none', color: 'inherit', '&:hover': { borderColor: brand.blue } }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography fontWeight={700} noWrap>{r.reference}</Typography>
                    <Typography variant="caption" color="text.secondary">{new Date(r.at).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}</Typography>
                  </Box>
                  <ChevronRightRounded />
                </Paper>
              ))}
            </Stack>
          </Box>
        )}

        {!b && !busy && (
          <Box sx={{ mt: 5, maxWidth: 420, mx: 'auto', opacity: 0.95 }}><RouteMap /></Box>
        )}

        {b && (
          <Paper elevation={0} sx={{ ...card, mt: 4, p: 0, overflow: 'hidden' }}>
            <Box sx={{ bgcolor: brand.deep, color: '#fff', p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ minWidth: 0 }}><Typography variant="caption" sx={{ opacity: 0.75 }}>Booking reference</Typography><Typography variant="h5" sx={{ wordBreak: 'break-all' }}>{b.reference}</Typography></Box>
              <Chip label={b.status} sx={{ bgcolor: TONE[b.status] || brand.blue, color: '#fff', fontWeight: 700, textTransform: 'capitalize' }} />
            </Box>
            <Box sx={{ p: { xs: 2.5, md: 4 }, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: { xs: 4, md: 6 } }}>
              <Box>
                {b.durationMin && <Typography sx={{ mb: 2.5 }}><Box component="span" sx={{ fontWeight: 800, color: brand.blue }}>ETA </Box><Eta min={b.durationMin} size="1.25rem" /></Typography>}
                <Journey b={b} />
              </Box>
              <FareSummary pickup={b.pickup} dropoff={b.dropoff} distanceKm={b.distanceKm} fare={bd.fare ?? b.fare} rate={b.ratePerKm} minimumFare={b.minimumFare} baseFare={bd.baseFare} vat={bd.vat} vatRate={bd.vatRate} total={bd.total} />
            </Box>
          </Paper>
        )}
      </Container>
    </Box>
  );
}
