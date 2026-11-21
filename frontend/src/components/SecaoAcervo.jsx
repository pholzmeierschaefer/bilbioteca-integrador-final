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

export default function SecaoAcervo({ onErro, onSucesso }) {
  const [obras, setObras] = useState([]);
  const [busca, setBusca] = useState('');

  // Modal Criar / Editar Livro
  const [modalLivro, setModalLivro] = useState(false);
  const [editando, setEditando] = useState(null);
  const [codigo, setCodigo] = useState('');
  const [titulo, setTitulo] = useState('');
  const [autor, setAutor] = useState('');
  const [editora, setEditora] = useState('');
  const [tipo, setTipo] = useState('Literatura');
  const [categoria, setCategoria] = useState('Romance');

  // Modal Exemplares (Tombos)
  const [obraSelecionada, setObraSelecionada] = useState(null);
  const [exemplares, setExemplares] = useState([]);
  const [novoTombo, setNovoTombo] = useState('');

  async function carregar(termo = '') {
    try {
      const qs = termo ? `?q=${encodeURIComponent(termo)}` : '';
      const lista = await apiRequest(`/api/livros${qs}`);
      setObras(lista);
    } catch (err) {
      onErro(err.message);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  function abrirNovo() {
    setEditando(null);
    setCodigo('');
    setTitulo('');
    setAutor('');
    setEditora('');
    setTipo('Literatura');
    setCategoria('Romance');
    setModalLivro(true);
  }

  function abrirEditar(obra) {
    setEditando(obra);
    setCodigo(obra.codigo);
    setTitulo(obra.titulo);
    setAutor(obra.autor);
    setEditora(obra.editora || '');
    setTipo(obra.tipo || 'Literatura');
    setCategoria(obra.categoria || 'Romance');
    setModalLivro(true);
  }

  async function handleSalvarLivro(event) {
    event.preventDefault();
    try {
      const corpo = { codigo, titulo, autor, editora, tipo, categoria };
      if (editando) {
        await apiRequest(`/api/livros/${editando.id}`, { method: 'PUT', body: corpo });
        onSucesso('Livro atualizado!');
      } else {
        await apiRequest('/api/livros', { method: 'POST', body: corpo });
        onSucesso('Livro cadastrado!');
      }
      setModalLivro(false);
      carregar(busca);
    } catch (err) {
      onErro(err.message);
    }
  }

  async function handleExcluirLivro(obra) {
    try {
      await apiRequest(`/api/livros/${obra.id}`, { method: 'DELETE' });
      onSucesso(`Livro "${obra.titulo}" excluído.`);
      carregar(busca);
    } catch (err) {
      onErro(err.message);
    }
  }

  async function abrirExemplares(obra) {
    try {
      const dados = await apiRequest(`/api/livros/${encodeURIComponent(obra.codigo)}/exemplares`);
      setObraSelecionada(obra);
      setExemplares(dados.exemplares || []);
      setNovoTombo('');
    } catch (err) {
      onErro(err.message);
    }
  }

  async function handleAdicionarExemplar(event) {
    event.preventDefault();
    try {
      await apiRequest(`/api/livros/${encodeURIComponent(obraSelecionada.codigo)}/exemplares`, {
        method: 'POST',
        body: { codigo_tombo: novoTombo.trim() },
      });
      setNovoTombo('');
      onSucesso('Exemplar adicionado!');
      abrirExemplares(obraSelecionada);
      carregar(busca);
    } catch (err) {
      onErro(err.message);
    }
  }

  async function handleStatusExemplar(tombo, status) {
    try {
      await apiRequest(`/api/livros/exemplares/${encodeURIComponent(tombo)}`, {
        method: 'PUT',
        body: { status },
      });
      onSucesso(`Exemplar ${tombo} alterado para ${status}.`);
      abrirExemplares(obraSelecionada);
      carregar(busca);
    } catch (err) {
      onErro(err.message);
    }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">Acervo de Livros</Typography>
        <Button variant="contained" onClick={abrirNovo}>
          + Novo Livro
        </Button>
      </Box>

      <TextField
        size="small"
        placeholder="Pesquisar por título, código ou autor..."
        value={busca}
        onChange={(e) => {
          setBusca(e.target.value);
          carregar(e.target.value);
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
              <TableCell>Editora</TableCell>
              <TableCell>Disponíveis / Total</TableCell>
              <TableCell align="right">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {obras.map((obra) => (
              <TableRow key={obra.id}>
                <TableCell>{obra.codigo}</TableCell>
                <TableCell>{obra.titulo}</TableCell>
                <TableCell>{obra.autor}</TableCell>
                <TableCell>{obra.editora || '-'}</TableCell>
                <TableCell>
                  {obra.exemplares_disponiveis} / {obra.total_exemplares_ativos}
                </TableCell>
                <TableCell align="right">
                  <Button size="small" onClick={() => abrirExemplares(obra)}>
                    Exemplares
                  </Button>
                  <Button size="small" onClick={() => abrirEditar(obra)}>
                    Editar
                  </Button>
                  <Button size="small" color="error" onClick={() => handleExcluirLivro(obra)}>
                    Excluir
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      {/* Modal Criar / Editar Livro */}
      <Dialog open={modalLivro} onClose={() => setModalLivro(false)} fullWidth maxWidth="xs">
        <form onSubmit={handleSalvarLivro}>
          <DialogTitle>{editando ? 'Editar Livro' : 'Novo Livro'}</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField size="small" label="Código" required value={codigo} onChange={(e) => setCodigo(e.target.value)} />
            <TextField size="small" label="Título" required value={titulo} onChange={(e) => setTitulo(e.target.value)} />
            <TextField size="small" label="Autor" required value={autor} onChange={(e) => setAutor(e.target.value)} />
            <TextField size="small" label="Editora" required value={editora} onChange={(e) => setEditora(e.target.value)} />
            <TextField size="small" label="Tipo" required value={tipo} onChange={(e) => setTipo(e.target.value)} />
            <TextField size="small" label="Categoria" required value={categoria} onChange={(e) => setCategoria(e.target.value)} />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setModalLivro(false)}>Cancelar</Button>
            <Button type="submit" variant="contained">
              Salvar
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Modal Exemplares */}
      <Dialog
        open={Boolean(obraSelecionada)}
        onClose={() => setObraSelecionada(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Exemplares — {obraSelecionada?.titulo}</DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleAdicionarExemplar} sx={{ display: 'flex', gap: 1, my: 1 }}>
            <TextField
              size="small"
              label="Código de Tombo"
              required
              fullWidth
              value={novoTombo}
              onChange={(e) => setNovoTombo(e.target.value)}
            />
            <Button type="submit" variant="contained">
              Adicionar
            </Button>
          </Box>

          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Tombo</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Ação</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {exemplares.map((ex) => (
                <TableRow key={ex.id}>
                  <TableCell>{ex.codigo_tombo}</TableCell>
                  <TableCell>{ex.status}</TableCell>
                  <TableCell align="right">
                    {ex.status !== 'inativo' && (
                      <Button
                        size="small"
                        color="error"
                        onClick={() => handleStatusExemplar(ex.codigo_tombo, 'inativo')}
                      >
                        Inativar
                      </Button>
                    )}
                    {ex.status === 'inativo' && (
                      <Button
                        size="small"
                        color="success"
                        onClick={() => handleStatusExemplar(ex.codigo_tombo, 'disponivel')}
                      >
                        Ativar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setObraSelecionada(null)}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
