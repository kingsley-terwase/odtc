import { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Box, Button, Chip, CircularProgress, Container, Paper, Stack, TextField, Typography } from '@mui/material';
import PaidRounded from '@mui/icons-material/PaidRounded';
import ScheduleRounded from '@mui/icons-material/ScheduleRounded';
import VerifiedUserRounded from '@mui/icons-material/VerifiedUserRounded';
import TwoWheelerRounded from '@mui/icons-material/TwoWheelerRounded';
import { Notice } from '../components/ui';
import { CourierScene } from '../components/art';
import { PasswordField, isEmail, isNgPhone } from '../components/Fields';
import { courierApplication, courierApply, courierRegister } from '../api';
import { useClient } from '../client/ClientAuth';
import { brand } from '../theme';

const perks = [
  [PaidRounded, 'Earn per delivery', 'Get paid for every completed run.'],
  [ScheduleRounded, 'Work your hours', 'Take jobs when it suits you.'],
  [VerifiedUserRounded, 'Verified handoffs', 'One-time codes protect you and the customer.'],
];
const steps = ['Create your courier account', 'Verify your email', 'Wait for approval from our team', 'Start confirming pickups and deliveries'];
const STATUS = { PENDING: ['In review', 'warning'], APPROVED: ['Approved', 'success'], REJECTED: ['Not approved', 'error'] };
const card = { p: { xs: 2.5, md: 4 }, borderRadius: 2, border: '1px solid #DCE4F2', bgcolor: '#fff' };

export default function Courier() {
  const { user, adopt, refresh } = useClient();
  const nav = useNavigate();
  const [f, setF] = useState({ name: '', email: '', phone: '', password: '' });
  const [phone, setPhone] = useState('');
  const [errs, setErrs] = useState({});
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [app, setApp] = useState(undefined);
  const [note, setNote] = useState('');

  useEffect(() => { if (user) courierApplication().then(setApp).catch(() => setApp(null)); else setApp(undefined); }, [user]);
  useEffect(() => { if (user) refresh().catch(() => {}); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const signUp = async (e) => {
    e.preventDefault();
    setErr('');
    const v = {};
    if (f.name.trim().length < 2) v.name = 'Enter your full name';
    if (!isEmail(f.email)) v.email = 'Enter a valid email address';
    if (!isNgPhone(f.phone)) v.phone = 'Enter a valid Nigerian phone number';
    if (f.password.length < 12) v.password = 'Use at least 12 characters';
    setErrs(v);
    if (Object.keys(v).length) return;
    setBusy(true);
    try {
      const r = await courierRegister(f);
      await adopt(r.user, r.application);
      setApp(r.application);
      nav('/courier/dashboard');
      setNote(r.verification?.status === 'unavailable' ? 'Account created, but the verification email could not be sent. Resend it from your account page.' : 'Application received. Check your email to verify your address.');
    } catch (ex) { setErr(ex.message); } finally { setBusy(false); }
  };

  const apply = async (e) => {
    e.preventDefault();
    setErr('');
    if (!isNgPhone(phone)) return setErr('Enter a valid Nigerian phone number.');
    setBusy(true);
    try { setApp(await courierApply(phone)); setNote('Application sent. Our team will review it shortly.'); } catch (ex) { setErr(ex.message); } finally { setBusy(false); }
  };

  const st = app ? STATUS[app.status] : null;

  return (
    <Box sx={{ bgcolor: brand.paper }}>
      <Box sx={{ background: `linear-gradient(150deg, ${brand.deep}, ${brand.blue})`, color: '#fff', py: { xs: 6, md: 10 } }}>
        <Container maxWidth="lg" sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.2fr 1fr' }, gap: 4, alignItems: 'center' }}>
          <Box>
          <Chip icon={<TwoWheelerRounded sx={{ color: '#fff !important' }} />} label="ODTC Couriers" sx={{ bgcolor: 'rgba(255,255,255,.15)', color: '#fff', fontWeight: 700, mb: 2 }} />
          <Typography variant="h1" sx={{ fontSize: { xs: '2.6rem', md: '4.2rem' }, maxWidth: 760 }}>Deliver with ODTC. Get paid for every run.</Typography>
          <Typography sx={{ mt: 2, fontSize: '1.15rem', color: 'rgba(255,255,255,.82)', maxWidth: 560 }}>Join our courier team. Apply in two minutes and we'll review it quickly.</Typography>
          </Box>
          <Box sx={{ display: { xs: 'none', md: 'block' } }}><CourierScene dark /></Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 8 }, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.1fr 1fr' }, gap: { xs: 4, md: 6 }, alignItems: 'start' }}>
        <Stack spacing={3}>
          <Stack spacing={2}>
            {perks.map(([Icon, t, d]) => (
              <Paper key={t} elevation={0} sx={{ ...card, p: 2.5, display: 'flex', gap: 2, alignItems: 'center' }}>
                <Box sx={{ width: 50, height: 50, borderRadius: 2, bgcolor: `${brand.orange}1F`, color: brand.orange, display: 'grid', placeItems: 'center' }}><Icon /></Box>
                <Box><Typography fontWeight={700}>{t}</Typography><Typography color="text.secondary">{d}</Typography></Box>
              </Paper>
            ))}
          </Stack>
          <Paper elevation={0} sx={card}>
            <Typography variant="h5" sx={{ mb: 2 }}>How it works</Typography>
            <Stack spacing={2}>
              {steps.map((s, i) => (
                <Stack key={s} direction="row" spacing={2} alignItems="center">
                  <Box sx={{ width: 34, height: 34, borderRadius: '50%', bgcolor: brand.blue, color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800 }}>{i + 1}</Box>
                  <Typography fontWeight={600}>{s}</Typography>
                </Stack>
              ))}
            </Stack>
          </Paper>
        </Stack>

        <Paper elevation={0} sx={{ ...card, border: '2px solid', borderColor: brand.blue, position: { md: 'sticky' }, top: 96 }}>
          {user?.role === 'COURIER' ? (
            <Stack spacing={2}>
              <Typography variant="h4">You're a courier</Typography>
              <Typography color="text.secondary">Your application is approved. Head to your desk to confirm pickups and deliveries.</Typography>
              <Button component={RouterLink} to="/courier/dashboard" size="large" variant="contained" color="secondary">Open courier dashboard</Button>
            </Stack>
          ) : app ? (
            <Stack spacing={2}>
              <Stack direction="row" spacing={1.5} alignItems="center"><Typography variant="h4">Your application</Typography><Chip color={st[1]} label={st[0]} /></Stack>
              {note && <Notice severity="success">{note}</Notice>}
              <Typography color="text.secondary">
                {app.status === 'PENDING' && 'We are reviewing your details. Make sure your email is verified, approval needs it.'}
                {app.status === 'APPROVED' && 'Approved! Sign out and back in to unlock your courier desk.'}
                {app.status === 'REJECTED' && (app.rejectionReason ? `Reason: ${app.rejectionReason}` : 'Your application was not approved this time.')}
              </Typography>
              <Button component={RouterLink} to="/courier/dashboard" variant="contained" color="secondary" size="large">Open my dashboard</Button>
            </Stack>
          ) : user ? (
            <Stack component="form" onSubmit={apply} noValidate spacing={2.5}>
              <Typography variant="h4">Apply as a courier</Typography>
              <Typography color="text.secondary">You're signed in as {user.email}. Add your phone number to apply. Your email must be verified.</Typography>
              {err && <Notice>{err}</Notice>}
              <TextField label="Phone number" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08012345678" />
              <Button type="submit" size="large" variant="contained" color="secondary" disabled={busy || app === undefined}>{busy ? 'Sending…' : 'Submit application'}</Button>
            </Stack>
          ) : (
            <Stack component="form" onSubmit={signUp} noValidate spacing={2.5}>
              <Typography variant="h4">Create courier account</Typography>
              {err && <Notice>{err}</Notice>}
              <TextField label="Full name" autoComplete="name" value={f.name} onChange={set('name')} error={!!errs.name} helperText={errs.name} />
              <TextField label="Email" type="email" autoComplete="email" value={f.email} onChange={set('email')} error={!!errs.email} helperText={errs.email} />
              <TextField label="Phone number" type="tel" autoComplete="tel" value={f.phone} onChange={set('phone')} error={!!errs.phone} helperText={errs.phone} />
              <PasswordField autoComplete="new-password" value={f.password} onChange={set('password')} error={!!errs.password} helperText={errs.password || 'At least 12 characters'} />
              <Button type="submit" size="large" variant="contained" color="secondary" disabled={busy} startIcon={busy ? <CircularProgress size={20} color="inherit" /> : null}>{busy ? 'Submitting…' : 'Apply now'}</Button>
              <Typography variant="body2" color="text.secondary" textAlign="center">Already have an account? <Box component={RouterLink} to="/signin" state={{ from: '/courier' }} sx={{ fontWeight: 700, color: brand.blue }}>Sign in</Box> to apply</Typography>
            </Stack>
          )}
        </Paper>
      </Container>
    </Box>
  );
}
