import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Grid2,
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
import SearchIcon from '@mui/icons-material/Search';
import BookmarkAddIcon from '@mui/icons-material/BookmarkAdd';
import RateReviewIcon from '@mui/icons-material/RateReview';
import CancelIcon from '@mui/icons-material/Cancel';
import BarraTopo from '../components/BarraTopo';
import ModalJustificativa from '../components/ModalJustificativa';
import { apiRequest, formatarData } from '../services/api';

const STATUS_RESERVA_LABEL = {
  pendente: { label: 'Na fila (Pendente)', color: 'info' },
  aguardando_retirada: { label: 'Disponível p/ Retirada!', color: 'success' },
  atendida: { label: 'Atendida', color: 'default' },
  cancelada: { label: 'Cancelada', color: 'default' },
};

/**
 * RF08, RF10, RF11 e RNF-05: Portal responsivo do Estudante.
 */
export default function PortalAluno() {
  const [aba, setAba] = useState(0);
  const [dadosPortal, setDadosPortal] = useState(null);
  const [obras, setObras] = useState([]);
  const [buscaAcervo, setBuscaAcervo] = useState('');
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [emprestimoParaJustificar, setEmprestimoParaJustificar] = useState(null);

  const carregarPortal = useCallback(async () => {
    try {
      const dados = await apiRequest('/api/emprestimos/meus');
      setDadosPortal(dados);
    } catch (err) {
      setErro(err.message);
    }
  }, []);

  const carregarAcervo = useCallback(async (termo = '') => {
    try {
      const query = termo.trim() ? `?q=${encodeURIComponent(termo.trim())}` : '';
      const lista = await apiRequest(`/api/livros${query}`);
      setObras(lista);
    } catch (err) {
      setErro(err.message);
    }
  }, []);

  useEffect(() => {
    carregarPortal();
    carregarAcervo();
  }, [carregarPortal, carregarAcervo]);

  async function handleReservarObra(codigoObra) {
    setErro('');
    setSucesso('');
    try {
      const reserva = await apiRequest('/api/reservas', {
        method: 'POST',
        body: { obra_codigo: codigoObra },
      });
      setSucesso(
        `Reserva registrada para "${reserva.obra?.titulo}" (posição na fila: ${reserva.posicao_fila || 1}).`
      );
      await carregarPortal();
    } catch (err) {
      setErro(err.message);
    }
  }

  async function handleCancelarReserva(reservaId) {
    setErro('');
    setSucesso('');
    try {
      await apiRequest(`/api/reservas/${reservaId}/cancelar`, { method: 'PATCH' });
      setSucesso('Reserva cancelada com sucesso.');
      await carregarPortal();
    } catch (err) {
      setErro(err.message);
    }
  }

  async function handleEnviarJustificativa(emprestimoId, texto) {
    setErro('');
    setSucesso('');
    await apiRequest(`/api/emprestimos/${emprestimoId}/justificativa`, {
      method: 'PATCH',
      body: { justificativa_atraso: texto },
    });
    setSucesso('Justificativa enviada à bibliotecária com sucesso.');
    await carregarPortal();
  }

  const estudante = dadosPortal?.estudante;
  const emPosse = dadosPortal?.em_posse || [];
  const historico = dadosPortal?.historico || [];
  const reservas = dadosPortal?.reservas || [];
  const reservasProntas = reservas.filter((r) => r.status === 'aguardando_retirada');

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: 6 }}>
      <BarraTopo subtitulo="Portal do Estudante" />

      <Container maxWidth="lg" sx={{ mt: 3 }}>
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

        {/* Alerta RN-05 quando exemplar reservado foi devolvido e aguarda retirada */}
        {reservasProntas.map((res) => (
          <Alert severity="info" key={res.id} sx={{ mb: 2 }}>
            <strong>Livro disponível para retirada!</strong> A obra{' '}
            <strong>{res.obra?.titulo}</strong> (Tombo: {res.exemplar?.codigo_tombo || 'retido'})
            está retida prioritariamente para você no balcão da biblioteca.
          </Alert>
        ))}

        {/* Cabeçalho com situação do leitor */}
        {estudante && (
          <Paper variant="outlined" sx={{ p: 2, mb: 2.5 }}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 1.5,
              }}
            >
              <Box>
                <Typography variant="h6" fontWeight={600}>
                  {estudante.nome}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Matrícula: {estudante.matricula} • Turma: {estudante.turma}
                </Typography>
              </Box>
              <Chip
                label={
                  estudante.status === 'ativo'
                    ? 'Situação: Ativo'
                    : estudante.status === 'bloqueado'
                      ? 'Situação: Bloqueado (Devolva livros em atraso)'
                      : 'Situação: Inativo'
                }
                color={estudante.status === 'ativo' ? 'success' : 'error'}
              />
            </Box>
          </Paper>
        )}

        <Paper sx={{ mb: 2.5 }}>
          <Tabs
            value={aba}
            onChange={(_, novaAba) => setAba(novaAba)}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label={`Meus Empréstimos (${emPosse.length})`} />
            <Tab label="Consultar Acervo" />
            <Tab label={`Minhas Reservas (${reservas.length})`} />
          </Tabs>
        </Paper>

        {/* ABA 0: MEUS EMPRÉSTIMOS E HISTÓRICO (RF11) */}
        {aba === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
                Livros em Posse ({emPosse.length}/2)
              </Typography>
              {emPosse.length === 0 ? (
                <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
                  <Typography color="text.secondary">
                    Você não possui livros emprestados no momento.
                  </Typography>
                </Paper>
              ) : (
                <Grid2 container spacing={2}>
                  {emPosse.map((emp) => (
                    <Grid2 size={{ xs: 12, md: 6 }} key={emp.id}>
                      <Card
                        variant="outlined"
                        sx={{
                          borderColor: emp.critico
                            ? 'error.main'
                            : emp.atrasado
                              ? 'warning.main'
                              : 'divider',
                        }}
                      >
                        <CardContent>
                          <Box
                            sx={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start',
                              gap: 1,
                              mb: 1,
                            }}
                          >
                            <Typography variant="subtitle1" fontWeight={600}>
                              {emp.exemplar?.obra?.titulo || 'Obra'}
                            </Typography>
                            <Chip
                              size="small"
                              label={
                                emp.atrasado
                                  ? `Atrasado (${emp.dias_atraso}d)`
                                  : 'No prazo'
                              }
                              color={emp.critico ? 'error' : emp.atrasado ? 'warning' : 'success'}
                            />
                          </Box>

                          <Typography variant="body2" color="text.secondary">
                            Autor: {emp.exemplar?.obra?.autor || '—'} • Tombo:{' '}
                            {emp.exemplar?.codigo_tombo || '—'}
                          </Typography>
                          <Typography variant="body2" sx={{ mt: 1 }}>
                            Retirado em: <strong>{formatarData(emp.data_emprestimo)}</strong> •
                            Devolução prevista:{' '}
                            <strong>{formatarData(emp.data_devolucao_prevista)}</strong>
                          </Typography>

                          {emp.justificativa_atraso && (
                            <Alert severity="info" sx={{ mt: 1.5, py: 0.5 }}>
                              <strong>Justificativa enviada:</strong> {emp.justificativa_atraso}
                            </Alert>
                          )}

                          <Box sx={{ mt: 2 }}>
                            <Button
                              size="small"
                              variant={emp.atrasado ? 'contained' : 'outlined'}
                              color={emp.atrasado ? 'warning' : 'primary'}
                              startIcon={<RateReviewIcon />}
                              onClick={() => setEmprestimoParaJustificar(emp)}
                            >
                              Enviar Justificativa de Atraso
                            </Button>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid2>
                  ))}
                </Grid2>
              )}
            </Box>

            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
                Histórico de Leituras ({historico.length})
              </Typography>
              {historico.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Nenhuma devolução registrada ainda.
                </Typography>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Obra</TableCell>
                        <TableCell>Tombo</TableCell>
                        <TableCell>Retirada</TableCell>
                        <TableCell>Devolução</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {historico.map((emp) => (
                        <TableRow key={emp.id}>
                          <TableCell>{emp.exemplar?.obra?.titulo || '—'}</TableCell>
                          <TableCell>{emp.exemplar?.codigo_tombo || '—'}</TableCell>
                          <TableCell>{formatarData(emp.data_emprestimo)}</TableCell>
                          <TableCell>{formatarData(emp.data_devolucao_realizada)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>
          </Box>
        )}

        {/* ABA 1: CONSULTAR ACERVO E RESERVAR (RF10 e RF08) */}
        {aba === 1 && (
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Box
              component="form"
              onSubmit={(e) => {
                e.preventDefault();
                carregarAcervo(buscaAcervo);
              }}
              sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap' }}
            >
              <TextField
                size="small"
                label="Buscar por título, autor ou código"
                value={buscaAcervo}
                onChange={(e) => setBuscaAcervo(e.target.value)}
                sx={{ flexGrow: 1, minWidth: 240 }}
              />
              <Button type="submit" variant="contained" startIcon={<SearchIcon />}>
                Buscar
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
                    <TableCell align="right">Reserva</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {obras.map((obra) => (
                    <TableRow key={obra.id}>
                      <TableCell>{obra.codigo}</TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {obra.titulo}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {obra.autor} — {obra.editora || 'Sem editora'}
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
                      <TableCell align="right">
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<BookmarkAddIcon />}
                          onClick={() => handleReservarObra(obra.codigo)}
                        >
                          Reservar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {obras.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        Nenhuma obra encontrada.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}

        {/* ABA 2: MINHAS RESERVAS (RF08) */}
        {aba === 2 && (
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
              Minhas Reservas Ativas ({reservas.length})
            </Typography>
            {reservas.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Você não possui reservas ativas na fila.
              </Typography>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Obra</TableCell>
                      <TableCell>Data da Reserva</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Ação</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reservas.map((res) => {
                      const info = STATUS_RESERVA_LABEL[res.status] || {
                        label: res.status,
                        color: 'default',
                      };
                      return (
                        <TableRow key={res.id}>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>
                              {res.obra?.titulo || '—'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Código: {res.obra?.codigo || '—'}
                              {res.exemplar?.codigo_tombo
                                ? ` • Tombo retido: ${res.exemplar.codigo_tombo}`
                                : ''}
                            </Typography>
                          </TableCell>
                          <TableCell>{formatarData(res.data_reserva)}</TableCell>
                          <TableCell>
                            <Chip size="small" label={info.label} color={info.color} />
                          </TableCell>
                          <TableCell align="right">
                            <Button
                              size="small"
                              color="error"
                              startIcon={<CancelIcon />}
                              onClick={() => handleCancelarReserva(res.id)}
                            >
                              Cancelar
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        )}
      </Container>

      <ModalJustificativa
        aberto={Boolean(emprestimoParaJustificar)}
        emprestimo={emprestimoParaJustificar}
        onFechar={() => setEmprestimoParaJustificar(null)}
        onEnviar={handleEnviarJustificativa}
      />
    </Box>
  );
}

