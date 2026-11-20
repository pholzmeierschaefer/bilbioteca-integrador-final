import { AppBar, Box, Button, Chip, Toolbar, Typography } from '@mui/material';
import LocalLibraryIcon from '@mui/icons-material/LocalLibrary';
import LogoutIcon from '@mui/icons-material/Logout';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function BarraTopo({ subtitulo }) {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();

  function handleSair() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <AppBar position="sticky" elevation={1}>
      <Toolbar sx={{ gap: 1.5, flexWrap: 'wrap' }}>
        <LocalLibraryIcon />
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h6" component="div" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
            Biblioteca HM — EEB Humberto Machado
          </Typography>
          {subtitulo && (
            <Typography variant="caption" sx={{ opacity: 0.9 }}>
              {subtitulo}
            </Typography>
          )}
        </Box>

        {usuario && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Chip
              label={`${usuario.nome} (${usuario.role === 'bibliotecario' ? 'Administrador' : 'Estudante'})`}
              size="small"
              sx={{ bgcolor: 'rgba(255,255,255,0.18)', color: '#fff' }}
            />
            <Button
              color="inherit"
              size="small"
              variant="outlined"
              startIcon={<LogoutIcon />}
              onClick={handleSair}
              sx={{ borderColor: 'rgba(255,255,255,0.5)' }}
            >
              Sair
            </Button>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
}

