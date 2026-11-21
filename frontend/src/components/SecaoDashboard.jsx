import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { apiRequest, baixarCsv, formatarData } from '../services/api';

export default function SecaoDashboard({ onErro, onSucesso }) {
  const [dashboard, setDashboard] = useState(null);
  const [totalAlunos, setTotalAlunos] = useState(0);
  const [totalLivros, setTotalLivros] = useState(0);

  async function carregar() {
    try {
      const [dash, alunos, livros] = await Promise.all([
        apiRequest('/api/emprestimos/dashboard'),
        apiRequest('/api/estudantes'),
        apiRequest('/api/livros'),
      ]);
      setDashboard(dash);
      setTotalAlunos(alunos.filter((a) => a.status !== 'inativo').length);
      setTotalLivros(livros.length);
    } catch (err) {
      onErro(err.message);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function handleDevolver(id) {
    try {
      const res = await apiRequest(`/api/emprestimos/${id}/devolver`, { method: 'PUT' });
      onSucesso(res.mensagem);
      carregar();
    } catch (err) {
      onErro(err.message);
    }
  }

  async function handleExportar(tipo) {
    try {
      await baixarCsv(`/api/relatorios/${tipo}?formato=csv`, `${tipo}.csv`);
    } catch (err) {
      onErro(err.message);
    }
  }

  const ind = dashboard?.indicadores || {};
  const criticos = dashboard?.atrasos_criticos || [];

  return (
    <Box>
      <Typography variant="h5">Visão Geral</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Acompanhamento em tempo real da biblioteca.
      </Typography>

      {/* Botões de exportação CSV (RF12) */}
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 3 }}>
        <Button size="small" variant="outlined" onClick={() => handleExportar('livros-mais-lidos')}>
          Exportar Livros Mais Lidos (CSV)
        </Button>
        <Button size="small" variant="outlined" onClick={() => handleExportar('frequencia-turmas')}>
          Exportar Frequência por Turma (CSV)
        </Button>
        <Button size="small" variant="outlined" onClick={() => handleExportar('taxas-atraso')}>
          Exportar Taxas de Atraso (CSV)
        </Button>
      </Box>

      {/* Cards de resumo simples */}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
        <Paper variant="outlined" sx={{ p: 2, minWidth: 150 }}>
          <Typography variant="body2">Total de Alunos</Typography>
          <Typography variant="h5">{totalAlunos}</Typography>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2, minWidth: 150 }}>
          <Typography variant="body2">Livros no Acervo</Typography>
          <Typography variant="h5">{totalLivros}</Typography>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2, minWidth: 150 }}>
          <Typography variant="body2">Empréstimos Ativos</Typography>
          <Typography variant="h5">{ind.total_emprestimos_ativos || 0}</Typography>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2, minWidth: 150 }}>
          <Typography variant="body2">Livros Atrasados</Typography>
          <Typography variant="h5" color={ind.total_atrasos ? 'error' : 'inherit'}>
            {ind.total_atrasos || 0}
          </Typography>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2, minWidth: 150 }}>
          <Typography variant="body2">Devoluções Hoje</Typography>
          <Typography variant="h5">{ind.devolucoes_previstas_hoje || 0}</Typography>
        </Paper>
      </Box>

      {/* Atrasos críticos (> 10 dias) */}
      <Typography variant="subtitle1" color="error" sx={{ mb: 1 }}>
        Atrasos Críticos (&gt; 10 dias)
      </Typography>
      <Paper variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Estudante</TableCell>
              <TableCell>Turma / Telefone</TableCell>
              <TableCell>Livro / Tombo</TableCell>
              <TableCell>Previsto</TableCell>
              <TableCell>Atraso</TableCell>
              <TableCell>Ação</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {criticos.map((item) => (
              <TableRow key={item.emprestimo_id} sx={{ bgcolor: '#fee2e2' }}>
                <TableCell>
                  {item.aluno?.nome} ({item.aluno?.matricula})
                </TableCell>
                <TableCell>
                  {item.aluno?.turma} • {item.aluno?.telefone || 'Sem contato'}
                </TableCell>
                <TableCell>
                  {item.livro?.titulo} ({item.livro?.exemplar_tombo})
                </TableCell>
                <TableCell>{formatarData(item.data_devolucao_prevista)}</TableCell>
                <TableCell>
                  <b>{item.dias_atraso} dias</b>
                </TableCell>
                <TableCell>
                  <Button
                    size="small"
                    variant="contained"
                    color="secondary"
                    onClick={() => handleDevolver(item.emprestimo_id)}
                  >
                    Devolver
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {criticos.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>Nenhum atraso crítico no momento.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
