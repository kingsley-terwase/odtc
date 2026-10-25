import { useCallback, useEffect, useState } from 'react';
import {
  Avatar, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Paper, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material';
import SendRounded from '@mui/icons-material/SendRounded';
import SwapHorizRounded from '@mui/icons-material/SwapHorizRounded';
import TripOriginRounded from '@mui/icons-material/TripOriginRounded';
import PinDropRounded from '@mui/icons-material/PinDropRounded';
import TwoWheelerRounded from '@mui/icons-material/TwoWheelerRounded';
import { Eta, Notice } from '../../components/ui';
import { adminApprovedCouriers, adminAssign, adminBookingAssignments, adminOrders, adminReassign, adminUnassigned } from '../../api';
import { brand } from '../../theme';

const card = { p: { xs: 2, md: 2.5 }, borderRadius: 3, border: '1px solid #DCE4F2', bgcolor: '#fff' };
const when = (d) => (d ? new Date(d).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' }) : '');
const STATUS_COLOR = { OFFERED: 'warning', ACCEPTED: 'info', COMPLETED: 'success', DECLINED: 'error', REVOKED: 'default' };

function AssignDialog({ booking, couriers, onClose, onDone }) {
  const [history, setHistory] = useState(null);
  const [courierId, setCourierId] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => { adminBookingAssignments(booking.id).then(setHistory).catch(() => setHistory([])); }, [booking.id]);
  const live = (history || []).find((a) => ['OFFERED', 'ACCEPTED'].includes(String(a.status).toUpperCase()));
  const reassign = !!live;

  const submit = async () => {
    if (!courierId) return setErr('Choose a courier.');
    if (reassign && reason.trim().length < 3) return setErr('Give a short reason for the change.');
    setBusy(true); setErr('');
    try {
      const r = reassign ? await adminReassign(booking.id, courierId, reason.trim()) : await adminAssign(booking.id, courierId);
      onDone(r.notification === 'sent' ? 'Courier assigned and notified.' : 'Courier assigned.');
    } catch (e) { setErr(e.message); setBusy(false); }
  };

  return (
    <Dialog open onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontFamily: '"Bricolage Grotesque"', fontWeight: 800 }}>{reassign ? 'Reassign courier' : 'Assign a courier'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <Box>
            <Typography fontWeight={700} sx={{ wordBreak: 'break-all' }}>{booking.reference}</Typography>
            <Typography variant="body2" color="text.secondary">{booking.pickup} → {booking.dropoff}</Typography>
          </Box>
          {err && <Notice>{err}</Notice>}
          {history === null && <CircularProgress size={24} />}
          {history?.length > 0 && (
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase' }}>History</Typography>
              <Stack spacing={1} sx={{ mt: 1 }}>
                {history.map((a) => (
                  <Stack key={a.id} direction="row" spacing={1.5} alignItems="center" sx={{ p: 1.25, bgcolor: '#F6F9FC', borderRadius: 1 }}>
                    <Avatar variant="rounded" sx={{ width: 32, height: 32, bgcolor: brand.blue, fontSize: 14, borderRadius: 1 }}>{(a.courier?.name || '?')[0]}</Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}><Typography variant="body2" fontWeight={700} noWrap>{a.courier?.name || a.courierId}</Typography><Typography variant="caption" color="text.secondary">{when(a.offeredAt)}{a.declineReason ? ` · ${a.declineReason}` : ''}{a.reassignmentReason ? ` · ${a.reassignmentReason}` : ''}</Typography></Box>
                    <Chip size="small" color={STATUS_COLOR[String(a.status).toUpperCase()] || 'default'} label={a.status} />
                  </Stack>
                ))}
              </Stack>
            </Box>
          )}
          <TextField select label={reassign ? 'New courier' : 'Courier'} value={courierId} onChange={(e) => setCourierId(e.target.value)} helperText={couriers.length ? 'Approved couriers only' : 'No approved couriers yet. Approve one in the Couriers tab.'}>
            {couriers.filter((c) => c.id !== live?.courierId).map((c) => <MenuItem key={c.id} value={c.id}>{c.name} · {c.phone || c.email}</MenuItem>)}
          </TextField>
          {reassign && <TextField label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Courier unavailable" />}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={busy}>Cancel</Button>
        <Button variant="contained" color="secondary" onClick={submit} disabled={busy || history === null || !couriers.length} startIcon={reassign ? <SwapHorizRounded /> : <SendRounded />}>{busy ? 'Saving…' : reassign ? 'Reassign' : 'Assign and notify'}</Button>
      </DialogActions>
    </Dialog>
  );
}

export default function DispatchView() {
  const [tab, setTab] = useState('unassigned');
  const [rows, setRows] = useState(null);
  const [couriers, setCouriers] = useState([]);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [pick, setPick] = useState(null);

  const load = useCallback(() => {
    setRows(null); setErr('');
    (tab === 'unassigned' ? adminUnassigned() : adminOrders()).then((r) => setRows(tab === 'unassigned' ? r : r.filter((b) => b.paymentStatus === 'paid'))).catch((e) => { setErr(e.message); setRows([]); });
  }, [tab]);
  useEffect(load, [load]);
  useEffect(() => { adminApprovedCouriers().then(setCouriers).catch(() => setCouriers([])); }, []);

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ sm: 'center' }}>
        <Typography sx={{ color: 'text.secondary', maxWidth: 560 }}>Send paid bookings to approved couriers. The courier is notified, accepts the job, then confirms pickup and delivery with the customer's codes.</Typography>
        <ToggleButtonGroup exclusive size="small" value={tab} onChange={(_, v) => v && setTab(v)} sx={{ bgcolor: '#fff', '& .Mui-selected': { bgcolor: `${brand.blue} !important`, color: '#fff !important' } }}>
          <ToggleButton value="unassigned" sx={{ textTransform: 'none', fontWeight: 700, px: 2 }}>Needs a courier</ToggleButton>
          <ToggleButton value="all" sx={{ textTransform: 'none', fontWeight: 700, px: 2 }}>All paid bookings</ToggleButton>
        </ToggleButtonGroup>
      </Stack>
      {ok && <Notice severity="success">{ok}</Notice>}
      {err && <Notice action={<Button color="inherit" onClick={load}>Retry</Button>}>{err}</Notice>}
      {!rows && <Box sx={{ py: 10, textAlign: 'center' }}><CircularProgress /></Box>}
      {rows && !rows.length && !err && (
        <Paper elevation={0} sx={{ ...card, textAlign: 'center', py: 7 }}>
          <TwoWheelerRounded sx={{ fontSize: 52, color: brand.blue, mb: 1 }} />
          <Typography variant="h5">{tab === 'unassigned' ? 'Every paid booking has a courier' : 'No paid bookings yet'}</Typography>
        </Paper>
      )}
      {rows?.map((b) => (
        <Paper key={b.id} elevation={0} sx={card}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
                <Typography fontWeight={800} sx={{ wordBreak: 'break-all' }}>{b.reference}</Typography>
                <Chip size="small" label={b.status} sx={{ textTransform: 'capitalize' }} />
                {b.durationMin && <Typography variant="body2"><Box component="span" sx={{ fontWeight: 800, color: brand.blue }}>ETA </Box><Eta min={b.durationMin} /></Typography>}
              </Stack>
              <Stack spacing={0.5}>
                <Stack direction="row" spacing={1}><TripOriginRounded sx={{ color: brand.blue, fontSize: 20 }} /><Typography variant="body2">{b.pickup}</Typography></Stack>
                <Stack direction="row" spacing={1}><PinDropRounded sx={{ color: '#1B8F4C', fontSize: 20 }} /><Typography variant="body2">{b.dropoff}</Typography></Stack>
              </Stack>
              <Typography variant="caption" color="text.secondary">{b.package?.description} · {b.customer?.name} · {when(b.createdAt)}</Typography>
            </Box>
            <Button variant={tab === 'unassigned' ? 'contained' : 'outlined'} color="secondary" startIcon={<SendRounded />} onClick={() => setPick(b)}>{tab === 'unassigned' ? 'Assign courier' : 'Assignment'}</Button>
          </Stack>
        </Paper>
      ))}
      {pick && <AssignDialog booking={pick} couriers={couriers} onClose={() => setPick(null)} onDone={(m) => { setPick(null); setOk(m); load(); }} />}
    </Stack>
  );
}
