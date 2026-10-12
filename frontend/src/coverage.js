// import { useCallback, useEffect, useMemo, useState } from 'react';
// import {
//   Autocomplete, Box, Button, Checkbox, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Drawer,
//   IconButton, InputAdornment, Paper, Stack, Switch, TextField, Typography,
// } from '@mui/material';
// import AddRounded from '@mui/icons-material/AddRounded';
// import EditRounded from '@mui/icons-material/EditRounded';
// import PlaceRounded from '@mui/icons-material/PlaceRounded';
// import SearchRounded from '@mui/icons-material/SearchRounded';
// import CloseRounded from '@mui/icons-material/CloseRounded';
// import CheckRounded from '@mui/icons-material/CheckRounded';
// import MapRounded from '@mui/icons-material/MapRounded';
// import { Notice } from '../../components/ui';
// import { adminAddSubdivision, adminAvailableSubdivisions, adminCreateArea, adminSubdivisions, adminUpdateArea, adminUpdateSubdivision } from '../../api';
// import { brand } from '../../theme';

// const NG_STATES = 'Abia,Adamawa,Akwa Ibom,Anambra,Bauchi,Bayelsa,Benue,Borno,Cross River,Delta,Ebonyi,Edo,Ekiti,Enugu,Federal Capital Territory,Gombe,Imo,Jigawa,Kaduna,Kano,Katsina,Kebbi,Kogi,Kwara,Lagos,Nasarawa,Niger,Ogun,Ondo,Osun,Oyo,Plateau,Rivers,Sokoto,Taraba,Yobe,Zamfara'.split(',');
// const QUICK = [['Ibadan', 'Oyo'], ['Port Harcourt', 'Rivers']];
// const KIND = { district: 'LGA / district', place: 'Town / city' };
// const PAGE = 50;
// const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
// const card = { p: { xs: 2.5, md: 3 }, borderRadius: 2, border: '1px solid #DCE4F2', bgcolor: '#fff' };

// function CreateDialog({ open, onClose, onCreated }) {
//   const [name, setName] = useState('');
//   const [state, setState] = useState(null);
//   const [busy, setBusy] = useState(false);
//   const [err, setErr] = useState('');
//   const submit = async () => {
//     if (name.trim().length < 2 || !state) { setErr('Enter the city name and choose its state.'); return; }
//     setBusy(true); setErr('');
//     try {
//       const a = await adminCreateArea({ name: name.trim(), state, countryCode: 'NG', type: 'CITY' });
//       setName(''); setState(null);
//       onCreated(a);
//     } catch (e) { setErr(e.message); } finally { setBusy(false); }
//   };
//   return (
//     <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="xs">
//       <DialogTitle sx={{ fontFamily: '"Bricolage Grotesque"', fontWeight: 800 }}>Add a service area</DialogTitle>
//       <DialogContent>
//         <Stack spacing={2.5} sx={{ pt: 1 }}>
//           <Typography variant="body2" sx={{ color: 'text.secondary' }}>A service area is a city you deliver in. Next you will pick the districts or LGAs inside it.</Typography>
//           <Stack direction="row" gap={1} flexWrap="wrap">
//             {QUICK.map(([n, s]) => <Chip key={n} clickable icon={<PlaceRounded />} label={`${n}, ${s}`} onClick={() => { setName(n); setState(s); }} />)}
//           </Stack>
//           {err && <Notice>{err}</Notice>}
//           <TextField label="City name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
//           <Autocomplete options={NG_STATES} value={state} onChange={(_, v) => setState(v)} renderInput={(p) => <TextField {...p} label="State" />} />
//           <TextField label="Country" value="Nigeria" disabled />
//         </Stack>
//       </DialogContent>
//       <DialogActions sx={{ px: 3, pb: 2 }}>
//         <Button onClick={onClose} disabled={busy}>Cancel</Button>
//         <Button variant="contained" color="secondary" onClick={submit} disabled={busy}>{busy ? 'Creating…' : 'Create area'}</Button>
//       </DialogActions>
//     </Dialog>
//   );
// }

// function RenameDialog({ area, onClose, onSaved }) {
//   const [name, setName] = useState(area.name);
//   const [busy, setBusy] = useState(false);
//   const [err, setErr] = useState('');
//   const save = async () => {
//     if (name.trim().length < 2) { setErr('Enter a name.'); return; }
//     setBusy(true); setErr('');
//     try { onSaved(await adminUpdateArea(area.id, { name: name.trim() })); } catch (e) { setErr(e.message); setBusy(false); }
//   };
//   return (
//     <Dialog open onClose={busy ? undefined : onClose} fullWidth maxWidth="xs">
//       <DialogTitle sx={{ fontFamily: '"Bricolage Grotesque"', fontWeight: 800 }}>Rename service area</DialogTitle>
//       <DialogContent><Stack spacing={2} sx={{ pt: 1 }}>{err && <Notice>{err}</Notice>}<TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} autoFocus /></Stack></DialogContent>
//       <DialogActions sx={{ px: 3, pb: 2 }}><Button onClick={onClose} disabled={busy}>Cancel</Button><Button variant="contained" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button></DialogActions>
//     </Dialog>
//   );
// }

// // Drawer to browse the GeoNames list for an area and approve several subdivisions at once.
// function Picker({ area, subs, open, onClose, onAdded }) {
//   const [items, setItems] = useState([]);
//   const [meta, setMeta] = useState(null);
//   const [loading, setLoading] = useState(false);
//   const [err, setErr] = useState('');
//   const [q, setQ] = useState('');
//   const [kind, setKind] = useState('all');
//   const [sel, setSel] = useState(new Set());
//   const [busy, setBusy] = useState(false);
//   const [fails, setFails] = useState([]);
//   const approved = useMemo(() => new Set(subs.map((s) => norm(s.name))), [subs]);

//   const fetchPages = useCallback(async (start, pages) => {
//     setLoading(true); setErr('');
//     try {
//       const res = await Promise.all(Array.from({ length: pages }, (_, i) => adminAvailableSubdivisions(area.id, { limit: PAGE, offset: start + i * PAGE })));
//       const rows = res.flatMap((r) => r.availableSubdivisions || []);
//       setItems((prev) => { const m = new Map(prev.map((i) => [i.geonameId, i])); rows.forEach((r) => m.set(r.geonameId, r)); return [...m.values()]; });
//       const last = res[res.length - 1];
//       setMeta({ total: res[0].total, next: start + pages * PAGE, more: !!last.hasMore, limited: res.some((r) => r.providerPaginationLimitReached), attr: res[0].attribution });
//     } catch (e) { setErr(e.message); } finally { setLoading(false); }
//   }, [area.id]);

//   useEffect(() => { if (open && !meta && !loading) fetchPages(0, 2); }, [open, meta, loading, fetchPages]);

//   const more = () => fetchPages(meta.next, Math.max(1, Math.min(4, Math.ceil((meta.total - meta.next) / PAGE))));
//   const shown = useMemo(() => items.filter((i) => (kind === 'all' || i.kind === kind) && (!q.trim() || i.name.toLowerCase().includes(q.trim().toLowerCase()))), [items, kind, q]);
//   const pickable = shown.filter((i) => !approved.has(norm(i.name)));
//   const toggle = (id) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

//   const approve = async () => {
//     const picks = [...new Map(items.filter((i) => sel.has(i.geonameId) && !approved.has(norm(i.name))).map((i) => [norm(i.name), i])).values()];
//     setBusy(true); setFails([]);
//     const bad = [];
//     for (const p of picks) {
//       try { onAdded(await adminAddSubdivision(area.id, p.name)); } catch (e) { bad.push({ id: p.geonameId, text: `${p.name}: ${e.message}` }); }
//     }
//     setBusy(false);
//     setFails(bad.map((b) => b.text));
//     setSel(new Set(bad.map((b) => b.id)));
//     if (!bad.length) onClose();
//   };

//   return (
//     <Drawer anchor="right" open={open} onClose={busy ? undefined : onClose} PaperProps={{ sx: { width: { xs: '100vw', sm: 520 }, display: 'flex', flexDirection: 'column' } }}>
//       <Box sx={{ p: 3, pb: 1.5 }}>
//         <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
//           <Box><Typography variant="caption" sx={{ color: 'text.secondary' }}>Add areas to</Typography><Typography variant="h4">{area.name}{area.state ? `, ${area.state}` : ''}</Typography></Box>
//           <IconButton onClick={onClose} aria-label="Close"><CloseRounded /></IconButton>
//         </Stack>
//         <TextField fullWidth size="small" sx={{ mt: 2 }} placeholder="Search the loaded list, e.g. Akinyele" value={q} onChange={(e) => setQ(e.target.value)} slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRounded /></InputAdornment> } }} />
//         <Stack direction="row" gap={1} sx={{ mt: 1.5 }} flexWrap="wrap" alignItems="center">
//           {[['all', 'All'], ['district', 'LGAs / districts'], ['place', 'Towns']].map(([k, l]) => <Chip key={k} clickable label={l} color={kind === k ? 'primary' : 'default'} variant={kind === k ? 'filled' : 'outlined'} onClick={() => setKind(k)} />)}
//           <Box sx={{ flex: 1 }} />
//           <Button size="small" disabled={!pickable.length} onClick={() => setSel((s) => new Set([...s, ...pickable.map((i) => i.geonameId)]))}>Select shown</Button>
//           <Button size="small" color="inherit" disabled={!sel.size} onClick={() => setSel(new Set())}>Clear</Button>
//         </Stack>
//         {meta && <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1 }}>Loaded {items.length} of {meta.total}. Search and filters only cover what is loaded.</Typography>}
//       </Box>

//       <Box sx={{ flex: 1, overflowY: 'auto', px: 2 }}>
//         {err && <Box sx={{ px: 1, pb: 1 }}><Notice action={<Button color="inherit" onClick={() => fetchPages(meta ? meta.next : 0, 1)}>Retry</Button>}>{err}</Notice></Box>}
//         {!meta && loading && <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress /></Box>}
//         {meta && shown.length === 0 && <Typography sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>{meta.more ? 'No match yet. Load more results to keep looking.' : 'No matches.'}</Typography>}
//         {shown.slice(0, 400).map((i) => {
//           const done = approved.has(norm(i.name));
//           return (
//             <Box key={i.geonameId} component="label" sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1, py: 0.25, borderRadius: 2, cursor: done ? 'default' : 'pointer', opacity: done ? 0.6 : 1, '&:hover': { bgcolor: done ? undefined : '#F4F7FC' } }}>
//               <Checkbox checked={done || sel.has(i.geonameId)} disabled={done} onChange={() => toggle(i.geonameId)} />
//               <Box sx={{ flex: 1, minWidth: 0 }}><Typography sx={{ fontWeight: 600 }}>{i.name}</Typography><Typography variant="caption" sx={{ color: 'text.secondary' }}>{KIND[i.kind] || i.kind}</Typography></Box>
//               {done && <Chip size="small" color="success" variant="outlined" label="Approved" />}
//             </Box>
//           );
//         })}
//         {meta?.more && <Box sx={{ p: 2, textAlign: 'center' }}><Button variant="outlined" onClick={more} disabled={loading} startIcon={loading ? <CircularProgress size={16} /> : null}>{loading ? 'Loading…' : 'Load more results'}</Button></Box>}
//         {meta?.limited && <Box sx={{ px: 1, pb: 2 }}><Notice severity="warning">The data provider's paging limit was reached. Use search to narrow the list.</Notice></Box>}
//         {meta?.attr && <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', pb: 2, color: 'text.secondary' }}>Place data from <a href={meta.attr.url} target="_blank" rel="noreferrer">{meta.attr.name}</a></Typography>}
//       </Box>

//       <Box sx={{ p: 2.5, borderTop: '1px solid #DCE4F2', bgcolor: '#fff' }}>
//         {fails.length > 0 && <Box sx={{ mb: 1.5 }}><Notice>{fails.map((f) => <div key={f}>{f}</div>)}</Notice></Box>}
//         <Button fullWidth size="large" variant="contained" color="secondary" disabled={!sel.size || busy} onClick={approve} startIcon={busy ? <CircularProgress size={18} color="inherit" /> : <CheckRounded />}>
//           {busy ? 'Approving…' : sel.size ? `Approve ${sel.size} selected` : 'Select areas to approve'}
//         </Button>
//       </Box>
//     </Drawer>
//   );
// }

// function AreaCard({ area, onChange, autoOpen }) {
//   const [subs, setSubs] = useState(null);
//   const [err, setErr] = useState('');
//   const [busy, setBusy] = useState(false);
//   const [pick, setPick] = useState(false);
//   const [ren, setRen] = useState(false);
//   useEffect(() => { adminSubdivisions(area.id).then(setSubs).catch((e) => { setSubs([]); setErr(e.message); }); }, [area.id]);
//   useEffect(() => { if (autoOpen) setPick(true); }, [autoOpen]);
//   const act = async (fn) => { setBusy(true); setErr(''); try { await fn(); } catch (e) { setErr(e.message); } finally { setBusy(false); } };
//   const toggleSub = (s) => act(async () => { const u = await adminUpdateSubdivision(area.id, s.id, { active: !s.active }); setSubs((x) => x.map((y) => (y.id === s.id ? { ...y, ...u, active: u.active ?? !s.active } : y))); });
//   const list = subs || [];
//   return (
//     <Paper elevation={0} sx={{ ...card, opacity: area.active ? 1 : 0.75, borderColor: area.active ? brand.blue : '#DCE4F2' }}>
//       <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
//         <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: area.active ? brand.blue : '#DCE4F2', color: '#fff', display: 'grid', placeItems: 'center' }}><PlaceRounded /></Box>
//         <Box sx={{ flex: 1, minWidth: 0 }}>
//           <Stack direction="row" spacing={1} alignItems="center"><Typography variant="h5" noWrap>{area.name}</Typography><IconButton size="small" onClick={() => setRen(true)} aria-label="Rename area"><EditRounded fontSize="small" /></IconButton></Stack>
//           <Typography variant="body2" sx={{ color: 'text.secondary' }}>{[area.state, area.active ? 'Open for bookings' : 'Switched off'].filter(Boolean).join(' · ')}{subs ? ` · ${list.filter((s) => s.active).length} of ${list.length} areas active` : ''}</Typography>
//         </Box>
//         <Switch checked={!!area.active} disabled={busy} color="secondary" inputProps={{ 'aria-label': `Deliver in ${area.name}` }} onChange={(e) => act(async () => onChange(await adminUpdateArea(area.id, { active: e.target.checked })))} />
//       </Stack>
//       {err && <Box sx={{ mb: 2 }}><Notice>{err}</Notice></Box>}
//       <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>Approved subdivisions. Tap one to switch it on or off.</Typography>
//       <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mb: 2 }}>
//         {subs === null ? <CircularProgress size={22} /> : list.length === 0 ? <Typography variant="body2" sx={{ color: 'text.secondary' }}>Nothing approved yet. Add the LGAs or districts you deliver to.</Typography>
//           : list.map((d) => <Chip key={d.id} clickable disabled={busy} onClick={() => toggleSub(d)} icon={d.active ? <CheckRounded /> : undefined} label={d.name}
//             sx={{ fontWeight: 600, ...(d.active ? { bgcolor: brand.blue, color: '#fff', '& .MuiChip-icon': { color: brand.orange }, '&:hover': { bgcolor: brand.deep } } : { bgcolor: '#fff', border: '1px solid #C9D5EA' }) }} />)}
//       </Stack>
//       <Button variant="outlined" startIcon={<AddRounded />} onClick={() => setPick(true)}>Add subdivisions</Button>
//       {pick && <Picker area={area} subs={list} open={pick} onClose={() => setPick(false)} onAdded={(s) => setSubs((x) => [...(x || []), s])} />}
//       {ren && <RenameDialog area={area} onClose={() => setRen(false)} onSaved={(u) => { onChange(u); setRen(false); }} />}
//     </Paper>
//   );
// }

// export function AreasView({ areas, setAreas }) {
//   const [create, setCreate] = useState(false);
//   const [fresh, setFresh] = useState(null);
//   const [ok, setOk] = useState('');
//   const active = areas.filter((a) => a.active).length;
//   return (
//     <Stack spacing={3}>
//       <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ sm: 'center' }}>
//         <Typography sx={{ color: 'text.secondary', maxWidth: 640 }}>Choose where ODTC delivers. Create a city, then approve the LGAs or districts inside it. The server only quotes and accepts bookings inside active areas.</Typography>
//         <Button variant="contained" color="secondary" startIcon={<AddRounded />} onClick={() => setCreate(true)} sx={{ flexShrink: 0 }}>Add service area</Button>
//       </Stack>
//       {ok && <Notice severity="success" action={<IconButton size="small" color="inherit" onClick={() => setOk('')}><CloseRounded fontSize="small" /></IconButton>}>{ok}</Notice>}
//       {areas.length > 0 && <Stack direction="row" gap={1}><Chip label={`${areas.length} service area${areas.length === 1 ? '' : 's'}`} /><Chip color="success" variant="outlined" label={`${active} active`} /></Stack>}
//       {areas.length === 0 && (
//         <Paper elevation={0} sx={{ ...card, textAlign: 'center', py: 7 }}>
//           <MapRounded sx={{ fontSize: 56, color: brand.blue, mb: 1 }} />
//           <Typography variant="h5">No service areas yet</Typography>
//           <Typography sx={{ color: 'text.secondary', mb: 3 }}>Customers cannot get a fare until you add a city and approve its areas.</Typography>
//           <Button variant="contained" color="secondary" startIcon={<AddRounded />} onClick={() => setCreate(true)}>Add your first area</Button>
//         </Paper>
//       )}
//       {areas.map((a) => <AreaCard key={a.id} area={a} autoOpen={fresh === a.id} onChange={(u) => setAreas((x) => x.map((y) => (y.id === u.id ? { ...y, ...u } : y)))} />)}
//       <CreateDialog open={create} onClose={() => setCreate(false)} onCreated={(a) => { setAreas((x) => [a, ...x]); setFresh(a.id); setCreate(false); setOk(`${a.name} created. Now choose the areas you deliver to.`); }} />
//     </Stack>
//   );
// }