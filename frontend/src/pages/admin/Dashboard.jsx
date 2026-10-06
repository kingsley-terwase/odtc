import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { keyframes } from '@emotion/react';
import {
  Avatar, Badge, Box, Button, Chip, CircularProgress, Drawer, IconButton, InputAdornment, Menu, MenuItem, Paper, Stack,
  Switch, Table, TableBody, TableCell, TableHead, TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import DashboardRounded from '@mui/icons-material/DashboardRounded';
import ReceiptLongRounded from '@mui/icons-material/ReceiptLongRounded';
import PeopleAltRounded from '@mui/icons-material/PeopleAltRounded';
import PaymentsRounded from '@mui/icons-material/PaymentsRounded';
import MapRounded from '@mui/icons-material/MapRounded';
import LogoutRounded from '@mui/icons-material/LogoutRounded';
import SearchRounded from '@mui/icons-material/SearchRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import PhoneRounded from '@mui/icons-material/PhoneRounded';
import WhatsApp from '@mui/icons-material/WhatsApp';
import RefreshRounded from '@mui/icons-material/RefreshRounded';
import MenuRounded from '@mui/icons-material/MenuRounded';
import NotificationsRounded from '@mui/icons-material/NotificationsRounded';
import CheckRounded from '@mui/icons-material/CheckRounded';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import PlaceRounded from '@mui/icons-material/PlaceRounded';
import SellRounded from '@mui/icons-material/SellRounded';
import { FareSummary, Logo, Notice } from '../../components/ui';
import { useAuth } from '../../admin/AuthContext';
import { adminAddSubdivision, adminAreas, adminOrders, adminPricing, adminPricingHistory, adminSetPricing, adminSubdivisions, adminUpdateArea } from '../../api';
import { naira } from '../../config';
import { brand } from '../../theme';

/* ================= helpers ================= */
const EASE = 'cubic-bezier(.2,.7,.2,1)';
const fadeUp = keyframes`from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:none}`;
const drift = keyframes`0%,100%{transform:translate(0,0)}50%{transform:translate(30px,-20px)}`;
const glow = keyframes`0%{box-shadow:0 0 0 0 rgba(249,107,15,.55)}70%{box-shadow:0 0 0 9px rgba(249,107,15,0)}100%{box-shadow:0 0 0 0 rgba(249,107,15,0)}`;
const calm = { '@media (prefers-reduced-motion: reduce)': { animation: 'none !important', transition: 'none !important' } };
const appear = (i = 0) => ({ animation: `${fadeUp} .6s ${EASE} ${i * 0.07}s both`, ...calm });

const labelOf = (b) => (b.paymentStatus === 'paid' ? b.status : b.paymentStatus === 'failed' ? 'payment failed' : 'awaiting payment');
const COLORS = { 'awaiting payment': '#B26A00', 'payment failed': '#C62828', confirmed: brand.blue, 'picked up': '#C2500A', delivered: '#1B8F4C', cancelled: '#6B7280' };
const FILTERS = ['all', 'confirmed', 'picked up', 'delivered', 'awaiting payment', 'payment failed', 'cancelled'];
const when = (d) => new Date(d).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' });
const initials = (n) => n.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
const earns = (b) => b.paymentStatus === 'paid' && b.status !== 'cancelled';

function series(orders, days) {
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push({ key: d.toDateString(), label: d.toLocaleDateString('en-NG', days > 7 ? { day: 'numeric', month: 'short' } : { weekday: 'short' }), value: 0, count: 0 });
  }
  orders.filter(earns).forEach((b) => {
    const r = out.find((x) => x.key === new Date(b.createdAt).toDateString());
    if (r) { r.value += b.fare; r.count += 1; }
  });
  return out;
}

function useCount(to, dur = 900) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let start;
    let id;
    const step = (t) => {
      if (start === undefined) start = t;
      const p = Math.min((t - start) / dur, 1);
      setN(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) id = requestAnimationFrame(step);
    };
    id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }, [to, dur]);
  return n;
}

/* ================= small components ================= */
const StatusChip = ({ b }) => {
  const l = labelOf(b);
  return <Chip size="small" label={l} sx={{ fontWeight: 700, textTransform: 'capitalize', color: COLORS[l], bgcolor: `${COLORS[l]}1A` }} />;
};

function Panel({ title, action, children, sx, i = 0 }) {
  return (
    <Paper elevation={0} sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 2, border: '1px solid #DCE4F2', ...appear(i), ...sx }}>
      {(title || action) && (
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2.5 }}>
          <Typography variant="h5" sx={{ fontSize: '1.15rem' }}>{title}</Typography>{action}
        </Stack>
      )}
      {children}
    </Paper>
  );
}

function Kpi({ label, value, money, accent, icon: Icon, hint, i }) {
  const n = useCount(value);
  return (
    <Paper elevation={0} sx={{ position: 'relative', overflow: 'hidden', p: 2.75, borderRadius: 2, border: '1px solid #DCE4F2', transition: `translate .3s ${EASE}, box-shadow .3s`, '&:hover': { translate: '0 -6px', boxShadow: '0 24px 44px -26px rgba(0,71,171,.5)' }, ...appear(i) }}>
      <Box aria-hidden sx={{ position: 'absolute', right: -30, top: -30, width: 110, height: 110, borderRadius: '50%', bgcolor: accent, opacity: 0.12 }} />
      <Box sx={{ width: 44, height: 44, borderRadius: 3, bgcolor: `${accent}22`, color: accent, display: 'grid', placeItems: 'center', mb: 1.5 }}><Icon /></Box>
      <Typography sx={{ color: 'text.secondary', fontWeight: 600 }}>{label}</Typography>
      <Typography variant="h3" sx={{ fontSize: { xs: '1.7rem', md: '2.1rem' }, lineHeight: 1.2 }}>{money ? naira(Math.round(n)) : Math.round(n)}</Typography>
      {hint && <Typography variant="caption" sx={{ color: 'text.secondary' }}>{hint}</Typography>}
    </Paper>
  );
}

function BarChart({ data, height = 220 }) {
  const [hi, setHi] = useState(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setOn(true), 60);
    return () => clearTimeout(t);
  }, []);
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: { xs: 0.6, md: 1.4 }, height }}>
        {data.map((d, i) => {
          const pct = Math.max((d.value / max) * 100, d.value ? 5 : 2);
          return (
            <Box key={d.key} onMouseEnter={() => setHi(i)} onMouseLeave={() => setHi(null)} sx={{ position: 'relative', flex: 1, height: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
              {hi === i && (
                <Box sx={{ position: 'absolute', bottom: `calc(${pct}% + 10px)`, zIndex: 2, px: 1.5, py: 0.75, borderRadius: 2, bgcolor: brand.ink, color: '#fff', textAlign: 'center', whiteSpace: 'nowrap', fontSize: '.8rem', fontWeight: 700 }}>
                  {naira(d.value)}<Box sx={{ opacity: 0.7, fontWeight: 500 }}>{d.count} order{d.count === 1 ? '' : 's'}</Box>
                </Box>
              )}
              <Box sx={{ width: '100%', maxWidth: 48, height: `${pct}%`, borderRadius: '10px 10px 4px 4px', bgcolor: hi === i ? brand.orange : d.value ? brand.blue : '#E3EAF6', transformOrigin: 'bottom', transform: on ? 'scaleY(1)' : 'scaleY(0)', transition: `transform .9s ${EASE} ${i * 0.04}s, background-color .2s`, ...calm }} />
            </Box>
          );
        })}
      </Box>
      <Box sx={{ display: 'flex', gap: { xs: 0.6, md: 1.4 }, mt: 1 }}>
        {data.map((d) => <Typography key={d.key} variant="caption" sx={{ flex: 1, textAlign: 'center', color: 'text.secondary', fontSize: { xs: '.62rem', md: '.75rem' } }}>{d.label}</Typography>)}
      </Box>
    </Box>
  );
}

function Donut({ parts, total }) {
  const R = 54;
  const C = 2 * Math.PI * R;
  let off = 0;
  return (
    <Box component="svg" viewBox="0 0 140 140" sx={{ width: 170, height: 170, flexShrink: 0 }}>
      <circle cx="70" cy="70" r={R} fill="none" stroke="#E8EEF8" strokeWidth="16" />
      {parts.filter((p) => p.value).map((p) => {
        const len = (p.value / total) * C;
        const el = <circle key={p.label} cx="70" cy="70" r={R} fill="none" stroke={p.color} strokeWidth="16" strokeDasharray={`${Math.max(len - 3, 0.1)} ${C - len + 3}`} strokeDashoffset={-off} transform="rotate(-90 70 70)" />;
        off += len;
        return el;
      })}
      <text x="70" y="68" textAnchor="middle" fontSize="26" fontWeight="800" fill={brand.ink} fontFamily="Bricolage Grotesque">{total}</text>
      <text x="70" y="86" textAnchor="middle" fontSize="10" fill="#4A5B7A">orders</text>
    </Box>
  );
}

const Field = ({ k, v }) => (
  <Box><Typography variant="caption" sx={{ color: 'text.secondary' }}>{k}</Typography><Typography sx={{ fontWeight: 600, wordBreak: 'break-word' }}>{v || '–'}</Typography></Box>
);

/* ================= sidebar ================= */
const NAV = [['overview', 'Overview', DashboardRounded], ['orders', 'Orders', ReceiptLongRounded], ['customers', 'Customers', PeopleAltRounded], ['earnings', 'Earnings', PaymentsRounded], ['coverage', 'Coverage', MapRounded], ['pricing', 'Pricing', SellRounded]];

function Sidebar({ view, go, badge, areas, admin, onLogout }) {
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', color: '#fff', background: `linear-gradient(190deg, ${brand.deep} 0%, ${brand.ink} 100%)`, position: 'relative', overflow: 'hidden' }}>
      <Box aria-hidden sx={{ position: 'absolute', width: 260, height: 260, left: -100, bottom: 40, borderRadius: '50%', bgcolor: brand.orange, opacity: 0.18, filter: 'blur(70px)', animation: `${drift} 14s ease-in-out infinite`, ...calm }} />
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ p: 3, position: 'relative' }}>
        <Logo size={44} />
        <Box><Typography variant="h5" sx={{ fontSize: '1.1rem', lineHeight: 1.1 }}>ODTC</Typography><Typography variant="caption" sx={{ opacity: 0.7 }}>Admin console</Typography></Box>
      </Stack>
      <Stack spacing={0.5} sx={{ px: 2, flex: 1, position: 'relative' }}>
        {NAV.map(([id, label, Icon]) => {
          const active = view === id;
          return (
            <Box key={id} component="button" onClick={() => go(id)} sx={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 1.75, width: '100%', px: 2, py: 1.4, border: 0, borderRadius: 1, cursor: 'pointer', textAlign: 'left', font: 'inherit', fontWeight: 600, color: active ? '#fff' : 'rgba(255,255,255,.7)', bgcolor: active ? 'rgba(255,255,255,.12)' : 'transparent', transition: 'all .2s', '&:hover': { bgcolor: 'rgba(255,255,255,.08)', color: '#fff' }, '&:focus-visible': { outline: `2px solid ${brand.orange}` } }}>
              <Box aria-hidden sx={{ position: 'absolute', left: 0, top: '22%', bottom: '22%', width: 4, borderRadius: 4, bgcolor: brand.orange, transform: active ? 'scaleY(1)' : 'scaleY(0)', transition: `transform .3s ${EASE}` }} />
              <Icon sx={{ color: active ? brand.orange : 'inherit' }} />
              <span style={{ flex: 1 }}>{label}</span>
              {id === 'orders' && badge > 0 && <Chip size="small" label={badge} sx={{ height: 22, bgcolor: brand.orange, color: brand.ink, fontWeight: 800 }} />}
            </Box>
          );
        })}
      </Stack>
      <Box sx={{ p: 2, position: 'relative' }}>
        <Box sx={{ p: 2, borderRadius: 1, bgcolor: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.14)' }}>
          <Stack direction="row" spacing={1} alignItems="center"><PlaceRounded sx={{ color: brand.orange, fontSize: 20 }} /><Typography sx={{ fontWeight: 700, fontSize: '.9rem' }}>Delivery areas</Typography></Stack>
          <Typography variant="body2" sx={{ opacity: 0.8, mt: 0.5 }}>{areas ? (areas.filter((a) => a.active).map((a) => a.name).join(', ') || 'No active areas yet') : 'Loading…'}</Typography>
          <Button size="small" onClick={() => go('coverage')} endIcon={<ArrowForwardRounded />} sx={{ color: brand.orange, mt: 0.5, px: 0 }}>Manage</Button>
        </Box>
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mt: 2, px: 1 }}>
          <Avatar sx={{ width: 36, height: 36, bgcolor: brand.orange, color: brand.ink, fontWeight: 800 }}>{(admin?.email || 'A')[0].toUpperCase()}</Avatar>
          <Typography noWrap sx={{ flex: 1, fontSize: '.85rem', opacity: 0.85 }}>{admin?.email || 'Admin'}</Typography>
          <Tooltip title="Sign out"><IconButton onClick={onLogout} aria-label="Sign out" sx={{ color: '#fff' }}><LogoutRounded fontSize="small" /></IconButton></Tooltip>
        </Stack>
      </Box>
    </Box>
  );
}

/* ================= order detail ================= */
function Detail({ b, onClose }) {
  const phone = b.customer.phone.replace(/[\s-]/g, '');
  const wa = phone.replace(/^\+/, '').replace(/^0/, '234');
  const paid = b.paymentStatus === 'paid';
  const stage = !paid ? 0 : b.status === 'confirmed' ? 1 : b.status === 'picked up' ? 2 : b.status === 'delivered' ? 3 : 1;
  const steps = ['Booked', 'Paid', 'Picked up', 'Delivered'];
  return (
    <Box sx={{ width: { xs: '100vw', sm: 480 }, p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
        <Box><Typography variant="caption" sx={{ color: 'text.secondary' }}>Order</Typography><Typography variant="h4">{b.reference}</Typography></Box>
        <IconButton onClick={onClose} aria-label="Close"><CloseRounded /></IconButton>
      </Stack>
      <StatusChip b={b} />
      {b.status === 'cancelled' ? <Box sx={{ mt: 3 }}><Notice severity="info">This order was cancelled.</Notice></Box> : (
        <Box sx={{ display: 'flex', alignItems: 'flex-start', mt: 3 }}>
          {steps.map((s, i) => (
            <Box key={s} sx={{ flex: 1, position: 'relative', textAlign: 'center' }}>
              {i > 0 && <Box sx={{ position: 'absolute', top: 13, right: '50%', width: '100%', height: 3, bgcolor: i <= stage ? brand.orange : '#DCE4F2' }} />}
              <Box sx={{ position: 'relative', mx: 'auto', width: 28, height: 28, borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: i <= stage ? brand.orange : '#fff', border: `3px solid ${i <= stage ? brand.orange : '#DCE4F2'}`, color: brand.ink, ...(i === stage ? { animation: `${glow} 2s infinite`, ...calm } : {}) }}>{i <= stage && <CheckRounded sx={{ fontSize: 16 }} />}</Box>
              <Typography variant="caption" sx={{ fontWeight: 600, color: i <= stage ? 'text.primary' : 'text.secondary' }}>{s}</Typography>
            </Box>
          ))}
        </Box>
      )}
      <Box sx={{ my: 3 }}><FareSummary pickup={b.pickup} dropoff={b.dropoff} distanceKm={b.distanceKm} fare={b.fare} /></Box>
      <Typography variant="h5" sx={{ mb: 1.5 }}>Customer</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
        <Field k="Name" v={b.customer.name} /><Field k="Phone" v={b.customer.phone} />
        <Box sx={{ gridColumn: '1 / -1' }}><Field k="Email" v={b.customer.email} /></Box>
      </Box>
      <Stack direction="row" spacing={1.5} sx={{ mb: 3 }}>
        <Button href={`tel:${phone}`} variant="outlined" startIcon={<PhoneRounded />}>Call</Button>
        <Button href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" variant="outlined" startIcon={<WhatsApp />}>WhatsApp</Button>
      </Stack>
      <Typography variant="h5" sx={{ mb: 1.5 }}>Package</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 3 }}>
        <Box sx={{ gridColumn: '1 / -1' }}><Field k="Description" v={b.package.description} /></Box>
        <Field k="Size" v={b.package.size} /><Field k="Booked" v={when(b.createdAt)} />
        <Field k="Payment reference" v={b.paymentReference} /><Field k="Payment" v={b.paymentStatus} />
      </Box>
      {!paid
        ? <Notice severity="info">This order has not been paid yet.</Notice>
        : <Notice severity="info">Pickup and delivery updates are not available in the admin API yet. Contact the customer from here.</Notice>}
    </Box>
  );
}

/* ================= views ================= */
function Overview({ orders, open, go, admin }) {
  const hour = new Date().getHours();
  const hello = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const paid = orders.filter((b) => b.paymentStatus === 'paid');
  const active = paid.filter((b) => b.status === 'confirmed' || b.status === 'picked up').length;
  const revenue = orders.filter(earns).reduce((s, b) => s + b.fare, 0);
  const parts = Object.entries(orders.reduce((a, b) => { const l = labelOf(b); a[l] = (a[l] || 0) + 1; return a; }, {})).map(([label, value]) => ({ label, value, color: COLORS[label] }));
  const week = useMemo(() => series(orders, 7), [orders]);
  return (
    <Stack spacing={3}>
      <Box sx={{ position: 'relative', overflow: 'hidden', borderRadius: 2, p: { xs: 3, md: 4.5 }, color: '#fff', background: `linear-gradient(120deg, ${brand.blue}, ${brand.deep})`, ...appear(0) }}>
        <Box aria-hidden sx={{ position: 'absolute', width: 340, height: 340, right: -70, top: -120, borderRadius: '50%', bgcolor: brand.orange, opacity: 0.45, filter: 'blur(70px)', animation: `${drift} 12s ease-in-out infinite`, ...calm }} />
        <Typography variant="h2" sx={{ position: 'relative', fontSize: { xs: '1.9rem', md: '2.6rem' } }}>{hello}, {(admin?.email || 'admin').split('@')[0]}.</Typography>
        <Typography sx={{ position: 'relative', mt: 1, fontSize: '1.1rem', opacity: 0.9 }}>{active ? `You have ${active} order${active > 1 ? 's' : ''} in progress.` : 'No orders in progress right now.'} Today's earnings sit at {naira(week[week.length - 1].value)}.</Typography>
        <Button onClick={() => go('orders')} variant="contained" color="secondary" endIcon={<ArrowForwardRounded />} sx={{ position: 'relative', mt: 2.5 }}>View orders</Button>
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', lg: 'repeat(4, 1fr)' }, gap: 2 }}>
        <Kpi i={1} label="All orders" value={orders.length} accent={brand.blue} icon={ReceiptLongRounded} hint="Every booking" />
        <Kpi i={2} label="In progress" value={active} accent={brand.orange} icon={PlaceRounded} hint="Confirmed or picked up" />
        <Kpi i={3} label="Delivered" value={paid.filter((b) => b.status === 'delivered').length} accent="#1B8F4C" icon={CheckRounded} hint="Completed deliveries" />
        <Kpi i={4} label="Paid revenue" value={revenue} money accent={brand.ink} icon={PaymentsRounded} hint="Paid, not cancelled" />
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.7fr 1fr' }, gap: 3 }}>
        <Panel i={5} title="Revenue, last 7 days"><BarChart data={week} /></Panel>
        <Panel i={6} title="Order status">
          <Stack direction={{ xs: 'column', sm: 'row', lg: 'column', xl: 'row' }} spacing={2} alignItems="center">
            <Donut parts={parts} total={orders.length} />
            <Stack spacing={1} sx={{ width: '100%' }}>
              {parts.map((p) => (
                <Stack key={p.label} direction="row" alignItems="center" spacing={1}>
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: p.color }} />
                  <Typography sx={{ flex: 1, textTransform: 'capitalize', fontSize: '.9rem' }}>{p.label}</Typography>
                  <Typography sx={{ fontWeight: 700 }}>{p.value}</Typography>
                </Stack>
              ))}
            </Stack>
          </Stack>
        </Panel>
      </Box>
      <Panel i={7} title="Latest orders" action={<Button size="small" onClick={() => go('orders')} endIcon={<ArrowForwardRounded />}>See all</Button>}>
        <Stack divider={<Box sx={{ borderBottom: '1px solid #EDF1F8' }} />}>
          {orders.slice(0, 5).map((b) => (
            <Stack key={b.reference} direction="row" alignItems="center" spacing={2} onClick={() => open(b.reference)} sx={{ py: 1.5, px: 2, cursor: 'pointer', borderRadius: 2, transition: 'background-color .2s', '&:hover': { bgcolor: '#F4F7FC' } }}>
              <Avatar sx={{ bgcolor: `${COLORS[labelOf(b)]}22`, color: COLORS[labelOf(b)], fontWeight: 800 }}>{initials(b.customer.name)}</Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography noWrap sx={{ fontWeight: 700 }}>{b.customer.name}</Typography>
                <Typography noWrap variant="body2" sx={{ color: 'text.secondary' }}>{b.pickup} to {b.dropoff}</Typography>
              </Box>
              <Box sx={{ textAlign: 'right' }}><Typography sx={{ fontWeight: 800 }}>{naira(b.fare)}</Typography><StatusChip b={b} /></Box>
            </Stack>
          ))}
        </Stack>
      </Panel>
    </Stack>
  );
}

function OrdersView({ orders, filter, setFilter, open }) {
  const [q, setQ] = useState('');
  const counts = useMemo(() => orders.reduce((a, b) => { const l = labelOf(b); a[l] = (a[l] || 0) + 1; return a; }, { all: orders.length }), [orders]);
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return orders.filter((b) => (filter === 'all' || labelOf(b) === filter) && (!s || [b.reference, b.customer.name, b.customer.phone, b.pickup, b.dropoff].join(' ').toLowerCase().includes(s)));
  }, [orders, filter, q]);
  return (
    <Stack spacing={2.5}>
      <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} justifyContent="space-between" sx={appear(0)}>
        <Stack direction="row" gap={1} flexWrap="wrap">
          {FILTERS.map((f) => (
            <Chip key={f} clickable onClick={() => setFilter(f)} label={`${f} ${counts[f] || 0}`} color={filter === f ? 'primary' : 'default'} variant={filter === f ? 'filled' : 'outlined'} sx={{ textTransform: 'capitalize', fontWeight: 600, bgcolor: filter === f ? undefined : '#fff' }} />
          ))}
        </Stack>
        <TextField size="small" placeholder="Search reference, name, phone or place" value={q} onChange={(e) => setQ(e.target.value)} sx={{ minWidth: { lg: 340 } }} slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRounded /></InputAdornment> } }} />
      </Stack>
      <Paper elevation={0} sx={{ borderRadius: 2, border: '1px solid #DCE4F2', overflow: 'hidden', ...appear(1) }}>
        {rows.length === 0 ? (
          <Box sx={{ p: 7, textAlign: 'center' }}><Typography variant="h5">{orders.length ? 'No orders match' : 'No orders yet'}</Typography><Typography sx={{ color: 'text.secondary' }}>{orders.length ? 'Try a different filter or search.' : 'New bookings appear here as customers book.'}</Typography></Box>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table>
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: '#F0F4FB' } }}>
                  <TableCell>Reference</TableCell><TableCell>Customer</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Route</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Km</TableCell>
                  <TableCell>Fare</TableCell><TableCell>Status</TableCell>
                  <TableCell sx={{ display: { xs: 'none', xl: 'table-cell' } }}>Booked</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((b) => (
                  <TableRow key={b.reference} hover onClick={() => open(b.reference)} sx={{ cursor: 'pointer' }}>
                    <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{b.reference}</TableCell>
                    <TableCell>{b.customer.name}<Typography variant="caption" display="block" sx={{ color: 'text.secondary' }}>{b.customer.phone}</Typography></TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, maxWidth: 280 }}>
                      <Typography noWrap variant="body2">{b.pickup}</Typography>
                      <Typography noWrap variant="body2" sx={{ color: 'text.secondary' }}>to {b.dropoff}</Typography>
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>{b.distanceKm}</TableCell>
                    <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{naira(b.fare)}</TableCell>
                    <TableCell><StatusChip b={b} /></TableCell>
                    <TableCell sx={{ display: { xs: 'none', xl: 'table-cell' }, whiteSpace: 'nowrap' }}>{when(b.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </Paper>
    </Stack>
  );
}

function CustomersView({ orders }) {
  const list = useMemo(() => {
    const m = {};
    orders.forEach((b) => {
      const k = b.customer.phone;
      const c = (m[k] ||= { ...b.customer, orders: 0, spent: 0, last: b.createdAt });
      c.orders += 1;
      if (earns(b)) c.spent += b.fare;
      if (b.createdAt > c.last) c.last = b.createdAt;
    });
    return Object.values(m).sort((a, b) => b.spent - a.spent);
  }, [orders]);
  return (
    <Panel title={`${list.length} customer${list.length === 1 ? '' : 's'}`}>
      {list.length === 0 ? <Typography sx={{ color: 'text.secondary' }}>Customers appear here after their first booking.</Typography> : (
        <Box sx={{ overflowX: 'auto' }}>
          <Table>
            <TableHead><TableRow sx={{ '& th': { fontWeight: 700 } }}><TableCell>Customer</TableCell><TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Email</TableCell><TableCell>Orders</TableCell><TableCell>Total spent</TableCell><TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Last order</TableCell><TableCell /></TableRow></TableHead>
            <TableBody>
              {list.map((c) => (
                <TableRow key={c.phone} hover>
                  <TableCell><Stack direction="row" spacing={1.5} alignItems="center"><Avatar sx={{ bgcolor: `${brand.blue}22`, color: brand.blue, fontWeight: 800 }}>{initials(c.name)}</Avatar><Box><Typography sx={{ fontWeight: 700 }}>{c.name}</Typography><Typography variant="caption" sx={{ color: 'text.secondary' }}>{c.phone}</Typography></Box></Stack></TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>{c.email}</TableCell>
                  <TableCell>{c.orders}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{naira(c.spent)}</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, whiteSpace: 'nowrap' }}>{when(c.last)}</TableCell>
                  <TableCell align="right"><IconButton href={`tel:${c.phone}`} aria-label={`Call ${c.name}`}><PhoneRounded fontSize="small" /></IconButton></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}
    </Panel>
  );
}

function EarningsView({ orders }) {
  const data = useMemo(() => series(orders, 14), [orders]);
  const paid = orders.filter(earns);
  const total = paid.reduce((s, b) => s + b.fare, 0);
  const km = paid.reduce((s, b) => s + b.distanceKm, 0);
  const cancelled = orders.filter((b) => b.paymentStatus === 'paid' && b.status === 'cancelled').reduce((s, b) => s + b.fare, 0);
  return (
    <Stack spacing={3}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', lg: 'repeat(4, 1fr)' }, gap: 2 }}>
        <Kpi i={0} label="Total earned" value={total} money accent={brand.blue} icon={PaymentsRounded} hint="Paid, not cancelled" />
        <Kpi i={1} label="Average order" value={paid.length ? total / paid.length : 0} money accent={brand.orange} icon={ReceiptLongRounded} hint="Per paid order" />
        <Kpi i={2} label="Kilometres" value={Math.round(km)} accent="#1B8F4C" icon={PlaceRounded} hint="Across paid orders" />
        <Kpi i={3} label="Cancelled value" value={cancelled} money accent="#6B7280" icon={CloseRounded} hint="Paid, then cancelled" />
      </Box>
      <Panel i={4} title="Revenue, last 14 days"><BarChart data={data} height={260} /></Panel>
    </Stack>
  );
}

function AreaCard({ area, onChange, i }) {
  const [subs, setSubs] = useState(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => { adminSubdivisions(area.id).then(setSubs).catch((e) => { setSubs([]); setErr(e.message); }); }, [area.id]);
  const act = async (fn) => { setBusy(true); setErr(''); try { await fn(); } catch (e) { setErr(e.message); } finally { setBusy(false); } };
  const add = () => name.trim() && act(async () => { const d = await adminAddSubdivision(area.id, name.trim()); setSubs((x) => [...(x || []), d]); setName(''); });
  return (
    <Panel i={i + 1} sx={{ opacity: area.active ? 1 : 0.7, borderColor: area.active ? brand.blue : '#DCE4F2' }}>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
        <Box sx={{ width: 48, height: 48, borderRadius: 3, bgcolor: area.active ? brand.blue : '#DCE4F2', color: '#fff', display: 'grid', placeItems: 'center' }}><PlaceRounded /></Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5">{area.name}</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>{area.active ? 'Customers can book here' : 'Switched off'}{subs ? ` · ${subs.length} approved area${subs.length === 1 ? '' : 's'}` : ''}</Typography>
        </Box>
        <Switch checked={!!area.active} disabled={busy} color="secondary" inputProps={{ 'aria-label': `Deliver in ${area.name}` }}
          onChange={(e) => act(async () => onChange(await adminUpdateArea(area.id, { active: e.target.checked })))} />
      </Stack>
      {err && <Box sx={{ mb: 2 }}><Notice>{err}</Notice></Box>}
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>Approved subdivisions (LGAs, districts)</Typography>
      <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mb: 2 }}>
        {subs === null ? <CircularProgress size={22} /> : subs.length === 0 ? <Typography variant="body2">None added yet.</Typography>
          : subs.map((d) => <Chip key={d.id} label={d.name} sx={{ fontWeight: 600, bgcolor: d.active ? brand.blue : '#fff', color: d.active ? '#fff' : 'inherit', border: d.active ? 0 : '1px solid #C9D5EA' }} />)}
      </Stack>
      <Stack direction="row" spacing={1}>
        <TextField size="small" fullWidth placeholder="Add a subdivision, e.g. Akinyele" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
        <Button variant="contained" disabled={busy || !name.trim()} onClick={add}>Add</Button>
      </Stack>
    </Panel>
  );
}

function AreasView({ areas, setAreas }) {
  return (
    <Stack spacing={3}>
      <Typography sx={{ color: 'text.secondary', maxWidth: 700, ...appear(0) }}>Choose where ODTC delivers. The server only gives fares and accepts bookings for pickups and drop-offs inside the areas switched on here.</Typography>
      {areas.length === 0 && <Notice severity="info">No service areas yet.</Notice>}
      {areas.map((a, i) => <AreaCard key={a.id} i={i} area={a} onChange={(u) => setAreas((x) => x.map((y) => (y.id === u.id ? u : y)))} />)}
    </Stack>
  );
}

function PricingView() {
  const [current, setCurrent] = useState(undefined);
  const [history, setHistory] = useState([]);
  const [rate, setRate] = useState('');
  const [min, setMin] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState(false);
  const load = useCallback(async () => {
    try {
      const [c, h] = await Promise.all([adminPricing(), adminPricingHistory()]);
      setCurrent(c); setHistory(h); setRate((r) => r || c?.ratePerKm || ''); setMin((m) => m || c?.minimumFare || '');
    } catch (e) { setCurrent(null); setErr(e.message); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const money = /^\d+(\.\d{1,2})?$/;
  const save = async () => {
    setErr(''); setOk(false);
    if (!money.test(rate) || Number(rate) <= 0) return setErr('Enter a rate per km above 0, with at most 2 decimals.');
    if (!money.test(min)) return setErr('Enter a minimum fare of 0 or more, with at most 2 decimals.');
    setBusy(true);
    try { await adminSetPricing(Number(rate).toFixed(2), Number(min).toFixed(2)); setOk(true); await load(); } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  if (current === undefined) return <Box sx={{ py: 12, textAlign: 'center' }}><CircularProgress /></Box>;
  return (
    <Stack spacing={3}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3 }}>
        <Panel i={0} title="Current pricing">
          {current ? (
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <Field k="Rate per km" v={naira(current.ratePerKm)} /><Field k="Minimum fare" v={naira(current.minimumFare)} />
              <Field k="Set on" v={when(current.createdAt)} />
            </Box>
          ) : <Notice severity="warning">No pricing is set yet, so customers cannot get a fare. Set it on the right.</Notice>}
        </Panel>
        <Panel i={1} title="Set new pricing">
          <Stack spacing={2}>
            {err && <Notice>{err}</Notice>}
            {ok && <Notice severity="success">New pricing is live. Past bookings keep the price they were quoted.</Notice>}
            <TextField label="Rate per km (₦)" value={rate} onChange={(e) => setRate(e.target.value)} inputProps={{ inputMode: 'decimal' }} />
            <TextField label="Minimum fare (₦)" value={min} onChange={(e) => setMin(e.target.value)} inputProps={{ inputMode: 'decimal' }} />
            <Button variant="contained" color="secondary" size="large" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save pricing'}</Button>
          </Stack>
        </Panel>
      </Box>
      <Panel i={2} title="Pricing history">
        <Table size="small">
          <TableHead><TableRow sx={{ '& th': { fontWeight: 700 } }}><TableCell>Set on</TableCell><TableCell>Rate per km</TableCell><TableCell>Minimum fare</TableCell></TableRow></TableHead>
          <TableBody>{history.map((h) => <TableRow key={h.id}><TableCell>{when(h.createdAt)}</TableCell><TableCell>{naira(h.ratePerKm)}</TableCell><TableCell>{naira(h.minimumFare)}</TableCell></TableRow>)}</TableBody>
        </Table>
      </Panel>
    </Stack>
  );
}

/* ================= page ================= */
const TITLES = { overview: 'Overview', orders: 'Orders', customers: 'Customers', earnings: 'Earnings', coverage: 'Coverage areas', pricing: 'Pricing' };

export default function Dashboard() {
  const { admin, logout } = useAuth();
  const nav = useNavigate();
  const [orders, setOrders] = useState(null);
  const [areas, setAreas] = useState(null);
  const [err, setErr] = useState('');
  const [view, setView] = useState('overview');
  const [filter, setFilter] = useState('all');
  const [selRef, setSelRef] = useState(null);
  const [updated, setUpdated] = useState(null);
  const [menu, setMenu] = useState(false);
  const [anchor, setAnchor] = useState(null);

  const signOut = useCallback(async () => { await logout(); nav('/admin/login', { replace: true }); }, [logout, nav]);

  const load = useCallback(async () => {
    try {
      setOrders(await adminOrders());
      setErr('');
      setUpdated(new Date());
    } catch (e) {
      if (e.status === 401) await signOut();
      else setErr(e.message);
    }
  }, [signOut]);

  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    adminAreas().then(setAreas).catch(() => setAreas([]));
  }, []);

  const go = (v) => { setView(v); setMenu(false); window.scrollTo(0, 0); };
  const newCount = (orders || []).filter((b) => b.paymentStatus === 'paid' && b.status === 'confirmed').length;
  const selected = orders?.find((b) => b.reference === selRef);
  const open = (ref) => setSelRef(ref);

  const side = <Sidebar view={view} go={go} badge={newCount} areas={areas} admin={admin} onLogout={signOut} />;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#EEF3FB' }}>
      <Box component="aside" sx={{ width: 268, flexShrink: 0, display: { xs: 'none', md: 'block' } }}>
        <Box sx={{ position: 'fixed', top: 0, bottom: 0, width: 268 }}>{side}</Box>
      </Box>
      <Drawer open={menu} onClose={() => setMenu(false)} sx={{ display: { md: 'none' }, '& .MuiDrawer-paper': { width: 268, border: 0 } }}>{side}</Drawer>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box component="header" sx={{ position: 'sticky', top: 0, zIndex: 10, display: 'flex', alignItems: 'center', gap: 1, px: { xs: 2, md: 4 }, py: 1.75, bgcolor: 'rgba(238,243,251,.85)', backdropFilter: 'blur(14px)', borderBottom: '1px solid #DCE4F2' }}>
          <IconButton onClick={() => setMenu(true)} aria-label="Open menu" sx={{ display: { md: 'none' } }}><MenuRounded /></IconButton>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h4" sx={{ fontSize: { xs: '1.3rem', md: '1.7rem' } }}>{TITLES[view]}</Typography>
            {updated && <Typography variant="caption" sx={{ color: 'text.secondary' }}>Updated {updated.toLocaleTimeString('en-NG', { timeStyle: 'short' })}</Typography>}
          </Box>
          <Tooltip title="Refresh"><IconButton onClick={load} aria-label="Refresh"><RefreshRounded /></IconButton></Tooltip>
          <Tooltip title={newCount ? `${newCount} new paid order${newCount > 1 ? 's' : ''}` : 'No new orders'}>
            <IconButton aria-label="New orders" onClick={() => { setFilter('confirmed'); go('orders'); }}>
              <Badge badgeContent={newCount} color="secondary"><NotificationsRounded /></Badge>
            </IconButton>
          </Tooltip>
          <IconButton onClick={(e) => setAnchor(e.currentTarget)} aria-label="Account"><Avatar sx={{ width: 36, height: 36, bgcolor: brand.blue, fontWeight: 800 }}>{(admin?.email || 'A')[0].toUpperCase()}</Avatar></IconButton>
          <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
            <MenuItem disabled>{admin?.email || 'Admin'}</MenuItem>
            <MenuItem onClick={signOut}>Sign out</MenuItem>
          </Menu>
        </Box>

        <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1280 }}>
          {err && <Box sx={{ mb: 2 }}><Notice action={<Button color="inherit" onClick={load}>Retry</Button>}>{err}</Notice></Box>}
          {!orders && !err ? <Box sx={{ py: 12, textAlign: 'center' }}><CircularProgress /></Box> : orders && (
            <>
              {view === 'overview' && <Overview orders={orders} open={open} go={go} admin={admin} />}
              {view === 'orders' && <OrdersView orders={orders} filter={filter} setFilter={setFilter} open={open} />}
              {view === 'customers' && <CustomersView orders={orders} />}
              {view === 'earnings' && <EarningsView orders={orders} />}
              {view === 'coverage' && (areas ? <AreasView areas={areas} setAreas={setAreas} /> : <Box sx={{ py: 12, textAlign: 'center' }}><CircularProgress /></Box>)}
              {view === 'pricing' && <PricingView />}
            </>
          )}
        </Box>
      </Box>

      <Drawer anchor="right" open={!!selected} onClose={() => setSelRef(null)}>
        {selected && <Detail b={selected} onClose={() => setSelRef(null)} />}
      </Drawer>
    </Box>
  );
}