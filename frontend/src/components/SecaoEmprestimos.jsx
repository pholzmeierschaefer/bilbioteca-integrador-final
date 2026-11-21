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
import { apiRequest, formatarData } from '../services/api';

export default function SecaoEmprestimos({ onErro, onSucesso }) {
  const [lista, setLista] = useState([]);
  const [modalNovo, setModalNovo] = useState(false);
  const [matricula, setMatricula] = useState('');
  const [tombo, setTombo] = useState('');

  async function carregar() {
    try {
      const dados = await apiRequest('/api/emprestimos');
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
      const novo = await apiRequest('/api/emprestimos', {
        method: 'POST',
        body: { estudante_matricula: matricula.trim(), exemplar_tombo: tombo.trim() },
      });
      onSucesso(`Empréstimo registrado! Prazo: ${formatarData(novo.data_devolucao_prevista)}.`);
      setMatricula('');
      setTombo('');
      setModalNovo(false);
      carregar();
    } catch (err) {
      onErro(err.message);
    }
  }

  async function handleDevolver(id) {
    try {
      const res = await apiRequest(`/api/emprestimos/${id}/devolver`, { method: 'PUT' });
      onSucesso(res.mensagem);
      carregar();
    } catch (err) {
      onErro(err.message);
    }
  }

  async function handleRenovar(id) {
    try {
      const res = await apiRequest(`/api/emprestimos/${id}/renovar`, { method: 'PUT' });
      onSucesso(`Renovado até ${formatarData(res.data_devolucao_prevista)}.`);
      carregar();
    } catch (err) {
      onErro(err.message);
    }
  }

  async function handleExcluir(id) {
    try {
      await apiRequest(`/api/emprestimos/${id}`, { method: 'DELETE' });
      onSucesso('Empréstimo excluído.');
      carregar();
    } catch (err) {
      onErro(err.message);
    }
  }

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Controle de Empréstimos
      </Typography>

      <Button variant="contained" onClick={() => setModalNovo(true)} sx={{ mb: 2 }}>
        + Novo Empréstimo
      </Button>

      <Paper variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Aluno (Matrícula)</TableCell>
              <TableCell>Livro / Tombo</TableCell>
              <TableCell>Prazo / Status</TableCell>
              <TableCell align="right">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {lista.map((emp) => {
              const aberto = emp.data_devolucao_realizada === null;
              return (
                <TableRow key={emp.id}>
                  <TableCell>
                    <div>{emp.estudante?.nome}</div>
                    <Typography variant="caption" color="text.secondary">
                      ({emp.estudante?.matricula})
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <div>{emp.exemplar?.obra?.titulo}</div>
                    <Typography variant="caption" color="text.secondary">
                      Tombo: {emp.exemplar?.codigo_tombo}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="caption"
                      display="block"
                      sx={{ color: emp.atrasado ? '#dc2626' : '#16a34a', fontWeight: 'bold' }}
                    >
                      {aberto ? (emp.atrasado ? `Atrasado (${emp.dias_atraso}d)` : 'Ativo') : 'Devolvido'}
                    </Typography>
                    <Typography variant="caption">
                      Até: {formatarData(emp.data_devolucao_prevista)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    {aberto && (
                      <>
                        <Button size="small" color="success" onClick={() => handleDevolver(emp.id)}>
                          Devolver
                        </Button>
                        <Button size="small" onClick={() => handleRenovar(emp.id)}>
                          Renovar
                        </Button>
                      </>
                    )}
                    <Button size="small" color="error" onClick={() => handleExcluir(emp.id)}>
                      Excluir
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={modalNovo} onClose={() => setModalNovo(false)} fullWidth maxWidth="xs">
        <form onSubmit={handleCriar}>
          <DialogTitle>Novo Empréstimo</DialogTitle>
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
              label="Código de Tombo"
              required
              value={tombo}
              onChange={(e) => setTombo(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setModalNovo(false)}>Cancelar</Button>
            <Button type="submit" variant="contained">
              Registrar
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
