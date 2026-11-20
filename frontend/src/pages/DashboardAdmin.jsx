import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid2,
  MenuItem,
  Paper,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AssignmentReturnIcon from '@mui/icons-material/AssignmentReturn';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import SearchIcon from '@mui/icons-material/Search';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import BarraTopo from '../components/BarraTopo';
import TabelaAtrasos from '../components/TabelaAtrasos';
import { apiRequest, baixarCsv, formatarData } from '../services/api';

const STATUS_ESTUDANTE_CHIP = {
  ativo: { label: 'Ativo', color: 'success' },
  bloqueado: { label: 'Bloqueado', color: 'error' },
  inativo: { label: 'Inativo', color: 'default' },
};

const STATUS_EXEMPLAR_CHIP = {
  disponivel: { label: 'Disponível', color: 'success' },
  emprestado: { label: 'Emprestado', color: 'primary' },
  retido_reserva: { label: 'Retido Reserva', color: 'warning' },
  inativo: { label: 'Inativo', color: 'default' },
};

export default function DashboardAdmin() {
  const [aba, setAba] = useState(0);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  // --- Estado Dashboard (RF09) ---
  const [dashboard, setDashboard] = useState(null);

  // --- Estado Balcão & Reservas (RF05–RF08) ---
  const [emprestimosAtivos, setEmprestimosAtivos] = useState([]);
  const [reservas, setReservas] = useState([]);
  const [formEmprestimo, setFormEmprestimo] = useState({
    estudante_matricula: '',
    exemplar_tombo: '',
  });
  const [tomboDevolucao, setTomboDevolucao] = useState('');

  // --- Estado Acervo & Exemplares (RF01, RF02, RF10) ---
  const [obras, setObras] = useState([]);
  const [filtroObras, setFiltroObras] = useState({ q: '', tipo: '', categoria: '' });
  const [formObra, setFormObra] = useState({
    codigo: '',
    titulo: '',
    autor: '',
    editora: '',
    tipo: 'Literatura',
    categoria: 'Romance',
  });
  const [obraSelecionada, setObraSelecionada] = useState(null);
  const [exemplaresObra, setExemplaresObra] = useState([]);
  const [novoTombo, setNovoTombo] = useState('');

  // --- Estado Estudantes & Importação CSV (RF03, RF04) ---
  const [estudantes, setEstudantes] = useState([]);
  const [filtroEstudantes, setFiltroEstudantes] = useState({ q: '', status: '' });
  const [formEstudante, setFormEstudante] = useState({
    matricula: '',
    nome: '',
    turma: '',
    telefone: '',
  });
  const [textoCsv, setTextoCsv] = useState('');

  // --- Estado Relatórios (RF12) ---
  const [filtroRelatorio, setFiltroRelatorio] = useState({ mes: '', ano: '' });
  const [relLivros, setRelLivros] = useState(null);
  const [relTurmas, setRelTurmas] = useState(null);
  const [relAtrasos, setRelAtrasos] = useState(null);

  const limparMensagens = () => {
    setErro('');
    setSucesso('');
  };

  const carregarDashboard = useCallback(async () => {
    const dados = await apiRequest('/api/emprestimos/dashboard');
    setDashboard(dados);
  }, []);

  const carregarBalcao = useCallback(async () => {
    const [listaEmp, listaRes] = await Promise.all([
      apiRequest('/api/emprestimos?apenas_ativos=true'),
      apiRequest('/api/reservas'),
    ]);
    setEmprestimosAtivos(listaEmp);
    setReservas(listaRes);
  }, []);

  const carregarObras = useCallback(async (filtros = {}) => {
    const params = new URLSearchParams();
    if (filtros.q?.trim()) params.set('q', filtros.q.trim());
    if (filtros.tipo?.trim()) params.set('tipo', filtros.tipo.trim());
    if (filtros.categoria?.trim()) params.set('categoria', filtros.categoria.trim());
    const qs = params.toString() ? `?${params.toString()}` : '';
    const lista = await apiRequest(`/api/livros${qs}`);
    setObras(lista);
  }, []);

  const carregarEstudantes = useCallback(async (filtros = {}) => {
    const params = new URLSearchParams();
    if (filtros.q?.trim()) params.set('q', filtros.q.trim());
    if (filtros.status?.trim()) params.set('status', filtros.status.trim());
    const qs = params.toString() ? `?${params.toString()}` : '';
    const lista = await apiRequest(`/api/estudantes${qs}`);
    setEstudantes(lista);
  }, []);

  const carregarRelatorios = useCallback(async (filtros = {}) => {
    const params = new URLSearchParams();
    if (filtros.mes) params.set('mes', filtros.mes);
    if (filtros.ano) params.set('ano', filtros.ano);
    const qs = params.toString() ? `?${params.toString()}` : '';

    const [livros, turmas, atrasos] = await Promise.all([
      apiRequest(`/api/relatorios/livros-mais-lidos${qs}`),
      apiRequest(`/api/relatorios/frequencia-turmas${qs}`),
      apiRequest(`/api/relatorios/taxas-atraso${qs}`),
    ]);

    setRelLivros(livros);
    setRelTurmas(turmas);
    setRelAtrasos(atrasos);
  }, []);

  useEffect(() => {
    async function carregarAbaAtual() {
      try {
        if (aba === 0) await carregarDashboard();
        else if (aba === 1) await carregarBalcao();
        else if (aba === 2) await carregarObras(filtroObras);
        else if (aba === 3) await carregarEstudantes(filtroEstudantes);
        else if (aba === 4) await carregarRelatorios(filtroRelatorio);
      } catch (err) {
        setErro(err.message);
      }
    }
    carregarAbaAtual();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aba]);

  // =====================================================================
  // AÇÕES DE BALCÃO (EMPRÉSTIMO, DEVOLUÇÃO, RENOVAÇÃO, RESERVAS)
  // =====================================================================

  async function handleRegistrarEmprestimo(event) {
    event.preventDefault();
    limparMensagens();
    try {
      const novo = await apiRequest('/api/emprestimos', {
        method: 'POST',
        body: formEmprestimo,
      });
      setSucesso(
        `Empréstimo registrado para ${novo.estudante?.nome}! Devolução prevista: ${formatarData(novo.data_devolucao_prevista)}.`
      );
      setFormEmprestimo({ estudante_matricula: '', exemplar_tombo: '' });
      await Promise.all([carregarBalcao(), carregarDashboard()]);
    } catch (err) {
      setErro(err.message);
    }
  }

  async function handleDevolverPorId(emprestimoId) {
    limparMensagens();
    try {
      const res = await apiRequest(`/api/emprestimos/${emprestimoId}/devolver`, {
        method: 'PATCH',
      });
      const extraDesbloqueio = res.estudante_desbloqueado
        ? ' Estudante desbloqueado automaticamente.'
        : '';
      setSucesso(`${res.mensagem}${extraDesbloqueio}`);
      await Promise.all([carregarDashboard(), carregarBalcao()]);
    } catch (err) {
      setErro(err.message);
    }
  }

  async function handleDevolverPorTombo(event) {
    event.preventDefault();
    limparMensagens();
    try {
      const res = await apiRequest('/api/emprestimos/devolver', {
        method: 'PATCH',
        body: { exemplar_tombo: tomboDevolucao.trim() },
      });
      const extraDesbloqueio = res.estudante_desbloqueado
        ? ' Estudante desbloqueado automaticamente.'
        : '';
      setSucesso(`${res.mensagem}${extraDesbloqueio}`);
      setTomboDevolucao('');
      await Promise.all([carregarDashboard(), carregarBalcao()]);
    } catch (err) {
      setErro(err.message);
    }
  }

  async function handleRenovar(emprestimoId) {
    limparMensagens();
    try {
      const renovado = await apiRequest(`/api/emprestimos/${emprestimoId}/renovar`, {
        method: 'PATCH',
      });
      setSucesso(
        `Empréstimo renovado (+7 dias)! Nova data prevista: ${formatarData(renovado.data_devolucao_prevista)}.`
      );
      await carregarBalcao();
    } catch (err) {
      setErro(err.message);
    }
  }

  async function handleCancelarReserva(reservaId) {
    limparMensagens();
    try {
      await apiRequest(`/api/reservas/${reservaId}/cancelar`, { method: 'PATCH' });
      setSucesso('Reserva cancelada.');
      await carregarBalcao();
    } catch (err) {
      setErro(err.message);
    }
  }

  // =====================================================================
  // AÇÕES DE ACERVO E EXEMPLARES (RF01, RF02, RN-06)
  // =====================================================================

  async function handleCriarObra(event) {
    event.preventDefault();
    limparMensagens();
    try {
      await apiRequest('/api/livros', { method: 'POST', body: formObra });
      setSucesso(`Obra "${formObra.titulo}" catalogada com sucesso.`);
      setFormObra({
        codigo: '',
        titulo: '',
        autor: '',
        editora: '',
        tipo: 'Literatura',
        categoria: 'Romance',
      });
      await carregarObras(filtroObras);
    } catch (err) {
      setErro(err.message);
    }
  }

  async function handleExcluirObra(obra) {
    limparMensagens();
    try {
      await apiRequest(`/api/livros/${obra.id}`, { method: 'DELETE' });
      setSucesso(`Obra "${obra.titulo}" excluída.`);
      await carregarObras(filtroObras);
    } catch (err) {
      setErro(err.message);
    }
  }

  async function abrirModalExemplares(obra) {
    limparMensagens();
    try {
      const dados = await apiRequest(`/api/livros/${encodeURIComponent(obra.codigo)}/exemplares`);
      setObraSelecionada(obra);
      setExemplaresObra(dados.exemplares || []);
      setNovoTombo('');
    } catch (err) {
      setErro(err.message);
    }
  }

  async function handleAdicionarExemplar(event) {
    event.preventDefault();
    if (!obraSelecionada) return;
    limparMensagens();
    try {
      await apiRequest(`/api/livros/${encodeURIComponent(obraSelecionada.codigo)}/exemplares`, {
        method: 'POST',
        body: { codigo_tombo: novoTombo.trim() },
      });
      setNovoTombo('');
      setSucesso('Exemplar físico cadastrado com sucesso (RN-06).');
      const dados = await apiRequest(
        `/api/livros/${encodeURIComponent(obraSelecionada.codigo)}/exemplares`
      );
      setExemplaresObra(dados.exemplares || []);
      await carregarObras(filtroObras);
    } catch (err) {
      setErro(err.message);
    }
  }

  async function handleAlterarStatusExemplar(tombo, novoStatus) {
    limparMensagens();
    try {
      await apiRequest(`/api/livros/exemplares/${encodeURIComponent(tombo)}`, {
        method: 'PATCH',
        body: { status: novoStatus },
      });
      const dados = await apiRequest(
        `/api/livros/${encodeURIComponent(obraSelecionada.codigo)}/exemplares`
      );
      setExemplaresObra(dados.exemplares || []);
      await carregarObras(filtroObras);
      setSucesso(`Status do exemplar ${tombo} atualizado para "${novoStatus}".`);
    } catch (err) {
      setErro(err.message);
    }
  }

  // =====================================================================
  // AÇÕES DE ESTUDANTES E IMPORTAÇÃO CSV (RF03, RF04)
  // =====================================================================

  async function handleCriarEstudante(event) {
    event.preventDefault();
    limparMensagens();
    try {
      await apiRequest('/api/estudantes', { method: 'POST', body: formEstudante });
      setSucesso(
        `Estudante "${formEstudante.nome}" cadastrado (senha inicial = matrícula ${formEstudante.matricula}).`
      );
      setFormEstudante({ matricula: '', nome: '', turma: '', telefone: '' });
      await carregarEstudantes(filtroEstudantes);
    } catch (err) {
      setErro(err.message);
    }
  }

  async function handleAlterarStatusEstudante(matricula, novoStatus) {
    limparMensagens();
    try {
      await apiRequest(`/api/estudantes/${encodeURIComponent(matricula)}/status`, {
        method: 'PATCH',
        body: { status: novoStatus },
      });
      setSucesso(`Status da matrícula ${matricula} alterado para "${novoStatus}".`);
      await carregarEstudantes(filtroEstudantes);
    } catch (err) {
      setErro(err.message);
    }
  }

  function handleLerArquivoCsv(event) {
    const arquivo = event.target.files?.[0];
    if (!arquivo) return;
    const leitor = new FileReader();
    leitor.onload = (e) => setTextoCsv(String(e.target?.result || ''));
    leitor.readAsText(arquivo, 'UTF-8');
  }

  async function handleImportarCsv() {
    limparMensagens();
    if (!textoCsv.trim()) {
      setErro('Selecione um arquivo .csv ou cole o conteúdo CSV antes de importar.');
      return;
    }
    try {
      const resultado = await apiRequest('/api/estudantes/importar', {
        method: 'POST',
        body: { csv: textoCsv },
      });
      setSucesso(
        `Importação concluída: ${resultado.criados} criado(s), ${resultado.ja_existiam} já existia(m), ${resultado.invalidos} inválido(s).`
      );
      setTextoCsv('');
      await carregarEstudantes(filtroEstudantes);
    } catch (err) {
      setErro(err.message);
    }
  }

  // =====================================================================
  // EXPORTAÇÃO CSV DE RELATÓRIOS (RF12)
  // =====================================================================

  async function handleBaixarRelatorioCsv(tipo) {
    limparMensagens();
    try {
      const params = new URLSearchParams({ formato: 'csv' });
      if (filtroRelatorio.mes) params.set('mes', filtroRelatorio.mes);
      if (filtroRelatorio.ano) params.set('ano', filtroRelatorio.ano);
      await baixarCsv(`/api/relatorios/${tipo}?${params.toString()}`, `${tipo}.csv`);
    } catch (err) {
      setErro(err.message);
    }
  }

  const indicadores = dashboard?.indicadores;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: 6 }}>
      <BarraTopo subtitulo="Painel da Bibliotecária" />

      <Container maxWidth="xl" sx={{ mt: 3 }}>
        {erro && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErro('')}>
            {erro}
          </Alert>
        )}
        {sucesso && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSucesso('')}>
            {sucesso}
          </Alert>
        )}

        <Paper sx={{ mb: 3 }}>
          <Tabs
            value={aba}
            onChange={(_, novaAba) => {
              limparMensagens();
              setAba(novaAba);
            }}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="Dashboard" />
            <Tab label="Balcão & Reservas" />
            <Tab label="Acervo & Exemplares" />
            <Tab label="Estudantes & CSV" />
            <Tab label="Relatórios" />
          </Tabs>
        </Paper>

        {/* ============================================================= */}
        {/* ABA 0: DASHBOARD GERENCIAL (RF09)                             */}
        {/* ============================================================= */}
        {aba === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Grid2 container spacing={2}>
              <Grid2 size={{ xs: 12, sm: 6, md: 3 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="body2" color="text.secondary">
                      Empréstimos Ativos
                    </Typography>
                    <Typography variant="h4" fontWeight={700} color="primary.main">
                      {indicadores?.total_emprestimos_ativos ?? 0}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid2>
              <Grid2 size={{ xs: 12, sm: 6, md: 3 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="body2" color="text.secondary">
                      Devoluções Previstas Hoje
                    </Typography>
                    <Typography variant="h4" fontWeight={700} color="info.main">
                      {indicadores?.devolucoes_previstas_hoje ?? 0}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid2>
              <Grid2 size={{ xs: 12, sm: 6, md: 3 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="body2" color="text.secondary">
                      Atrasos Gerais
                    </Typography>
                    <Typography variant="h4" fontWeight={700} color="warning.main">
                      {indicadores?.total_atrasos ?? 0}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid2>
              <Grid2 size={{ xs: 12, sm: 6, md: 3 }}>
                <Card
                  variant="outlined"
                  sx={{
                    borderColor:
                      (indicadores?.total_atrasos_criticos ?? 0) > 0 ? 'error.main' : 'divider',
                    bgcolor:
                      (indicadores?.total_atrasos_criticos ?? 0) > 0
                        ? 'rgba(211, 47, 47, 0.06)'
                        : 'background.paper',
                  }}
                >
                  <CardContent>
                    <Typography variant="body2" color="error.main" fontWeight={600}>
                      Atrasos Críticos (&gt; 10 dias)
                    </Typography>
                    <Typography variant="h4" fontWeight={700} color="error.main">
                      {indicadores?.total_atrasos_criticos ?? 0}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid2>
            </Grid2>

            <TabelaAtrasos
              titulo="Atrasos Críticos (> 10 dias)"
              somenteCriticos
              itens={dashboard?.atrasos_criticos || []}
              onDevolver={handleDevolverPorId}
            />

            <TabelaAtrasos
              titulo="Todos os Empréstimos em Atraso"
              itens={dashboard?.atrasos_gerais || []}
              onDevolver={handleDevolverPorId}
            />
          </Box>
        )}

        {/* ============================================================= */}
        {/* ABA 1: BALCÃO (EMPRÉSTIMOS, DEVOLUÇÃO, RENOVAÇÃO) & RESERVAS  */}
        {/* ============================================================= */}
        {aba === 1 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Grid2 container spacing={2}>
              <Grid2 size={{ xs: 12, md: 7 }}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
                    Registrar Novo Empréstimo (Prazo: 7 dias • Limite: 2 livros)
                  </Typography>
                  <Box
                    component="form"
                    onSubmit={handleRegistrarEmprestimo}
                    sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}
                  >
                    <TextField
                      size="small"
                      required
                      label="Matrícula do Estudante"
                      value={formEmprestimo.estudante_matricula}
                      onChange={(e) =>
                        setFormEmprestimo((prev) => ({
                          ...prev,
                          estudante_matricula: e.target.value,
                        }))
                      }
                      placeholder="Ex.: 2026001"
                    />
                    <TextField
                      size="small"
                      required
                      label="Código de Tombo do Exemplar"
                      value={formEmprestimo.exemplar_tombo}
                      onChange={(e) =>
                        setFormEmprestimo((prev) => ({ ...prev, exemplar_tombo: e.target.value }))
                      }
                      placeholder="Ex.: TOMBO-001"
                    />
                    <Button type="submit" variant="contained" startIcon={<AddIcon />}>
                      Emprestar
                    </Button>
                  </Box>
                </Paper>
              </Grid2>

              <Grid2 size={{ xs: 12, md: 5 }}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
                    Devolução Rápida por Tombo (RF06)
                  </Typography>
                  <Box
                    component="form"
                    onSubmit={handleDevolverPorTombo}
                    sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}
                  >
                    <TextField
                      size="small"
                      required
                      label="Código de Tombo"
                      value={tomboDevolucao}
                      onChange={(e) => setTomboDevolucao(e.target.value)}
                      placeholder="Ex.: TOMBO-005"
                      sx={{ flexGrow: 1 }}
                    />
                    <Button
                      type="submit"
                      variant="contained"
                      color="secondary"
                      startIcon={<AssignmentReturnIcon />}
                    >
                      Dar Baixa
                    </Button>
                  </Box>
                </Paper>
              </Grid2>
            </Grid2>

            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
                Empréstimos Ativos ({emprestimosAtivos.length})
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Estudante</TableCell>
                      <TableCell>Livro / Tombo</TableCell>
                      <TableCell>Empréstimo</TableCell>
                      <TableCell>Previsto</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Ações</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {emprestimosAtivos.map((emp) => (
                      <TableRow
                        key={emp.id}
                        sx={{
                          bgcolor: emp.critico ? 'rgba(211, 47, 47, 0.08)' : 'inherit',
                        }}
                      >
                        <TableCell>
                          <strong>{emp.estudante?.nome}</strong> ({emp.estudante?.matricula})
                          <Typography variant="caption" display="block" color="text.secondary">
                            {emp.estudante?.turma}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {emp.exemplar?.obra?.titulo}
                          <Typography variant="caption" display="block" color="text.secondary">
                            Tombo: {emp.exemplar?.codigo_tombo} • Renovações: {emp.renovacoes}
                          </Typography>
                        </TableCell>
                        <TableCell>{formatarData(emp.data_emprestimo)}</TableCell>
                        <TableCell>{formatarData(emp.data_devolucao_prevista)}</TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={emp.atrasado ? `Atrasado (${emp.dias_atraso}d)` : 'Ativo'}
                            color={emp.critico ? 'error' : emp.atrasado ? 'warning' : 'success'}
                          />
                        </TableCell>
                        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<AutorenewIcon />}
                            onClick={() => handleRenovar(emp.id)}
                            sx={{ mr: 1 }}
                          >
                            Renovar
                          </Button>
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<AssignmentReturnIcon />}
                            onClick={() => handleDevolverPorId(emp.id)}
                          >
                            Devolver
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {emprestimosAtivos.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          Nenhum empréstimo ativo no momento.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
                Fila de Reservas — Ordem de Chegada (RN-05) ({reservas.length})
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Data</TableCell>
                      <TableCell>Estudante</TableCell>
                      <TableCell>Obra / Tombo Retido</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Ação</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reservas.map((res) => (
                      <TableRow key={res.id}>
                        <TableCell>{formatarData(res.data_reserva)}</TableCell>
                        <TableCell>
                          {res.estudante?.nome} ({res.estudante?.matricula})
                        </TableCell>
                        <TableCell>
                          {res.obra?.titulo} ({res.obra?.codigo})
                          {res.exemplar?.codigo_tombo && (
                            <Typography variant="caption" display="block" color="warning.main">
                              Tombo retido: {res.exemplar.codigo_tombo}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={
                              res.status === 'aguardando_retirada'
                                ? 'Aguardando Retirada'
                                : res.status
                            }
                            color={
                              res.status === 'aguardando_retirada'
                                ? 'warning'
                                : res.status === 'pendente'
                                  ? 'info'
                                  : 'default'
                            }
                          />
                        </TableCell>
                        <TableCell align="right">
                          {(res.status === 'pendente' || res.status === 'aguardando_retirada') && (
                            <Button
                              size="small"
                              color="error"
                              onClick={() => handleCancelarReserva(res.id)}
                            >
                              Cancelar
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {reservas.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} align="center">
                          Nenhuma reserva registrada.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Box>
        )}

        {/* ============================================================= */}
        {/* ABA 2: ACERVO & EXEMPLARES (RF01, RF02, RF10, RN-06)          */}
        {/* ============================================================= */}
        {aba === 2 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
                Catalogar Nova Obra (RF01)
              </Typography>
              <Grid2 container spacing={1.5} component="form" onSubmit={handleCriarObra}>
                <Grid2 size={{ xs: 12, sm: 4, md: 2 }}>
                  <TextField
                    size="small"
                    required
                    fullWidth
                    label="Código"
                    value={formObra.codigo}
                    onChange={(e) => setFormObra((p) => ({ ...p, codigo: e.target.value }))}
                    placeholder="LIV-010"
                  />
                </Grid2>
                <Grid2 size={{ xs: 12, sm: 8, md: 3 }}>
                  <TextField
                    size="small"
                    required
                    fullWidth
                    label="Título"
                    value={formObra.titulo}
                    onChange={(e) => setFormObra((p) => ({ ...p, titulo: e.target.value }))}
                  />
                </Grid2>
                <Grid2 size={{ xs: 12, sm: 6, md: 2 }}>
                  <TextField
                    size="small"
                    required
                    fullWidth
                    label="Autor"
                    value={formObra.autor}
                    onChange={(e) => setFormObra((p) => ({ ...p, autor: e.target.value }))}
                  />
                </Grid2>
                <Grid2 size={{ xs: 12, sm: 6, md: 2 }}>
                  <TextField
                    size="small"
                    required
                    fullWidth
                    label="Editora"
                    value={formObra.editora}
                    onChange={(e) => setFormObra((p) => ({ ...p, editora: e.target.value }))}
                  />
                </Grid2>
                <Grid2 size={{ xs: 6, sm: 4, md: 1.5 }}>
                  <TextField
                    size="small"
                    required
                    fullWidth
                    label="Tipo"
                    value={formObra.tipo}
                    onChange={(e) => setFormObra((p) => ({ ...p, tipo: e.target.value }))}
                  />
                </Grid2>
                <Grid2 size={{ xs: 6, sm: 4, md: 1.5 }}>
                  <TextField
                    size="small"
                    required
                    fullWidth
                    label="Categoria"
                    value={formObra.categoria}
                    onChange={(e) => setFormObra((p) => ({ ...p, categoria: e.target.value }))}
                  />
                </Grid2>
                <Grid2 size={{ xs: 12 }}>
                  <Button type="submit" variant="contained" startIcon={<AddIcon />}>
                    Salvar Obra
                  </Button>
                </Grid2>
              </Grid2>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2 }}>
              <Box
                component="form"
                onSubmit={(e) => {
                  e.preventDefault();
                  carregarObras(filtroObras);
                }}
                sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap' }}
              >
                <TextField
                  size="small"
                  label="Buscar título, autor ou código"
                  value={filtroObras.q}
                  onChange={(e) => setFiltroObras((p) => ({ ...p, q: e.target.value }))}
                  sx={{ flexGrow: 1, minWidth: 220 }}
                />
                <TextField
                  size="small"
                  label="Tipo"
                  value={filtroObras.tipo}
                  onChange={(e) => setFiltroObras((p) => ({ ...p, tipo: e.target.value }))}
                />
                <TextField
                  size="small"
                  label="Categoria"
                  value={filtroObras.categoria}
                  onChange={(e) => setFiltroObras((p) => ({ ...p, categoria: e.target.value }))}
                />
                <Button type="submit" variant="outlined" startIcon={<SearchIcon />}>
                  Filtrar
                </Button>
              </Box>

              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Código</TableCell>
                      <TableCell>Título / Autor</TableCell>
                      <TableCell>Tipo / Categoria</TableCell>
                      <TableCell align="center">Disponíveis / Ativos</TableCell>
                      <TableCell align="right">Ações</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {obras.map((obra) => (
                      <TableRow key={obra.id}>
                        <TableCell>{obra.codigo}</TableCell>
                        <TableCell>
                          <strong>{obra.titulo}</strong>
                          <Typography variant="caption" display="block" color="text.secondary">
                            {obra.autor} — {obra.editora || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {obra.tipo || '—'} / {obra.categoria || '—'}
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            size="small"
                            label={`${obra.exemplares_disponiveis} / ${obra.total_exemplares_ativos}`}
                            color={obra.exemplares_disponiveis > 0 ? 'success' : 'warning'}
                          />
                        </TableCell>
                        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<Inventory2Icon />}
                            onClick={() => abrirModalExemplares(obra)}
                            sx={{ mr: 1 }}
                          >
                            Exemplares
                          </Button>
                          <Button
                            size="small"
                            color="error"
                            startIcon={<DeleteIcon />}
                            onClick={() => handleExcluirObra(obra)}
                          >
                            Excluir
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Box>
        )}

        {/* ============================================================= */}
        {/* ABA 3: ESTUDANTES & IMPORTAÇÃO CSV (RF03, RF04, RN-03)        */}
        {/* ============================================================= */}
        {aba === 3 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Grid2 container spacing={2}>
              <Grid2 size={{ xs: 12, md: 7 }}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
                    Cadastrar Estudante (RF03 — senha padrão = matrícula)
                  </Typography>
                  <Grid2 container spacing={1.5} component="form" onSubmit={handleCriarEstudante}>
                    <Grid2 size={{ xs: 12, sm: 4 }}>
                      <TextField
                        size="small"
                        required
                        fullWidth
                        label="Matrícula"
                        value={formEstudante.matricula}
                        onChange={(e) =>
                          setFormEstudante((p) => ({ ...p, matricula: e.target.value }))
                        }
                      />
                    </Grid2>
                    <Grid2 size={{ xs: 12, sm: 8 }}>
                      <TextField
                        size="small"
                        required
                        fullWidth
                        label="Nome Completo"
                        value={formEstudante.nome}
                        onChange={(e) => setFormEstudante((p) => ({ ...p, nome: e.target.value }))}
                      />
                    </Grid2>
                    <Grid2 size={{ xs: 6, sm: 4 }}>
                      <TextField
                        size="small"
                        required
                        fullWidth
                        label="Turma"
                        value={formEstudante.turma}
                        onChange={(e) => setFormEstudante((p) => ({ ...p, turma: e.target.value }))}
                        placeholder="Ex.: 2º Ano A"
                      />
                    </Grid2>
                    <Grid2 size={{ xs: 6, sm: 5 }}>
                      <TextField
                        size="small"
                        fullWidth
                        label="Telefone"
                        value={formEstudante.telefone}
                        onChange={(e) =>
                          setFormEstudante((p) => ({ ...p, telefone: e.target.value }))
                        }
                      />
                    </Grid2>
                    <Grid2 size={{ xs: 12, sm: 3 }}>
                      <Button type="submit" variant="contained" fullWidth startIcon={<AddIcon />}>
                        Cadastrar
                      </Button>
                    </Grid2>
                  </Grid2>
                </Paper>
              </Grid2>

              <Grid2 size={{ xs: 12, md: 5 }}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
                    Importar Alunos via CSV (RF04)
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                    Cabeçalho: <code>matricula;nome;turma;telefone</code>
                  </Typography>
                  <TextField
                    size="small"
                    multiline
                    minRows={2}
                    fullWidth
                    value={textoCsv}
                    onChange={(e) => setTextoCsv(e.target.value)}
                    placeholder="matricula;nome;turma;telefone"
                    sx={{ mb: 1.5 }}
                  />
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button
                      component="label"
                      size="small"
                      variant="outlined"
                      startIcon={<UploadFileIcon />}
                    >
                      Carregar .CSV
                      <input type="file" accept=".csv,text/csv" hidden onChange={handleLerArquivoCsv} />
                    </Button>
                    <Button size="small" variant="contained" onClick={handleImportarCsv}>
                      Importar Lote
                    </Button>
                  </Box>
                </Paper>
              </Grid2>
            </Grid2>

            <Paper variant="outlined" sx={{ p: 2 }}>
              <Box
                component="form"
                onSubmit={(e) => {
                  e.preventDefault();
                  carregarEstudantes(filtroEstudantes);
                }}
                sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap' }}
              >
                <TextField
                  size="small"
                  label="Buscar por nome, matrícula ou turma"
                  value={filtroEstudantes.q}
                  onChange={(e) => setFiltroEstudantes((p) => ({ ...p, q: e.target.value }))}
                  sx={{ flexGrow: 1, minWidth: 220 }}
                />
                <TextField
                  size="small"
                  select
                  label="Status"
                  value={filtroEstudantes.status}
                  onChange={(e) => setFiltroEstudantes((p) => ({ ...p, status: e.target.value }))}
                  sx={{ minWidth: 150 }}
                >
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="ativo">Ativo</MenuItem>
                  <MenuItem value="bloqueado">Bloqueado</MenuItem>
                  <MenuItem value="inativo">Inativo</MenuItem>
                </TextField>
                <Button type="submit" variant="outlined" startIcon={<SearchIcon />}>
                  Filtrar
                </Button>
              </Box>

              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Matrícula</TableCell>
                      <TableCell>Nome</TableCell>
                      <TableCell>Turma</TableCell>
                      <TableCell>Telefone</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Alterar Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {estudantes.map((est) => {
                      const chip = STATUS_ESTUDANTE_CHIP[est.status] || {
                        label: est.status,
                        color: 'default',
                      };
                      return (
                        <TableRow key={est.id}>
                          <TableCell>{est.matricula}</TableCell>
                          <TableCell>
                            <strong>{est.nome}</strong>
                            <Typography variant="caption" display="block" color="text.secondary">
                              {est.email || '—'}
                            </Typography>
                          </TableCell>
                          <TableCell>{est.turma}</TableCell>
                          <TableCell>{est.telefone || '—'}</TableCell>
                          <TableCell>
                            <Chip size="small" label={chip.label} color={chip.color} />
                          </TableCell>
                          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                            {est.status !== 'ativo' && (
                              <Button
                                size="small"
                                color="success"
                                onClick={() => handleAlterarStatusEstudante(est.matricula, 'ativo')}
                              >
                                Ativar
                              </Button>
                            )}
                            {est.status !== 'bloqueado' && (
                              <Button
                                size="small"
                                color="error"
                                onClick={() =>
                                  handleAlterarStatusEstudante(est.matricula, 'bloqueado')
                                }
                              >
                                Bloquear
                              </Button>
                            )}
                            {est.status !== 'inativo' && (
                              <Button
                                size="small"
                                color="inherit"
                                onClick={() =>
                                  handleAlterarStatusEstudante(est.matricula, 'inativo')
                                }
                              >
                                Inativar
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Box>
        )}

        {/* ============================================================= */}
        {/* ABA 4: RELATÓRIOS GERENCIAIS + EXPORTAÇÃO CSV (RF12)          */}
        {/* ============================================================= */}
        {aba === 4 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Box
                component="form"
                onSubmit={(e) => {
                  e.preventDefault();
                  carregarRelatorios(filtroRelatorio);
                }}
                sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}
              >
                <TextField
                  size="small"
                  label="Mês (1-12)"
                  type="number"
                  value={filtroRelatorio.mes}
                  onChange={(e) => setFiltroRelatorio((p) => ({ ...p, mes: e.target.value }))}
                  sx={{ width: 130 }}
                />
                <TextField
                  size="small"
                  label="Ano"
                  type="number"
                  value={filtroRelatorio.ano}
                  onChange={(e) => setFiltroRelatorio((p) => ({ ...p, ano: e.target.value }))}
                  sx={{ width: 130 }}
                />
                <Button type="submit" variant="contained" startIcon={<SearchIcon />}>
                  Atualizar Relatórios
                </Button>
              </Box>
            </Paper>

            {/* 1. Livros Mais Lidos */}
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="subtitle1" fontWeight={600}>
                  Livros Mais Lidos
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={() => handleBaixarRelatorioCsv('livros-mais-lidos')}
                >
                  Exportar CSV
                </Button>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>#</TableCell>
                      <TableCell>Obra</TableCell>
                      <TableCell>Autor</TableCell>
                      <TableCell>Categoria</TableCell>
                      <TableCell align="right">Empréstimos</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(relLivros?.dados || []).map((item) => (
                      <TableRow key={item.obra_id}>
                        <TableCell>{item.posicao}</TableCell>
                        <TableCell>{item.titulo}</TableCell>
                        <TableCell>{item.autor}</TableCell>
                        <TableCell>{item.categoria}</TableCell>
                        <TableCell align="right">
                          <strong>{item.total_emprestimos}</strong>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>

            {/* 2. Frequência por Turma & 3. Taxas de Atraso */}
            <Grid2 container spacing={2}>
              <Grid2 size={{ xs: 12, md: 6 }}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Box
                    sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}
                  >
                    <Typography variant="subtitle1" fontWeight={600}>
                      Frequência por Turma
                    </Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<DownloadIcon />}
                      onClick={() => handleBaixarRelatorioCsv('frequencia-turmas')}
                    >
                      CSV
                    </Button>
                  </Box>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Turma</TableCell>
                          <TableCell align="right">Empréstimos</TableCell>
                          <TableCell align="right">Leitores</TableCell>
                          <TableCell align="right">Média/Aluno</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(relTurmas?.dados || []).map((item) => (
                          <TableRow key={item.turma}>
                            <TableCell>{item.turma}</TableCell>
                            <TableCell align="right">{item.total_emprestimos}</TableCell>
                            <TableCell align="right">
                              {item.estudantes_leitores}/{item.total_estudantes_turma}
                            </TableCell>
                            <TableCell align="right">
                              {item.media_emprestimos_por_estudante}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              </Grid2>

              <Grid2 size={{ xs: 12, md: 6 }}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Box
                    sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}
                  >
                    <Typography variant="subtitle1" fontWeight={600}>
                      Taxas de Atraso (Geral: {relAtrasos?.resumo?.taxa_atraso_percentual ?? 0}%)
                    </Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<DownloadIcon />}
                      onClick={() => handleBaixarRelatorioCsv('taxas-atraso')}
                    >
                      CSV
                    </Button>
                  </Box>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Turma</TableCell>
                          <TableCell align="right">Total</TableCell>
                          <TableCell align="right">Atrasos</TableCell>
                          <TableCell align="right">Taxa (%)</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(relAtrasos?.por_turma || []).map((item) => (
                          <TableRow key={item.turma}>
                            <TableCell>{item.turma}</TableCell>
                            <TableCell align="right">{item.total_emprestimos}</TableCell>
                            <TableCell align="right">{item.total_com_atraso}</TableCell>
                            <TableCell align="right">
                              <Chip
                                size="small"
                                label={`${item.taxa_atraso_percentual}%`}
                                color={item.taxa_atraso_percentual > 25 ? 'error' : 'default'}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              </Grid2>
            </Grid2>
          </Box>
        )}
      </Container>

      {/* MODAL DE EXEMPLARES FÍSICOS DA OBRA (RF02 e RN-06) */}
      <Dialog
        open={Boolean(obraSelecionada)}
        onClose={() => setObraSelecionada(null)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          Exemplares Físicos — {obraSelecionada?.titulo} ({obraSelecionada?.codigo})
        </DialogTitle>
        <DialogContent>
          <Box
            component="form"
            onSubmit={handleAdicionarExemplar}
            sx={{ display: 'flex', gap: 1.5, mt: 1, mb: 2 }}
          >
            <TextField
              size="small"
              required
              label="Novo Código de Tombo (RN-06)"
              value={novoTombo}
              onChange={(e) => setNovoTombo(e.target.value)}
              placeholder="Ex.: TOMBO-009"
              sx={{ flexGrow: 1 }}
            />
            <Button type="submit" variant="contained" startIcon={<AddIcon />}>
              Adicionar Exemplar
            </Button>
          </Box>

          <Divider sx={{ mb: 2 }} />

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Código de Tombo</TableCell>
                  <TableCell>Status Atual</TableCell>
                  <TableCell align="right">Ação</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {exemplaresObra.map((ex) => {
                  const chip = STATUS_EXEMPLAR_CHIP[ex.status] || {
                    label: ex.status,
                    color: 'default',
                  };
                  return (
                    <TableRow key={ex.id}>
                      <TableCell>
                        <strong>{ex.codigo_tombo}</strong>
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={chip.label} color={chip.color} />
                      </TableCell>
                      <TableCell align="right">
                        {ex.status !== 'disponivel' && ex.status !== 'emprestado' && (
                          <Button
                            size="small"
                            color="success"
                            onClick={() => handleAlterarStatusExemplar(ex.codigo_tombo, 'disponivel')}
                          >
                            Marcar Disponível
                          </Button>
                        )}
                        {ex.status !== 'inativo' && (
                          <Button
                            size="small"
                            color="error"
                            onClick={() => handleAlterarStatusExemplar(ex.codigo_tombo, 'inativo')}
                          >
                            Inativar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {exemplaresObra.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} align="center">
                      Nenhum exemplar físico cadastrado para esta obra.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setObraSelecionada(null)}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

