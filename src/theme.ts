import { createTheme } from '@mui/material/styles'

// Paleta herdada do plano alimentar da Tainara: verde/menta com toques de laranja.
export const palette = {
  verde: '#2D6A4F',
  verdeClaro: '#52B788',
  menta: '#D8F3DC',
  creme: '#F8F4EF',
  laranja: '#E07A3A',
  cinza: '#6B7280',
  texto: '#1C2B20',
}

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: palette.verde, light: palette.verdeClaro, contrastText: '#fff' },
    secondary: { main: palette.laranja, contrastText: '#fff' },
    background: { default: palette.creme, paper: '#ffffff' },
    text: { primary: palette.texto, secondary: palette.cinza },
  },
  typography: {
    fontFamily: "'DM Sans', sans-serif",
    h1: { fontFamily: "'DM Serif Display', serif" },
    h2: { fontFamily: "'DM Serif Display', serif" },
    h3: { fontFamily: "'DM Serif Display', serif" },
    h4: { fontFamily: "'DM Serif Display', serif", fontWeight: 400 },
    h5: { fontFamily: "'DM Serif Display', serif", fontWeight: 400 },
    h6: { fontFamily: "'DM Sans', sans-serif", fontWeight: 700 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: { borderRadius: 14 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 20, paddingInline: 18 },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600 },
      },
    },
  },
})

export default theme
