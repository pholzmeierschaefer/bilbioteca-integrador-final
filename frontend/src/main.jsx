import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import App from './App';

const tema = createTheme({
  palette: {
    primary: { main: '#ffdab9', dark: '#f4c095', contrastText: '#3e2723' },
    secondary: { main: '#8d6e63', contrastText: '#ffffff' },
    error: { main: '#d32f2f' },
    background: { default: '#fffaf5' },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        outlinedPrimary: { color: '#5d4037', borderColor: '#e0b08a' },
        textPrimary: { color: '#5d4037' },
      },
    },
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider theme={tema}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </StrictMode>
);
