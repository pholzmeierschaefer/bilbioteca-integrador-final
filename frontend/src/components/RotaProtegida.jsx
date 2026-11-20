import { Box, CircularProgress } from '@mui/material';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function RotaProtegida({ papeisPermitidos = [], children }) {
  const { usuario, carregandoSessao } = useAuth();

  if (carregandoSessao) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  if (papeisPermitidos.length > 0 && !papeisPermitidos.includes(usuario.role)) {
    return <Navigate to={usuario.role === 'bibliotecario' ? '/painel' : '/aluno'} replace />;
  }

  return children;
}
