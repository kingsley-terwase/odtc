import { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import { Avatar, Box, Button, Chip, CircularProgress, Container, Paper, Stack, Typography } from '@mui/material';
import LocalShippingRounded from '@mui/icons-material/LocalShippingRounded';
import TravelExploreRounded from '@mui/icons-material/TravelExploreRounded';
import TwoWheelerRounded from '@mui/icons-material/TwoWheelerRounded';
import LogoutRounded from '@mui/icons-material/LogoutRounded';
import MarkEmailUnreadRounded from '@mui/icons-material/MarkEmailUnreadRounded';
import VerifiedRounded from '@mui/icons-material/VerifiedRounded';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import { Notice } from '../components/ui';
import { courierApplication, resendVerification } from '../api';
import { useClient } from '../client/ClientAuth';
import { brand } from '../theme';

const card = { p: { xs: 2.5, md: 3.5 }, borderRadius: 2, border: '1px solid #DCE4F2', bgcolor: '#fff' };
const STATUS = { PENDING: ['In review', 'warning'], APPROVED: ['Approved', 'success'], REJECTED: ['Not approved', 'error'] };

function Tile({ to, icon: Icon, title, text, tone = brand.blue }) {
  return (
    <Paper component={RouterLink} to={to} elevation={0} sx={{ ...card, textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: 2, transition: 'transform .2s, box-shadow .2s', '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 14px 30px rgba(0,41,122,.12)' } }}>
      <Box sx={{ width: 52, height: 52, borderRadius: 2, bgcolor: `${tone}18`, color: tone, display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon /></Box>
      <Box sx={{ flex: 1 }}><Typography fontWeight={700}>{title}</Typography><Typography variant="body2" color="text.secondary">{text}</Typography></Box>
      <ArrowForwardRounded sx={{ color: 'text.secondary' }} />
    </Paper>
  );
}

export default function Account() {
  const { user, logout, refresh } = useClient();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [app, setApp] = useState(undefined);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [sending, setSending] = useState(false);
  const verified = !!user?.emailVerifiedAt;

  useEffect(() => { refresh().catch(() => {}); }, [refresh]);
  useEffect(() => { courierApplication().then(setApp).catch(() => setApp(null)); }, []);

  const resend = async () => {
    setErr(''); setMsg(''); setSending(true);
    try { await resendVerification(); setMsg('Verification link sent. Check your inbox (and spam).'); } catch (e) { setErr(e.message); } finally { setSending(false); }
  };
  const out = async () => { await logout(); nav('/', { replace: true }); };
  const st = app ? STATUS[app.status] : null;

  return (
    <Box sx={{ bgcolor: brand.paper, minHeight: '70vh', py: { xs: 4, md: 7 } }}>
      <Container maxWidth="md">
        <Paper elevation={0} sx={{ ...card, display: 'flex', alignItems: 'center', gap: 2.5, flexWrap: 'wrap' }}>
          <Avatar variant="rounded" sx={{ width: 64, height: 64, bgcolor: brand.blue, fontWeight: 800, fontSize: '1.5rem' }}>{(user?.name || user?.email || '?')[0].toUpperCase()}</Avatar>
          <Box sx={{ flex: 1, minWidth: 200 }}>
            <Typography variant="h4" sx={{ fontSize: '1.7rem' }}>{params.get('welcome') ? `Welcome, ${(user?.name || '').split(' ')[0]}` : user?.name || 'My account'}</Typography>
            <Typography color="text.secondary">{user?.email}</Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              <Chip size="small" label={user?.role === 'COURIER' ? 'Courier' : 'Customer'} />
              {verified && <Chip size="small" color="success" variant="outlined" icon={<VerifiedRounded />} label="Email verified" />}
            </Stack>
          </Box>
          <Button color="inherit" startIcon={<LogoutRounded />} onClick={out}>Sign out</Button>
        </Paper>

        {!verified && (
          <Paper elevation={0} sx={{ ...card, mt: 3, borderColor: brand.orange, bgcolor: 'rgba(249,107,15,.06)' }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
              <MarkEmailUnreadRounded sx={{ color: brand.orange, fontSize: 36 }} />
              <Box sx={{ flex: 1 }}><Typography fontWeight={700}>Verify your email</Typography><Typography variant="body2" color="text.secondary">Couriers must have a verified email before they can be approved. We send a link to {user?.email}.</Typography></Box>
              <Button variant="contained" color="secondary" onClick={resend} disabled={sending} startIcon={sending ? <CircularProgress size={16} color="inherit" /> : null}>Resend link</Button>
            </Stack>
            {msg && <Box sx={{ mt: 2 }}><Notice severity="success">{msg}</Notice></Box>}
            {err && <Box sx={{ mt: 2 }}><Notice>{err}</Notice></Box>}
          </Paper>
        )}

        <Stack spacing={2} sx={{ mt: 3 }}>
          <Tile to="/book" icon={LocalShippingRounded} title="Book a delivery" text="Pick up and drop off anywhere we cover." />
          <Tile to="/track" icon={TravelExploreRounded} title="Track a delivery" text="Check status and resend your pickup or delivery code." tone="#1B8F4C" />
          {user?.role === 'COURIER'
            ? <Tile to="/courier/dashboard" icon={TwoWheelerRounded} title="Courier dashboard" text="Confirm pickups and deliveries with customer codes." tone={brand.orange} />
            : <Tile to={app ? '/courier/dashboard' : '/courier'} icon={TwoWheelerRounded} title={app ? 'Courier dashboard' : 'Become a courier'} text={st ? `Status: ${st[0]}` : 'Earn by delivering with ODTC.'} tone={brand.orange} />}
        </Stack>

        {app && user?.role !== 'COURIER' && (
          <Paper elevation={0} sx={{ ...card, mt: 3 }}>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="h5">Courier application</Typography>
              <Chip size="small" color={st[1]} label={st[0]} />
            </Stack>
            <Typography color="text.secondary">
              {app.status === 'PENDING' && 'Our team is reviewing your application. You will be able to confirm pickups as soon as it is approved.'}
              {app.status === 'REJECTED' && (app.rejectionReason ? `Reason: ${app.rejectionReason}` : 'Your application was not approved.')}
              {app.status === 'APPROVED' && 'Approved. Sign out and back in to see your courier desk.'}
            </Typography>
          </Paper>
        )}
      </Container>
    </Box>
  );
}
