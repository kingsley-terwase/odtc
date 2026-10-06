import { useState } from 'react';
import { Navigate, useLocation, useNavigate, Link as RouterLink } from 'react-router-dom';
import { Box, Button, CircularProgress, IconButton, InputAdornment, Paper, Stack, TextField, Typography } from '@mui/material';
import VisibilityRounded from '@mui/icons-material/VisibilityRounded';
import VisibilityOffRounded from '@mui/icons-material/VisibilityOffRounded';
import { Logo, Notice } from '../components/ui';
import { useAuth } from '../admin/AuthContext';
import { brand } from '../theme';

export default function AdminLogin() {
    const { admin, ready, login } = useAuth();
    const nav = useNavigate();
    const loc = useLocation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [show, setShow] = useState(false);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState('');

    if (ready && admin) return <Navigate to="/admin" replace />;

    const submit = async (e) => {
        e.preventDefault();
        setErr('');
        if (!email.trim() || !password) return setErr('Enter your email and password.');
        setBusy(true);
        try {
            await login(email.trim(), password);
            nav(loc.state?.from || '/admin', { replace: true });
        } catch (ex) {
            setErr(ex.message);
            setBusy(false);
        }
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'grid',
                placeItems: 'center',
                p: 2,
                background: `
      radial-gradient(900px 600px at 100% 0%, rgba(249, 107, 15, 0.32), transparent 55%),
      radial-gradient(700px 500px at 0% 100%, rgba(30, 136, 229, 0.22), transparent 55%),
      linear-gradient(135deg, ${brand.deep} 0%, ${brand.blue} 50%, #031426 100%)
    `
            }}
        >


            <Paper component="form" onSubmit={submit} noValidate sx={{ width: '100%', maxWidth: 420, p: { xs: 3, sm: 5 }, borderRadius: 2 }}>
                <Stack alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
                    <Logo size={72} />
                    <Typography variant="h4">Admin sign in</Typography>
                    <Typography color="text.secondary" textAlign="center">Sign in to view and manage ODTC Logistics orders.</Typography>
                </Stack>
                <Stack spacing={2.5}>
                    {err && <Notice>{err}</Notice>}
                    <TextField label="Email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
                    <TextField
                        label="Password" type={show ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)}
                        slotProps={{
                            input: {
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow((s) => !s)} edge="end">{show ? <VisibilityOffRounded /> : <VisibilityRounded />}</IconButton>
                                    </InputAdornment>
                                )
                            }
                        }}
                    />
                    <Button type="submit" size="large" variant="contained" color="secondary" disabled={busy} startIcon={busy ? <CircularProgress size={20} color="inherit" /> : null}>
                        {busy ? 'Signing in…' : 'Sign in'}
                    </Button>
                    <Button component={RouterLink} to="/" size="small">Back to website</Button>
                </Stack>
            </Paper>
        </Box>
    );
}