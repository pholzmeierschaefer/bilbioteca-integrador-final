import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
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

export default function SecaoEstudantes({ onErro, onSucesso }) {
  const [lista, setLista] = useState([]);
  const [busca, setBusca] = useState('');

  // Modal Criar / Editar
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [matricula, setMatricula] = useState('');
  const [nome, setNome] = useState('');
  const [turma, setTurma] = useState('');
  const [telefone, setTelefone] = useState('');
  const [status, setStatus] = useState('ativo');

  // Modal CSV
  const [modalCsv, setModalCsv] = useState(false);
  const [textoCsv, setTextoCsv] = useState('');

  async function carregar(termo = '') {
    try {
      const qs = termo ? `?q=${encodeURIComponent(termo)}` : '';
      const dados = await apiRequest(`/api/estudantes${qs}`);
      setLista(dados);
    } catch (err) {
      onErro(err.message);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  function abrirNovo() {
    setEditando(null);
    setMatricula('');
    setNome('');
    setTurma('');
    setTelefone('');
    setStatus('ativo');
    setModalAberto(true);
  }

  function abrirEditar(aluno) {
    setEditando(aluno);
    setMatricula(aluno.matricula);
    setNome(aluno.nome);
    setTurma(aluno.turma);
    setTelefone(aluno.telefone || '');
    setStatus(aluno.status);
    setModalAberto(true);
  }

  async function handleSalvar(event) {
    event.preventDefault();
    try {
      const corpo = { matricula, nome, turma, telefone, status };
      if (editando) {
        await apiRequest(`/api/estudantes/${encodeURIComponent(editando.matricula)}`, {
          method: 'PUT',
          body: corpo,
        });
        onSucesso('Aluno atualizado com sucesso!');
      } else {
        await apiRequest('/api/estudantes', { method: 'POST', body: corpo });
        onSucesso('Aluno cadastrado! Senha inicial = matrícula.');
      }
      setModalAberto(false);
      carregar(busca);
    } catch (err) {
      onErro(err.message);
    }
  }

  async function handleExcluir(aluno) {
    try {
      await apiRequest(`/api/estudantes/${encodeURIComponent(aluno.matricula)}`, {
        method: 'DELETE',
      });
      onSucesso(`Aluno "${aluno.nome}" inativado.`);
      carregar(busca);
    } catch (err) {
      onErro(err.message);
    }
  }

  function handleArquivoCsv(event) {
    const arquivo = event.target.files?.[0];
    if (!arquivo) return;
    const leitor = new FileReader();
    leitor.onload = (e) => setTextoCsv(String(e.target.result || ''));
    leitor.readAsText(arquivo, 'UTF-8');
  }

  async function handleImportarCsv() {
    try {
      const res = await apiRequest('/api/estudantes/importar', {
        method: 'POST',
        body: { csv: textoCsv },
      });
      onSucesso(`Importação: ${res.criados} criados, ${res.ja_existiam} já existiam.`);
      setTextoCsv('');
      setModalCsv(false);
      carregar(busca);
    } catch (err) {
      onErro(err.message);
    }
  }

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Alunos Registrados
      </Typography>

      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 2 }}>
        <Button variant="outlined" onClick={() => setModalCsv(true)} sx={{ bgcolor: '#ffffff' }}>
          Importar Planilha
        </Button>
        <Button variant="contained" onClick={abrirNovo}>
          + Novo Aluno
        </Button>
        <TextField
          size="small"
          placeholder="Pesquisar nome, matrícula ou turma..."
          value={busca}
          onChange={(e) => {
            setBusca(e.target.value);
            carregar(e.target.value);
          }}
          sx={{ ml: 'auto', minWidth: 260, bgcolor: '#ffffff' }}
        />
      </Box>

      <Paper variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Matrícula</TableCell>
              <TableCell>Nome</TableCell>
              <TableCell>Contato / Turma</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {lista.map((aluno) => (
              <TableRow key={aluno.id}>
                <TableCell>{aluno.matricula}</TableCell>
                <TableCell>{aluno.nome}</TableCell>
                <TableCell>
                  <div>{aluno.telefone || 'Sem contato'}</div>
                  <Typography variant="caption" color="text.secondary">
                    {aluno.turma}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography
                    variant="body2"
                    color={
                      aluno.status === 'ativo'
                        ? 'success.main'
                        : aluno.status === 'bloqueado'
                          ? 'error.main'
                          : 'text.secondary'
                    }
                  >
                    {aluno.status}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Button size="small" onClick={() => abrirEditar(aluno)}>
                    Editar
                  </Button>
                  <Button size="small" color="error" onClick={() => handleExcluir(aluno)}>
                    Excluir
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      {/* Modal Criar / Editar Aluno */}
      <Dialog open={modalAberto} onClose={() => setModalAberto(false)} fullWidth maxWidth="xs">
        <form onSubmit={handleSalvar}>
          <DialogTitle>{editando ? 'Editar Aluno' : 'Novo Aluno'}</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              size="small"
              label="Matrícula"
              required
              value={matricula}
              onChange={(e) => setMatricula(e.target.value)}
            />
            <TextField
              size="small"
              label="Nome Completo"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
            <TextField
              size="small"
              label="Turma"
              required
              value={turma}
              onChange={(e) => setTurma(e.target.value)}
            />
            <TextField
              size="small"
              label="Telefone"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
            />
            {editando && (
              <TextField
                size="small"
                select
                label="Status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <MenuItem value="ativo">Ativo</MenuItem>
                <MenuItem value="bloqueado">Bloqueado</MenuItem>
                <MenuItem value="inativo">Inativo</MenuItem>
              </TextField>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setModalAberto(false)}>Cancelar</Button>
            <Button type="submit" variant="contained">
              Salvar
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Modal Importar CSV */}
      <Dialog open={modalCsv} onClose={() => setModalCsv(false)} fullWidth maxWidth="sm">
        <DialogTitle>Importar Planilha CSV</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <Typography variant="body2">
            Formato: <b>matricula;nome;turma;telefone</b>
          </Typography>
          <input type="file" accept=".csv,text/csv" onChange={handleArquivoCsv} />
          <TextField
            multiline
            rows={5}
            size="small"
            value={textoCsv}
            onChange={(e) => setTextoCsv(e.target.value)}
            placeholder="matricula;nome;turma;telefone"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalCsv(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleImportarCsv}>
            Importar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
