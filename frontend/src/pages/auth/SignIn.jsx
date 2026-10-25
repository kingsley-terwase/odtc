import { useState } from 'react';
import { Link as RouterLink, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Box, Button, CircularProgress, Divider, Link, Stack, TextField, Typography } from '@mui/material';
import { Notice } from '../../components/ui';
import { PasswordField, isEmail } from '../../components/Fields';
import GoogleButton, { GOOGLE_CLIENT_ID } from '../../components/Google';
import { useClient } from '../../client/ClientAuth';
import AuthFrame from './AuthFrame';

export default function SignIn() {
  const { ready, user, home, login, google } = useClient();
  const nav = useNavigate();
  const loc = useLocation();
  const [f, setF] = useState({ email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  // Each role lands on its own dashboard. A saved destination is only used when it belongs to that same area.
  const target = (h) => { const f = loc.state?.from; const area = (x) => (x || '').split('/')[1]; return f && area(f) === area(h) ? f : h; };
  const after = (h) => nav(target(h), { replace: true });

  if (ready && user) return <Navigate to={target(home)} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (!isEmail(f.email) || !f.password) return setErr('Enter your email and password.');
    setBusy(true);
    try { after(await login(f.email, f.password)); } catch (ex) { setErr(ex.message); setBusy(false); }
  };
  const viaGoogle = async (token) => {
    setErr(''); setBusy(true);
    try { after(await google(token)); } catch (ex) { setErr(ex.message); setBusy(false); }
  };

  return (
    <AuthFrame title="Welcome back" subtitle="Sign in to manage your deliveries and courier work."
      aside={<Typography variant="body2" color="text.secondary">New here? <Link component={RouterLink} to="/signup" fontWeight={700} underline="hover">Create account</Link></Typography>}>
      <Stack component="form" onSubmit={submit} noValidate spacing={2.5}>
        {err && <Notice>{err}</Notice>}
        <TextField label="Email" type="email" autoComplete="username" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} autoFocus />
        <PasswordField value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
        <Box sx={{ textAlign: 'right', mt: -1.5 }}><Link component={RouterLink} to="/forgot-password" underline="hover" fontWeight={700} variant="body2">Forgot password?</Link></Box>
        <Button type="submit" size="large" variant="contained" color="secondary" disabled={busy} startIcon={busy ? <CircularProgress size={20} color="inherit" /> : null}>
          {busy ? 'Signing in…' : 'Sign in'}
        </Button>
        {GOOGLE_CLIENT_ID && (<>
          <Divider>or</Divider>
          <GoogleButton text="signin_with" onCredential={viaGoogle} onError={setErr} />
        </>)}
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">Didn't get your verification email? <Link component={RouterLink} to="/verify-email" underline="hover" fontWeight={700}>Send it again</Link></Typography>
        </Box>
      </Stack>
    </AuthFrame>
  );
}
