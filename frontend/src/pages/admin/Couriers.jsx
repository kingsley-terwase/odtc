import { useCallback, useEffect, useState } from 'react';
import { Avatar, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Paper, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import CheckRounded from '@mui/icons-material/CheckRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import PhoneRounded from '@mui/icons-material/PhoneRounded';
import TwoWheelerRounded from '@mui/icons-material/TwoWheelerRounded';
import { Notice } from '../../components/ui';
import { adminCourierApplications, adminDecideCourier } from '../../api';
import { brand } from '../../theme';

const card = { p: { xs: 2, md: 2.5 }, borderRadius: 3, border: '1px solid #DCE4F2', bgcolor: '#fff' };
const when = (d) => (d ? new Date(d).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' }) : '');
const TABS = [['PENDING', 'Pending'], ['APPROVED', 'Approved'], ['REJECTED', 'Rejected']];
const initials = (n) => (n || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

function RejectDialog({ app, onClose, onDone }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const go = async () => {
    if (reason.trim().length < 3) return setErr('Give a short reason so the applicant knows why.');
    setBusy(true); setErr('');
    try { await adminDecideCourier(app.id, 'REJECT', reason.trim()); onDone(); } catch (e) { setErr(e.message); setBusy(false); }
  };
  return (
    <Dialog open onClose={busy ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontFamily: '"Bricolage Grotesque"', fontWeight: 800 }}>Reject application</DialogTitle>
      <DialogContent><Stack spacing={2} sx={{ pt: 1 }}>{err && <Notice>{err}</Notice>}<TextField label="Reason" multiline minRows={3} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus helperText="The applicant sees this on their account page" /></Stack></DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}><Button onClick={onClose} disabled={busy}>Cancel</Button><Button color="error" variant="contained" onClick={go} disabled={busy}>{busy ? 'Rejecting…' : 'Reject'}</Button></DialogActions>
    </Dialog>
  );
}

export default function CouriersView() {
  const [tab, setTab] = useState('PENDING');
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState('');
  const [busyId, setBusyId] = useState('');
  const [reject, setReject] = useState(null);
  const [ok, setOk] = useState('');

  const load = useCallback(() => {
    setRows(null); setErr('');
    adminCourierApplications(tab).then(setRows).catch((e) => { setErr(e.message); setRows([]); });
  }, [tab]);
  useEffect(load, [load]);

  const approve = async (a) => {
    setBusyId(a.id); setErr(''); setOk('');
    try { await adminDecideCourier(a.id, 'APPROVE'); setRows((r) => r.filter((x) => x.id !== a.id)); setOk(`${a.name || a.email || 'Applicant'} is now a courier.`); }
    catch (e) { setErr(e.message); } finally { setBusyId(''); }
  };

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ sm: 'center' }}>
        <Typography sx={{ color: 'text.secondary', maxWidth: 560 }}>Review people who want to deliver for ODTC. Approval needs a verified email and turns the account into a courier.</Typography>
        <ToggleButtonGroup exclusive size="small" value={tab} onChange={(_, v) => v && setTab(v)} sx={{ bgcolor: '#fff', '& .Mui-selected': { bgcolor: `${brand.blue} !important`, color: '#fff !important' } }}>
          {TABS.map(([v, l]) => <ToggleButton key={v} value={v} sx={{ textTransform: 'none', fontWeight: 700, px: 2 }}>{l}</ToggleButton>)}
        </ToggleButtonGroup>
      </Stack>
      {ok && <Notice severity="success">{ok}</Notice>}
      {err && <Notice action={<Button color="inherit" onClick={load}>Retry</Button>}>{err}</Notice>}
      {!rows && <Box sx={{ py: 10, textAlign: 'center' }}><CircularProgress /></Box>}
      {rows && rows.length === 0 && !err && (
        <Paper elevation={0} sx={{ ...card, textAlign: 'center', py: 7 }}>
          <TwoWheelerRounded sx={{ fontSize: 52, color: brand.blue, mb: 1 }} />
          <Typography variant="h5">No {tab.toLowerCase()} applications</Typography>
          <Typography color="text.secondary">New applications show up here as soon as they come in.</Typography>
        </Paper>
      )}
      {rows?.map((a) => {
        const name = a.name || a.user?.name || a.applicant?.name || '';
        const email = a.email || a.user?.email || a.applicant?.email || '';
        const verified = a.emailVerifiedAt || a.user?.emailVerifiedAt || a.applicant?.emailVerifiedAt;
        return (
          <Paper key={a.id} elevation={0} sx={card}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
              <Avatar sx={{ bgcolor: `${brand.blue}22`, color: brand.blue, fontWeight: 800, width: 48, height: 48 }}>{initials(name || email)}</Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography fontWeight={700} noWrap>{name || email || 'Applicant'}</Typography>
                <Typography variant="body2" color="text.secondary" noWrap>{[email, a.phone].filter(Boolean).join(' · ')}</Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 0.75 }} flexWrap="wrap" useFlexGap>
                  {verified != null && <Chip size="small" variant="outlined" color={verified ? 'success' : 'warning'} label={verified ? 'Email verified' : 'Email not verified'} />}
                  <Chip size="small" variant="outlined" label={`Applied ${when(a.createdAt)}`} />
                  {a.status === 'REJECTED' && a.rejectionReason && <Chip size="small" variant="outlined" color="error" label={a.rejectionReason} />}
                </Stack>
              </Box>
              <Stack direction="row" spacing={1}>
                {a.phone && <Button href={`tel:${a.phone}`} startIcon={<PhoneRounded />} color="inherit">Call</Button>}
                {a.status === 'PENDING' && (<>
                  <Button color="error" variant="outlined" startIcon={<CloseRounded />} disabled={busyId === a.id} onClick={() => setReject(a)}>Reject</Button>
                  <Button color="secondary" variant="contained" startIcon={busyId === a.id ? <CircularProgress size={16} color="inherit" /> : <CheckRounded />} disabled={busyId === a.id} onClick={() => approve(a)}>Approve</Button>
                </>)}
              </Stack>
            </Stack>
          </Paper>
        );
      })}
      {reject && <RejectDialog app={reject} onClose={() => setReject(null)} onDone={() => { setReject(null); load(); }} />}
    </Stack>
  );
}
