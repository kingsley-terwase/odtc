import { useRef, useState } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import { Box, Button, CircularProgress, Stack, TextField, Typography } from '@mui/material';
import MarkEmailReadRounded from '@mui/icons-material/MarkEmailReadRounded';
import LockResetRounded from '@mui/icons-material/LockResetRounded';
import { Notice } from '../../components/ui';
import { PasswordField, isEmail } from '../../components/Fields';
import { requestPasswordReset, resetPassword } from '../../api';
import { brand } from '../../theme';
import AuthFrame from './AuthFrame';

// Forgot password: asks for the email and sends a reset link.
export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState('');
  const [err, setErr] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (!isEmail(email)) return setErr('Enter the email you signed up with.');
    setBusy(true);
    try { const r = await requestPasswordReset(email); setSent(r.message || 'A reset link has been sent to you.'); } catch (ex) { setErr(ex.message); } finally { setBusy(false); }
  };
  return (
    <AuthFrame title={sent ? 'Check your inbox' : 'Forgot your password?'} subtitle={sent ? undefined : "Enter your email and we'll send you a link to set a new one."}>
      {sent ? (
        <Stack spacing={3} alignItems="flex-start">
          <Box sx={{ width: 72, height: 72, borderRadius: 2, bgcolor: `${brand.blue}1A`, color: brand.blue, display: 'grid', placeItems: 'center' }}><MarkEmailReadRounded sx={{ fontSize: 40 }} /></Box>
          <Typography color="text.secondary">{sent} It can take a minute, so check spam too.</Typography>
          <Button component={RouterLink} to="/signin" variant="contained" color="secondary" size="large">Back to sign in</Button>
        </Stack>
      ) : (
        <Stack component="form" onSubmit={submit} noValidate spacing={2.5}>
          {err && <Notice>{err}</Notice>}
          <TextField label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
          <Button type="submit" size="large" variant="contained" color="secondary" disabled={busy} startIcon={busy ? <CircularProgress size={20} color="inherit" /> : null}>{busy ? 'Sending…' : 'Send reset link'}</Button>
          <Button component={RouterLink} to="/signin">Back to sign in</Button>
        </Stack>
      )}
    </AuthFrame>
  );
}

// The emailed link carries the token after #token= (or ?token=).
const readToken = (params) => {
  const h = window.location.hash.match(/[#&]token=([^&]+)/);
  return h ? decodeURIComponent(h[1]) : params.get('token') || '';
};

export function ResetPassword() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const token = useRef(readToken(params)).current;
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (pw.length < 12) return setErr('Use at least 12 characters.');
    if (pw.length > 128) return setErr('Use 128 characters or fewer.');
    if (pw !== pw2) return setErr('The two passwords do not match.');
    setBusy(true);
    try { await resetPassword(token, pw); window.history.replaceState(null, '', window.location.pathname); setDone(true); setTimeout(() => nav('/signin', { replace: true }), 2500); }
    catch (ex) { setErr(ex.message); } finally { setBusy(false); }
  };

  if (!token) {
    return (
      <AuthFrame title="This link is incomplete" subtitle="Open the reset link from your email again, or ask for a new one.">
        <Button component={RouterLink} to="/forgot-password" variant="contained" color="secondary" size="large">Send a new link</Button>
      </AuthFrame>
    );
  }
  return (
    <AuthFrame title={done ? 'Password updated' : 'Set a new password'} subtitle={done ? 'Taking you to sign in…' : 'Choose a strong password you have not used before.'}>
      {done ? (
        <Stack spacing={2} alignItems="flex-start"><Box sx={{ width: 72, height: 72, borderRadius: 2, bgcolor: '#1B8F4C1A', color: '#1B8F4C', display: 'grid', placeItems: 'center' }}><LockResetRounded sx={{ fontSize: 40 }} /></Box><Button component={RouterLink} to="/signin" variant="contained" color="secondary" size="large">Sign in now</Button></Stack>
      ) : (
        <Stack component="form" onSubmit={submit} noValidate spacing={2.5}>
          {err && <Notice>{err}</Notice>}
          <PasswordField label="New password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} helperText="At least 12 characters" autoFocus />
          <PasswordField label="Confirm new password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
          <Button type="submit" size="large" variant="contained" color="secondary" disabled={busy} startIcon={busy ? <CircularProgress size={20} color="inherit" /> : null}>{busy ? 'Saving…' : 'Update password'}</Button>
        </Stack>
      )}
    </AuthFrame>
  );
}
