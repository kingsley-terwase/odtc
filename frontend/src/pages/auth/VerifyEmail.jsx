import { useEffect, useRef, useState } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { Box, Button, CircularProgress, Stack, TextField, Typography } from '@mui/material';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import ErrorRounded from '@mui/icons-material/ErrorRounded';
import MarkEmailReadRounded from '@mui/icons-material/MarkEmailReadRounded';
import { Notice } from '../../components/ui';
import { isEmail } from '../../components/Fields';
import { requestVerification, verifyEmail } from '../../api';
import { useClient } from '../../client/ClientAuth';
import { brand } from '../../theme';
import AuthFrame from './AuthFrame';

// The emailed link carries the token after #token= (or ?token=). With a token we verify it; without one we offer to send a new link.
const readToken = (params) => {
  const h = window.location.hash.match(/[#&]token=([^&]+)/);
  return h ? decodeURIComponent(h[1]) : params.get('token') || '';
};

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const { user, refresh } = useClient();
  const token = useRef(readToken(params)).current;
  const [state, setState] = useState(token ? 'checking' : 'ask'); // checking | ok | bad | ask | sent
  const [err, setErr] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [busy, setBusy] = useState(false);
  const ran = useRef(false);

  useEffect(() => {
    if (!token || ran.current) return;
    ran.current = true; // tokens are single-use, so never verify twice (StrictMode)
    verifyEmail(token)
      .then(() => { setState('ok'); window.history.replaceState(null, '', window.location.pathname); if (user) refresh().catch(() => {}); })
      .catch((e) => { setErr(e.message); setState('bad'); });
  }, [token, user, refresh]);

  const send = async (e) => {
    e.preventDefault();
    setErr('');
    if (!isEmail(email)) return setErr('Enter the email you signed up with.');
    setBusy(true);
    try { await requestVerification(email); setState('sent'); } catch (ex) { setErr(ex.message); } finally { setBusy(false); }
  };

  const Status = ({ icon: Icon, color, title, text, children }) => (
    <Stack spacing={2.5} alignItems="flex-start">
      <Box sx={{ width: 72, height: 72, borderRadius: '50%', bgcolor: `${color}1A`, color, display: 'grid', placeItems: 'center' }}><Icon sx={{ fontSize: 40 }} /></Box>
      <Box><Typography variant="h3" sx={{ fontSize: '2rem' }}>{title}</Typography><Typography color="text.secondary" sx={{ mt: 1 }}>{text}</Typography></Box>
      {children}
    </Stack>
  );

  return (
    <AuthFrame>
      {state === 'checking' && <Stack alignItems="center" spacing={2} sx={{ py: 6 }}><CircularProgress /><Typography fontWeight={600}>Verifying your email…</Typography></Stack>}
      {state === 'ok' && (
        <Status icon={CheckCircleRounded} color="#1B8F4C" title="Email verified" text="You're all set. You can now apply to become a courier and receive delivery updates.">
          <Button component={RouterLink} to={user ? '/account' : '/signin'} variant="contained" color="secondary" size="large">{user ? 'Go to my account' : 'Sign in'}</Button>
        </Status>
      )}
      {state === 'bad' && (
        <Status icon={ErrorRounded} color="#C62828" title="This link didn't work" text={err || 'The link may have expired or already been used.'}>
          <Button variant="contained" color="secondary" size="large" onClick={() => { setErr(''); setState('ask'); }}>Send a new link</Button>
        </Status>
      )}
      {state === 'sent' && (
        <Status icon={MarkEmailReadRounded} color={brand.blue} title="Check your inbox" text="If that email has an account that still needs verifying, a fresh link is on its way. It can take a minute, so check spam too.">
          <Button component={RouterLink} to="/signin" size="large">Back to sign in</Button>
        </Status>
      )}
      {state === 'ask' && (
        <Stack component="form" onSubmit={send} noValidate spacing={2.5}>
          <Box><Typography variant="h3" sx={{ fontSize: '2rem' }}>Verify your email</Typography><Typography color="text.secondary" sx={{ mt: 1 }}>Enter your email and we'll send you a new verification link.</Typography></Box>
          {err && <Notice>{err}</Notice>}
          <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
          <Button type="submit" size="large" variant="contained" color="secondary" disabled={busy}>{busy ? 'Sending…' : 'Send verification link'}</Button>
          <Button component={RouterLink} to="/signin">Back to sign in</Button>
        </Stack>
      )}
    </AuthFrame>
  );
}
