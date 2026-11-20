import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiRequest, getToken, setToken } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [carregandoSessao, setCarregandoSessao] = useState(true);

  const validarSessao = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUsuario(null);
      setCarregandoSessao(false);
      return;
    }

    try {
      const perfil = await apiRequest('/auth/perfil');
      setUsuario(perfil);
    } catch {
      setToken(null);
      setUsuario(null);
    } finally {
      setCarregandoSessao(false);
    }
  }, []);

  useEffect(() => {
    validarSessao();
  }, [validarSessao]);

  const login = useCallback(async (matricula, senha, perfil) => {
    const resposta = await apiRequest('/auth/login', {
      method: 'POST',
      autenticado: false,
      body: { matricula, senha, perfil },
    });

    setToken(resposta.token);
    setUsuario(resposta.usuario);
    return resposta.usuario;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUsuario(null);
  }, []);

  return (
    <AuthContext.Provider value={{ usuario, carregandoSessao, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const contexto = useContext(AuthContext);
  if (!contexto) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider.');
  }
  return contexto;
}
