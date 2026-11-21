import { useEffect, useState } from 'react';
import {
  Alert,
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
import ModalMudarSenha from '../components/ModalMudarSenha';
import { apiRequest, formatarData } from '../services/api';

export default function PortalAluno({ usuario, onSair }) {
  const [tela, setTela] = useState('emprestimos');
  const [portal, setPortal] = useState(null);
  const [obras, setObras] = useState([]);
  const [busca, setBusca] = useState('');
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [modalSenha, setModalSenha] = useState(false);

  // Modal de justificativa
  const [empJustificar, setEmpJustificar] = useState(null);
  const [textoJustificativa, setTextoJustificativa] = useState('');

  async function carregarPortal() {
    try {
      const dados = await apiRequest('/api/emprestimos/meus');
      setPortal(dados);
    } catch (err) {
      setErro(err.message);
    }
  }

  async function carregarObras(termo = '') {
    try {
      const qs = termo ? `?q=${encodeURIComponent(termo)}` : '';
      const lista = await apiRequest(`/api/livros${qs}`);
      setObras(lista);
    } catch (err) {
      setErro(err.message);
    }
  }

  useEffect(() => {
    carregarPortal();
    carregarObras();
  }, []);

  async function handleReservar(codigoObra) {
    setErro('');
    setSucesso('');
    try {
      await apiRequest('/api/reservas', {
        method: 'POST',
        body: { obra_codigo: codigoObra },
      });
      setSucesso('Reserva registrada com sucesso!');
      carregarPortal();
    } catch (err) {
      setErro(err.message);
    }
  }

  async function handleCancelarReserva(id) {
    setErro('');
    setSucesso('');
    try {
      await apiRequest(`/api/reservas/${id}/cancelar`, { method: 'PUT' });
      setSucesso('Reserva cancelada.');
      carregarPortal();
    } catch (err) {
      setErro(err.message);
    }
  }

  async function handleEnviarJustificativa(event) {
    event.preventDefault();
    setErro('');
    setSucesso('');
    try {
      await apiRequest(`/api/emprestimos/${empJustificar.id}/justificativa`, {
        method: 'PUT',
        body: { justificativa_atraso: textoJustificativa },
      });
      setSucesso('Justificativa enviada com sucesso!');
      setEmpJustificar(null);
      setTextoJustificativa('');
      carregarPortal();
    } catch (err) {
      setErro(err.message);
    }
  }

  const emPosse = portal?.em_posse || [];
  const historico = portal?.historico || [];
  const reservas = portal?.reservas || [];

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Menu lateral simples */}
      <Box
        sx={{
          width: 220,
          bgcolor: '#ffffff',
          borderRight: '1px solid #e5e7eb',
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
        }}
      >
        <Box sx={{ mb: 3 }}>
          <img src="/capa.jpeg" alt="Logo HM" style={{ width: 80, height: 80, objectFit: 'contain' }} />
          <Typography variant="h6">BiblioHM</Typography>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, flexGrow: 1 }}>
          {[
            { id: 'emprestimos', nome: 'Meus Empréstimos' },
            { id: 'acervo', nome: 'Acervo de Livros' },
            { id: 'reservas', nome: 'Minhas Reservas' },
          ].map((item) => (
            <Button
              key={item.id}
              onClick={() => setTela(item.id)}
              sx={{
                textTransform: 'none',
                bgcolor: tela === item.id ? '#ffdab9' : 'transparent',
                color: tela === item.id ? '#3e2723' : '#1f2937',
                fontWeight: tela === item.id ? 'bold' : 'normal',
              }}
            >
              {item.nome}
            </Button>
          ))}
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, pt: 2 }}>
          <Typography variant="caption">{usuario.nome}</Typography>
          <Button size="small" variant="outlined" onClick={() => setModalSenha(true)}>
            Mudar Senha
          </Button>
          <Button size="small" variant="contained" color="error" onClick={onSair}>
            Sair
          </Button>
        </Box>
      </Box>

      {/* Conteúdo */}
      <Box sx={{ flex: 1, p: 4, overflowX: 'auto' }}>
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

        {tela === 'emprestimos' && (
          <Box>
            <Typography variant="h5" sx={{ mb: 2 }}>
              Meus Empréstimos
            </Typography>

            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Em posse ({emPosse.length}/2)
            </Typography>
            <Paper variant="outlined" sx={{ mb: 3 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Livro</TableCell>
                    <TableCell>Tombo</TableCell>
                    <TableCell>Devolução Prevista</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Ação</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {emPosse.map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell>{emp.exemplar?.obra?.titulo}</TableCell>
                      <TableCell>{emp.exemplar?.codigo_tombo}</TableCell>
                      <TableCell>{formatarData(emp.data_devolucao_prevista)}</TableCell>
                      <TableCell>
                        <Typography variant="body2" color={emp.atrasado ? 'error' : 'success.main'}>
                          {emp.atrasado ? `Atrasado (${emp.dias_atraso}d)` : 'No prazo'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          onClick={() => {
                            setEmpJustificar(emp);
                            setTextoJustificativa('');
                          }}
                        >
                          Justificar Atraso
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {emPosse.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5}>Nenhum livro em posse.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Paper>

            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Histórico ({historico.length})
            </Typography>
            <Paper variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Livro</TableCell>
                    <TableCell>Retirada</TableCell>
                    <TableCell>Devolução</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {historico.map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell>{emp.exemplar?.obra?.titulo}</TableCell>
                      <TableCell>{formatarData(emp.data_emprestimo)}</TableCell>
                      <TableCell>{formatarData(emp.data_devolucao_realizada)}</TableCell>
                    </TableRow>
                  ))}
                  {historico.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3}>Sem histórico de devoluções.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Paper>
          </Box>
        )}

        {tela === 'acervo' && (
          <Box>
            <Typography variant="h5" sx={{ mb: 2 }}>
              Acervo de Livros
            </Typography>
            <TextField
              size="small"
              placeholder="Pesquisar título, código ou autor..."
              value={busca}
              onChange={(e) => {
                setBusca(e.target.value);
                carregarObras(e.target.value);
              }}
              sx={{ mb: 2, width: 320, bgcolor: '#ffffff' }}
            />
            <Paper variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Código</TableCell>
                    <TableCell>Título</TableCell>
                    <TableCell>Autor</TableCell>
                    <TableCell>Disponíveis / Total</TableCell>
                    <TableCell>Ação</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {obras.map((obra) => (
                    <TableRow key={obra.id}>
                      <TableCell>{obra.codigo}</TableCell>
                      <TableCell>{obra.titulo}</TableCell>
                      <TableCell>{obra.autor}</TableCell>
                      <TableCell>
                        {obra.exemplares_disponiveis} / {obra.total_exemplares_ativos}
                      </TableCell>
                      <TableCell>
                        <Button size="small" onClick={() => handleReservar(obra.codigo)}>
                          Reservar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          </Box>
        )}

        {tela === 'reservas' && (
          <Box>
            <Typography variant="h5" sx={{ mb: 2 }}>
              Minhas Reservas
            </Typography>
            <Paper variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Livro</TableCell>
                    <TableCell>Data</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Ação</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reservas.map((res) => (
                    <TableRow key={res.id}>
                      <TableCell>{res.obra?.titulo}</TableCell>
                      <TableCell>{formatarData(res.data_reserva)}</TableCell>
                      <TableCell>{res.status}</TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          color="error"
                          onClick={() => handleCancelarReserva(res.id)}
                        >
                          Cancelar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {reservas.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4}>Nenhuma reserva ativa.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Paper>
          </Box>
        )}
      </Box>

      {/* Modal Justificativa */}
      <Dialog open={Boolean(empJustificar)} onClose={() => setEmpJustificar(null)} fullWidth maxWidth="sm">
        <form onSubmit={handleEnviarJustificativa}>
          <DialogTitle>Enviar Justificativa de Atraso</DialogTitle>
          <DialogContent>
            <TextField
              label="Motivo do atraso"
              multiline
              rows={3}
              fullWidth
              required
              value={textoJustificativa}
              onChange={(e) => setTextoJustificativa(e.target.value)}
              sx={{ mt: 1 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEmpJustificar(null)}>Cancelar</Button>
            <Button type="submit" variant="contained">
              Enviar
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <ModalMudarSenha
        aberto={modalSenha}
        onFechar={() => setModalSenha(false)}
        onSucesso={setSucesso}
      />
    </Box>
  );
}
