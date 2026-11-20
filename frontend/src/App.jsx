import { Navigate, Route, Routes } from 'react-router-dom';
import RotaProtegida from './components/RotaProtegida';
import LoginPage from './pages/LoginPage';
import DashboardAdmin from './pages/DashboardAdmin';
import PortalAluno from './pages/PortalAluno';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/painel"
        element={
          <RotaProtegida papeisPermitidos={['bibliotecario']}>
            <DashboardAdmin />
          </RotaProtegida>
        }
      />
      <Route
        path="/aluno"
        element={
          <RotaProtegida papeisPermitidos={['aluno', 'bibliotecario']}>
            <PortalAluno />
          </RotaProtegida>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
