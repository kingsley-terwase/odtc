import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    AppBar, Box, Button, Chip, CircularProgress, Container, Drawer, IconButton, InputAdornment, Paper, Stack,
    Table, TableBody, TableCell, TableHead, TableRow, TextField, Toolbar, Typography,
} from '@mui/material';
import LogoutRounded from '@mui/icons-material/LogoutRounded';
import SearchRounded from '@mui/icons-material/SearchRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import PhoneRounded from '@mui/icons-material/PhoneRounded';
import WhatsApp from '@mui/icons-material/WhatsApp';
import RefreshRounded from '@mui/icons-material/RefreshRounded';
import { FareSummary, Logo, Notice } from '../../components/ui';
import { useAuth } from '../../admin/AuthContext';
import { adminOrders, adminUpdateStatus } from '../../api';
import { naira } from '../../config';
import { brand } from '../../theme';

const labelOf = (b) => (b.paymentStatus === 'paid' ? b.status : b.paymentStatus === 'failed' ? 'payment failed' : 'awaiting payment');
const COLORS = { 'awaiting payment': '#B26A00', 'payment failed': '#C62828', confirmed: brand.blue, 'picked up': '#C2500A', delivered: '#1B8F4C', cancelled: '#6B7280' };
const FILTERS = ['all', 'confirmed', 'picked up', 'delivered', 'awaiting payment', 'cancelled'];
const NEXT = { confirmed: 'picked up', 'picked up': 'delivered' };
const when = (d) => new Date(d).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' });

const StatusChip = ({ b }) => {
    const l = labelOf(b);
    return <Chip size="small" label={l} sx={{ fontWeight: 700, textTransform: 'capitalize', color: COLORS[l], bgcolor: `${COLORS[l]}1A` }} />;
};

const Stat = ({ label, value, accent }) => (
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 4, borderLeft: `6px solid ${accent}` }}>
        <Typography color="text.secondary" fontWeight={600}>{label}</Typography>
        <Typography variant="h3" sx={{ fontSize: { xs: '1.8rem', md: '2.2rem' } }}>{value}</Typography>
    </Paper>
);

const Field = ({ k, v }) => (
    <Box><Typography variant="caption" color="text.secondary">{k}</Typography><Typography fontWeight={600} sx={{ wordBreak: 'break-word' }}>{v || '–'}</Typography></Box>
);

function Detail({ b, onClose, onStatus, busy, err }) {
    const phone = b.customer.phone.replace(/[\s-]/g, '');
    const wa = phone.replace(/^\+/, '').replace(/^0/, '234');
    const paid = b.paymentStatus === 'paid';
    const next = NEXT[b.status];
    const open = paid && b.status !== 'delivered' && b.status !== 'cancelled';
    return (
        <Box sx={{ width: { xs: '100vw', sm: 460 }, p: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                <Box><Typography variant="caption" color="text.secondary">Order</Typography><Typography variant="h4">{b.reference}</Typography></Box>
                <IconButton onClick={onClose} aria-label="Close"><CloseRounded /></IconButton>
            </Stack>
            <StatusChip b={b} />
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

            <Typography variant="h5" sx={{ mb: 1.5 }}>Update order</Typography>
            {err && <Box sx={{ mb: 2 }}><Notice>{err}</Notice></Box>}
            {!paid && <Notice severity="info">Actions unlock once the payment is verified.</Notice>}
            {open && (
                <Stack spacing={1.5}>
                    {next && <Button size="large" variant="contained" color="secondary" disabled={busy} onClick={() => onStatus(b, next)}>Mark as {next}</Button>}
                    <Button color="error" variant="outlined" disabled={busy} onClick={() => window.confirm('Cancel this order?') && onStatus(b, 'cancelled')}>Cancel order</Button>
                </Stack>
            )}
        </Box>
    );
}

export default function Dashboard() {
    const { admin, logout } = useAuth();
    const nav = useNavigate();
    const [orders, setOrders] = useState(null);
    const [err, setErr] = useState('');
    const [filter, setFilter] = useState('all');
    const [q, setQ] = useState('');
    const [selRef, setSelRef] = useState(null);
    const [busy, setBusy] = useState(false);
    const [actErr, setActErr] = useState('');
    const [updated, setUpdated] = useState(null);

    const load = useCallback(async () => {
        try {
            setOrders(await adminOrders());
            setErr('');
            setUpdated(new Date());
        } catch (e) {
            if (e.status === 401) { await logout(); nav('/admin/login', { replace: true }); }
            else setErr(e.message);
        }
    }, [logout, nav]);

    useEffect(() => {
        load();
        const id = setInterval(load, 30000);
        return () => clearInterval(id);
    }, [load]);

    const stats = useMemo(() => {
        const o = orders || [];
        const paid = o.filter((b) => b.paymentStatus === 'paid');
        return {
            total: o.length,
            active: paid.filter((b) => b.status === 'confirmed' || b.status === 'picked up').length,
            delivered: paid.filter((b) => b.status === 'delivered').length,
            revenue: paid.filter((b) => b.status !== 'cancelled').reduce((s, b) => s + b.fare, 0),
        };
    }, [orders]);

    const rows = useMemo(() => {
        const s = q.trim().toLowerCase();
        return (orders || []).filter((b) =>
            (filter === 'all' || labelOf(b) === filter) &&
            (!s || [b.reference, b.customer.name, b.customer.phone, b.pickup, b.dropoff].join(' ').toLowerCase().includes(s)));
    }, [orders, filter, q]);

    const selected = orders?.find((b) => b.reference === selRef);

    const changeStatus = async (b, status) => {
        setBusy(true); setActErr('');
        try {
            const u = await adminUpdateStatus(b.reference, status);
            setOrders((os) => os.map((o) => (o.reference === u.reference ? u : o)));
        } catch (e) {
            setActErr(e.message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: brand.paper }}>
            <AppBar position="sticky" elevation={0} sx={{ bgcolor: brand.deep }}>
                <Toolbar sx={{ gap: 1.5 }}>
                    <Logo size={40} />
                    <Typography variant="h5" sx={{ fontSize: '1.15rem', mr: 'auto' }}>ODTC Admin</Typography>
                    <Typography sx={{ display: { xs: 'none', sm: 'block' }, opacity: 0.8 }}>{admin?.email}</Typography>
                    <Button color="inherit" onClick={async () => { await logout(); nav('/admin/login'); }} startIcon={<LogoutRounded />}>Sign out</Button>
                </Toolbar>
            </AppBar>

            <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
                    <Typography variant="h2" sx={{ fontSize: { xs: '2rem', md: '2.6rem' } }}>Orders</Typography>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        {updated && <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>Updated {updated.toLocaleTimeString('en-NG', { timeStyle: 'short' })}</Typography>}
                        <IconButton onClick={load} aria-label="Refresh orders"><RefreshRounded /></IconButton>
                    </Stack>
                </Stack>

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2, mb: 4 }}>
                    <Stat label="All orders" value={stats.total} accent={brand.blue} />
                    <Stat label="In progress" value={stats.active} accent={brand.orange} />
                    <Stat label="Delivered" value={stats.delivered} accent="#1B8F4C" />
                    <Stat label="Paid revenue" value={naira(stats.revenue)} accent={brand.ink} />
                </Box>

                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }} justifyContent="space-between">
                    <Stack direction="row" gap={1} flexWrap="wrap">
                        {FILTERS.map((f) => (
                            <Chip key={f} label={f} clickable onClick={() => setFilter(f)} color={filter === f ? 'primary' : 'default'} variant={filter === f ? 'filled' : 'outlined'} sx={{ textTransform: 'capitalize', fontWeight: 600 }} />
                        ))}
                    </Stack>
                    <TextField size="small" placeholder="Search reference, name, phone or place" value={q} onChange={(e) => setQ(e.target.value)} sx={{ minWidth: { md: 340 } }}
                        slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRounded /></InputAdornment> } }} />
                </Stack>

                {err && <Box sx={{ mb: 2 }}><Notice action={<Button color="inherit" onClick={load}>Retry</Button>}>{err}</Notice></Box>}

                <Paper variant="outlined" sx={{ borderRadius: 4, overflow: 'hidden' }}>
                    {!orders && !err ? (
                        <Box sx={{ p: 8, textAlign: 'center' }}><CircularProgress /></Box>
                    ) : rows.length === 0 ? (
                        <Box sx={{ p: 6, textAlign: 'center' }}>
                            <Typography variant="h5">{orders?.length ? 'No orders match' : 'No orders yet'}</Typography>
                            <Typography color="text.secondary">{orders?.length ? 'Try a different filter or search.' : 'New bookings appear here as customers book.'}</Typography>
                        </Box>
                    ) : (
                        <Box sx={{ overflowX: 'auto' }}>
                            <Table>
                                <TableHead>
                                    <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: '#F0F4FB' } }}>
                                        <TableCell>Reference</TableCell>
                                        <TableCell>Customer</TableCell>
                                        <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Route</TableCell>
                                        <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Km</TableCell>
                                        <TableCell>Fare</TableCell>
                                        <TableCell>Status</TableCell>
                                        <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>Booked</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {rows.map((b) => (
                                        <TableRow key={b.reference} hover onClick={() => { setActErr(''); setSelRef(b.reference); }} sx={{ cursor: 'pointer' }}>
                                            <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{b.reference}</TableCell>
                                            <TableCell>{b.customer.name}<Typography variant="caption" display="block" color="text.secondary">{b.customer.phone}</Typography></TableCell>
                                            <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, maxWidth: 280 }}>
                                                <Typography noWrap variant="body2">{b.pickup}</Typography>
                                                <Typography noWrap variant="body2" color="text.secondary">to {b.dropoff}</Typography>
                                            </TableCell>
                                            <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>{b.distanceKm}</TableCell>
                                            <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{naira(b.fare)}</TableCell>
                                            <TableCell><StatusChip b={b} /></TableCell>
                                            <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' }, whiteSpace: 'nowrap' }}>{when(b.createdAt)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Box>
                    )}
                </Paper>
            </Container>

            <Drawer anchor="right" open={!!selected} onClose={() => setSelRef(null)}>
                {selected && <Detail b={selected} onClose={() => setSelRef(null)} onStatus={changeStatus} busy={busy} err={actErr} />}
            </Drawer>
        </Box>
    );
}