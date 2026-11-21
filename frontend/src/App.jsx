import { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { apiRequest, getToken, setToken } from './services/api';
import LoginPage from './pages/LoginPage';
import DashboardAdmin from './pages/DashboardAdmin';
import PortalAluno from './pages/PortalAluno';

export default function App() {
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function verificarLogin() {
      if (!getToken()) {
        setCarregando(false);
        return;
      }

      try {
        const perfil = await apiRequest('/auth/perfil');
        setUsuario(perfil);
      } catch {
        setToken(null);
        setUsuario(null);
      } finally {
        setCarregando(false);
      }
    }

    verificarLogin();
  }, []);

  function handleSair() {
    setToken(null);
    setUsuario(null);
  }

  if (carregando) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography>Carregando...</Typography>
      </Box>
    );
  }

  if (!usuario) {
    return <LoginPage onLogin={setUsuario} />;
  }

  if (usuario.role === 'bibliotecario') {
    return <DashboardAdmin usuario={usuario} onSair={handleSair} />;
  }

  return <PortalAluno usuario={usuario} onSair={handleSair} />;
}
