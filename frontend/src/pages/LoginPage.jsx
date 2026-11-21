import { useState } from 'react';
import { Alert, Box, Button, Paper, TextField, Typography } from '@mui/material';
import { apiRequest, setToken } from '../services/api';

export default function LoginPage({ onLogin }) {
  const [perfil, setPerfil] = useState('estudante');
  const [matricula, setMatricula] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');

  async function handleEntrar(event) {
    event.preventDefault();
    setErro('');

    try {
      const dados = await apiRequest('/auth/login', {
        method: 'POST',
        body: { matricula: matricula.trim(), senha, perfil },
      });

      setToken(dados.token);
      onLogin(dados.usuario);
    } catch (err) {
      setErro(err.message);
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
      }}
    >
      <Paper variant="outlined" sx={{ p: 3, width: '100%', maxWidth: 360 }}>
        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <img src="/capa.jpeg" alt="Logo HM" style={{ width: 72, height: 72, objectFit: 'contain' }} />
          <Typography variant="h6">BiblioHM</Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <Button
            fullWidth
            size="small"
            variant={perfil === 'estudante' ? 'contained' : 'outlined'}
            onClick={() => setPerfil('estudante')}
          >
            Estudante
          </Button>
          <Button
            fullWidth
            size="small"
            variant={perfil === 'administrador' ? 'contained' : 'outlined'}
            onClick={() => setPerfil('administrador')}
          >
            Administrador
          </Button>
        </Box>

        {erro && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {erro}
          </Alert>
        )}

        <form onSubmit={handleEntrar}>
          <TextField
            label="Matrícula"
            size="small"
            fullWidth
            required
            value={matricula}
            onChange={(e) => setMatricula(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Senha"
            type="password"
            size="small"
            fullWidth
            required
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Button type="submit" variant="contained" fullWidth>
            Entrar
          </Button>
        </form>
      </Paper>
    </Box>
  );
}
