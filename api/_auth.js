// Validação criptográfica de sessão no servidor (HMAC-SHA256 JWT + TOTP RFC 6238 + Supabase Auth opcional).
// Arquivos iniciados por "_" na pasta /api não viram rotas públicas na Vercel.

const crypto = require('crypto');

function getAuthSecret() {
  if (process.env.PRADO_AUTH_SECRET && process.env.PRADO_AUTH_SECRET.length >= 32) {
    return process.env.PRADO_AUTH_SECRET;
  }
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return crypto.createHash('sha256').update('prado-jwt:' + process.env.SUPABASE_SERVICE_ROLE_KEY).digest('hex');
  }
  if (process.env.OPENAI_API_KEY) {
    return crypto.createHash('sha256').update('prado-jwt:' + process.env.OPENAI_API_KEY).digest('hex');
  }
  return null;
}

function base64UrlEncode(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(String(input), 'utf8');
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function base64UrlDecodeToBuffer(str) {
  const pad = 4 - (str.length % 4);
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/') + (pad < 4 ? '='.repeat(pad) : '');
  return Buffer.from(b64, 'base64');
}

function signServerJwt(payload, expiresInSec = 28800) {
  const secret = getAuthSecret();
  if (!secret) throw new Error('Segredo de autenticação do servidor não configurado.');

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'HS256', typ: 'JWT' };
  const body = {
    ...payload,
    iss: 'prado-gestao-auth',
    iat: now,
    exp: now + expiresInSec,
    jti: crypto.randomBytes(12).toString('hex')
  };

  const unsigned = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(body))}`;
  const sig = crypto.createHmac('sha256', secret).update(unsigned).digest();
  return `${unsigned}.${base64UrlEncode(sig)}`;
}

// Lista de revogação de tokens em memória (Logout / Invalidação de Sessão)
const revokedTokens = new Map(); // key: jti ou token -> expiry timestamp (ms)

function revokeServerToken(token) {
  if (!token || typeof token !== 'string') return;
  try {
    const claims = verifyServerJwt(token);
    const key = (claims && claims.jti) ? claims.jti : token;
    const exp = (claims && claims.exp) ? claims.exp * 1000 : Date.now() + 28800 * 1000;
    revokedTokens.set(key, exp);
  } catch {
    revokedTokens.set(token, Date.now() + 28800 * 1000);
  }
}

function isTokenRevoked(token) {
  if (!token) return true;
  const now = Date.now();
  if (revokedTokens.has(token)) return true;
  try {
    const part = token.split('.')[1];
    if (part) {
      const payload = JSON.parse(base64UrlDecodeToBuffer(part).toString('utf8'));
      if (payload && payload.jti && revokedTokens.has(payload.jti)) {
        return true;
      }
    }
  } catch {}
  return false;
}

function verifyServerJwt(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const secret = getAuthSecret();
  if (!secret) return null;

  try {
    const [hB64, pB64, sB64] = parts;
    const unsigned = `${hB64}.${pB64}`;
    const expectedSig = crypto.createHmac('sha256', secret).update(unsigned).digest();
    const providedSig = base64UrlDecodeToBuffer(sB64);

    if (expectedSig.length !== providedSig.length || !crypto.timingSafeEqual(expectedSig, providedSig)) {
      return null;
    }

    const header = JSON.parse(base64UrlDecodeToBuffer(hB64).toString('utf8'));
    if (!header || header.alg !== 'HS256') return null;

    const payload = JSON.parse(base64UrlDecodeToBuffer(pB64).toString('utf8'));
    const now = Math.floor(Date.now() / 1000);
    if (!payload || payload.iss !== 'prado-gestao-auth') return null;
    if (typeof payload.exp !== 'number' || payload.exp <= now) return null;

    // Checagem de token revogado
    if (payload.jti && revokedTokens.has(payload.jti)) return null;
    if (revokedTokens.has(token)) return null;

    return payload;
  } catch {
    return null;
  }
}

function hashPasswordServer(plainPassword) {
  if (!plainPassword || typeof plainPassword !== 'string') {
    throw new Error('Senha inválida para hash.');
  }
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(plainPassword, salt, 64);
  return `${salt}:${derived.toString('hex')}`;
}

function verifyPasswordServer(plainPassword, storedHash) {
  if (!plainPassword || !storedHash || typeof plainPassword !== 'string' || typeof storedHash !== 'string') {
    return false;
  }
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, expectedHex] = parts;
  try {
    const derived = crypto.scryptSync(plainPassword, salt, 64);
    const expected = Buffer.from(expectedHex, 'hex');
    if (derived.length !== expected.length) return false;
    return crypto.timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

function base32ToBuffer(base32Str) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = String(base32Str || '').toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const bytes = [];
  for (let i = 0; i < clean.length; i++) {
    const idx = alphabet.indexOf(clean[i]);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

function computeHotp(keyBuf, counter) {
  const buf = Buffer.alloc(8);
  let tmp = Math.floor(counter);
  for (let i = 7; i >= 0; i--) {
    buf[i] = tmp & 0xff;
    tmp = Math.floor(tmp / 256);
  }
  const hmac = crypto.createHmac('sha1', keyBuf).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(binary % 1000000).padStart(6, '0');
}

// Armazenamento de time-steps TOTP utilizados para proteção contra Replay Attack (RFC 6238)
const lastUsedTotpSteps = new Map(); // key: userId/email -> { step: number, timestamp: number }

function verifyTotpServerWithReplayCheck(userId, code, base32Secret, windowSteps = 2) {
  const cleanCode = String(code || '').replace(/\D/g, '');
  if (!/^\d{6}$/.test(cleanCode) || !base32Secret) {
    return { ok: false, error: 'Código de 6 dígitos inválido ou não informado.' };
  }

  const keyBuf = base32ToBuffer(base32Secret);
  if (!keyBuf.length) {
    return { ok: false, error: 'Chave secreta do Google Authenticator inválida.' };
  }

  const currentStep = Math.floor(Date.now() / 1000 / 30);
  const codeBuf = Buffer.from(cleanCode, 'utf8');

  let matchedStep = null;
  for (let offset = -windowSteps; offset <= windowSteps; offset++) {
    const candidateStep = currentStep + offset;
    const candidate = computeHotp(keyBuf, candidateStep);
    const candBuf = Buffer.from(candidate, 'utf8');
    if (codeBuf.length === candBuf.length && crypto.timingSafeEqual(codeBuf, candBuf)) {
      matchedStep = candidateStep;
      break;
    }
  }

  if (matchedStep === null) {
    return { ok: false, error: 'Código do Google Authenticator incorreto ou expirado.' };
  }

  // Proteção estrita contra Replay Attack (RFC 6238)
  const userKey = String(userId || 'global-user').toLowerCase().trim();
  const lastRecord = lastUsedTotpSteps.get(userKey);
  if (lastRecord && lastRecord.step >= matchedStep) {
    return {
      ok: false,
      replay: true,
      error: 'Este código do Google Authenticator já foi utilizado. Aguarde os próximos 30 segundos para gerar um novo código.'
    };
  }

  // Registra o step utilizado pelo usuário
  lastUsedTotpSteps.set(userKey, { step: matchedStep, timestamp: Date.now() });

  // Limpeza de histórico antigo (> 15 minutos)
  const cutoff = Date.now() - 15 * 60 * 1000;
  for (const [k, v] of lastUsedTotpSteps.entries()) {
    if (v.timestamp < cutoff) lastUsedTotpSteps.delete(k);
  }

  return { ok: true, step: matchedStep };
}

function verifyTotpServer(code, base32Secret, windowSteps = 2) {
  const cleanCode = String(code || '').replace(/\D/g, '');
  if (!/^\d{6}$/.test(cleanCode) || !base32Secret) return false;

  const keyBuf = base32ToBuffer(base32Secret);
  if (!keyBuf.length) return false;

  const currentStep = Math.floor(Date.now() / 1000 / 30);
  const codeBuf = Buffer.from(cleanCode, 'utf8');

  for (let offset = -windowSteps; offset <= windowSteps; offset++) {
    const candidate = computeHotp(keyBuf, currentStep + offset);
    const candBuf = Buffer.from(candidate, 'utf8');
    if (codeBuf.length === candBuf.length && crypto.timingSafeEqual(codeBuf, candBuf)) {
      return true;
    }
  }
  return false;
}

function parseCookies(req) {
  const list = {};
  const cookieHeader = req.headers?.cookie;
  if (!cookieHeader) return list;
  cookieHeader.split(';').forEach(cookie => {
    const parts = cookie.split('=');
    const key = parts.shift()?.trim();
    if (key) {
      list[key] = decodeURIComponent(parts.join('=').trim());
    }
  });
  return list;
}

function decodeJwtPayloadUnsafe(token) {
  try {
    const part = token.split('.')[1];
    return JSON.parse(base64UrlDecodeToBuffer(part).toString('utf8'));
  } catch {
    return null;
  }
}

async function requireMfaUser(req) {
  const authHeader = req.headers?.authorization || '';
  const hasBearerHeader = authHeader.startsWith('Bearer ');
  const bearerToken = hasBearerHeader ? authHeader.slice(7).trim() : '';

  const cookies = parseCookies(req);
  const cookieToken = cookies.prado_session || '';

  // Se o cliente enviou Authorization header, validamos estritamente esse token (sem fallback para cookie)
  const token = hasBearerHeader ? bearerToken : cookieToken;

  if (!token) {
    return {
      ok: false,
      status: 401,
      error: 'Não autorizado. Faça login no sistema.',
      codigo: 'UNAUTHORIZED'
    };
  }

  // 1. Verifica token JWT assinado pelo servidor Prado (HMAC-SHA256)
  const serverClaims = verifyServerJwt(token);
  if (serverClaims) {
    if (serverClaims.purpose !== 'session' || serverClaims.aal !== 'aal2') {
      return {
        ok: false,
        status: 403,
        error: 'Verificação em 2 etapas (Google Authenticator) obrigatória.',
        codigo: 'MFA_REQUIRED'
      };
    }
    return {
      ok: true,
      user: serverClaims.user || {
        id: serverClaims.sub,
        email: serverClaims.email,
        role: serverClaims.role || 'operador'
      },
      claims: serverClaims
    };
  }

  // 2. Fallback opcional: Verifica JWT real do Supabase Auth se o servidor tiver SUPABASE_URL + SUPABASE_ANON_KEY
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (url && anonKey) {
    try {
      const r = await fetch(`${url}/auth/v1/user`, {
        headers: { apikey: anonKey, Authorization: `Bearer ${token}` }
      });
      if (r.ok) {
        const supaUser = await r.json();
        const claims = decodeJwtPayloadUnsafe(token);
        if (!claims || claims.aal !== 'aal2') {
          return {
            ok: false,
            status: 403,
            error: 'Verificação em 2 etapas (Google Authenticator) obrigatória.',
            codigo: 'MFA_REQUIRED'
          };
        }
        return { ok: true, user: supaUser, claims };
      }
    } catch {
      // Falha na verificação externa
    }
  }

  return {
    ok: false,
    status: 401,
    error: 'Sessão inválida ou expirada. Faça login novamente.',
    codigo: 'UNAUTHORIZED'
  };
}

module.exports = {
  requireMfaUser,
  signServerJwt,
  verifyServerJwt,
  verifyPasswordServer,
  hashPasswordServer,
  verifyTotpServer,
  verifyTotpServerWithReplayCheck,
  revokeServerToken,
  isTokenRevoked,
  parseCookies
};
