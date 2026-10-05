import { Box, Typography, Stack, Alert, Divider } from '@mui/material';
import { RATE, naira } from '../config';
import { brand } from '../theme';

export function Logo({ size = 44 }) {
  return (
    <Box sx={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, bgcolor: '#fff' }}>
      <Box component="img" src="/logo-badge.jpg" alt="ODTC Logistics" sx={{ width: '146%', height: '146%', ml: '-23%', mt: '-23%', display: 'block' }} />
    </Box>
  );
}

export function SectionHeading({ title, children, light, align = 'left' }) {
  return (
    <Box sx={{ mb: { xs: 4, md: 6 }, maxWidth: 640, textAlign: align, mx: align === 'center' ? 'auto' : 0 }}>
      <Typography variant="h2" sx={{ fontSize: { xs: '2rem', md: '3rem' }, color: light ? '#fff' : 'text.primary' }}>{title}</Typography>
      {children && <Typography sx={{ mt: 1.5, fontSize: '1.1rem', color: light ? 'rgba(255,255,255,.8)' : 'text.secondary' }}>{children}</Typography>}
    </Box>
  );
}

export function Notice({ severity = 'error', children, action }) {
  return <Alert severity={severity} action={action} sx={{ borderRadius: 3, alignItems: 'center' }}>{children}</Alert>;
}

// Route + distance + fare. Used on the Book and Confirmation pages.
export function FareSummary({ pickup, dropoff, distanceKm, fare, loading }) {
  const ready = distanceKm != null && fare != null;
  return (
    <Stack spacing={2.5}>
      <Box sx={{ position: 'relative', pl: 4 }}>
        <Box sx={{ position: 'absolute', left: 9, top: 14, bottom: 14, borderLeft: '2px dashed #B8C5DD' }} />
        {[['Pickup', pickup, brand.blue], ['Drop-off', dropoff, brand.orange]].map(([l, v, c], i) => (
          <Box key={l} sx={{ position: 'relative', mb: i ? 0 : 2.5 }}>
            <Box sx={{ position: 'absolute', left: -32, top: 4, width: 14, height: 14, borderRadius: '50%', bgcolor: c, border: '3px solid #fff', boxShadow: `0 0 0 2px ${c}` }} />
            <Typography variant="caption" color="text.secondary" fontWeight={600}>{l}</Typography>
            <Typography fontWeight={600} sx={{ lineHeight: 1.3 }}>{v || 'Not set yet'}</Typography>
          </Box>
        ))}
      </Box>
      <Divider />
      <Stack spacing={1}>
        <Row label="Distance" value={loading ? 'Calculating…' : ready ? `${distanceKm} km` : '–'} />
        <Row label="Rate" value={`${naira(RATE)} per km`} />
      </Stack>
      <Box sx={{ bgcolor: brand.deep, color: '#fff', borderRadius: 1, p: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Typography fontWeight={600}>Total fare</Typography>
        <Typography variant="h3" sx={{ fontSize: '2.2rem', color: ready ? brand.orange : 'rgba(255,255,255,.4)' }}>{ready ? naira(fare) : '₦0'}</Typography>
      </Box>
    </Stack>
  );
}
const Row = ({ label, value }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
    <Typography color="text.secondary">{label}</Typography>
    <Typography fontWeight={700}>{value}</Typography>
  </Box>
);
