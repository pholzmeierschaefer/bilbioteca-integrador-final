import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { apiRequest } from '../services/api';

export default function SecaoReservas({ onErro, onSucesso }) {
  const [lista, setLista] = useState([]);
  const [modalNova, setModalNova] = useState(false);
  const [matricula, setMatricula] = useState('');
  const [codigoObra, setCodigoObra] = useState('');

  async function carregar() {
    try {
      const dados = await apiRequest('/api/reservas');
      setLista(dados);
    } catch (err) {
      onErro(err.message);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function handleCriar(event) {
    event.preventDefault();
    try {
      await apiRequest('/api/reservas', {
        method: 'POST',
        body: { estudante_matricula: matricula.trim(), obra_codigo: codigoObra.trim() },
      });
      onSucesso('Reserva registrada!');
      setMatricula('');
      setCodigoObra('');
      setModalNova(false);
      carregar();
    } catch (err) {
      onErro(err.message);
    }
  }

  async function handleConcluir(res) {
    try {
      if (res.status === 'aguardando_retirada' && res.exemplar?.codigo_tombo) {
        await apiRequest('/api/emprestimos', {
          method: 'POST',
          body: {
            estudante_matricula: res.estudante.matricula,
            exemplar_tombo: res.exemplar.codigo_tombo,
          },
        });
        onSucesso('Reserva concluída e empréstimo criado!');
      } else {
        await apiRequest(`/api/reservas/${res.id}`, {
          method: 'PUT',
          body: { status: 'atendida' },
        });
        onSucesso('Reserva concluída!');
      }
      carregar();
    } catch (err) {
      onErro(err.message);
    }
  }

  async function handleCancelar(id) {
    try {
      await apiRequest(`/api/reservas/${id}/cancelar`, { method: 'PUT' });
      onSucesso('Reserva cancelada.');
      carregar();
    } catch (err) {
      onErro(err.message);
    }
  }

  async function handleExcluir(id) {
    try {
      await apiRequest(`/api/reservas/${id}`, { method: 'DELETE' });
      onSucesso('Reserva excluída.');
      carregar();
    } catch (err) {
      onErro(err.message);
    }
  }

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Lista de Reservas
      </Typography>

      <Button variant="contained" onClick={() => setModalNova(true)} sx={{ mb: 2 }}>
        + Nova Reserva
      </Button>

      <Paper variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Aluno</TableCell>
              <TableCell>Livro</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {lista.map((res) => {
              const ativa = res.status === 'pendente' || res.status === 'aguardando_retirada';
              return (
                <TableRow key={res.id}>
                  <TableCell>
                    {res.estudante?.nome} ({res.estudante?.matricula})
                  </TableCell>
                  <TableCell>{res.obra?.titulo}</TableCell>
                  <TableCell>{res.status}</TableCell>
                  <TableCell align="right">
                    {ativa && (
                      <>
                        <Button size="small" color="success" onClick={() => handleConcluir(res)}>
                          Concluir
                        </Button>
                        <Button size="small" color="warning" onClick={() => handleCancelar(res.id)}>
                          Cancelar
                        </Button>
                      </>
                    )}
                    <Button size="small" color="error" onClick={() => handleExcluir(res.id)}>
                      Excluir
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={modalNova} onClose={() => setModalNova(false)} fullWidth maxWidth="xs">
        <form onSubmit={handleCriar}>
          <DialogTitle>Nova Reserva</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              size="small"
              label="Matrícula do Aluno"
              required
              value={matricula}
              onChange={(e) => setMatricula(e.target.value)}
            />
            <TextField
              size="small"
              label="Código da Obra"
              required
              value={codigoObra}
              onChange={(e) => setCodigoObra(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setModalNova(false)}>Cancelar</Button>
            <Button type="submit" variant="contained">
              Reservar
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
