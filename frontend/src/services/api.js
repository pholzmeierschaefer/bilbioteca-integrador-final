export const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:3000';

let accessToken = null;
let refreshPromise = null;

export function getAccessToken() {
  return accessToken;
}

export function setAccessToken(token) {
  accessToken = token || null;
}

export function decodificarPayloadJwt(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => `%${(`00${c.charCodeAt(0).toString(16)}`).slice(-2)}`)
        .join('')
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * Tenta renovar o Access Token usando o cookie HttpOnly (/auth/refresh).
 * Garante apenas uma requisição de refresh simultânea (single-flight).
 */
export async function renovarSessao() {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
      .then(async (res) => {
        if (!res.ok) {
          setAccessToken(null);
          return null;
        }
        const dados = await res.json();
        const novoToken = dados.accessToken || dados.token;
        if (!novoToken) {
          setAccessToken(null);
          return null;
        }
        setAccessToken(novoToken);
        return {
          token: novoToken,
          usuario: dados.usuario || decodificarPayloadJwt(novoToken),
        };
      })
      .catch(() => {
        setAccessToken(null);
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

export async function apiRequest(caminho, opcoes = {}) {
  const {
    method = 'GET',
    body,
    headers = {},
    autenticado = true,
    _tentativaRefresh = false,
  } = opcoes;

  const requestHeaders = { ...headers };
  if (body !== undefined && !(body instanceof FormData)) {
    requestHeaders['Content-Type'] = 'application/json';
  }
  if (autenticado && accessToken) {
    requestHeaders.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${caminho}`, {
    method,
    headers: requestHeaders,
    credentials: 'include',
    body: body !== undefined && !(body instanceof FormData) ? JSON.stringify(body) : body,
  });

  if (response.status === 401 && autenticado && !_tentativaRefresh) {
    const sessao = await renovarSessao();
    if (sessao) {
      return apiRequest(caminho, { ...opcoes, _tentativaRefresh: true });
    }
  }

  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const mensagem =
      typeof payload === 'object' && payload !== null
        ? payload.erro || payload.message || 'Erro ao processar requisição.'
        : payload || 'Erro ao processar requisição.';
    const erro = new Error(mensagem);
    erro.status = response.status;
    erro.detalhes = payload?.detalhes;
    throw erro;
  }

  return payload;
}

export async function baixarCsv(caminho, nomeArquivo) {
  const executar = () =>
    fetch(`${API_BASE_URL}${caminho}`, {
      method: 'GET',
      credentials: 'include',
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    });

  let res = await executar();
  if (res.status === 401 && (await renovarSessao())) {
    res = await executar();
  }

  if (!res.ok) {
    throw new Error('Não foi possível gerar o relatório CSV.');
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function formatarData(valor) {
  if (!valor) return '—';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return '—';
  return data.toLocaleDateString('pt-BR');
}
