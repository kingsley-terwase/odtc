import { useState } from 'react';
import { Box, Button, CircularProgress, Paper, Stack, Typography } from '@mui/material';
import CheckRounded from '@mui/icons-material/CheckRounded';
import MailOutlineRounded from '@mui/icons-material/MailOutlineRounded';
import { Notice } from './ui';
import Crisp from './Crisp';
import { resendCode } from '../api';
import { brand } from '../theme';

const mask = (e) => String(e || '').replace(/^(.).*(@.*)$/, '$1•••$2');

// Paid > Picked up > Delivered, with the code delivery explained and resend buttons for the two one-time codes.
export default function Journey({ b }) {
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState(null);
  const paid = b.paymentStatus === 'paid';
  const picked = b.pickupStatus === 'COMPLETED';
  const delivered = b.deliveryStatus === 'COMPLETED';
  const steps = [
    ['Payment received', paid, ''],
    ['Package picked up', picked, b.pickupCompletedAt],
    ['Delivered', delivered, b.deliveryCompletedAt],
  ];
  const current = steps.findIndex((s) => !s[1]);

  const send = async (kind) => {
    setBusy(kind); setMsg(null);
    try { await resendCode(kind, b.reference); setMsg({ ok: true, text: kind === 'pickup' ? `Pickup code sent to ${mask(b.sender.email)}.` : `Delivery code sent to ${mask(b.recipient.email)}.` }); }
    catch (e) { setMsg({ ok: false, text: e.message }); }
    finally { setBusy(''); }
  };

  return (
    <Crisp>
    <Stack spacing={3}>
      <Box>
        {steps.map(([label, ok, at], i) => (
          <Stack key={label} direction="row" spacing={2} sx={{ position: 'relative', pb: i < steps.length - 1 ? 3 : 0 }}>
            {i < steps.length - 1 && <Box sx={{ position: 'absolute', left: 15, top: 32, bottom: 0, width: 2, bgcolor: steps[i + 1][1] || ok ? brand.blue : '#DCE4F2' }} />}
            <Box sx={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, display: 'grid', placeItems: 'center', zIndex: 1, bgcolor: ok ? '#1B8F4C' : i === current ? '#fff' : '#EEF2F9', color: '#fff', border: i === current && !ok ? `3px solid ${brand.orange}` : 'none' }}>
              {ok ? <CheckRounded sx={{ fontSize: 20 }} /> : i === current ? <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: brand.orange }} /> : null}
            </Box>
            <Box sx={{ pt: 0.25 }}>
              <Typography fontWeight={ok || i === current ? 700 : 500} color={ok || i === current ? 'text.primary' : 'text.secondary'}>{label}</Typography>
              {ok && at && <Typography variant="caption" color="text.secondary">{new Date(at).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}</Typography>}
            </Box>
          </Stack>
        ))}
      </Box>

      {paid && !delivered && (
        <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2, bgcolor: 'rgba(0,71,171,.05)', border: '1px solid #DCE4F2' }}>
          <Stack direction="row" spacing={1.5} alignItems="flex-start">
            <MailOutlineRounded sx={{ color: brand.blue, mt: 0.25 }} />
            <Box>
              <Typography fontWeight={700}>Two one-time codes were emailed</Typography>
              <Typography variant="body2" color="text.secondary">
                The sender ({mask(b.sender.email)}) has the pickup code and the recipient ({mask(b.recipient.email)}) has the delivery code. Share each only with our courier at the handoff.
              </Typography>
            </Box>
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 2 }}>
            {!picked && <Button variant="outlined" onClick={() => send('pickup')} disabled={!!busy} startIcon={busy === 'pickup' ? <CircularProgress size={16} /> : null}>Resend pickup code</Button>}
            <Button variant="outlined" onClick={() => send('delivery')} disabled={!!busy} startIcon={busy === 'delivery' ? <CircularProgress size={16} /> : null}>Resend delivery code</Button>
          </Stack>
          {msg && <Box sx={{ mt: 2 }}><Notice severity={msg.ok ? 'success' : 'error'}>{msg.text}</Notice></Box>}
        </Paper>
      )}
    </Stack>
    </Crisp>
  );
}
