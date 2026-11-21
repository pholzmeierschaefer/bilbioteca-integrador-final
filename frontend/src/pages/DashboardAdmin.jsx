import { useState } from 'react';
import { Alert, Box, Button, Typography } from '@mui/material';
import ModalMudarSenha from '../components/ModalMudarSenha';
import SecaoDashboard from '../components/SecaoDashboard';
import SecaoEstudantes from '../components/SecaoEstudantes';
import SecaoAcervo from '../components/SecaoAcervo';
import SecaoEmprestimos from '../components/SecaoEmprestimos';
import SecaoReservas from '../components/SecaoReservas';
import SecaoMensagens from '../components/SecaoMensagens';

const MENUS = [
  { id: 'dashboard', nome: 'Dashboard & Relatórios' },
  { id: 'estudantes', nome: 'Estudantes' },
  { id: 'acervo', nome: 'Acervo & Exemplares' },
  { id: 'emprestimos', nome: 'Empréstimos' },
  { id: 'reservas', nome: 'Reservas' },
  { id: 'mensagens', nome: 'Mensagens / Avisos' },
];

export default function DashboardAdmin({ usuario, onSair }) {
  const [tela, setTela] = useState('dashboard');
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [modalSenha, setModalSenha] = useState(false);

  function mostrarErro(msg) {
    setSucesso('');
    setErro(msg);
  }

  function mostrarSucesso(msg) {
    setErro('');
    setSucesso(msg);
  }

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
          {MENUS.map((item) => (
            <Button
              key={item.id}
              onClick={() => {
                setErro('');
                setSucesso('');
                setTela(item.id);
              }}
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

      {/* Conteúdo principal */}
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

        {tela === 'dashboard' && (
          <SecaoDashboard onErro={mostrarErro} onSucesso={mostrarSucesso} />
        )}
        {tela === 'estudantes' && (
          <SecaoEstudantes onErro={mostrarErro} onSucesso={mostrarSucesso} />
        )}
        {tela === 'acervo' && (
          <SecaoAcervo onErro={mostrarErro} onSucesso={mostrarSucesso} />
        )}
        {tela === 'emprestimos' && (
          <SecaoEmprestimos onErro={mostrarErro} onSucesso={mostrarSucesso} />
        )}
        {tela === 'reservas' && (
          <SecaoReservas onErro={mostrarErro} onSucesso={mostrarSucesso} />
        )}
        {tela === 'mensagens' && (
          <SecaoMensagens onErro={mostrarErro} onSucesso={mostrarSucesso} />
        )}
      </Box>

      <ModalMudarSenha
        aberto={modalSenha}
        onFechar={() => setModalSenha(false)}
        onSucesso={mostrarSucesso}
      />
    </Box>
  );
}
