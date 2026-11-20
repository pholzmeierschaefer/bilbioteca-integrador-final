import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Divider,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import LocalLibraryIcon from '@mui/icons-material/LocalLibrary';
import SchoolIcon from '@mui/icons-material/School';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const { usuario, login } = useAuth();
  const navigate = useNavigate();

  const [perfil, setPerfil] = useState('estudante');
  const [matricula, setMatricula] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (usuario) {
      navigate(usuario.role === 'bibliotecario' ? '/painel' : '/aluno', { replace: true });
    }
  }, [usuario, navigate]);

  function handleTrocarPerfil(_, novoPerfil) {
    if (novoPerfil) {
      setPerfil(novoPerfil);
      setErro('');
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErro('');
    setCarregando(true);

    try {
      const dadosUsuario = await login(matricula.trim(), senha, perfil);
      navigate(dadosUsuario.role === 'bibliotecario' ? '/painel' : '/aluno', { replace: true });
    } catch (err) {
      setErro(err.message || 'Falha na autenticação. Verifique matrícula e senha.');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      <Container maxWidth="xs">
        <Card elevation={3}>
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <LocalLibraryIcon color="primary" sx={{ fontSize: 48, mb: 1 }} />
              <Typography variant="h5" fontWeight={700}>
                Biblioteca HM
              </Typography>
              <Typography variant="body2" color="text.secondary">
                EEB Humberto Machado — Itapiranga/SC
              </Typography>
            </Box>

            <ToggleButtonGroup
              value={perfil}
              exclusive
              fullWidth
              color="primary"
              onChange={handleTrocarPerfil}
              sx={{ mb: 2.5 }}
            >
              <ToggleButton value="estudante" sx={{ gap: 1 }}>
                <SchoolIcon fontSize="small" />
                Estudante
              </ToggleButton>
              <ToggleButton value="administrador" sx={{ gap: 1 }}>
                <AdminPanelSettingsIcon fontSize="small" />
                Administrador
              </ToggleButton>
            </ToggleButtonGroup>

            {erro && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {erro}
              </Alert>
            )}

            <Box
              component="form"
              onSubmit={handleSubmit}
              sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
            >
              <TextField
                label="Matrícula"
                type="text"
                required
                fullWidth
                autoFocus
                value={matricula}
                onChange={(e) => setMatricula(e.target.value)}
                placeholder={perfil === 'administrador' ? 'Ex.: admin' : 'Ex.: 2026001'}
              />
              <TextField
                label="Senha"
                type="password"
                required
                fullWidth
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />
              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={carregando}
              >
                {carregando
                  ? 'Entrando...'
                  : `Entrar como ${perfil === 'administrador' ? 'Administrador' : 'Estudante'}`}
              </Button>
            </Box>

            <Divider sx={{ my: 2.5 }} />
            <Typography variant="caption" color="text.secondary" display="block">
              <strong>Acesso de teste (após yarn seed:reset):</strong>
              <br />
              Administrador: matrícula <code>admin</code> / senha <code>admin</code>
              <br />
              Estudante: matrícula <code>2026001</code> / senha <code>2026001</code>
            </Typography>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
