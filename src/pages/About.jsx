import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Container, Paper, Stack, Typography } from '@mui/material';
import PhoneRounded from '@mui/icons-material/PhoneRounded';
import MailRounded from '@mui/icons-material/MailRounded';
import WhatsApp from '@mui/icons-material/WhatsApp';
import PlaceRounded from '@mui/icons-material/PlaceRounded';
import ScheduleRounded from '@mui/icons-material/ScheduleRounded';
import { SectionHeading } from '../components/ui';
import { CONTACT, RATE, naira } from '../config';
import { brand } from '../theme';

const values = [
  ['Safe', 'Your package is handled with care from pickup to drop-off.'],
  ['Dependable', 'You get a booking reference and a clear record of every delivery.'],
  ['Reliable', `One honest price: ${naira(RATE)} per kilometre, shown before you pay.`],
];

export default function About() {
  const rows = [
    [PhoneRounded, 'Call us', CONTACT.phone, `tel:${CONTACT.phone}`],
    [WhatsApp, 'WhatsApp', CONTACT.whatsapp && 'Chat with us', `https://wa.me/${CONTACT.whatsapp}`],
    [MailRounded, 'Email', CONTACT.email, `mailto:${CONTACT.email}`],
    [PlaceRounded, 'Visit', CONTACT.address],
    [ScheduleRounded, 'Operating hours', CONTACT.hours],
  ].filter((r) => r[2]);

  return (
    <>
      <Box sx={{ bgcolor: brand.deep, color: '#fff', py: { xs: 7, md: 11 } }}>
        <Container maxWidth="lg" sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.4fr 1fr' }, gap: 6, alignItems: 'center' }}>
          <Box>
            <Typography variant="h1" sx={{ fontSize: { xs: '2.6rem', md: '4rem' } }}>Delivery you can plan around.</Typography>
            <Typography sx={{ mt: 3, fontSize: '1.2rem', maxWidth: 560, color: 'rgba(255,255,255,.85)' }}>
              ODTC Logistics moves your parcels and packages for a simple, distance-based price. Book online, see your fare, pay, and get your reference.
            </Typography>
          </Box>
          <Box component="img" src="/logo-truck.jpg" alt="ODTC Logistics truck" sx={{ width: '100%', maxWidth: 340, borderRadius: 6, justifySelf: { md: 'end' } }} />
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 8, md: 11 } }}>
        <SectionHeading title="What we stand for" />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 4 }}>
          {values.map(([t, d], i) => (
            <Box key={t} sx={{ borderTop: `5px solid ${[brand.blue, brand.orange, brand.ink][i]}`, pt: 2.5 }}>
              <Typography variant="h4">{t}</Typography>
              <Typography color="text.secondary" sx={{ mt: 1, fontSize: '1.05rem' }}>{d}</Typography>
            </Box>
          ))}
        </Box>
      </Container>

      <Container maxWidth="lg" sx={{ pb: { xs: 8, md: 12 } }}>
        <Paper variant="outlined" sx={{ borderRadius: 6, p: { xs: 3, md: 6 }, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 5 }}>
          <Box>
            <Typography variant="h2" sx={{ fontSize: { xs: '2rem', md: '2.6rem' } }}>Talk to us</Typography>
            <Typography color="text.secondary" sx={{ mt: 1.5, mb: 3, fontSize: '1.1rem' }}>Questions about a delivery or your booking? Reach out and mention your booking reference if you have one.</Typography>
            <Button component={RouterLink} to="/book" variant="contained" color="secondary" size="large">Book a delivery</Button>
          </Box>
          <Stack spacing={2.5}>
            {rows.length === 0 && <Typography color="text.secondary">Contact details are being added. Use Book a delivery to place an order in the meantime.</Typography>}
            {rows.map(([Icon, label, text, href]) => (
              <Stack key={label} direction="row" spacing={2} alignItems="center" component={href ? 'a' : 'div'} href={href} target={href?.startsWith('http') ? '_blank' : undefined} rel="noreferrer" sx={{ color: 'inherit', textDecoration: 'none' }}>
                <Box sx={{ width: 48, height: 48, borderRadius: 3, bgcolor: 'rgba(0,71,171,.1)', color: brand.blue, display: 'grid', placeItems: 'center' }}><Icon /></Box>
                <Box><Typography variant="caption" color="text.secondary">{label}</Typography><Typography fontWeight={700}>{text}</Typography></Box>
              </Stack>
            ))}
          </Stack>
        </Paper>
      </Container>
    </>
  );
}
