import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { keyframes } from '@emotion/react';
import { Avatar, Box, Button, Chip, CircularProgress, Paper, Stack, Typography } from '@mui/material';
import GridViewRounded from '@mui/icons-material/GridViewRounded';
import AddRoadRounded from '@mui/icons-material/AddRoadRounded';
import LocalShippingRounded from '@mui/icons-material/LocalShippingRounded';
import TravelExploreRounded from '@mui/icons-material/TravelExploreRounded';
import BadgeRounded from '@mui/icons-material/BadgeRounded';
import SupportAgentRounded from '@mui/icons-material/SupportAgentRounded';
import LogoutRounded from '@mui/icons-material/LogoutRounded';
import VerifiedRounded from '@mui/icons-material/VerifiedRounded';
import MarkEmailUnreadRounded from '@mui/icons-material/MarkEmailUnreadRounded';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import TwoWheelerRounded from '@mui/icons-material/TwoWheelerRounded';
import KeyRounded from '@mui/icons-material/KeyRounded';
import PhoneInTalkRounded from '@mui/icons-material/PhoneInTalkRounded';
import TripOriginRounded from '@mui/icons-material/TripOriginRounded';
import PinDropRounded from '@mui/icons-material/PinDropRounded';
import { Eta, Notice } from '../../components/ui';
import { CourierScene, ParcelStack, RouteMap } from '../../components/art';
import DashShell from '../../components/DashShell';
import Crisp from '../../components/Crisp';
import { resendVerification, savedBookings, trackBooking } from '../../api';
import { useClient } from '../../client/ClientAuth';
import { brand } from '../../theme';

const BLUE = brand.blue;
const TINT = '#E8F1FF';
const LINE = '#DCE4F2';
const rise = keyframes`from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}`;
const calm = { '@media (prefers-reduced-motion: reduce)': { animation: 'none !important', transition: 'none !important' } };
const appear = (i = 0) => ({ animation: `${rise} .5s cubic-bezier(.2,.8,.2,1) ${Math.min(i, 8) * 0.06}s both`, ...calm });
const panel = { bgcolor: '#fff', border: `1px solid ${LINE}`, borderRadius: 2 };
const naira = (n) => `₦${Number(n || 0).toLocaleString('en-NG')}`;
const stamp = (d) => (d ? new Date(d).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' }) : '');
const TONE = { confirmed: BLUE, 'picked up': '#C2500A', delivered: '#1B8F4C', cancelled: '#6B7280', 'awaiting payment': '#B26A00', 'payment failed': '#C62828' };

function Tile({ to, icon: Icon, title, text, tone = BLUE, i = 0 }) {
  return (
    <Paper component={RouterLink} to={to} elevation={0} sx={{ ...panel, p: 2.5, textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: 2, transition: 'transform .2s, box-shadow .2s', '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 14px 30px rgba(0,41,122,.12)' }, ...appear(i) }}>
      <Box sx={{ width: 52, height: 52, borderRadius: 1, bgcolor: `${tone}18`, color: tone, display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon /></Box>
      <Box sx={{ flex: 1 }}><Typography fontWeight={800}>{title}</Typography><Typography variant="body2" color="text.secondary">{text}</Typography></Box>
      <ArrowForwardRounded sx={{ color: tone }} />
    </Paper>
  );
}

// The customer's deliveries made from this browser. Replaced by an account-wide list when the customer APIs arrive.
function useMyDeliveries() {
  const [rows, setRows] = useState(null);
  const load = useCallback(async () => {
    const idx = savedBookings();
    const out = await Promise.all(idx.map(async (r) => { try { return await trackBooking(r.reference); } catch { return null; } }));
    setRows(out.filter(Boolean));
  }, []);
  useEffect(() => { load(); }, [load]);
  return [rows, load];
}

function DeliveryRow({ b, i }) {
  return (
    <Paper component={RouterLink} to={`/track/${encodeURIComponent(b.reference)}`} elevation={0} sx={{ ...panel, p: 2.5, textDecoration: 'none', color: 'inherit', display: 'block', transition: 'border-color .2s', '&:hover': { borderColor: BLUE }, ...appear(i) }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1} flexWrap="wrap" sx={{ mb: 1.5 }}>
        <Box sx={{ minWidth: 0 }}><Typography fontWeight={800} sx={{ wordBreak: 'break-all' }}>{b.reference}</Typography><Typography variant="caption" color="text.secondary">{stamp(b.createdAt)}</Typography></Box>
        <Chip size="small" label={b.status} sx={{ bgcolor: TONE[b.status] || BLUE, color: '#fff', fontWeight: 700, textTransform: 'capitalize' }} />
      </Stack>
      <Stack spacing={0.75}>
        <Stack direction="row" spacing={1}><TripOriginRounded sx={{ color: BLUE, fontSize: 20 }} /><Typography variant="body2">{b.pickup || '-'}</Typography></Stack>
        <Stack direction="row" spacing={1}><PinDropRounded sx={{ color: '#1B8F4C', fontSize: 20 }} /><Typography variant="body2">{b.dropoff || '-'}</Typography></Stack>
      </Stack>
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 1.5 }}>
        {b.durationMin && <Typography variant="body2"><Box component="span" sx={{ fontWeight: 800, color: BLUE }}>ETA </Box><Eta min={b.durationMin} /></Typography>}
        <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>{b.package?.description}</Typography>
        <Typography fontWeight={800}>{naira(b.fare)}</Typography>
      </Stack>
    </Paper>
  );
}

function Overview({ user, rows }) {
  const active = (rows || []).filter((b) => ['confirmed', 'picked up'].includes(b.status)).length;
  const done = (rows || []).filter((b) => b.status === 'delivered').length;
  return (
    <Stack spacing={3}>
      <Box sx={{ position: 'relative', overflow: 'hidden', borderRadius: 2, color: '#fff', background: `linear-gradient(120deg, ${brand.deep}, ${BLUE} 60%, #1B8F4C)`, ...appear(0) }}>
        <Box aria-hidden sx={{ position: 'absolute', width: 300, height: 300, right: -60, top: -130, bgcolor: brand.orange, opacity: 0.35, filter: 'blur(70px)' }} />
        <Box sx={{ position: 'relative', display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.1fr 1fr' }, alignItems: 'center', gap: 2, p: { xs: 3, md: 5 }, pb: { xs: 0, md: 3 } }}>
          <Box sx={{ pb: { xs: 2, md: 0 } }}>
            <Typography variant="h3" sx={{ fontSize: { xs: '1.9rem', md: '2.7rem' } }}>Hi {(user?.name || 'there').split(' ')[0]}, what are we sending today?</Typography>
            <Typography sx={{ mt: 1.5, color: 'rgba(255,255,255,.9)', maxWidth: 440 }}>Book a pickup in under a minute and follow it all the way to the door.</Typography>
            <Button component={RouterLink} to="/book" variant="contained" size="large" startIcon={<AddRoadRounded />} sx={{ mt: 3, bgcolor: '#fff', color: BLUE, '&:hover': { bgcolor: '#EEF4FF' } }}>Book a delivery</Button>
          </Box>
          <CourierScene dark />
        </Box>
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
        {[['On the way', active, LocalShippingRounded, brand.orange], ['Delivered', done, VerifiedRounded, '#1B8F4C'], ['All deliveries', (rows || []).length, KeyRounded, BLUE]].map(([l, v, Icon, c], i) => (
          <Paper key={l} elevation={0} sx={{ ...panel, p: 2.5, position: 'relative', overflow: 'hidden', ...appear(i + 1) }}>
            <Box aria-hidden sx={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, bgcolor: c }} />
            <Stack direction="row" spacing={2} alignItems="center"><Box sx={{ width: 46, height: 46, borderRadius: 1, bgcolor: `${c}18`, color: c, display: 'grid', placeItems: 'center' }}><Icon /></Box><Box><Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' }}>{l}</Typography><Typography variant="h4">{rows ? v : '-'}</Typography></Box></Stack>
          </Paper>
        ))}
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
        <Tile i={4} to="/book" icon={AddRoadRounded} title="Book a delivery" text="Search any address, see your fare, pay securely." />
        <Tile i={5} to="/track" icon={TravelExploreRounded} title="Track a delivery" text="Follow status and resend your pickup or delivery code." tone="#1B8F4C" />
      </Box>
      <Paper elevation={0} sx={{ ...panel, p: { xs: 2.5, md: 3 }, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', ...appear(6) }}>
        <Box sx={{ width: 52, height: 52, borderRadius: 1, bgcolor: `${brand.orange}1F`, color: brand.orange, display: 'grid', placeItems: 'center' }}><TwoWheelerRounded /></Box>
        <Box sx={{ flex: 1, minWidth: 220 }}><Typography fontWeight={800}>Want to earn with ODTC?</Typography><Typography variant="body2" color="text.secondary">Apply to become a courier from your account.</Typography></Box>
        <Button component={RouterLink} to="/courier" variant="outlined">Become a courier</Button>
      </Paper>
    </Stack>
  );
}

function Deliveries({ rows, reload }) {
  if (!rows) return <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress /></Box>;
  if (!rows.length) {
    return (
      <Paper elevation={0} sx={{ ...panel, p: { xs: 3, md: 6 }, textAlign: 'center' }}>
        <Box sx={{ maxWidth: 260, mx: 'auto' }}><ParcelStack /></Box>
        <Typography variant="h5" sx={{ mt: 1 }}>No deliveries yet</Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>Deliveries you book on this device show up here.</Typography>
        <Button component={RouterLink} to="/book" variant="contained" color="secondary" size="large">Book your first delivery</Button>
      </Paper>
    );
  }
  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="flex-end"><Button size="small" color="inherit" onClick={reload}>Refresh</Button></Stack>
      {rows.map((b, i) => <DeliveryRow key={b.id} b={b} i={i} />)}
    </Stack>
  );
}

function Profile({ user, logout }) {
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const verified = !!user?.emailVerifiedAt;
  const resend = async () => { setBusy(true); setMsg(null); try { await resendVerification(); setMsg({ ok: true, t: 'Verification link sent. Check your inbox.' }); } catch (e) { setMsg({ ok: false, t: e.message }); } finally { setBusy(false); } };
  const Row = ({ k, v }) => (<Stack direction="row" justifyContent="space-between" sx={{ py: 1.5, borderTop: `1px solid ${LINE}` }}><Typography color="text.secondary">{k}</Typography><Typography fontWeight={700} sx={{ textAlign: 'right', ml: 2, wordBreak: 'break-word' }}>{v || '-'}</Typography></Stack>);
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, alignItems: 'start' }}>
      <Paper elevation={0} sx={{ ...panel, p: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <Avatar variant="rounded" sx={{ width: 64, height: 64, bgcolor: BLUE, borderRadius: 2, fontWeight: 800, fontSize: '1.6rem' }}>{(user?.name || user?.email || '?')[0].toUpperCase()}</Avatar>
          <Box><Typography variant="h5">{user?.name}</Typography><Chip size="small" icon={verified ? <VerifiedRounded /> : undefined} color={verified ? 'success' : 'default'} label={verified ? 'Email verified' : 'Email not verified'} /></Box>
        </Stack>
        <Row k="Email" v={user?.email} />
        <Row k="Member since" v={user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-NG', { dateStyle: 'medium' }) : ''} />
        <Button fullWidth color="inherit" variant="outlined" startIcon={<LogoutRounded />} onClick={logout} sx={{ mt: 3 }}>Sign out</Button>
      </Paper>
      <Stack spacing={2.5}>
        {!verified && (
          <Paper elevation={0} sx={{ ...panel, p: 3, borderColor: brand.orange, bgcolor: 'rgba(249,107,15,.06)' }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <MarkEmailUnreadRounded sx={{ color: brand.orange, fontSize: 36 }} />
              <Box sx={{ flex: 1 }}><Typography fontWeight={800}>Verify your email</Typography><Typography variant="body2" color="text.secondary">We sent a link to {user?.email}.</Typography></Box>
              <Button variant="contained" color="secondary" onClick={resend} disabled={busy}>Resend</Button>
            </Stack>
            {msg && <Box sx={{ mt: 2 }}><Notice severity={msg.ok ? 'success' : 'error'}>{msg.t}</Notice></Box>}
          </Paper>
        )}
        <Box sx={{ bgcolor: TINT, borderRadius: 2, p: 3 }}><RouteMap /></Box>
      </Stack>
    </Box>
  );
}

function Help() {
  const items = [
    [KeyRounded, 'What are the two codes?', 'After you pay, the sender gets a pickup code and the recipient a delivery code by email. Share each only with our courier at the handoff.'],
    [TravelExploreRounded, 'How do I follow my delivery?', 'Open Track a delivery and enter your booking reference. You can resend a code from there.'],
    [LocalShippingRounded, "My courier hasn't arrived", 'Check the ETA on your tracking page, then contact us if it is late.'],
  ];
  return (
    <Stack spacing={2.5}>
      {items.map(([Icon, t, d], i) => (
        <Paper key={t} elevation={0} sx={{ ...panel, p: 3, display: 'flex', gap: 2, ...appear(i) }}>
          <Box sx={{ width: 46, height: 46, borderRadius: 1, bgcolor: TINT, color: BLUE, display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon /></Box>
          <Box><Typography fontWeight={800}>{t}</Typography><Typography color="text.secondary">{d}</Typography></Box>
        </Paper>
      ))}
      <Button component={RouterLink} to="/about" variant="contained" size="large" startIcon={<PhoneInTalkRounded />} sx={{ alignSelf: 'flex-start' }}>Contact ODTC</Button>
    </Stack>
  );
}

const NAV = [
  ['overview', 'Overview', GridViewRounded, {}],
  ['deliveries', 'My deliveries', LocalShippingRounded, {}],
  ['profile', 'My profile', BadgeRounded, {}],
  ['help', 'Help', SupportAgentRounded, {}],
];

export default function ClientApp() {
  const { tab = 'overview' } = useParams();
  const nav = useNavigate();
  const { user, logout, refresh } = useClient();
  const [rows, reload] = useMyDeliveries();
  useEffect(() => { refresh().catch(() => {}); }, [refresh]);
  const out = async () => { await logout(); nav('/', { replace: true }); };
  const id = NAV.find((n) => n[0] === tab) ? tab : 'overview';
  const navItems = useMemo(() => NAV, []);
  return (
    <Crisp>
      <DashShell nav={navItems} tab={id} base="/account" roleLabel="CUSTOMER" accent={BLUE} tint={TINT} page="#F4F7FC" line={LINE} user={user} logout={out}>
        {id === 'overview' && <Overview user={user} rows={rows} />}
        {id === 'deliveries' && <Deliveries rows={rows} reload={reload} />}
        {id === 'profile' && <Profile user={user} logout={out} />}
        {id === 'help' && <Help />}
      </DashShell>
    </Crisp>
  );
}
