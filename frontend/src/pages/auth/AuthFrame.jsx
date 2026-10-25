import { Link as RouterLink } from 'react-router-dom';
import { Box, Stack, Typography } from '@mui/material';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import BoltRounded from '@mui/icons-material/BoltRounded';
import ShieldRounded from '@mui/icons-material/ShieldRounded';
import PinDropRounded from '@mui/icons-material/PinDropRounded';
import { Logo } from '../../components/ui';
import { CourierScene } from '../../components/art';
import { brand } from '../../theme';

const points = [
  [BoltRounded, 'Fast pickups', 'Book in under a minute and see your fare before you pay.'],
  [PinDropRounded, 'Door to door', 'Pick any address with Google search, no guessing.'],
  [ShieldRounded, 'Code-verified handoff', 'Pickup and delivery are confirmed with one-time codes.'],
];

// Split-screen shell used by every account page: brand panel on the left, the form on the right.
export default function AuthFrame({ title, subtitle, children, aside }) {
  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: { xs: '1fr', md: '5fr 6fr' }, bgcolor: '#fff' }}>
      <Box sx={{
        display: { xs: 'none', md: 'flex' }, flexDirection: 'column', justifyContent: 'space-between', p: 6, color: '#fff', position: 'relative', overflow: 'hidden',
        background: `radial-gradient(700px 480px at 100% 0%, rgba(249,107,15,.38), transparent 60%), linear-gradient(160deg, ${brand.deep} 0%, ${brand.blue} 100%)`,
      }}>
        <Stack component={RouterLink} to="/" direction="row" spacing={1.5} alignItems="center" sx={{ color: '#fff', textDecoration: 'none' }}>
          <Logo size={44} /><Typography variant="h5" sx={{ fontSize: '1.25rem' }}>ODTC Logistics</Typography>
        </Stack>
        <Box>
          <Typography variant="h2" sx={{ fontSize: { md: '2.6rem', lg: '3.2rem' }, mb: 4 }}>Deliveries that arrive when you say.</Typography>
          <Stack spacing={3}>
            {points.map(([Icon, t, d]) => (
              <Stack key={t} direction="row" spacing={2} alignItems="flex-start">
                <Box sx={{ width: 44, height: 44, borderRadius: 2, bgcolor: 'rgba(255,255,255,.14)', display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon sx={{ color: brand.orange }} /></Box>
                <Box><Typography fontWeight={700}>{t}</Typography><Typography sx={{ color: 'rgba(255,255,255,.78)' }}>{d}</Typography></Box>
              </Stack>
            ))}
          </Stack>
          <Box sx={{ mt: 4, mx: -2 }}><CourierScene dark /></Box>
        </Box>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,.6)' }}>© {new Date().getFullYear()} ODTC Logistics</Typography>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', px: { xs: 2.5, sm: 6 }, py: { xs: 3, md: 5 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack component={RouterLink} to="/" direction="row" spacing={0.75} alignItems="center" sx={{ color: 'text.primary', textDecoration: 'none', fontWeight: 700 }}>
            <ArrowBackRounded fontSize="small" /> Home
          </Stack>
          {aside}
        </Stack>
        <Box sx={{ flex: 1, display: 'grid', alignContent: 'center', maxWidth: 440, width: '100%', mx: 'auto', py: 5 }}>
          {title && <Typography variant="h3" sx={{ fontSize: { xs: '2rem', md: '2.4rem' } }}>{title}</Typography>}
          {subtitle && <Typography color="text.secondary" sx={{ mt: 1, mb: 4, fontSize: '1.05rem' }}>{subtitle}</Typography>}
          {children}
        </Box>
      </Box>
    </Box>
  );
}
