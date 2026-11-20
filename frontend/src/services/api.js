export const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:3000';

const CHAVE_TOKEN = 'biblioteca_hm_token';

export function getToken() {
  return sessionStorage.getItem(CHAVE_TOKEN);
}

export function setToken(token) {
  if (token) {
    sessionStorage.setItem(CHAVE_TOKEN, token);
  } else {
    sessionStorage.removeItem(CHAVE_TOKEN);
  }
}

/**
 * Cliente HTTP padronizado com envio automático do token JWT (Bearer)
 * e tratamento uniforme de erros da API ({ erro, detalhes }).
 */
export async function apiRequest(caminho, opcoes = {}) {
  const { method = 'GET', body, headers = {}, autenticado = true } = opcoes;

  const requestHeaders = { ...headers };
  const ehTextoBruto = typeof body === 'string';

  if (body !== undefined && !ehTextoBruto && !(body instanceof FormData)) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  const token = getToken();
  if (autenticado && token) {
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  const resposta = await fetch(`${API_BASE_URL}${caminho}`, {
    method,
    headers: requestHeaders,
    body:
      body !== undefined && !ehTextoBruto && !(body instanceof FormData)
        ? JSON.stringify(body)
        : body,
  });

  if (resposta.status === 204) {
    return null;
  }

  const contentType = resposta.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await resposta.json()
    : await resposta.text();

  if (!resposta.ok) {
    const mensagem =
      typeof payload === 'object' && payload !== null
        ? payload.erro || payload.message || 'Erro ao processar requisição.'
        : payload || 'Erro ao processar requisição.';
    const erro = new Error(mensagem);
    erro.status = resposta.status;
    erro.detalhes = payload?.detalhes;
    throw erro;
  }

  return payload;
}

/**
 * Faz o download de relatórios CSV (RF12) autenticados via Bearer Token.
 */
export async function baixarCsv(caminho, nomeArquivo) {
  const token = getToken();
  const resposta = await fetch(`${API_BASE_URL}${caminho}`, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!resposta.ok) {
    let mensagem = 'Não foi possível gerar o arquivo CSV.';
    try {
      const dados = await resposta.json();
      if (dados?.erro) mensagem = dados.erro;
    } catch {
      // mantém mensagem padrão
    }
    throw new Error(mensagem);
  }

  const blob = await resposta.blob();
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
