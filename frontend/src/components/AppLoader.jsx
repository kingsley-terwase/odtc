import { useEffect, useState } from 'react';
import { keyframes } from '@emotion/react';
import { Box, Typography } from '@mui/material';
import { Logo } from './ui';
import { brand } from '../theme';

const spin = keyframes`to{transform:rotate(360deg)}`;
const ripple = keyframes`0%{transform:scale(.7);opacity:.55}100%{transform:scale(2.1);opacity:0}`;
const bob = keyframes`0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-6px) scale(1.04)}`;
const letter = keyframes`from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}`;
const drive = keyframes`0%{transform:translateX(-120px)}100%{transform:translateX(calc(100vw + 40px))}`;
const road = keyframes`to{background-position:-48px 0}`;
const shine = keyframes`0%{transform:translateX(-100%)}100%{transform:translateX(260%)}`;
const calm = { '@media (prefers-reduced-motion: reduce)': { animation: 'none !important' } };

function Scooter() {
  return (
    <svg width="96" height="64" viewBox="0 0 96 64" aria-hidden>
      <circle cx="18" cy="52" r="9" fill="#0B1B3A" /><circle cx="18" cy="52" r="4" fill="#CBD7EE" />
      <circle cx="78" cy="52" r="9" fill="#0B1B3A" /><circle cx="78" cy="52" r="4" fill="#CBD7EE" />
      <path d="M18 52 L32 32 H66 L78 52 Z" fill={brand.blue} />
      <path d="M60 32 L66 14 H78" fill="none" stroke="#0B1B3A" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="6" y="14" width="30" height="24" fill={brand.orange} /><rect x="6" y="14" width="30" height="6" fill="#FFB27A" /><rect x="17" y="14" width="5" height="24" fill="#fff" opacity=".85" />
      <path d="M44 32 L48 10 L60 13 L56 32 Z" fill="#1B8F4C" />
      <circle cx="56" cy="3" r="8" fill="#F1C7A1" /><path d="M48 3 A8 8 0 0 1 64 3 L64 6 H48 Z" fill="#1B8F4C" />
    </svg>
  );
}

// Full-screen brand loader: pulsing logo with a spinning ring, the wordmark, a progress shimmer and a courier driving across.
export default function AppLoader({ label = 'Getting things ready', inline = false, leaving = false }) {
  return (
    <Box role="status" aria-live="polite" sx={{
      position: inline ? 'relative' : 'fixed', inset: inline ? 'auto' : 0, minHeight: inline ? '70vh' : '100vh', zIndex: 2000, display: 'grid', placeItems: 'center', overflow: 'hidden', color: '#fff',
      background: `radial-gradient(900px 600px at 80% 0%, rgba(249,107,15,.30), transparent 60%), radial-gradient(700px 500px at 0% 100%, rgba(27,143,76,.32), transparent 60%), linear-gradient(160deg, ${brand.deep}, ${brand.ink})`,
      opacity: leaving ? 0 : 1, transition: 'opacity .55s ease', pointerEvents: leaving ? 'none' : 'auto',
    }}>
      <Box sx={{ textAlign: 'center', px: 3 }}>
        <Box sx={{ position: 'relative', width: 148, height: 148, mx: 'auto', display: 'grid', placeItems: 'center' }}>
          {[0, 1, 2].map((i) => <Box key={i} aria-hidden sx={{ position: 'absolute', inset: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,.5)', animation: `${ripple} 2.4s ease-out ${i * 0.8}s infinite`, ...calm }} />)}
          <Box aria-hidden sx={{ position: 'absolute', inset: 0, borderRadius: '50%', background: `conic-gradient(from 0deg, ${brand.orange}, #1B8F4C, ${brand.blue}, transparent 70%)`, WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 5px), #000 calc(100% - 4px))', mask: 'radial-gradient(farthest-side, transparent calc(100% - 5px), #000 calc(100% - 4px))', animation: `${spin} 1.3s linear infinite`, ...calm }} />
          <Box sx={{ animation: `${bob} 2s ease-in-out infinite`, ...calm }}><Logo size={104} /></Box>
        </Box>
        <Box sx={{ mt: 3.5, display: 'flex', justifyContent: 'center', gap: 0.25 }} aria-label="ODTC Logistics">
          {'ODTC'.split('').map((c, i) => <Typography key={i} variant="h3" aria-hidden sx={{ fontSize: '2.4rem', letterSpacing: '.08em', animation: `${letter} .6s cubic-bezier(.2,.8,.2,1) ${0.15 + i * 0.09}s both`, ...calm }}>{c}</Typography>)}
        </Box>
        <Typography sx={{ letterSpacing: '.55em', fontWeight: 800, fontSize: '.8rem', color: brand.orange, animation: `${letter} .6s ease .6s both`, ...calm }}>LOGISTICS</Typography>
        <Box sx={{ width: 190, height: 5, mx: 'auto', mt: 3.5, bgcolor: 'rgba(255,255,255,.16)', borderRadius: 1, overflow: 'hidden' }}>
          <Box sx={{ width: '38%', height: '100%', borderRadius: 1, background: `linear-gradient(90deg, ${brand.orange}, #fff)`, animation: `${shine} 1.2s ease-in-out infinite`, ...calm }} />
        </Box>
        <Typography variant="body2" sx={{ mt: 1.5, color: 'rgba(255,255,255,.7)' }}>{label}…</Typography>
      </Box>
      <Box aria-hidden sx={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 74 }}>
        <Box sx={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 26, bgcolor: 'rgba(0,0,0,.35)' }} />
        <Box sx={{ position: 'absolute', left: 0, right: 0, bottom: 11, height: 4, backgroundImage: 'repeating-linear-gradient(90deg, rgba(255,255,255,.75) 0 24px, transparent 24px 48px)', animation: `${road} .6s linear infinite`, ...calm }} />
        <Box sx={{ position: 'absolute', bottom: 18, left: 0, animation: `${drive} 3.2s linear infinite`, ...calm }}><Scooter /></Box>
      </Box>
    </Box>
  );
}

// Shows the loader on the first visit of a session (at least ~1.6s, until the page has loaded), then fades out.
export function Splash() {
  const seen = (() => { try { return sessionStorage.getItem('odtc_splash') === '1'; } catch { return false; } })();
  const [phase, setPhase] = useState(seen ? 'gone' : 'show');
  useEffect(() => {
    if (phase !== 'show') return undefined;
    let ready = document.readyState === 'complete';
    let timer = false;
    const finish = () => {
      if (!(ready && timer)) return;
      setPhase('leave');
      try { sessionStorage.setItem('odtc_splash', '1'); } catch { /* ignore */ }
      setTimeout(() => setPhase('gone'), 600);
    };
    const t = setTimeout(() => { timer = true; finish(); }, 1600);
    const onLoad = () => { ready = true; finish(); };
    if (!ready) window.addEventListener('load', onLoad);
    const cap = setTimeout(() => { ready = true; timer = true; finish(); }, 5000); // never block longer than 5s
    return () => { clearTimeout(t); clearTimeout(cap); window.removeEventListener('load', onLoad); };
  }, [phase]);
  if (phase === 'gone') return null;
  return <AppLoader leaving={phase === 'leave'} />;
}
