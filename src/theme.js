import { createTheme } from '@mui/material/styles';
export const brand = { blue: '#0047AB', deep: '#00297A', orange: '#F96B0F', ink: '#0B1B3A', paper: '#F5F8FD' };
const display = '"Bricolage Grotesque", Figtree, sans-serif';
export default createTheme({
  palette: {
    primary: { main: brand.blue, dark: brand.deep },
    secondary: { main: brand.orange, contrastText: brand.ink },
    background: { default: brand.paper },
    text: { primary: brand.ink, secondary: '#4A5B7A' },
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: 'Figtree, system-ui, sans-serif',
    h1: { fontFamily: display, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.02 },
    h2: { fontFamily: display, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.08 },
    h3: { fontFamily: display, fontWeight: 800, letterSpacing: '-0.02em' },
    h4: { fontFamily: display, fontWeight: 700 },
    h5: { fontFamily: display, fontWeight: 700 },
    button: { textTransform: 'none', fontWeight: 700 },
  },
  components: {
    MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { borderRadius: 999 }, sizeLarge: { padding: '12px 28px', fontSize: '1.05rem' } } },
    MuiOutlinedInput: { styleOverrides: { root: { backgroundColor: '#fff' } } },
  },
});
