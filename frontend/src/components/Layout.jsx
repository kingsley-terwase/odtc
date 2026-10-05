
import { useState, useEffect } from 'react';
import { Outlet, Link as RouterLink, NavLink, useNavigate } from 'react-router-dom';
import {
  AppBar, Toolbar, Box, Button, Container, IconButton, Menu, MenuItem, Stack, Typography,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import MenuRounded from '@mui/icons-material/MenuRounded';
import PhoneRounded from '@mui/icons-material/PhoneRounded';
import MailRounded from '@mui/icons-material/MailRounded';
import PlaceRounded from '@mui/icons-material/PlaceRounded';
import Apple from '@mui/icons-material/Apple';
import Android from '@mui/icons-material/Android';
import { Logo } from './ui';
import { CONTACT } from '../config';
import { brand } from '../theme';

const links = [['/', 'Home'], ['/about', 'About & Contact']];

function Navbar() {
  const [anchor, setAnchor] = useState(null);
  return (
    <AppBar position="sticky" elevation={0} sx={{ bgcolor: '#000', borderBottom: '1.5px solid rgba(0,41,122,.92)', backdropFilter: 'blur(12px)' }}>
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{ gap: 2, minHeight: { xs: 64, md: 76 } }}>
          <Box component={RouterLink} to="/" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: '#fff', textDecoration: 'none', mr: 'auto' }}>
            <Logo />
            <Typography variant="h5" sx={{ fontSize: '1.25rem', letterSpacing: '-0.01em' }}>ODTC Logistics</Typography>
          </Box>
          <Stack direction="row" spacing={1} sx={{ display: { xs: 'none', md: 'flex' } }}>
            {links.map(([to, l]) => (
              <Button key={to} component={NavLink} to={to} end sx={{ color: 'rgba(255,255,255,.85)', '&.active': { color: '#fff', bgcolor: 'rgba(255,255,255,.12)' } }}>{l}</Button>
            ))}
          </Stack>
          <Button
            component={RouterLink}
            to="/book"
            variant="contained"
            color="secondary"
          >
            <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
              Book a delivery
            </Box>
            <Box component="span" sx={{ display: { xs: "inline", sm: "none" } }}>
              Book
            </Box>
          </Button>          <IconButton aria-label="Open menu" onClick={(e) => setAnchor(e.currentTarget)} sx={{ display: { md: 'none' }, color: '#fff' }}><MenuRounded /></IconButton>
          <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
            {links.map(([to, l]) => <MenuItem key={to} component={RouterLink} to={to} onClick={() => setAnchor(null)}>{l}</MenuItem>)}
          </Menu>
        </Toolbar>
      </Container>
    </AppBar>
  );
}

// Captures the browser's "install app" prompt (Chrome/Edge/Android)
function useInstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setDeferred(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);
  const install = async () => {
    if (!deferred) return false;
    deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    return true;
  };
  return { canInstall: !!deferred, install };
}

function StoreBadge({ icon: Icon, small, big, onClick }) {
  return (
    <Box
      component="button"
      onClick={onClick}
      aria-label={`${big} – coming soon`}
      sx={{
        display: 'flex', alignItems: 'center', gap: 1.25, px: 1.75, py: 0.9, minWidth: 160,
        bgcolor: '#000', color: '#fff', border: '1px solid rgba(255,255,255,.4)',
        borderRadius: '10px', cursor: 'pointer', textAlign: 'left', font: 'inherit',
        transition: 'border-color .2s, transform .2s',
        '&:hover': { borderColor: '#fff', transform: 'translateY(-1px)' },
      }}
    >
      <Icon sx={{ fontSize: 30 }} />
      <Box>
        <Typography sx={{ fontSize: 10, lineHeight: 1, opacity: 0.8 }}>{small}</Typography>
        <Typography sx={{ fontSize: 17, lineHeight: 1.2, fontWeight: 600 }}>{big}</Typography>
      </Box>
    </Box>
  );
}

function AppComingSoonDialog({ open, onClose }) {
  const navigate = useNavigate();
  const { canInstall, install } = useInstallPrompt();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Our mobile app is coming soon 🚚</DialogTitle>
      <DialogContent>
        <Typography sx={{ mb: 2 }}>
          We're putting the finishing touches on the ODTC Logistics app. In the meantime,
          you can book and track deliveries right here on our website — it works great on your phone.
        </Typography>
        {!canInstall && (
          <Typography variant="body2" color="text.secondary">
            Tip: open your browser menu and tap <b>Add to Home Screen</b> to keep ODTC one tap away
            (on iPhone: Share → Add to Home Screen).
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, flexWrap: 'wrap', gap: 1 }}>
        {canInstall && (
          <Button onClick={async () => { await install(); onClose(); }}>Install web app</Button>
        )}
        <Button onClick={onClose}>Close</Button>
        <Button
          variant="contained"
          color="secondary"
          onClick={() => { onClose(); navigate('/book'); }}
        >
          Book a delivery
        </Button>
      </DialogActions>
    </Dialog>
  );
}
function Footer() {
  const [appDialog, setAppDialog] = useState(false);
  const items = [
    [PhoneRounded, CONTACT.phone, CONTACT.phone && `tel:${CONTACT.phone}`],
    [MailRounded, CONTACT.email, CONTACT.email && `mailto:${CONTACT.email}`],
    [PlaceRounded, CONTACT.address],
  ].filter((i) => i[1]);

  return (
    <Box component="footer" sx={{ bgcolor: '#000', color: '#fff', py: 6, mt: 'auto' }}>
      <Container maxWidth="lg" sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4, justifyContent: 'space-between' }}>
        <Box sx={{ maxWidth: 340 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Logo size={48} />
            <Typography variant="h5">ODTC Logistics</Typography>
          </Stack>
          <Typography sx={{ mt: 2, color: 'rgba(255,255,255,.7)' }}>
            Safe, dependable and reliable delivery. Book online and pay ₦50 for every kilometre.
          </Typography>
        </Box>

        <Stack spacing={1}>
          <Typography fontWeight={700}>Explore</Typography>
          {[['/', 'Home'], ['/book', 'Book a delivery'], ['/about', 'About & Contact']].map(([to, l]) => (
            <Typography key={to} component={RouterLink} to={to} sx={{ color: 'rgba(255,255,255,.75)', textDecoration: 'none', '&:hover': { color: brand.orange } }}>{l}</Typography>
          ))}
        </Stack>

        {items.length > 0 && (
          <Stack spacing={1}>
            <Typography fontWeight={700}>Contact</Typography>
            {items.map(([Icon, text, href]) => (
              <Stack key={text} direction="row" spacing={1} alignItems="center" component={href ? 'a' : 'div'} href={href} sx={{ color: 'rgba(255,255,255,.75)', textDecoration: 'none' }}>
                <Icon fontSize="small" /><span>{text}</span>
              </Stack>
            ))}
          </Stack>
        )}

        <Stack spacing={1.5}>
          <Typography fontWeight={700}>Get the app</Typography>
          <StoreBadge icon={Apple} small="Download on the" big="App Store" onClick={() => setAppDialog(true)} />
          <StoreBadge icon={Android} small="GET IT ON" big="Google Play" onClick={() => setAppDialog(true)} />
        </Stack>
      </Container>

      <Container maxWidth="lg">
        <Typography variant="body2" sx={{ mt: 5, color: 'rgba(255,255,255,.5)' }}>
          © {new Date().getFullYear()} ODTC Logistics. All rights reserved.
        </Typography>
      </Container>

      <AppComingSoonDialog open={appDialog} onClose={() => setAppDialog(false)} />
    </Box>
  );
}

export default function Layout() {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <Box component="main" sx={{ flex: 1 }}><Outlet /></Box>
      <Footer />
    </Box>
  );
}
