// Validação de sessão no servidor: token do Supabase verificado + exigência de 2FA (aal2).
// Arquivos iniciados por "_" na pasta /api não viram rotas na Vercel.

function decodeJwtPayload(token) {
  try {
    const part = token.split('.')[1];
    return JSON.parse(Buffer.from(part.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
  } catch {
    return null;
  }
}

async function requireMfaUser(req) {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return { ok: false, status: 503, error: 'Autenticação do servidor não configurada.' };
  }

  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) {
    return { ok: false, status: 401, error: 'Não autorizado. Faça login no sistema.', codigo: 'UNAUTHORIZED' };
  }

  // Confirma no Supabase que o token é autêntico e não expirou
  let user;
  try {
    const r = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${token}` }
    });
    if (!r.ok) {
      return { ok: false, status: 401, error: 'Sessão inválida ou expirada. Faça login novamente.', codigo: 'UNAUTHORIZED' };
    }
    user = await r.json();
  } catch {
    return { ok: false, status: 503, error: 'Falha ao validar a sessão.' };
  }

  // Token já foi validado pelo Supabase acima; aqui lemos o nível de garantia
  const claims = decodeJwtPayload(token);
  if (!claims || claims.aal !== 'aal2') {
    return { ok: false, status: 403, error: 'Verificação em 2 etapas (Google Authenticator) obrigatória.', codigo: 'MFA_REQUIRED' };
  }

  return { ok: true, user };
}

module.exports = { requireMfaUser };
