import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { keyframes } from '@emotion/react';
import { Avatar, Box, Button, Chip, CircularProgress, Paper, Stack, TextField, Typography } from '@mui/material';
import GridViewRounded from '@mui/icons-material/GridViewRounded';
import NotificationsActiveRounded from '@mui/icons-material/NotificationsActiveRounded';
import Inventory2Rounded from '@mui/icons-material/Inventory2Rounded';
import LocalShippingRounded from '@mui/icons-material/LocalShippingRounded';
import TaskAltRounded from '@mui/icons-material/TaskAltRounded';
import BadgeRounded from '@mui/icons-material/BadgeRounded';
import SupportAgentRounded from '@mui/icons-material/SupportAgentRounded';
import LogoutRounded from '@mui/icons-material/LogoutRounded';
import LockRounded from '@mui/icons-material/LockRounded';
import VerifiedRounded from '@mui/icons-material/VerifiedRounded';
import MarkEmailUnreadRounded from '@mui/icons-material/MarkEmailUnreadRounded';
import KeyRounded from '@mui/icons-material/KeyRounded';
import ShieldRounded from '@mui/icons-material/ShieldRounded';
import PinDropRounded from '@mui/icons-material/PinDropRounded';
import TripOriginRounded from '@mui/icons-material/TripOriginRounded';
import PhoneRounded from '@mui/icons-material/PhoneRounded';
import RefreshRounded from '@mui/icons-material/RefreshRounded';
import BoltRounded from '@mui/icons-material/BoltRounded';
import CheckRounded from '@mui/icons-material/CheckRounded';
import PhoneInTalkRounded from '@mui/icons-material/PhoneInTalkRounded';
import { Eta, Notice } from '../../components/ui';
import { CourierScene, ParcelStack, RouteMap } from '../../components/art';
import DashShell from '../../components/DashShell';
import Crisp from '../../components/Crisp';
import { courierAccept, courierApplication, courierAssignments, courierConfirmDelivery, courierConfirmPickup, courierDecline, resendVerification } from '../../api';
import { useClient } from '../../client/ClientAuth';
import { brand } from '../../theme';

const GREEN = '#1B8F4C';
const MINT = '#EAF7F0';
const LINE = '#DDE8E2';
const pop = keyframes`0%{transform:scale(.4);opacity:0}60%{transform:scale(1.12)}100%{transform:scale(1);opacity:1}`;
const rise = keyframes`from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}`;
const float = keyframes`0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}`;
const calm = { '@media (prefers-reduced-motion: reduce)': { animation: 'none !important', transition: 'none !important' } };
const appear = (i = 0) => ({ animation: `${rise} .5s cubic-bezier(.2,.8,.2,1) ${Math.min(i, 8) * 0.06}s both`, ...calm });
const panel = { bgcolor: '#fff', border: `1px solid ${LINE}`, borderRadius: 2 };
const stamp = (d) => (d ? new Date(d).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' }) : '');
const hello = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };
const STATUS = { PENDING: ['In review', 'warning'], APPROVED: ['Approved', 'success'], REJECTED: ['Not approved', 'error'] };

/* ---------- one assignment, from offer to completed ---------- */
function Steps({ job }) {
  const accepted = job.stage !== 'offer';
  const steps = [['Accepted', accepted, job.respondedAt], ['Picked up', job.pickupDone, job.pickupAt], ['Delivered', job.deliveryDone, job.deliveryAt]];
  const next = steps.findIndex((s) => !s[1]);
  return (
    <Stack direction="row" alignItems="flex-start" sx={{ width: '100%' }}>
      {steps.map(([label, ok, at], i) => (
        <Box key={label} sx={{ flex: 1, textAlign: 'center', position: 'relative' }}>
          {i > 0 && <Box sx={{ position: 'absolute', top: 15, left: '-50%', width: '100%', height: 3, bgcolor: ok || steps[i - 1][1] && ok ? GREEN : steps[i - 1][1] ? `${GREEN}66` : LINE }} />}
          <Box sx={{ position: 'relative', zIndex: 1, width: 32, height: 32, mx: 'auto', borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: ok ? GREEN : '#fff', border: ok ? 'none' : `3px solid ${i === next ? brand.orange : LINE}`, color: '#fff', animation: ok ? `${pop} .45s ease both` : 'none', ...calm }}>
            {ok ? <CheckRounded sx={{ fontSize: 20 }} /> : i === next ? <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: brand.orange }} /> : null}
          </Box>
          <Typography variant="body2" fontWeight={ok || i === next ? 800 : 500} color={ok || i === next ? 'text.primary' : 'text.secondary'} sx={{ mt: 0.75 }}>{label}</Typography>
          {ok && at && <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{stamp(at)}</Typography>}
        </Box>
      ))}
    </Stack>
  );
}

function Stop({ tone, label, address, who, phone }) {
  return (
    <Stack direction="row" spacing={1.5}>
      <Box sx={{ pt: 0.5 }}>{tone === 'pickup' ? <TripOriginRounded sx={{ color: brand.blue }} /> : <PinDropRounded sx={{ color: GREEN }} />}</Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="caption" sx={{ fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', color: tone === 'pickup' ? brand.blue : GREEN }}>{label}</Typography>
        <Typography fontWeight={700} sx={{ wordBreak: 'break-word' }}>{address || '-'}</Typography>
        {who && (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
            <Typography variant="body2" color="text.secondary">{who}</Typography>
            {phone && <Button size="small" href={`tel:${phone}`} startIcon={<PhoneRounded sx={{ fontSize: 16 }} />} sx={{ py: 0, minWidth: 0 }}>{phone}</Button>}
          </Stack>
        )}
      </Box>
    </Stack>
  );
}

function JobCard({ job, onChanged, i = 0 }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState('');
  const pick = job.stage === 'to-pickup';
  const accent = job.stage === 'completed' ? GREEN : pick || job.stage === 'offer' ? brand.blue : GREEN;

  const run = async (name, fn) => { setErr(''); setBusy(name); try { await fn(); await onChanged(); } catch (e) { setErr(e.message); } finally { setBusy(''); } };
  const accept = () => run('accept', () => courierAccept(job.id));
  const decline = () => { if (reason.trim().length < 3) return setErr('Give a short reason.'); return run('decline', () => courierDecline(job.id, reason.trim())); };
  const confirm = (e) => {
    e.preventDefault();
    if (code.trim().length < 4) return setErr(`Enter the ${pick ? 'pickup' : 'delivery'} code from the customer.`);
    return run('confirm', async () => { await (pick ? courierConfirmPickup : courierConfirmDelivery)(job.bookingId, code); setCode(''); });
  };

  return (
    <Paper elevation={0} sx={{ ...panel, overflow: 'hidden', borderTop: `4px solid ${accent}`, ...appear(i) }}>
      <Box sx={{ p: { xs: 2.5, md: 3 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1} sx={{ mb: 2 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" sx={{ wordBreak: 'break-all' }}>{job.reference || 'Delivery'}</Typography>
            <Typography variant="body2" color="text.secondary">{job.item}{job.size ? ` · ${job.size.toLowerCase()}` : ''}</Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            {job.durationMin && <Typography variant="body2"><Box component="span" sx={{ fontWeight: 800, color: brand.blue }}>ETA </Box><Eta min={job.durationMin} /></Typography>}
            <Chip size="small" color={job.stage === 'completed' ? 'success' : job.stage === 'offer' ? 'warning' : 'default'} label={job.stage === 'offer' ? 'New offer' : job.stage === 'completed' ? 'Completed' : job.stage === 'to-pickup' ? 'Go to pickup' : job.stage === 'to-deliver' ? 'On the way' : job.stage} />
          </Stack>
        </Stack>

        <Stack spacing={2} sx={{ mb: 3 }}>
          <Stop tone="pickup" label="Pickup" address={job.pickup} who={job.senderName} phone={job.senderPhone} />
          <Box sx={{ ml: '11px', borderLeft: `2px dashed ${LINE}`, height: 12, mt: -1, mb: -1 }} />
          <Stop tone="drop" label="Drop-off" address={job.dropoff} who={job.recipientName} phone={job.recipientPhone} />
        </Stack>

        {job.stage !== 'offer' && <Box sx={{ mb: 3 }}><Steps job={job} /></Box>}
        {err && <Box sx={{ mb: 2 }}><Notice>{err}</Notice></Box>}

        {job.stage === 'offer' && (
          declining ? (
            <Stack spacing={1.5}>
              <TextField label="Why can't you take it?" value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
              <Stack direction="row" spacing={1}><Button color="inherit" onClick={() => { setDeclining(false); setErr(''); }}>Back</Button><Button color="error" variant="contained" onClick={decline} disabled={!!busy} startIcon={busy === 'decline' ? <CircularProgress size={16} color="inherit" /> : null}>Decline job</Button></Stack>
            </Stack>
          ) : (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Button size="large" variant="contained" onClick={accept} disabled={!!busy} startIcon={busy === 'accept' ? <CircularProgress size={18} color="inherit" /> : <TaskAltRounded />} sx={{ bgcolor: GREEN, '&:hover': { bgcolor: '#14753D' } }}>Accept job</Button>
              <Button size="large" color="inherit" variant="outlined" onClick={() => setDeclining(true)}>Decline</Button>
            </Stack>
          )
        )}

        {(job.stage === 'to-pickup' || job.stage === 'to-deliver') && (
          <Box component="form" onSubmit={confirm} noValidate sx={{ bgcolor: pick ? '#E8F1FF' : MINT, borderRadius: 2, p: 2.5 }}>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
              <Box sx={{ width: 38, height: 38, borderRadius: 1, bgcolor: accent, color: '#fff', display: 'grid', placeItems: 'center' }}>{pick ? <Inventory2Rounded fontSize="small" /> : <LocalShippingRounded fontSize="small" />}</Box>
              <Box><Typography fontWeight={800}>{pick ? 'Confirm pickup' : 'Confirm delivery'}</Typography><Typography variant="body2" color="text.secondary">{pick ? `Ask ${job.senderName || 'the sender'} for their pickup code` : `Ask ${job.recipientName || 'the recipient'} for their delivery code`}</Typography></Box>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField fullWidth size="small" placeholder={pick ? 'Pickup code' : 'Delivery code'} value={code} onChange={(e) => setCode(e.target.value)} autoComplete="one-time-code" sx={{ bgcolor: '#fff' }}
                slotProps={{ htmlInput: { inputMode: 'numeric', style: { letterSpacing: '.4em', fontWeight: 800, textAlign: 'center', fontSize: '1.2rem' } } }} />
              <Button type="submit" size="large" variant="contained" disabled={!!busy} startIcon={busy === 'confirm' ? <CircularProgress size={18} color="inherit" /> : <KeyRounded />} sx={{ bgcolor: accent, flexShrink: 0, '&:hover': { bgcolor: accent, filter: 'brightness(.92)' } }}>{pick ? 'Confirm pickup' : 'Confirm delivery'}</Button>
            </Stack>
          </Box>
        )}

        {job.stage === 'completed' && (
          <Box sx={{ bgcolor: MINT, border: `1px solid ${GREEN}55`, borderRadius: 2, p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: GREEN, color: '#fff', display: 'grid', placeItems: 'center', animation: `${pop} .5s ease both`, ...calm }}><TaskAltRounded /></Box>
            <Box><Typography fontWeight={800}>Order completed</Typography><Typography variant="body2" color="text.secondary">Delivered {stamp(job.deliveryAt || job.completedAt)}</Typography></Box>
          </Box>
        )}
      </Box>
    </Paper>
  );
}

function Empty({ art, title, text, action }) {
  return (
    <Paper elevation={0} sx={{ ...panel, p: { xs: 3, md: 6 }, textAlign: 'center' }}>
      <Box sx={{ maxWidth: 260, mx: 'auto' }}>{art}</Box>
      <Typography variant="h5" sx={{ mt: 1 }}>{title}</Typography>
      <Typography color="text.secondary" sx={{ maxWidth: 420, mx: 'auto' }}>{text}</Typography>
      {action}
    </Paper>
  );
}

function Kpi({ icon: Icon, label, value, tone = GREEN, i = 0, onClick }) {
  return (
    <Paper component={onClick ? 'button' : 'div'} onClick={onClick} elevation={0} sx={{ ...panel, p: 2.5, position: 'relative', overflow: 'hidden', textAlign: 'left', font: 'inherit', cursor: onClick ? 'pointer' : 'default', transition: 'transform .2s', '&:hover': onClick ? { transform: 'translateY(-3px)' } : {}, ...appear(i) }}>
      <Box aria-hidden sx={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, bgcolor: tone }} />
      <Stack direction="row" spacing={2} alignItems="center">
        <Box sx={{ width: 46, height: 46, borderRadius: 1, bgcolor: `${tone}18`, color: tone, display: 'grid', placeItems: 'center' }}><Icon /></Box>
        <Box><Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' }}>{label}</Typography><Typography variant="h4">{value}</Typography></Box>
      </Stack>
    </Paper>
  );
}

function Overview({ user, isCourier, app, jobs, go }) {
  const c = (s) => jobs.filter((j) => j.stage === s).length;
  const st = app ? STATUS[app.status] : null;
  const next = jobs.find((j) => j.stage === 'to-deliver') || jobs.find((j) => j.stage === 'to-pickup') || jobs.find((j) => j.stage === 'offer');
  return (
    <Stack spacing={3}>
      <Box sx={{ position: 'relative', overflow: 'hidden', borderRadius: 2, color: '#fff', background: `linear-gradient(120deg, #0E6B38 0%, ${GREEN} 38%, ${brand.blue} 100%)`, ...appear(0) }}>
        <Box aria-hidden sx={{ position: 'absolute', width: 320, height: 320, right: -60, top: -140, bgcolor: brand.orange, opacity: 0.35, filter: 'blur(70px)' }} />
        <Box sx={{ position: 'relative', display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.1fr 1fr' }, alignItems: 'center', gap: 2, p: { xs: 3, md: 5 }, pb: { xs: 0, md: 3 } }}>
          <Box sx={{ pb: { xs: 2, md: 0 } }}>
            <Chip size="small" icon={<BoltRounded sx={{ color: '#fff !important' }} />} label={isCourier ? 'Courier on duty' : st ? `Application ${st[0].toLowerCase()}` : 'Welcome'} sx={{ bgcolor: 'rgba(255,255,255,.18)', color: '#fff', fontWeight: 700, mb: 2 }} />
            <Typography variant="h3" sx={{ fontSize: { xs: '1.9rem', md: '2.7rem' } }}>{hello()}, {(user?.name || 'there').split(' ')[0]}.</Typography>
            <Typography sx={{ mt: 1.5, color: 'rgba(255,255,255,.9)', maxWidth: 440 }}>
              {!isCourier ? (app?.status === 'REJECTED' ? 'Your application was not approved this time.' : 'Your application is in with our team. Jobs appear here once you are approved.')
                : c('offer') ? `You have ${c('offer')} new job offer${c('offer') > 1 ? 's' : ''} waiting for you.` : next ? 'Keep going. Your next step is ready below.' : 'No jobs right now. New assignments from dispatch show up here.'}
            </Typography>
            {isCourier && next && <Button variant="contained" size="large" onClick={() => go(next.stage === 'offer' ? 'offers' : next.stage === 'to-pickup' ? 'pickup' : 'delivery')} sx={{ mt: 3, bgcolor: '#fff', color: GREEN, '&:hover': { bgcolor: '#F1FAF5' } }}>{next.stage === 'offer' ? 'View offer' : next.stage === 'to-pickup' ? 'Confirm a pickup' : 'Confirm a delivery'}</Button>}
          </Box>
          <Box sx={{ animation: `${float} 6s ease-in-out infinite`, ...calm }}><CourierScene dark /></Box>
        </Box>
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2 }}>
        <Kpi i={1} icon={NotificationsActiveRounded} label="New offers" value={c('offer')} tone={brand.orange} onClick={() => go('offers')} />
        <Kpi i={2} icon={Inventory2Rounded} label="To pick up" value={c('to-pickup')} tone={brand.blue} onClick={() => go('pickup')} />
        <Kpi i={3} icon={LocalShippingRounded} label="To deliver" value={c('to-deliver')} tone={GREEN} onClick={() => go('delivery')} />
        <Kpi i={4} icon={TaskAltRounded} label="Completed" value={c('completed')} tone="#0E6B38" onClick={() => go('completed')} />
      </Box>
      <Paper elevation={0} sx={{ ...panel, p: { xs: 2.5, md: 4 }, ...appear(5) }}>
        <Typography variant="h5" sx={{ mb: 3 }}>How a job works</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 3 }}>
          {[[NotificationsActiveRounded, 'Accept', 'Dispatch offers you a job. Accept it, or decline with a reason.', brand.orange], [PinDropRounded, 'Pick up', "Meet the sender and enter their pickup code. The step turns green.", brand.blue], [LocalShippingRounded, 'Deliver', "Hand over and enter the recipient's delivery code.", GREEN], [TaskAltRounded, 'Completed', 'The order is closed and moves to your completed list.', '#0E6B38']].map(([Icon, t, d, col], i) => (
            <Stack key={t} direction="row" spacing={2}>
              <Box sx={{ width: 48, height: 48, borderRadius: 1, bgcolor: `${col}18`, color: col, display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon /></Box>
              <Box><Typography fontWeight={800}>{i + 1}. {t}</Typography><Typography variant="body2" color="text.secondary">{d}</Typography></Box>
            </Stack>
          ))}
        </Box>
      </Paper>
    </Stack>
  );
}

function JobList({ jobs, stage, onChanged, empty }) {
  const rows = jobs.filter((j) => j.stage === stage);
  if (!rows.length) return empty;
  return <Stack spacing={2.5}>{rows.map((j, i) => <JobCard key={j.id} job={j} i={i} onChanged={onChanged} />)}</Stack>;
}

function Profile({ user, isCourier, app, logout }) {
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const verified = !!user?.emailVerifiedAt;
  const st = app ? STATUS[app.status] : null;
  const resend = async () => { setBusy(true); setMsg(null); try { await resendVerification(); setMsg({ ok: true, t: 'Verification link sent. Check your inbox.' }); } catch (e) { setMsg({ ok: false, t: e.message }); } finally { setBusy(false); } };
  const Row = ({ k, v }) => (<Stack direction="row" justifyContent="space-between" sx={{ py: 1.5, borderTop: `1px solid ${LINE}` }}><Typography color="text.secondary">{k}</Typography><Typography fontWeight={700} sx={{ textAlign: 'right', ml: 2, wordBreak: 'break-word' }}>{v || '-'}</Typography></Stack>);
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, alignItems: 'start' }}>
      <Paper elevation={0} sx={{ ...panel, p: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <Avatar variant="rounded" sx={{ width: 64, height: 64, bgcolor: GREEN, borderRadius: 2, fontWeight: 800, fontSize: '1.6rem' }}>{(user?.name || user?.email || '?')[0].toUpperCase()}</Avatar>
          <Box><Typography variant="h5">{user?.name}</Typography><Chip size="small" icon={verified ? <VerifiedRounded /> : undefined} label={isCourier ? 'Courier' : 'Courier applicant'} color={isCourier ? 'success' : 'default'} /></Box>
        </Stack>
        <Row k="Email" v={user?.email} />
        <Row k="Email status" v={verified ? 'Verified' : 'Not verified'} />
        <Row k="Phone" v={app?.phone} />
        <Row k="Application" v={st ? st[0] : isCourier ? 'Approved' : 'Not applied'} />
        {app?.status === 'REJECTED' && app.rejectionReason && <Row k="Reason" v={app.rejectionReason} />}
        <Button fullWidth color="inherit" variant="outlined" startIcon={<LogoutRounded />} onClick={logout} sx={{ mt: 3 }}>Sign out</Button>
      </Paper>
      <Stack spacing={2.5}>
        {!verified && (
          <Paper elevation={0} sx={{ ...panel, p: 3, borderColor: brand.orange, bgcolor: 'rgba(249,107,15,.06)' }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <MarkEmailUnreadRounded sx={{ color: brand.orange, fontSize: 36 }} />
              <Box sx={{ flex: 1 }}><Typography fontWeight={800}>Verify your email</Typography><Typography variant="body2" color="text.secondary">Approval needs a verified email.</Typography></Box>
              <Button variant="contained" color="secondary" onClick={resend} disabled={busy}>Resend</Button>
            </Stack>
            {msg && <Box sx={{ mt: 2 }}><Notice severity={msg.ok ? 'success' : 'error'}>{msg.t}</Notice></Box>}
          </Paper>
        )}
        <Box sx={{ bgcolor: MINT, borderRadius: 2, p: 3 }}><CourierScene /></Box>
      </Stack>
    </Box>
  );
}

function Help() {
  const items = [
    [NotificationsActiveRounded, 'How do I get jobs?', 'Dispatch assigns bookings to approved couriers. A new job shows under Offers. Accept it to start, or decline with a reason.'],
    [KeyRounded, 'What are the codes?', 'Each booking has a pickup code for the sender and a delivery code for the recipient. Never share them yourself. The customer reads them out.'],
    [ShieldRounded, 'A code is rejected', 'Check it with the customer and try again. They can resend codes from their tracking page.'],
  ];
  return (
    <Stack spacing={2.5}>
      {items.map(([Icon, t, d], i) => (
        <Paper key={t} elevation={0} sx={{ ...panel, p: 3, display: 'flex', gap: 2, ...appear(i) }}>
          <Box sx={{ width: 46, height: 46, borderRadius: 1, bgcolor: MINT, color: GREEN, display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon /></Box>
          <Box><Typography fontWeight={800}>{t}</Typography><Typography color="text.secondary">{d}</Typography></Box>
        </Paper>
      ))}
      <Button component={RouterLink} to="/about" variant="contained" size="large" startIcon={<PhoneInTalkRounded />} sx={{ alignSelf: 'flex-start', bgcolor: GREEN, '&:hover': { bgcolor: '#14753D' } }}>Contact ODTC</Button>
    </Stack>
  );
}

export default function CourierApp() {
  const { tab = 'overview' } = useParams();
  const nav = useNavigate();
  const { user, logout, refresh, setApplication } = useClient();
  const [app, setApp] = useState(undefined);
  const [jobs, setJobs] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [err, setErr] = useState('');
  const isCourier = user?.role === 'COURIER';

  const load = useCallback(async () => {
    try { setJobs(await courierAssignments()); setErr(''); } catch (e) { setErr(e.message); } finally { setLoaded(true); }
  }, []);

  useEffect(() => {
    refresh().catch(() => {});
    courierApplication().then((a) => { setApp(a); setApplication?.(a); }).catch(() => setApp(null));
  }, [refresh, setApplication]);
  useEffect(() => { if (!isCourier) { setLoaded(true); return undefined; } load(); const t = setInterval(load, 45000); return () => clearInterval(t); }, [isCourier, load]);

  const c = (s) => jobs.filter((j) => j.stage === s).length;
  const lock = !isCourier;
  const navItems = useMemo(() => [
    ['overview', 'Overview', GridViewRounded, {}],
    ['offers', 'Job offers', NotificationsActiveRounded, { locked: lock, count: c('offer') }],
    ['pickup', 'Confirm pickup', Inventory2Rounded, { locked: lock, count: c('to-pickup') }],
    ['delivery', 'Confirm delivery', LocalShippingRounded, { locked: lock, count: c('to-deliver') }],
    ['completed', 'Completed', TaskAltRounded, { locked: lock }],
    ['profile', 'My profile', BadgeRounded, {}],
    ['help', 'Help', SupportAgentRounded, {}],
  ], [jobs, lock]); // eslint-disable-line react-hooks/exhaustive-deps

  const go = useCallback((id) => nav(id === 'overview' ? '/courier/dashboard' : `/courier/dashboard/${id}`), [nav]);
  const out = async () => { await logout(); nav('/', { replace: true }); };
  const id = navItems.find((n) => n[0] === tab) ? tab : 'overview';

  const locked = (
    <Paper elevation={0} sx={{ ...panel, p: 5, textAlign: 'center' }}>
      <LockRounded sx={{ fontSize: 48, color: brand.orange }} />
      <Typography variant="h5" sx={{ mt: 1 }}>Unlocks when you're approved</Typography>
      <Typography color="text.secondary">Check your application status on the Overview page.</Typography>
    </Paper>
  );
  const refreshBar = isCourier && (
    <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}><Button size="small" color="inherit" startIcon={<RefreshRounded />} onClick={load}>Refresh</Button></Stack>
  );

  let body;
  if (id === 'overview') body = <Overview user={user} isCourier={isCourier} app={app} jobs={jobs} go={go} />;
  else if (id === 'profile') body = <Profile user={user} isCourier={isCourier} app={app} logout={out} />;
  else if (id === 'help') body = <Help />;
  else if (lock) body = locked;
  else {
    const cfg = {
      offers: ['offer', <Empty key="e" art={<ParcelStack />} title="No offers right now" text="When dispatch assigns you a booking it appears here with Accept and Decline." />],
      pickup: ['to-pickup', <Empty key="e" art={<ParcelStack />} title="Nothing to pick up" text="Accepted jobs waiting for collection show here. Enter the sender's code to tick the pickup." />],
      delivery: ['to-deliver', <Empty key="e" art={<RouteMap />} title="Nothing to deliver" text="Once a pickup is confirmed, the delivery shows here for the recipient's code." />],
      completed: ['completed', <Empty key="e" art={<CourierScene />} title="No completed orders yet" text="Finished deliveries are listed here with their times." />],
    }[id];
    body = (<>{refreshBar}{err && <Box sx={{ mb: 2 }}><Notice action={<Button color="inherit" onClick={load}>Retry</Button>}>{err}</Notice></Box>}{!loaded ? null : <JobList jobs={jobs} stage={cfg[0]} onChanged={load} empty={cfg[1]} />}</>);
  }

  return (
    <Crisp>
      <DashShell nav={navItems} tab={id} base="/courier/dashboard" roleLabel="COURIER" user={user} logout={out} loading={app === undefined || (isCourier && !loaded)}>{body}</DashShell>
    </Crisp>
  );
}
