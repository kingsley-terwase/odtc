import { useState } from 'react';
import {
  Autocomplete, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Paper, Stack, Switch, TextField, Typography,
} from '@mui/material';
import AddRounded from '@mui/icons-material/AddRounded';
import EditRounded from '@mui/icons-material/EditRounded';
import PlaceRounded from '@mui/icons-material/PlaceRounded';
import MapRounded from '@mui/icons-material/MapRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import { Notice } from '../../components/ui';
import { adminCreateArea, adminUpdateArea } from '../../api';
import { brand } from '../../theme';

const NG_STATES = 'Abia,Adamawa,Akwa Ibom,Anambra,Bauchi,Bayelsa,Benue,Borno,Cross River,Delta,Ebonyi,Edo,Ekiti,Enugu,Federal Capital Territory,Gombe,Imo,Jigawa,Kaduna,Kano,Katsina,Kebbi,Kogi,Kwara,Lagos,Nasarawa,Niger,Ogun,Ondo,Osun,Oyo,Plateau,Rivers,Sokoto,Taraba,Yobe,Zamfara'.split(',');
const card = { p: { xs: 2.5, md: 3 }, borderRadius: 3, border: '1px solid #DCE4F2', bgcolor: '#fff' };

// Coverage is by state: an active state record lets customers get quotes for any address inside it.
function CreateDialog({ open, onClose, onCreated, taken }) {
  const [state, setState] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const submit = async () => {
    if (!state) { setErr('Choose the state you want to serve.'); return; }
    setBusy(true); setErr('');
    try {
      const a = await adminCreateArea({ name: state, state, countryCode: 'NG', type: 'STATE' });
      setState(null);
      onCreated(a);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontFamily: '"Bricolage Grotesque"', fontWeight: 800 }}>Add a state</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>Once active, customers can get quotes and book anywhere inside this state.</Typography>
          {err && <Notice>{err}</Notice>}
          <Autocomplete options={NG_STATES.filter((s) => !taken.has(s.toLowerCase()))} value={state} onChange={(_, v) => setState(v)} renderInput={(p) => <TextField {...p} label="State" autoFocus />} />
          <TextField label="Country" value="Nigeria" disabled />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={busy}>Cancel</Button>
        <Button variant="contained" color="secondary" onClick={submit} disabled={busy}>{busy ? 'Adding…' : 'Add state'}</Button>
      </DialogActions>
    </Dialog>
  );
}

function RenameDialog({ area, onClose, onSaved }) {
  const [name, setName] = useState(area.name);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const save = async () => {
    if (name.trim().length < 2) { setErr('Enter a name.'); return; }
    setBusy(true); setErr('');
    try { onSaved(await adminUpdateArea(area.id, { name: name.trim() })); } catch (e) { setErr(e.message); setBusy(false); }
  };
  return (
    <Dialog open onClose={busy ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontFamily: '"Bricolage Grotesque"', fontWeight: 800 }}>Rename service area</DialogTitle>
      <DialogContent><Stack spacing={2} sx={{ pt: 1 }}>{err && <Notice>{err}</Notice>}<TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} autoFocus /></Stack></DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}><Button onClick={onClose} disabled={busy}>Cancel</Button><Button variant="contained" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button></DialogActions>
    </Dialog>
  );
}

function AreaCard({ area, onChange }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [ren, setRen] = useState(false);
  const toggle = async (active) => {
    setBusy(true); setErr('');
    try { onChange(await adminUpdateArea(area.id, { active })); } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <Paper elevation={0} sx={{ ...card, opacity: area.active ? 1 : 0.8, borderColor: area.active ? brand.blue : '#DCE4F2' }}>
      <Stack direction="row" alignItems="center" spacing={2}>
        <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: area.active ? brand.blue : '#DCE4F2', color: '#fff', display: 'grid', placeItems: 'center' }}><PlaceRounded /></Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="h5" noWrap>{area.name}</Typography>
            <IconButton size="small" onClick={() => setRen(true)} aria-label="Rename area"><EditRounded fontSize="small" /></IconButton>
          </Stack>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>{[area.state, area.type === 'STATE' ? 'Whole state' : area.type, area.active ? 'Open for bookings' : 'Switched off'].filter(Boolean).join(' · ')}</Typography>
        </Box>
        <Switch checked={!!area.active} disabled={busy} color="secondary" inputProps={{ 'aria-label': `Deliver in ${area.name}` }} onChange={(e) => toggle(e.target.checked)} />
      </Stack>
      {err && <Box sx={{ mt: 2 }}><Notice>{err}</Notice></Box>}
      {ren && <RenameDialog area={area} onClose={() => setRen(false)} onSaved={(u) => { onChange(u); setRen(false); }} />}
    </Paper>
  );
}

export function AreasView({ areas, setAreas }) {
  const [create, setCreate] = useState(false);
  const [ok, setOk] = useState('');
  const active = areas.filter((a) => a.active).length;
  const taken = new Set(areas.map((a) => String(a.state || a.name).toLowerCase()));
  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ sm: 'center' }}>
        <Typography sx={{ color: 'text.secondary', maxWidth: 640 }}>Choose the states ODTC delivers in. The server only quotes and accepts bookings for addresses inside an active state.</Typography>
        <Button variant="contained" color="secondary" startIcon={<AddRounded />} onClick={() => setCreate(true)} sx={{ flexShrink: 0 }}>Add state</Button>
      </Stack>
      {ok && <Notice severity="success" action={<IconButton size="small" color="inherit" onClick={() => setOk('')}><CloseRounded fontSize="small" /></IconButton>}>{ok}</Notice>}
      {areas.length > 0 && <Stack direction="row" gap={1}><Chip label={`${areas.length} service area${areas.length === 1 ? '' : 's'}`} /><Chip color="success" variant="outlined" label={`${active} active`} /></Stack>}
      {areas.length === 0 && (
        <Paper elevation={0} sx={{ ...card, textAlign: 'center', py: 7 }}>
          <MapRounded sx={{ fontSize: 56, color: brand.blue, mb: 1 }} />
          <Typography variant="h5">No service areas yet</Typography>
          <Typography sx={{ color: 'text.secondary', mb: 3 }}>Customers cannot get a fare until you add a state.</Typography>
          <Button variant="contained" color="secondary" startIcon={<AddRounded />} onClick={() => setCreate(true)}>Add your first state</Button>
        </Paper>
      )}
      {areas.map((a) => <AreaCard key={a.id} area={a} onChange={(u) => setAreas((x) => x.map((y) => (y.id === u.id ? { ...y, ...u } : y)))} />)}
      <CreateDialog open={create} taken={taken} onClose={() => setCreate(false)} onCreated={(a) => { setAreas((x) => [a, ...x]); setCreate(false); setOk(`${a.name} added. Customers can now book inside it.`); }} />
    </Stack>
  );
}
