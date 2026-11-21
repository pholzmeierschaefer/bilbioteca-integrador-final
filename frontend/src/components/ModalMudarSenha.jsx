import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material';
import { apiRequest } from '../services/api';

export default function ModalMudarSenha({ aberto, onFechar, onSucesso }) {
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (aberto) {
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmacao('');
      setErro('');
    }
  }, [aberto]);

  async function handleSubmit(event) {
    event.preventDefault();
    setErro('');

    if (novaSenha.length < 4) {
      setErro('A nova senha deve ter no mínimo 4 caracteres.');
      return;
    }
    if (novaSenha !== confirmacao) {
      setErro('A confirmação da nova senha não confere.');
      return;
    }

    setSalvando(true);
    try {
      await apiRequest('/auth/senha', {
        method: 'PUT',
        body: { senha_atual: senhaAtual, nova_senha: novaSenha },
      });
      if (onSucesso) onSucesso('Senha alterada com sucesso!');
      onFechar();
    } catch (err) {
      setErro(err.message || 'Não foi possível alterar a senha.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={aberto} onClose={onFechar} fullWidth maxWidth="xs">
      <form onSubmit={handleSubmit}>
        <DialogTitle>Mudar Senha</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {erro && <Alert severity="error">{erro}</Alert>}
          <TextField
            label="Senha atual"
            type="password"
            size="small"
            required
            fullWidth
            value={senhaAtual}
            onChange={(e) => setSenhaAtual(e.target.value)}
          />
          <TextField
            label="Nova senha"
            type="password"
            size="small"
            required
            fullWidth
            value={novaSenha}
            onChange={(e) => setNovaSenha(e.target.value)}
          />
          <TextField
            label="Confirmar nova senha"
            type="password"
            size="small"
            required
            fullWidth
            value={confirmacao}
            onChange={(e) => setConfirmacao(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onFechar} disabled={salvando}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar Nova Senha'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
