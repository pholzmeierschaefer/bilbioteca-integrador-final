import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material';

/**
 * RF11: Modal para o estudante enviar justificativa de atraso vinculada a um empréstimo.
 */
export default function ModalJustificativa({ aberto, emprestimo, onFechar, onEnviar }) {
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (aberto) {
      setTexto('');
      setErro('');
    }
  }, [aberto, emprestimo]);

  async function handleConfirmar(event) {
    event.preventDefault();
    if (texto.trim().length < 5) {
      setErro('Descreva o motivo do atraso com pelo menos 5 caracteres.');
      return;
    }

    setEnviando(true);
    setErro('');
    try {
      await onEnviar(emprestimo.id, texto.trim());
      onFechar();
    } catch (err) {
      setErro(err.message || 'Não foi possível enviar a justificativa.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={aberto} onClose={onFechar} fullWidth maxWidth="sm">
      <form onSubmit={handleConfirmar}>
        <DialogTitle>Enviar Justificativa de Atraso</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {emprestimo && (
            <Typography variant="body2" color="text.secondary">
              Obra: <strong>{emprestimo.exemplar?.obra?.titulo || '—'}</strong> (Tombo:{' '}
              {emprestimo.exemplar?.codigo_tombo || '—'})
            </Typography>
          )}

          {erro && <Alert severity="error">{erro}</Alert>}

          <TextField
            label="Motivo do atraso"
            multiline
            minRows={3}
            fullWidth
            required
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Ex.: Estive ausente por motivo de saúde e entregarei o livro na próxima aula."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onFechar} disabled={enviando}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={enviando}>
            {enviando ? 'Enviando...' : 'Enviar Justificativa'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

