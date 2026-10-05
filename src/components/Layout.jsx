import { useState } from 'react';
import { Outlet, Link as RouterLink, NavLink } from 'react-router-dom';
import { AppBar, Toolbar, Box, Button, Container, IconButton, Menu, MenuItem, Stack, Typography } from '@mui/material';
import MenuRounded from '@mui/icons-material/MenuRounded';
import PhoneRounded from '@mui/icons-material/PhoneRounded';
import MailRounded from '@mui/icons-material/MailRounded';
import PlaceRounded from '@mui/icons-material/PlaceRounded';
import { Logo } from './ui';
import { CONTACT } from '../config';
import { brand } from '../theme';

const links = [['/', 'Home'], ['/about', 'About & Contact']];

function Navbar() {
  const [anchor, setAnchor] = useState(null);
  return (
    <AppBar position="sticky" elevation={0} sx={{ bgcolor: 'rgba(0,41,122,.92)', backdropFilter: 'blur(12px)' }}>
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
          <Button component={RouterLink} to="/book" variant="contained" color="secondary">Book a delivery</Button>
          <IconButton aria-label="Open menu" onClick={(e) => setAnchor(e.currentTarget)} sx={{ display: { md: 'none' }, color: '#fff' }}><MenuRounded /></IconButton>
          <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
            {links.map(([to, l]) => <MenuItem key={to} component={RouterLink} to={to} onClick={() => setAnchor(null)}>{l}</MenuItem>)}
          </Menu>
        </Toolbar>
      </Container>
    </AppBar>
  );
}

function Footer() {
  const items = [[PhoneRounded, CONTACT.phone, CONTACT.phone && `tel:${CONTACT.phone}`], [MailRounded, CONTACT.email, CONTACT.email && `mailto:${CONTACT.email}`], [PlaceRounded, CONTACT.address]].filter((i) => i[1]);
  return (
    <Box component="footer" sx={{ bgcolor: brand.ink, color: '#fff', py: 6, mt: 'auto' }}>
      <Container maxWidth="lg" sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4, justifyContent: 'space-between' }}>
        <Box sx={{ maxWidth: 340 }}>
          <Stack direction="row" spacing={1.5} alignItems="center"><Logo size={48} /><Typography variant="h5">ODTC Logistics</Typography></Stack>
          <Typography sx={{ mt: 2, color: 'rgba(255,255,255,.7)' }}>Safe, dependable and reliable delivery. Book online and pay ₦50 for every kilometre.</Typography>
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
              <Stack key={text} direction="row" spacing={1} alignItems="center" component={href ? 'a' : 'div'} href={href} sx={{ color: 'rgba(255,255,255,.75)', textDecoration: 'none' }}><Icon fontSize="small" /><span>{text}</span></Stack>
            ))}
          </Stack>
        )}
      </Container>
      <Container maxWidth="lg"><Typography variant="body2" sx={{ mt: 5, color: 'rgba(255,255,255,.5)' }}>© {new Date().getFullYear()} ODTC Logistics. All rights reserved.</Typography></Container>
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
