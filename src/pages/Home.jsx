import { useEffect, useRef, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Accordion, AccordionDetails, AccordionSummary, Box, Button, Container, Slider, Stack, Typography } from '@mui/material';
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import VisibilityRounded from '@mui/icons-material/VisibilityRounded';
import LockRounded from '@mui/icons-material/LockRounded';
import ReceiptLongRounded from '@mui/icons-material/ReceiptLongRounded';
import PhoneIphoneRounded from '@mui/icons-material/PhoneIphoneRounded';
import { SectionHeading } from '../components/ui';
import { RATE, naira } from '../config';
import { brand } from '../theme';

const MAX_KM = 40;

// The hero's one memorable moment: a live fare ticket. Drag the courier along the route.
function FareTicket() {
  const path = useRef(null);
  const [km, setKm] = useState(2);
  const [len, setLen] = useState(0);
  const [pt, setPt] = useState({ x: 50, y: 190 });

  useEffect(() => {
    setLen(path.current.getTotalLength());
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return setKm(14);
    let start, id;
    const step = (t) => {
      start ??= t;
      const p = Math.min((t - start) / 1700, 1);
      setKm(Math.round(2 + 12 * (1 - Math.pow(1 - p, 3))));
      if (p < 1) id = requestAnimationFrame(step);
    };
    id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }, []);
  useEffect(() => { if (len) setPt(path.current.getPointAtLength((len * km) / MAX_KM)); }, [km, len]);

  return (
    <Box sx={{ position: 'relative', bgcolor: '#fff', color: 'text.primary', borderRadius: 7, boxShadow: '0 40px 80px -20px rgba(0,0,0,.45)', transform: { md: 'rotate(1.5deg)' }, overflow: 'hidden' }}>
      <Box sx={{ p: { xs: 2.5, sm: 3.5 }, pb: 1 }}>
        <Typography fontWeight={700} color="text.secondary">Try the fare calculator</Typography>
        <Box component="svg" viewBox="0 0 440 250" sx={{ width: '100%', display: 'block', mt: 1 }} role="img" aria-label="Route from pickup to drop-off">
          <path ref={path} d="M50 190 C 130 190, 140 60, 230 100 S 330 200, 390 70" fill="none" stroke="#C9D5EA" strokeWidth="6" strokeLinecap="round" strokeDasharray="2 12" />
          {len > 0 && <path d="M50 190 C 130 190, 140 60, 230 100 S 330 200, 390 70" fill="none" stroke={brand.orange} strokeWidth="7" strokeLinecap="round" strokeDasharray={`${(len * km) / MAX_KM} ${len}`} />}
          <circle cx="50" cy="190" r="12" fill={brand.blue} stroke="#fff" strokeWidth="4" />
          <circle cx="390" cy="70" r="12" fill={brand.ink} stroke="#fff" strokeWidth="4" />
          <text x="50" y="224" textAnchor="middle" fontSize="13" fontWeight="700" fill={brand.ink}>Pickup</text>
          <text x="390" y="46" textAnchor="middle" fontSize="13" fontWeight="700" fill={brand.ink}>Drop-off</text>
          <g transform={`translate(${pt.x} ${pt.y})`}>
            <circle r="18" fill={brand.orange} opacity=".25" />
            <circle r="11" fill={brand.orange} stroke="#fff" strokeWidth="3" />
          </g>
        </Box>
        <Slider value={km} min={1} max={MAX_KM} onChange={(_, v) => setKm(v)} aria-label="Distance in kilometres" color="secondary" sx={{ mt: 1 }} />
      </Box>
      <Box sx={{ position: 'relative', borderTop: '2px dashed #C9D5EA', mt: 1 }}>
        {[-1, 1].map((s) => <Box key={s} sx={{ position: 'absolute', top: -14, [s < 0 ? 'left' : 'right']: -14, width: 28, height: 28, borderRadius: '50%', bgcolor: brand.deep }} />)}
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ p: { xs: 2.5, sm: 3.5 } }}>
          <Box>
            <Typography color="text.secondary" fontWeight={600}>{km} km × {naira(RATE)}</Typography>
            <Typography variant="h2" aria-live="polite" sx={{ fontSize: { xs: '2.6rem', sm: '3.4rem' }, color: brand.blue }}>{naira(km * RATE)}</Typography>
          </Box>
          <Button component={RouterLink} to="/book" variant="contained" color="secondary" size="large" endIcon={<ArrowForwardRounded />}>Book it</Button>
        </Stack>
      </Box>
    </Box>
  );
}

function Hero() {
  return (
    <Box sx={{ position: 'relative', overflow: 'hidden', color: '#fff', background: `radial-gradient(900px 500px at 85% 10%, rgba(249,107,15,.35), transparent 60%), linear-gradient(160deg, ${brand.blue} 0%, ${brand.deep} 70%)`, pt: { xs: 7, md: 12 }, pb: { xs: 9, md: 14 } }}>
      {[['8%', 220, 0.14], ['14%', 140, 0.1], ['20%', 300, 0.08]].map(([top, w, o], i) => (
        <Box key={i} sx={{ position: 'absolute', left: -40, top, width: w, height: 14, borderRadius: 99, bgcolor: '#fff', opacity: o, display: { xs: 'none', md: 'block' } }} />
      ))}
      <Container maxWidth="lg" sx={{ position: 'relative', display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.1fr .9fr' }, gap: { xs: 6, md: 8 }, alignItems: 'center' }}>
        <Box>
          <Typography variant="h1" sx={{ fontSize: { xs: '2.9rem', sm: '4rem', lg: '5rem' } }}>Book it. See the fare. We deliver.</Typography>
          <Typography sx={{ mt: 3, fontSize: { xs: '1.1rem', md: '1.3rem' }, maxWidth: 520, color: 'rgba(255,255,255,.85)' }}>
            Enter a pickup and a drop-off and know exactly what you will pay before you pay it. It is {naira(RATE)} for every kilometre, nothing hidden.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 4 }}>
            <Button component={RouterLink} to="/book" variant="contained" color="secondary" size="large" endIcon={<ArrowForwardRounded />}>Book a delivery</Button>
            <Button href="#pricing" size="large" variant="outlined" sx={{ color: '#fff', borderColor: 'rgba(255,255,255,.5)', '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,.08)' } }}>See how pricing works</Button>
          </Stack>
          <Stack direction="row" flexWrap="wrap" gap={{ xs: 1.5, sm: 3 }} sx={{ mt: 5 }}>
            {['Safe', 'Dependable', 'Reliable'].map((t) => (
              <Stack key={t} direction="row" spacing={0.75} alignItems="center"><CheckCircleRounded sx={{ color: brand.orange }} /><Typography fontWeight={700}>{t}</Typography></Stack>
            ))}
          </Stack>
        </Box>
        <FareTicket />
      </Container>
    </Box>
  );
}

function Pricing() {
  return (
    <Box id="pricing" sx={{ py: { xs: 8, md: 12 }, scrollMarginTop: 70 }}>
      <Container maxWidth="lg">
        <SectionHeading title={`${naira(RATE)} a kilometre. That is the whole price.`}>We measure the route from pickup to drop-off and multiply by the rate. You see the number before you pay.</SectionHeading>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, bgcolor: '#fff', borderRadius: 6, border: '1px solid #DCE4F2', overflow: 'hidden' }}>
          {[[10, 500], [18, 900], [25, 1250]].map(([k, f], i) => (
            <Box key={k} sx={{ p: 4, borderLeft: { md: i ? '1px solid #DCE4F2' : 0 }, borderTop: { xs: i ? '1px solid #DCE4F2' : 0, md: 0 } }}>
              <Typography color="text.secondary" fontWeight={600}>{k} km trip</Typography>
              <Typography variant="h2" sx={{ fontSize: '3.2rem', color: i === 1 ? brand.orange : brand.blue }}>{naira(f)}</Typography>
              <Typography color="text.secondary">{k} × {naira(RATE)}</Typography>
            </Box>
          ))}
        </Box>
      </Container>
    </Box>
  );
}

const steps = [
  ['Enter your locations', 'Type where we pick up and where it goes.'],
  ['See your fare', 'Distance and price appear straight away.'],
  ['Pay online', 'Add your details and pay securely in the same flow.'],
  ['Get your reference', 'A booking reference confirms your delivery.'],
];

function HowItWorks() {
  return (
    <Box sx={{ bgcolor: brand.deep, color: '#fff', py: { xs: 8, md: 12 } }}>
      <Container maxWidth="lg">
        <SectionHeading light title="Four steps, one screen at a time">No account to create and no forms you do not need.</SectionHeading>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: { xs: 4, md: 3 }, position: 'relative' }}>
          {steps.map(([t, d], i) => (
            <Box key={t} sx={{ display: 'flex', flexDirection: { xs: 'row', md: 'column' }, gap: 2 }}>
              <Box sx={{ width: 52, height: 52, flexShrink: 0, borderRadius: '50%', bgcolor: brand.orange, color: brand.ink, display: 'grid', placeItems: 'center', fontFamily: '"Bricolage Grotesque"', fontWeight: 800, fontSize: '1.4rem' }}>{i + 1}</Box>
              <Box><Typography variant="h5" sx={{ mb: 0.5 }}>{t}</Typography><Typography sx={{ color: 'rgba(255,255,255,.75)' }}>{d}</Typography></Box>
            </Box>
          ))}
        </Box>
      </Container>
    </Box>
  );
}

const highlights = [
  [VisibilityRounded, 'Fare before you pay', 'Distance and total are on screen before payment.'],
  [LockRounded, 'Secure online payment', 'Pay inside the booking. Your booking is only marked paid once the payment is verified.'],
  [ReceiptLongRounded, 'Clear confirmation', 'Every paid booking gets a reference with the route, distance and fare.'],
  [PhoneIphoneRounded, 'Made for your phone', 'Book from your phone, tablet or computer.'],
];

const faqs = [
  ['How is my fare calculated?', `We measure the route distance between pickup and drop-off and multiply it by ${naira(RATE)} per kilometre. A 10 km trip costs ${naira(500)}.`],
  ['When do I pay?', 'You pay online while booking, after you have seen your distance and fare.'],
  ['What do I get after paying?', 'A booking reference and a summary of your route, distance, fare and payment status.'],
  ['Can I book from my phone?', 'Yes. The whole booking works on phones, tablets and computers.'],
];

function Highlights() {
  return (
    <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 }, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1.2fr' }, gap: { xs: 5, md: 10 } }}>
      <Box>
        <SectionHeading title="Delivery that keeps its promises">Built around one job: getting your package from A to B with no surprises.</SectionHeading>
        <Box component="img" src="/logo-moto.jpg" alt="ODTC Logistics: safe, dependable, reliable" sx={{ width: '100%', maxWidth: 380, borderRadius: 5, display: { xs: 'none', md: 'block' } }} />
      </Box>
      <Stack spacing={4}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 4 }}>
          {highlights.map(([Icon, t, d]) => (
            <Box key={t}>
              <Box sx={{ width: 48, height: 48, borderRadius: 3, bgcolor: 'rgba(249,107,15,.14)', color: brand.orange, display: 'grid', placeItems: 'center', mb: 1.5 }}><Icon /></Box>
              <Typography variant="h5" sx={{ fontSize: '1.15rem' }}>{t}</Typography>
              <Typography color="text.secondary" sx={{ mt: 0.5 }}>{d}</Typography>
            </Box>
          ))}
        </Box>
        <Box>
          <Typography variant="h5" sx={{ mb: 1.5 }}>Quick answers</Typography>
          {faqs.map(([q, a]) => (
            <Accordion key={q} disableGutters elevation={0} sx={{ bgcolor: 'transparent', borderBottom: '1px solid #DCE4F2', '&:before': { display: 'none' } }}>
              <AccordionSummary expandIcon={<ExpandMoreRounded />}><Typography fontWeight={700}>{q}</Typography></AccordionSummary>
              <AccordionDetails><Typography color="text.secondary">{a}</Typography></AccordionDetails>
            </Accordion>
          ))}
        </Box>
      </Stack>
    </Container>
  );
}

function CtaBand() {
  return (
    <Container maxWidth="lg" sx={{ pb: { xs: 8, md: 12 } }}>
      <Box sx={{ bgcolor: brand.orange, borderRadius: 7, p: { xs: 4, md: 7 }, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { md: 'center' }, justifyContent: 'space-between', gap: 3 }}>
        <Box>
          <Typography variant="h2" sx={{ fontSize: { xs: '2rem', md: '3rem' }, color: brand.ink }}>Ready when you are.</Typography>
          <Typography sx={{ mt: 1, fontSize: '1.15rem', color: brand.ink }}>Your fare takes less than a minute to find out.</Typography>
        </Box>
        <Button component={RouterLink} to="/book" size="large" variant="contained" sx={{ bgcolor: brand.ink, color: '#fff', '&:hover': { bgcolor: brand.deep }, alignSelf: { xs: 'stretch', md: 'auto' } }} endIcon={<ArrowForwardRounded />}>Book a delivery</Button>
      </Box>
    </Container>
  );
}

export default function Home() {
  return (<><Hero /><Pricing /><HowItWorks /><Highlights /><CtaBand /></>);
}
