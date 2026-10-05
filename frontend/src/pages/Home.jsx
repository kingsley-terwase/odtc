import { useEffect, useRef, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { keyframes } from '@emotion/react';
import { Accordion, AccordionDetails, AccordionSummary, Box, Button, Container, Slider, Stack, Typography } from '@mui/material';
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import VisibilityRounded from '@mui/icons-material/VisibilityRounded';
import LockRounded from '@mui/icons-material/LockRounded';
import ReceiptLongRounded from '@mui/icons-material/ReceiptLongRounded';
import PhoneIphoneRounded from '@mui/icons-material/PhoneIphoneRounded';
import LocalShippingRounded from '@mui/icons-material/LocalShippingRounded';
import TwoWheelerRounded from '@mui/icons-material/TwoWheelerRounded';
import SellRounded from '@mui/icons-material/SellRounded';
import Locate from '/locate.png';
import Calculate from '/calculate.png';
import Payment from '/payment.png';
import Confirm from '/confirm.png'
import { SectionHeading } from '../components/ui';
import { RATE, naira } from '../config';
import { brand } from '../theme';

const MAX_KM = 40;
const EASE = 'cubic-bezier(.2,.7,.2,1)';

/* ============ Animation toolkit ============ */
const slideUp = keyframes`from{transform:translateY(110%)}to{transform:translateY(0)}`;
const rise = keyframes`from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:none}`;
const enterRight = keyframes`from{opacity:0;transform:translateX(70px) scale(.95)}to{opacity:1;transform:none}`;
const streak = keyframes`from{opacity:0;transform:translateX(-100%)}to{opacity:1;transform:none}`;
const bob = keyframes`0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}`;
const drift = keyframes`0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(50px,-36px) scale(1.15)}`;
const flow = keyframes`to{stroke-dashoffset:-40}`;
const scroll = keyframes`from{transform:translateX(0)}to{transform:translateX(-50%)}`;
const pulse = keyframes`0%{box-shadow:0 0 0 0 rgba(249,107,15,.6)}70%{box-shadow:0 0 0 20px rgba(249,107,15,0)}100%{box-shadow:0 0 0 0 rgba(249,107,15,0)}`;
const shine = keyframes`0%{transform:translateX(-130%) skewX(-20deg)}55%,100%{transform:translateX(420%) skewX(-20deg)}`;
const pop = keyframes`0%{opacity:0;transform:scale(.4)}60%{opacity:1;transform:scale(1.14)}100%{opacity:1;transform:scale(1)}`;
const spin = keyframes`to{transform:rotate(360deg)}`;
const ping = keyframes`0%{opacity:.6;transform:scale(.5)}100%{opacity:0;transform:scale(1.7)}`;
const ride = keyframes`0%{left:-80px}100%{left:calc(100% + 80px)}`;
const travel = keyframes`0%{left:0;opacity:0}10%{opacity:1}90%{opacity:1}100%{left:100%;opacity:0}`;

const calm = { '@media (prefers-reduced-motion: reduce)': { animation: 'none !important', transition: 'none !important' } };
// Keyframes are only ever interpolated into strings. Never pass the keyframes object itself to sx.
const anim = (kf, dur, delay = 0) => ({ animation: `${kf} ${dur}s ${EASE} ${delay}s both`, ...calm });
const loop = (kf, dur, delay = 0) => ({ animation: `${kf} ${dur}s ease-in-out ${delay}s infinite`, ...calm });
const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function useInView(margin = '0px 0px -12% 0px') {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (reduced() || !('IntersectionObserver' in window)) {
      setSeen(true);
      return undefined;
    }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setSeen(true);
        io.disconnect();
      }
    }, { rootMargin: margin, threshold: 0.12 });
    io.observe(el);
    return () => io.disconnect();
  }, [margin]);
  return [ref, seen];
}

function Reveal({ children, delay = 0, y = 40, x = 0, sx }) {
  const [ref, seen] = useInView();
  return (
    <Box ref={ref} sx={{ opacity: seen ? 1 : 0, transform: seen ? 'none' : `translate(${x}px, ${y}px)`, transition: `opacity .9s ${EASE} ${delay}s, transform .9s ${EASE} ${delay}s`, ...calm, ...sx }}>
      {children}
    </Box>
  );
}

function CountUp({ to, active, dur = 1500 }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!active) return undefined;
    if (reduced()) {
      setN(to);
      return undefined;
    }
    let start;
    let id;
    const step = (t) => {
      if (start === undefined) start = t;
      const p = Math.min((t - start) / dur, 1);
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) id = requestAnimationFrame(step);
    };
    id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }, [active, to, dur]);
  return <>{naira(n)}</>;
}

function ScrollBar() {
  const ref = useRef(null);
  useEffect(() => {
    const on = () => {
      const h = document.documentElement;
      const p = h.scrollTop / (h.scrollHeight - h.clientHeight || 1);
      if (ref.current) ref.current.style.transform = `scaleX(${p})`;
    };
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  return <Box ref={ref} aria-hidden sx={{ position: 'fixed', top: 0, left: 0, right: 0, height: 3, zIndex: 2000, bgcolor: brand.orange, transformOrigin: '0 50%', transform: 'scaleX(0)' }} />;
}

/* ============ Hero ============ */
function FareTicket() {
  const path = useRef(null);
  const [km, setKm] = useState(2);
  const [len, setLen] = useState(0);
  const [pt, setPt] = useState({ x: 50, y: 190 });

  useEffect(() => {
    setLen(path.current.getTotalLength());
    if (reduced()) {
      setKm(14);
      return undefined;
    }
    let start;
    let id;
    const step = (t) => {
      if (start === undefined) start = t;
      const p = Math.min((t - start) / 1700, 1);
      setKm(Math.round(2 + 12 * (1 - Math.pow(1 - p, 3))));
      if (p < 1) id = requestAnimationFrame(step);
    };
    id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (len) setPt(path.current.getPointAtLength((len * km) / MAX_KM));
  }, [km, len]);

  const D = 'M50 190 C 130 190, 140 60, 230 100 S 330 200, 390 70';
  return (
    <Box sx={{ position: 'relative', bgcolor: '#fff', color: 'text.primary', borderRadius: 1, border: '4px solid #70a3fa', boxShadow: '0 40px 80px -20px rgba(0,0,0,.5)', overflow: 'hidden' }}>
      <Box sx={{ p: { xs: 2.5, sm: 3.5 }, pb: 1 }}>
        <Typography sx={{ fontWeight: 700, color: 'text.secondary' }}>Try the fare calculator</Typography>
        <Box component="svg" viewBox="0 0 440 250" sx={{ width: '100%', display: 'block', mt: 1 }} role="img" aria-label="Route from pickup to drop-off">
          <path ref={path} d={D} fill="none" stroke="#C9D5EA" strokeWidth="6" strokeLinecap="round" strokeDasharray="2 12" />
          {len > 0 && <path d={D} fill="none" stroke={brand.orange} strokeWidth="7" strokeLinecap="round" strokeDasharray={`${(len * km) / MAX_KM} ${len}`} />}
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
            <Typography sx={{ color: 'text.secondary', fontWeight: 600 }}>{km} km × {naira(RATE)}</Typography>
            <Typography variant="h2" aria-live="polite" sx={{ fontSize: { xs: '2.6rem', sm: '3.4rem' }, color: brand.blue }}>{naira(km * RATE)}</Typography>
          </Box>
          <Button component={RouterLink} to="/book" variant="contained" color="secondary" size="large" endIcon={<ArrowForwardRounded />}>Book it</Button>
        </Stack>
      </Box>
    </Box>
  );
}

function RouteBackdrop() {
  const roads = [
    ['r1', 'M-20 520 C 200 420, 320 600, 560 480 S 900 300, 1220 380'],
    ['r2', 'M-20 200 C 220 260, 380 120, 640 220 S 980 520, 1220 560'],
    ['r3', 'M300 -20 C 340 200, 260 420, 420 720'],
    ['r4', 'M860 -20 C 800 180, 980 330, 900 720'],
  ];
  const couriers = [['r1', 11, 0], ['r2', 14, -5], ['r4', 12, -3], ['r1', 11, -5.5]];
  return (
    <Box aria-hidden sx={{ position: 'absolute', inset: 0, '& .flow': { animation: `${flow} 1.4s linear infinite` }, '@media (prefers-reduced-motion: reduce)': { '& .flow': { animation: 'none' } } }}>
      <Box component="svg" viewBox="0 0 1200 700" preserveAspectRatio="xMidYMid slice" sx={{ width: '100%', height: '100%', display: 'block' }}>
        {roads.map(([id, d]) => <path key={id} id={id} d={d} fill="none" stroke="rgba(255,255,255,.09)" strokeWidth="2" />)}
        <path className="flow" d={roads[0][1]} fill="none" stroke={brand.orange} strokeOpacity=".55" strokeWidth="3" strokeLinecap="round" strokeDasharray="6 14" />
        <path className="flow" d={roads[1][1]} fill="none" stroke="#fff" strokeOpacity=".25" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 16" />
        {[[40, 500], [1150, 395]].map(([x, y], i) => (
          <g key={i} transform={`translate(${x} ${y})`}>
            <circle r="6" fill={brand.orange}>
              <animate attributeName="r" values="6;26" dur="2.6s" repeatCount="indefinite" begin={`${i * 1.2}s`} />
              <animate attributeName="opacity" values=".55;0" dur="2.6s" repeatCount="indefinite" begin={`${i * 1.2}s`} />
            </circle>
            <circle r="6" fill="#fff" stroke={brand.orange} strokeWidth="3" />
          </g>
        ))}
        {couriers.map(([road, dur, begin], i) => (
          <g key={i}>
            <circle r="16" fill={brand.orange} opacity=".25" />
            <circle r="7" fill={brand.orange} stroke="#fff" strokeWidth="2.5" />
            <animateMotion dur={`${dur}s`} begin={`${begin}s`} repeatCount="indefinite" rotate="auto">
              <mpath href={`#${road}`} />
            </animateMotion>
          </g>
        ))}
      </Box>
    </Box>
  );
}

function Tilt({ children }) {
  const ref = useRef(null);
  const move = (e) => {
    const el = ref.current;
    if (!el || e.pointerType === 'touch' || reduced()) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(1100px) rotateY(${x * 12}deg) rotateX(${-y * 9}deg) scale(1.015)`;
  };
  const resetTilt = () => {
    if (ref.current) ref.current.style.transform = 'perspective(1100px) rotateY(0deg) rotateX(0deg) scale(1)';
  };
  return (
    <Box ref={ref} onPointerMove={move} onPointerLeave={resetTilt} sx={{ transition: 'transform .3s ease-out', willChange: 'transform' }}>
      {children}
    </Box>
  );
}

function FloatChip({ icon: Icon, text, sx, delay = 0 }) {
  return (
    <Box sx={{ position: 'absolute', zIndex: 2, display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 1, px: 2, py: 1, borderRadius: 99, color: '#fff', fontWeight: 700, fontSize: '.9rem', whiteSpace: 'nowrap', bgcolor: 'rgba(11,27,58,.72)', border: '1px solid rgba(255,255,255,.2)', backdropFilter: 'blur(14px)', boxShadow: '0 16px 40px -12px rgba(0,0,0,.5)', ...loop(bob, 5 + delay, delay), ...sx }}>
      <Icon sx={{ color: brand.orange, fontSize: 20 }} />{text}
    </Box>
  );
}

function Line({ children, delay, color }) {
  return (
    <Box component="span" sx={{ display: 'block', overflow: 'hidden', pb: '.1em', mb: '-.1em' }}>
      <Box component="span" sx={{ display: 'block', color, ...anim(slideUp, 0.95, delay) }}>{children}</Box>
    </Box>
  );
}

function Marquee() {
  const words = ['Safe', 'Dependable', 'Reliable', `${naira(RATE)} per kilometre`, 'Pay online', 'Instant booking reference'];
  const items = [...words, ...words, ...words, ...words];
  return (
    <Box aria-hidden sx={{ position: 'relative', mt: { xs: 8, md: 12 }, bgcolor: brand.orange, py: { xs: 1.5, md: 2 }, overflow: 'hidden', width: '104%', ml: '-2%', boxShadow: '0 -20px 60px rgba(0,0,0,.25)' }}>
      <Box sx={{ display: 'flex', width: 'max-content', animation: `${scroll} 34s linear infinite`, ...calm }}>
        {items.map((w, i) => {
          const Sep = i % 2 ? TwoWheelerRounded : LocalShippingRounded;
          return (
            <Stack key={i} direction="row" alignItems="center" spacing={3} sx={{ pr: 3, flexShrink: 0 }}>
              <Typography sx={{ fontFamily: '"Bricolage Grotesque"', fontWeight: 800, fontSize: { xs: '1.1rem', md: '1.4rem' }, color: brand.ink, whiteSpace: 'nowrap' }}>{w}</Typography>
              <Sep sx={{ color: brand.ink, opacity: 0.55 }} />
            </Stack>
          );
        })}
      </Box>
    </Box>
  );
}

function Hero() {
  const facts = [[SellRounded, `${naira(RATE)} per km`, 'One flat rate'], [LockRounded, 'Secure payment', 'Pay online'], [ReceiptLongRounded, 'Instant reference', 'After you pay']];
  const goPricing = (e) => {
    e.preventDefault();
    document.getElementById('pricing')?.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth' });
  };
  return (
    <Box sx={{ position: 'relative', overflow: 'hidden', color: '#fff', pt: { xs: 7, md: 12 }, background: '#000' }}>
      <Box aria-hidden sx={{ position: 'absolute', width: 520, height: 520, right: '-8%', top: '-12%', borderRadius: '50%', bgcolor: brand.orange, opacity: 0.38, filter: 'blur(110px)', ...loop(drift, 16) }} />
      <Box aria-hidden sx={{ position: 'absolute', width: 460, height: 460, left: '-10%', bottom: '8%', borderRadius: '50%', bgcolor: '#2D7BFF', opacity: 0.35, filter: 'blur(110px)', ...loop(drift, 20, -6) }} />
      <Box aria-hidden sx={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,.16) 1px, transparent 1px)', backgroundSize: '28px 28px', maskImage: 'radial-gradient(ellipse at 60% 40%, #000 20%, transparent 75%)', WebkitMaskImage: 'radial-gradient(ellipse at 60% 40%, #000 20%, transparent 75%)' }} />
      <RouteBackdrop />
      {[['9%', 260, 0], ['15%', 160, 0.2], ['21%', 340, 0.4]].map(([top, w, d], i) => (
        <Box key={i} aria-hidden sx={{ position: 'absolute', left: 0, top, width: w, height: 12, borderRadius: '0 99px 99px 0', display: { xs: 'none', md: 'block' }, background: 'linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,.25))', ...anim(streak, 1.2, 0.3 + d) }} />
      ))}

      <Container maxWidth="lg" sx={{ position: 'relative', display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.08fr .92fr' }, gap: { xs: 7, md: 8 }, alignItems: 'center' }}>
        <Box>
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, px: 2, py: 0.75, mb: 3, borderRadius: 99, bgcolor: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.2)', backdropFilter: 'blur(10px)', ...anim(rise, 0.9, 0.05) }}>
            <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: brand.orange, animation: `${pulse} 2s infinite`, ...calm }} />
            <Typography sx={{ fontWeight: 700, fontSize: '.92rem' }}>Fast & reliable delivery, booked online</Typography>
          </Box>

          <Typography variant="h1" sx={{ fontSize: { xs: '3rem', sm: '4.3rem', lg: '5.5rem' } }}>
            <Line delay={0.15}>Book it.</Line>
            <Line delay={0.3}>See the fare.</Line>
            <Line delay={0.45} color={brand.orange}>We deliver.</Line>
          </Typography>

          <Typography sx={{ mt: 3.5, fontSize: { xs: '1.1rem', md: '1.3rem' }, maxWidth: 540, color: 'rgba(255,255,255,.86)', ...anim(rise, 0.9, 0.75) }}>
            Enter a pickup and a drop-off and know exactly what you will pay before you pay it. {naira(RATE)} for every kilometre, nothing hidden.
          </Typography>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 4.5, ...anim(rise, 0.9, 0.9) }}>
            <Button component={RouterLink} to="/book" variant="contained" color="secondary" size="large" endIcon={<ArrowForwardRounded />}
              sx={{ position: 'relative', overflow: 'hidden', px: 4.5, py: 1.6, fontSize: '1.1rem', animation: `${pulse} 2.4s infinite`, transition: 'transform .2s', '&:hover': { transform: 'translateY(-2px)' }, '&::after': { content: '""', position: 'absolute', top: 0, left: 0, width: '30%', height: '100%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.55), transparent)', animation: `${shine} 3.6s ease-in-out infinite` }, ...calm }}>
              Book a delivery
            </Button>
            <Button href="#pricing" onClick={goPricing} size="large" variant="outlined" sx={{ color: '#fff', borderColor: 'rgba(255,255,255,.45)', backdropFilter: 'blur(8px)', '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,.1)' } }}>See how pricing works</Button>
          </Stack>

          <Box sx={{ mt: 6, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, auto)' }, justifyContent: { sm: 'start' }, gap: 1.5, ...anim(rise, 0.9, 1.05) }}>
            {facts.map(([Icon, t, s]) => (
              <Stack key={t} direction="row" spacing={1.5} alignItems="center" sx={{ px: 2, py: 1.25, borderRadius: 1, bgcolor: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.16)', backdropFilter: 'blur(12px)' }}>
                <Box sx={{ width: 38, height: 38, borderRadius: 2.5, bgcolor: 'rgba(249,107,15,.2)', color: brand.orange, display: 'grid', placeItems: 'center' }}><Icon fontSize="small" /></Box>
                <Box><Typography sx={{ fontWeight: 700, lineHeight: 1.2 }}>{t}</Typography><Typography variant="caption" sx={{ color: 'rgba(255,255,255,.7)' }}>{s}</Typography></Box>
              </Stack>
            ))}
          </Box>
        </Box>

        <Box sx={{ position: 'relative', ...anim(enterRight, 1.1, 0.5) }}>
          <FloatChip icon={VisibilityRounded} text="Fare shown before you pay" sx={{ top: -22, left: -26 }} />
          <FloatChip icon={ReceiptLongRounded} text="Booking reference issued" sx={{ top: '46%', right: -30 }} delay={1.2} />
          <FloatChip icon={LockRounded} text="Verified online payment" sx={{ bottom: -20, left: 24 }} delay={2.1} />
          <Tilt><FareTicket /></Tilt>
        </Box>
      </Container>

      <Marquee />
    </Box>
  );
}

/* ============ Pricing ============ */
function PriceCard({ km, fare, i, dark }) {
  const [ref, seen] = useInView();
  const d = i * 0.15;
  return (
    <Box ref={ref} sx={{
      position: 'relative', overflow: 'hidden', p: { xs: 3, md: 4 }, borderRadius: 1,
      bgcolor: dark ? brand.deep : '#fff', color: dark ? '#fff' : 'text.primary',
      border: '1px solid', borderColor: dark ? 'transparent' : '#DCE4F2',
      boxShadow: dark ? '0 30px 60px -20px rgba(0,41,122,.55)' : '0 10px 30px -18px rgba(11,27,58,.25)',
      opacity: seen ? 1 : 0, transform: seen ? 'none' : 'translateY(60px) scale(.96)',
      transition: `opacity .8s ${EASE} ${d}s, transform .8s ${EASE} ${d}s, translate .35s ${EASE}, box-shadow .35s`,
      '&:hover': { translate: '0 -10px', boxShadow: dark ? '0 40px 70px -18px rgba(0,41,122,.7)' : '0 30px 60px -20px rgba(0,71,171,.35)', '& .glow': { opacity: 1 } },
      ...calm,
    }}>
      <Box className="glow" aria-hidden sx={{ position: 'absolute', width: 220, height: 220, right: -80, top: -80, borderRadius: '50%', bgcolor: brand.orange, opacity: dark ? 0.35 : 0, filter: 'blur(60px)', transition: 'opacity .4s' }} />
      <Typography sx={{ position: 'relative', fontWeight: 700, color: dark ? 'rgba(255,255,255,.75)' : 'text.secondary' }}>{km} km trip</Typography>
      <Typography variant="h2" sx={{ position: 'relative', fontSize: { xs: '3rem', md: '3.4rem' }, color: dark ? brand.orange : brand.blue, my: 0.5 }}><CountUp to={fare} active={seen} /></Typography>
      <Typography sx={{ position: 'relative', color: dark ? 'rgba(255,255,255,.75)' : 'text.secondary', mb: 3 }}>{km} × {naira(RATE)}</Typography>
      <Box sx={{ position: 'relative', height: 8, borderRadius: 99, bgcolor: dark ? 'rgba(255,255,255,.15)' : '#E6ECF7' }}>
        <Box sx={{ height: '100%', borderRadius: 99, bgcolor: brand.orange, width: seen ? `${(km / 25) * 100}%` : '0%', transition: `width 1.4s ${EASE} ${d + 0.3}s`, ...calm }} />
        <Box sx={{ position: 'absolute', top: '50%', left: seen ? `${(km / 25) * 100}%` : '0%', width: 22, height: 22, mt: '-11px', ml: '-11px', borderRadius: '50%', bgcolor: '#fff', border: `4px solid ${brand.orange}`, transition: `left 1.4s ${EASE} ${d + 0.3}s`, ...calm }} />
      </Box>
    </Box>
  );
}

function Pricing() {
  return (
    <Box id="pricing" sx={{ position: 'relative', overflow: 'hidden', pt: { xs: 12, md: 16 }, pb: { xs: 8, md: 12 }, scrollMarginTop: 70 }}>
      <Box aria-hidden sx={{ position: 'absolute', width: 480, height: 480, left: '-10%', top: '10%', borderRadius: '50%', bgcolor: brand.blue, opacity: 0.08, filter: 'blur(90px)', ...loop(drift, 18) }} />
      <Container maxWidth="lg" sx={{ position: 'relative' }}>
        <Reveal><SectionHeading title={`${naira(RATE)} a kilometre. That is the whole price.`}>We measure the route from pickup to drop-off and multiply by the rate. You see the number before you pay.</SectionHeading></Reveal>
        <Reveal delay={0.1} sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1.5, mb: 4 }}>
          {[['Distance', brand.blue], ['×', null], [naira(RATE), brand.orange], ['=', null], ['Your fare', brand.ink]].map(([t, c], i) => (
            c ? <Box key={i} sx={{ px: 2.5, py: 1, borderRadius: 99, bgcolor: c, color: c === brand.orange ? brand.ink : '#fff', fontWeight: 800, fontFamily: '"Bricolage Grotesque"', fontSize: '1.1rem' }}>{t}</Box>
              : <Typography key={i} sx={{ fontWeight: 800, fontSize: '1.4rem', color: 'text.secondary' }}>{t}</Typography>
          ))}
        </Reveal>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: { xs: 2.5, md: 3 } }}>
          {[[10, 500], [18, 900], [25, 1250]].map(([k, f], i) => <PriceCard key={k} km={k} fare={f} i={i} dark={i === 1} />)}
        </Box>
      </Container>
    </Box>
  );
}

/* ============ How it works ============ */
const steps = [
  [Locate, 'Enter your locations', 'Type where we pick up and where it goes.'],
  [Calculate, 'See your fare', 'Distance and price appear straight away.'],
  [Payment, 'Pay online', 'Add your details and pay securely in the same flow.'],
  [Confirm, 'Get your reference', 'A booking reference confirms your delivery.'],
];

function HowItWorks() {
  const [ref, seen] = useInView();
  return (
    <Box sx={{ position: 'relative', overflow: 'hidden', bgcolor: brand.deep, color: '#fff', py: { xs: 9, md: 13 } }}>
      <Box aria-hidden sx={{ position: 'absolute', width: 500, height: 500, right: '-10%', bottom: '-20%', borderRadius: '50%', bgcolor: brand.orange, opacity: 0.22, filter: 'blur(110px)', ...loop(drift, 18) }} />
      <Box aria-hidden sx={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,.12) 1px, transparent 1px)', backgroundSize: '28px 28px', maskImage: 'linear-gradient(180deg, transparent, #000 30%, transparent)', WebkitMaskImage: 'linear-gradient(180deg, transparent, #000 30%, transparent)' }} />
      <Container maxWidth="lg" sx={{ position: 'relative' }}>
        <Reveal><SectionHeading light title="Four steps, one screen at a time">No account to create and no forms you do not need.</SectionHeading></Reveal>
        <Box ref={ref} sx={{ position: 'relative', display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: { xs: 4, md: 3 } }}>
          <Box aria-hidden sx={{ display: { xs: 'none', md: 'block' }, position: 'absolute', top: 34, left: '12.5%', right: '12.5%', height: 3, borderRadius: 99, bgcolor: 'rgba(255,255,255,.14)' }}>
            <Box sx={{ height: '100%', borderRadius: 99, bgcolor: brand.orange, transformOrigin: 'left', transform: seen ? 'scaleX(1)' : 'scaleX(0)', transition: `transform 2.2s ${EASE} .3s`, ...calm }} />
            {seen && <Box sx={{ position: 'absolute', top: -5, width: 13, height: 13, borderRadius: '50%', bgcolor: '#fff', boxShadow: `0 0 16px 4px ${brand.orange}`, animation: `${travel} 3.4s ease-in-out 2.4s infinite`, ...calm }} />}
          </Box>
          {steps.map(([Icon, t, d], i) => (
            <Box key={t} sx={{ position: 'relative', display: 'flex', flexDirection: { xs: 'row', md: 'column' }, alignItems: { xs: 'flex-start', md: 'center' }, textAlign: { md: 'center' }, gap: 2.5, '&:hover .badge': { transform: 'translateY(-6px) rotate(-6deg)', boxShadow: `0 18px 36px -10px ${brand.orange}` } }}>
              <Box className="badge" sx={{ position: 'relative', width: 68, height: 68, flexShrink: 0, borderRadius: '50%', bgcolor: brand.orange, color: brand.ink, display: 'grid', placeItems: 'center', boxShadow: '0 0 0 8px rgba(249,107,15,.18)', transition: 'transform .3s, box-shadow .3s', ...(seen ? anim(pop, 0.8, 0.3 + i * 0.4) : { opacity: 0 }) }}>
                <Box component={'img'} src={Icon} alt={t} sx={{ maxwidth:'100%', width: '40px'}}/>
                <Box sx={{ position: 'absolute', top: -4, right: -4, width: 24, height: 24, borderRadius: '50%', bgcolor: '#fff', color: brand.deep, fontWeight: 800, fontSize: '.8rem', display: 'grid', placeItems: 'center' }}>{i + 1}</Box>
              </Box>
              <Box sx={{ opacity: seen ? 1 : 0, transform: seen ? 'none' : 'translateY(20px)', transition: `all .8s ${EASE} ${0.5 + i * 0.4}s`, ...calm }}>
                <Typography variant="h5" sx={{ mb: 0.75 }}>{t}</Typography>
                <Typography sx={{ color: 'rgba(255,255,255,.75)', maxWidth: 260, mx: { md: 'auto' } }}>{d}</Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Container>
    </Box>
  );
}

/* ============ Highlights + FAQ ============ */
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
    <Container maxWidth="lg" sx={{ py: { xs: 9, md: 13 }, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1.2fr' }, gap: { xs: 6, md: 10 }, alignItems: 'start' }}>
      <Box>
        <Reveal><SectionHeading title="Delivery that keeps its promises">Built around one job: getting your package from A to B with no surprises.</SectionHeading></Reveal>
        <Reveal delay={0.15} x={-40} sx={{ display: { xs: 'none', md: 'block' } }}>
          <Box sx={{ position: 'relative', maxWidth: 380 }}>
            <Box aria-hidden sx={{ position: 'absolute', inset: -22, borderRadius: '50%', border: `4px dashed ${brand.orange}`, opacity: 0.5, ...{ animation: `${spin} 40s linear infinite`, ...calm } }} />
            <Box sx={{ position: 'relative', borderRadius: 20, overflow: 'hidden', boxShadow: '0 30px 60px -20px rgba(0,41,122,.4)', bgcolor: '#fff', ...loop(bob, 7) }}>
              <Box component="img" src="/logo-moto.jpg" alt="ODTC Logistics: safe, dependable, reliable" sx={{ width: '100%', display: 'block' }} />
            </Box>
          </Box>
        </Reveal>
      </Box>
      <Stack spacing={5}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5 }}>
          {highlights.map(([Icon, t, d], i) => (
            <Reveal key={t} delay={i * 0.12}>
              <Box sx={{ height: '100%', p: 3, borderRadius: 1, bgcolor: '#fff', border: '1px solid #DCE4F2', transition: `translate .35s ${EASE}, box-shadow .35s, border-color .35s`, '&:hover': { translate: '0 -8px', boxShadow: '0 24px 50px -22px rgba(0,71,171,.45)', borderColor: brand.orange, '& .ico': { transform: 'rotate(-10deg) scale(1.12)', bgcolor: brand.orange, color: brand.ink } } }}>
                <Box className="ico" sx={{ width: 52, height: 52, borderRadius: 3, bgcolor: 'rgba(249,107,15,.14)', color: brand.orange, display: 'grid', placeItems: 'center', mb: 2, transition: 'all .35s' }}><Icon /></Box>
                <Typography variant="h5" sx={{ fontSize: '1.15rem' }}>{t}</Typography>
                <Typography sx={{ color: 'text.secondary', mt: 0.75 }}>{d}</Typography>
              </Box>
            </Reveal>
          ))}
        </Box>
        <Reveal>
          <Typography variant="h5" sx={{ mb: 2 }}>Quick answers</Typography>
          <Stack spacing={1.5}>
            {faqs.map(([q, a]) => (
              <Accordion key={q} disableGutters elevation={0} sx={{ bgcolor: '#fff', border: '1px solid #DCE4F2', borderRadius: '16px !important', overflow: 'hidden', transition: 'border-color .25s, box-shadow .25s', '&:before': { display: 'none' }, '&:hover': { borderColor: brand.blue }, '&.Mui-expanded': { borderColor: brand.orange, boxShadow: '0 16px 36px -22px rgba(249,107,15,.6)' } }}>
                <AccordionSummary expandIcon={<ExpandMoreRounded />}><Typography sx={{ fontWeight: 700 }}>{q}</Typography></AccordionSummary>
                <AccordionDetails><Typography sx={{ color: 'text.secondary' }}>{a}</Typography></AccordionDetails>
              </Accordion>
            ))}
          </Stack>
        </Reveal>
      </Stack>
    </Container>
  );
}

/* ============ Closing call to action ============ */
function CtaBand() {
  return (
    <Container maxWidth="lg" sx={{ pb: { xs: 8, md: 12 } }}>
      <Reveal>
        <Box sx={{ position: 'relative', overflow: 'hidden', borderRadius: {xs:1, md:2}, p: { xs: 4, md: 8 }, pb: { xs: 9, md: 11 }, background: `linear-gradient(120deg, ${brand.orange} 0%, #FF8A3D 100%)`, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { md: 'center' }, justifyContent: 'space-between', gap: 3 }}>
          {[260, 420].map((s, i) => (
            <Box key={s} aria-hidden sx={{ position: 'absolute', right: -s / 3, top: -s / 3, width: s, height: s, borderRadius: '50%', border: '2px solid rgba(255,255,255,.55)', ...{ animation: `${ping} 4s ease-out ${i * 2}s infinite`, ...calm } }} />
          ))}
          <Box sx={{ position: 'relative' }}>
            <Typography variant="h2" sx={{ fontSize: { xs: '2.1rem', md: '3.2rem' }, color: brand.ink }}>Ready when you are.</Typography>
            <Typography sx={{ mt: 1, fontSize: '1.15rem', color: brand.ink }}>Your fare takes less than a minute to find out.</Typography>
          </Box>
          <Button component={RouterLink} to="/book" size="large" variant="contained" endIcon={<ArrowForwardRounded />}
            sx={{ position: 'relative', overflow: 'hidden', bgcolor: brand.ink, color: '#fff', px: 4.5, py: 1.6, fontSize: '1.1rem', alignSelf: { xs: 'stretch', md: 'auto' }, transition: 'transform .2s, background-color .2s', '&:hover': { bgcolor: brand.deep, transform: 'translateY(-3px)' }, '&::after': { content: '""', position: 'absolute', top: 0, left: 0, width: '30%', height: '100%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.35), transparent)', animation: `${shine} 3.6s ease-in-out infinite` }, ...calm }}>
            Book a delivery
          </Button>
          <Box aria-hidden sx={{ position: 'absolute', left: 0, right: 0, bottom: 22, height: 0, borderTop: '3px dashed rgba(11,27,58,.35)' }} />
          <Box aria-hidden sx={{ position: 'absolute', bottom: 24, color: brand.ink, display: 'flex', ...{ animation: `${ride} 7s linear infinite`, ...calm } }}>
            <TwoWheelerRounded sx={{ fontSize: 44 }} />
          </Box>
        </Box>
      </Reveal>
    </Container>
  );
}

export default function Home() {
  return (
    <>
      <ScrollBar />
      <Hero />
      <Pricing />
      <HowItWorks />
      <Highlights />
      <CtaBand />
    </>
  );
}