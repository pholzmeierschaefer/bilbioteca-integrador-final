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
import { apiRequest } from '../services/api';

export default function SecaoMensagens({ onErro, onSucesso }) {
  const [lista, setLista] = useState([]);

  async function carregar() {
    try {
      const dados = await apiRequest('/api/emprestimos/justificativas');
      setLista(dados);
    } catch (err) {
      onErro(err.message);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function handleAnalisar(id) {
    try {
      await apiRequest(`/api/emprestimos/justificativas/${id}/analisar`, { method: 'PUT' });
      onSucesso('Justificativa marcada como analisada.');
      carregar();
    } catch (err) {
      onErro(err.message);
    }
  }

  return (
    <Box>
      <Typography variant="h5">Caixa de Mensagens / Avisos</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Justificativas de atraso enviadas pelos alunos via Portal.
      </Typography>

      <Paper variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Data</TableCell>
              <TableCell>Aluno (Matrícula)</TableCell>
              <TableCell>Justificativa</TableCell>
              <TableCell align="right">Ação</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {lista.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{new Date(item.data_envio).toLocaleString('pt-BR')}</TableCell>
                <TableCell>
                  <div>{item.estudante?.nome}</div>
                  <Typography variant="caption" color="text.secondary">
                    ({item.estudante?.matricula})
                  </Typography>
                </TableCell>
                <TableCell>{item.texto_descritivo}</TableCell>
                <TableCell align="right">
                  {item.status === 'pendente' ? (
                    <Button size="small" color="success" onClick={() => handleAnalisar(item.id)}>
                      Marcar Analisada
                    </Button>
                  ) : (
                    'Analisada'
                  )}
                </TableCell>
              </TableRow>
            ))}
            {lista.length === 0 && (
              <TableRow>
                <TableCell colSpan={4}>Nenhuma mensagem encontrada.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
