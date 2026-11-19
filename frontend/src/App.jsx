import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import PainelBibliotecario from './pages/PainelBibliotecario';
import PortalAluno from './pages/PortalAluno';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route
        path="/painel"
        element={
          <ProtectedRoute rolesPermitidos={['bibliotecario']}>
            <PainelBibliotecario />
          </ProtectedRoute>
        }
      />
      <Route
        path="/aluno"
        element={
          <ProtectedRoute rolesPermitidos={['aluno']}>
            <PortalAluno />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
