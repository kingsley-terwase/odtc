import { useState } from 'react';
import { Link as RouterLink, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Box, Button, CircularProgress, Divider, LinearProgress, Link, Stack, TextField, Typography } from '@mui/material';
import { Notice } from '../../components/ui';
import { PasswordField, isEmail } from '../../components/Fields';
import GoogleButton, { GOOGLE_CLIENT_ID } from '../../components/Google';
import { useClient } from '../../client/ClientAuth';
import AuthFrame from './AuthFrame';

const strength = (p) => {
  let n = 0;
  if (p.length >= 12) n++;
  if (p.length >= 16) n++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) n++;
  if (/\d/.test(p)) n++;
  if (/[^A-Za-z0-9]/.test(p)) n++;
  return Math.min(n, 4);
};
const LABELS = ['Too short', 'Weak', 'Okay', 'Good', 'Strong'];
const COLORS = ['error', 'error', 'warning', 'success', 'success'];

export default function SignUp() {
  const { user, ready, home, register, google } = useClient();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [errs, setErrs] = useState({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const next = params.get('next') || '/account?welcome=1';

  if (ready && user) return <Navigate to={home} replace />;

  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    const v = {};
    if (f.name.trim().length < 2) v.name = 'Enter your full name';
    if (!isEmail(f.email)) v.email = 'Enter a valid email address';
    if (f.password.length < 12) v.password = 'Use at least 12 characters';
    else if (f.password.length > 128) v.password = 'Use 128 characters or fewer';
    setErrs(v);
    if (Object.keys(v).length) return;
    setBusy(true);
    try { const h = await register(f); nav(h === '/account' ? next : h, { replace: true }); } catch (ex) { setErr(ex.message); setBusy(false); }
  };
  const viaGoogle = async (token) => {
    setErr(''); setBusy(true);
    try { nav(await google(token), { replace: true }); } catch (ex) { setErr(ex.message); setBusy(false); }
  };
  const sc = strength(f.password);

  return (
    <AuthFrame title="Create your account" subtitle="Track deliveries, verify your email and apply to ride with us."
      aside={<Typography variant="body2" color="text.secondary">Have an account? <Link component={RouterLink} to="/signin" fontWeight={700} underline="hover">Sign in</Link></Typography>}>
      <Stack component="form" onSubmit={submit} noValidate spacing={2.5}>
        {err && <Notice>{err}</Notice>}
        <TextField label="Full name" autoComplete="name" value={f.name} onChange={set('name')} error={!!errs.name} helperText={errs.name} autoFocus />
        <TextField label="Email" type="email" autoComplete="email" value={f.email} onChange={set('email')} error={!!errs.email} helperText={errs.email} />
        <Box>
          <PasswordField fullWidth autoComplete="new-password" value={f.password} onChange={set('password')} error={!!errs.password} helperText={errs.password || 'At least 12 characters'} />
          {f.password && (
            <Box sx={{ mt: 1 }}>
              <LinearProgress variant="determinate" value={(sc + (f.password.length >= 12 ? 0 : 0)) * 25} color={COLORS[f.password.length < 12 ? 0 : sc]} sx={{ height: 6, borderRadius: 2 }} />
              <Typography variant="caption" color="text.secondary">{f.password.length < 12 ? LABELS[0] : LABELS[sc]}</Typography>
            </Box>
          )}
        </Box>
        <Button type="submit" size="large" variant="contained" color="secondary" disabled={busy} startIcon={busy ? <CircularProgress size={20} color="inherit" /> : null}>
          {busy ? 'Creating account…' : 'Create account'}
        </Button>
        {GOOGLE_CLIENT_ID && (<>
          <Divider>or</Divider>
          <GoogleButton text="signup_with" onCredential={viaGoogle} onError={setErr} />
        </>)}
        <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
          Want to deliver for ODTC? <Link component={RouterLink} to="/courier" underline="hover" fontWeight={700}>Become a courier</Link>
        </Typography>
      </Stack>
    </AuthFrame>
  );
}
