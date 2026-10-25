import { ThemeProvider, createTheme, useTheme } from '@mui/material/styles';

// Crisper corners for the account, courier and tracking pages: with this wrapper an sx borderRadius of 1 or 2 means 4px or 8px.
export default function Crisp({ children }) {
  const outer = useTheme();
  const theme = createTheme(outer, {
    shape: { borderRadius: 4 },
    components: {
      MuiButton: { styleOverrides: { root: { borderRadius: 6 } } },
      MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 6 } } },
      MuiChip: { styleOverrides: { root: { borderRadius: 6 } } },
      MuiToggleButton: { styleOverrides: { root: { borderRadius: 6 } } },
      MuiPaper: { styleOverrides: { root: { borderRadius: 8 } } },
      MuiAlert: { styleOverrides: { root: { borderRadius: 6 } } },
    },
  });
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}
