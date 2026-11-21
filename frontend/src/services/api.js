const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const CHAVE_TOKEN = 'bibliohm_token';

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

export async function apiRequest(caminho, opcoes = {}) {
  const { method = 'GET', body } = opcoes;
  const headers = {};

  if (body) {
    headers['Content-Type'] = 'application/json';
  }

  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const resposta = await fetch(`${API_URL}${caminho}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (resposta.status === 204) {
    return null;
  }

  const dados = await resposta.json();

  if (!resposta.ok) {
    throw new Error(dados.erro || 'Erro ao comunicar com o servidor.');
  }

  return dados;
}

export async function baixarCsv(caminho, nomeArquivo) {
  const token = getToken();
  const resposta = await fetch(`${API_URL}${caminho}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!resposta.ok) {
    throw new Error('Não foi possível baixar o arquivo CSV.');
  }

  const blob = await resposta.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivo;
  link.click();
  URL.revokeObjectURL(url);
}

export function formatarData(valor) {
  if (!valor) return '-';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return '-';
  return data.toLocaleDateString('pt-BR');
}
