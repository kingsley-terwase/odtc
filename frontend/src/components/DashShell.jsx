import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Avatar, Badge, Box, Button, Drawer, IconButton, LinearProgress, Stack, Typography } from '@mui/material';
import LogoutRounded from '@mui/icons-material/LogoutRounded';
import MenuRounded from '@mui/icons-material/MenuRounded';
import HomeRounded from '@mui/icons-material/HomeRounded';
import LockRounded from '@mui/icons-material/LockRounded';
import { Logo } from './ui';
import Crisp from './Crisp';
import { brand } from '../theme';

// Shared dashboard frame for the rider and the customer: icon side menu, sticky top bar and a mobile drawer.
// nav = [[id, label, Icon, { locked, count }]]
export default function DashShell({ nav, tab, base, roleLabel, accent = '#1B8F4C', tint = '#EAF7F0', page = '#F3F8F5', line = '#DDE8E2', user, logout, loading, children }) {
  const go = useNavigate();
  const [open, setOpen] = useState(false);
  const cur = nav.find((n) => n[0] === tab) || nav[0];
  const to = (id) => (id === nav[0][0] ? base : `${base}/${id}`);

  const Rail = ({ onNav }) => (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#fff', borderRight: `1px solid ${line}` }}>
      <Stack component={RouterLink} to="/" direction="row" spacing={1.5} alignItems="center" sx={{ p: 3, textDecoration: 'none', color: brand.ink }}>
        <Logo size={40} />
        <Box><Typography fontWeight={800} sx={{ lineHeight: 1.1 }}>ODTC</Typography><Typography variant="caption" sx={{ color: accent, fontWeight: 800, letterSpacing: '.1em' }}>{roleLabel}</Typography></Box>
      </Stack>
      <Stack component="nav" aria-label={`${roleLabel} navigation`} spacing={0.5} sx={{ px: 2, flex: 1, overflowY: 'auto' }}>
        {nav.map(([id, label, Icon, opt = {}]) => {
          const active = cur[0] === id;
          return (
            <Box key={id} component="button" onClick={() => { go(to(id)); onNav?.(); }} sx={{ display: 'flex', alignItems: 'center', gap: 1.75, width: '100%', px: 1.5, py: 1.25, border: 0, borderRadius: 1, cursor: 'pointer', textAlign: 'left', font: 'inherit', fontWeight: 700, color: active ? '#fff' : brand.ink, bgcolor: active ? accent : 'transparent', transition: 'all .2s', '&:hover': { bgcolor: active ? accent : tint }, '&:focus-visible': { outline: `2px solid ${brand.blue}` } }}>
              <Box sx={{ width: 34, height: 34, borderRadius: 1, display: 'grid', placeItems: 'center', bgcolor: active ? 'rgba(255,255,255,.2)' : tint, color: active ? '#fff' : accent }}>
                <Badge color="secondary" badgeContent={opt.count || 0} max={99}><Icon fontSize="small" /></Badge>
              </Box>
              <Box sx={{ flex: 1 }}>{label}</Box>
              {opt.locked && <LockRounded sx={{ fontSize: 16, opacity: 0.55 }} />}
            </Box>
          );
        })}
      </Stack>
      <Box sx={{ p: 2 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ p: 1.5, bgcolor: '#F6F9FC', borderRadius: 1 }}>
          <Avatar variant="rounded" sx={{ bgcolor: brand.blue, borderRadius: 1, width: 38, height: 38, fontWeight: 800 }}>{(user?.name || '?')[0].toUpperCase()}</Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}><Typography fontWeight={700} noWrap>{user?.name}</Typography><Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>{user?.email}</Typography></Box>
          <IconButton aria-label="Sign out" onClick={logout} size="small"><LogoutRounded fontSize="small" /></IconButton>
        </Stack>
      </Box>
    </Box>
  );

  const CurIcon = cur[2];
  return (
    <Crisp>
      <Box sx={{ minHeight: '100vh', display: 'flex', bgcolor: page }}>
        <Box sx={{ display: { xs: 'none', md: 'block' }, width: 280, flexShrink: 0, position: 'sticky', top: 0, height: '100vh' }}><Rail /></Box>
        <Drawer open={open} onClose={() => setOpen(false)} PaperProps={{ sx: { width: 290 } }}><Rail onNav={() => setOpen(false)} /></Drawer>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ position: 'sticky', top: 0, zIndex: 5, px: { xs: 2, md: 4 }, py: 1.5, bgcolor: 'rgba(255,255,255,.9)', backdropFilter: 'blur(8px)', borderBottom: `1px solid ${line}` }}>
            <IconButton aria-label="Open menu" onClick={() => setOpen(true)} sx={{ display: { md: 'none' } }}><MenuRounded /></IconButton>
            <Box sx={{ width: 36, height: 36, borderRadius: 1, bgcolor: accent, color: '#fff', display: 'grid', placeItems: 'center' }}><CurIcon fontSize="small" /></Box>
            <Typography variant="h5" sx={{ flex: 1 }}>{cur[1]}</Typography>
            <Button component={RouterLink} to="/" color="inherit" startIcon={<HomeRounded />} sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>Website</Button>
            <Button color="inherit" startIcon={<LogoutRounded />} onClick={logout} sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>Sign out</Button>
          </Stack>
          {loading && <LinearProgress color="success" />}
          <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1180 }}>{children}</Box>
        </Box>
      </Box>
    </Crisp>
  );
}
