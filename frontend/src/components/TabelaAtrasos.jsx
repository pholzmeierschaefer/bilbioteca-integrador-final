import {
  Button,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import AssignmentReturnIcon from '@mui/icons-material/AssignmentReturn';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { formatarData } from '../services/api';

/**
 * RF09: Tabela de atrasos com destaque crítico vermelho para atrasos superiores a 10 dias.
 */
export default function TabelaAtrasos({
  itens = [],
  titulo = 'Empréstimos em Atraso',
  somenteCriticos = false,
  onDevolver,
}) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography
        variant="subtitle1"
        sx={{
          fontWeight: 600,
          mb: 1.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          color: somenteCriticos ? 'error.main' : 'text.primary',
        }}
      >
        {somenteCriticos && <WarningAmberIcon fontSize="small" />}
        {titulo} ({itens.length})
      </Typography>

      {itens.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Nenhum registro encontrado.
        </Typography>
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Estudante</TableCell>
                <TableCell>Turma / Contato</TableCell>
                <TableCell>Livro / Tombo</TableCell>
                <TableCell>Previsto</TableCell>
                <TableCell>Atraso</TableCell>
                <TableCell>Justificativa</TableCell>
                {onDevolver && <TableCell align="right">Ação</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {itens.map((item) => {
                const emprestimoId = item.emprestimo_id ?? item.id;
                const aluno = item.aluno ?? item.estudante;
                const tituloLivro = item.livro?.titulo ?? item.exemplar?.obra?.titulo ?? '—';
                const tombo = item.livro?.exemplar_tombo ?? item.exemplar?.codigo_tombo ?? '—';
                const critico = Boolean(item.critico || item.dias_atraso > 10);

                return (
                  <TableRow
                    key={emprestimoId}
                    sx={{
                      bgcolor: critico ? 'rgba(211, 47, 47, 0.08)' : 'inherit',
                    }}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {aluno?.nome || '—'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Matrícula: {aluno?.matricula || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{aluno?.turma || '—'}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {aluno?.telefone || 'Sem telefone'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{tituloLivro}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Tombo: {tombo}
                      </Typography>
                    </TableCell>
                    <TableCell>{formatarData(item.data_devolucao_prevista)}</TableCell>
                    <TableCell>
                      <Chip
                        label={`${item.dias_atraso} dia(s)`}
                        size="small"
                        color={critico ? 'error' : 'warning'}
                        variant={critico ? 'filled' : 'outlined'}
                      />
                    </TableCell>
                    <TableCell sx={{ maxWidth: 220 }}>
                      {item.justificativa_atraso ? (
                        <Tooltip title={item.justificativa_atraso}>
                          <Typography variant="caption" noWrap display="block">
                            {item.justificativa_atraso}
                          </Typography>
                        </Tooltip>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          Sem justificativa
                        </Typography>
                      )}
                    </TableCell>
                    {onDevolver && (
                      <TableCell align="right">
                        <Button
                          size="small"
                          variant="contained"
                          color="primary"
                          startIcon={<AssignmentReturnIcon />}
                          onClick={() => onDevolver(emprestimoId)}
                        >
                          Devolver
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
}

