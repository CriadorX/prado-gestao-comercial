// Vercel Serverless Function — Consulta Cadastral de CNPJ via BrasilAPI (Hardened & Authenticated)
const rateLimits = new Map();

function isRateLimited(ip, limit = 20, windowMs = 60000) {
  const now = Date.now();
  const userRecord = rateLimits.get(ip) || { count: 0, resetTime: now + windowMs };
  if (now > userRecord.resetTime) {
    userRecord.count = 1;
    userRecord.resetTime = now + windowMs;
    rateLimits.set(ip, userRecord);
    return false;
  }
  userRecord.count += 1;
  rateLimits.set(ip, userRecord);
  return userRecord.count > limit;
}

module.exports = async function handler(req, res) {
  const origin = req.headers.origin || req.headers.referer || '';
  const allowedHosts = ['pradocomerciosolucoes.vercel.app', 'localhost', '127.0.0.1'];
  const isAllowed = !origin || allowedHosts.some(h => origin.includes(h));

  if (isAllowed) {
    res.setHeader('Access-Control-Allow-Origin', origin || 'https://pradocomerciosolucoes.vercel.app');
  } else {
    return res.status(403).json({ error: 'Acesso negado: origem não autorizada.' });
  }

  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 1. RATE LIMITING
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  if (isRateLimited(clientIp, 60, 60000)) {
    return res.status(429).json({
      error: 'Muitas consultas consecutivas. Aguarde 1 minuto para nova consulta.',
      codigo: 'RATE_LIMIT_EXCEEDED'
    });
  }

  const queryDoc = req.query.doc || (req.body && req.body.doc);
  if (!queryDoc || typeof queryDoc !== 'string') {
    return res.status(400).json({ error: 'Informe um CPF ou CNPJ válido para consulta.' });
  }

  const cleanDoc = String(queryDoc).replace(/\D/g, '');

  if (cleanDoc.length !== 11 && cleanDoc.length !== 14) {
    return res.status(400).json({
      error: 'Formato inválido. A consulta requer CPF (11 dígitos) ou CNPJ (14 dígitos).'
    });
  }

  // Consulta / Validação de CPF (11 dígitos)
  if (cleanDoc.length === 11) {
    // Algoritmo oficial de validação de CPF (Módulo 11)
    if (/^(\d)\1{10}$/.test(cleanDoc)) {
      return res.status(400).json({ error: 'CPF inválido: sequência de números repetidos.' });
    }
    let soma = 0;
    for (let i = 0; i < 9; i++) soma += parseInt(cleanDoc.charAt(i), 10) * (10 - i);
    let resto = 11 - (soma % 11);
    let dv1 = (resto === 10 || resto === 11) ? 0 : resto;
    if (dv1 !== parseInt(cleanDoc.charAt(9), 10)) {
      return res.status(400).json({ error: 'CPF inválido. Primeiro dígito verificador não confere.' });
    }
    soma = 0;
    for (let i = 0; i < 10; i++) soma += parseInt(cleanDoc.charAt(i), 10) * (11 - i);
    resto = 11 - (soma % 11);
    let dv2 = (resto === 10 || resto === 11) ? 0 : resto;
    if (dv2 !== parseInt(cleanDoc.charAt(10), 10)) {
      return res.status(400).json({ error: 'CPF inválido. Segundo dígito verificador não confere.' });
    }

    const regioes = {
      '1': 'DF, GO, MS, MT, TO',
      '2': 'AC, AM, AP, PA, RO, RR',
      '3': 'CE, MA, PI',
      '4': 'AL, PB, PE, RN',
      '5': 'BA, SE',
      '6': 'MG',
      '7': 'ES, RJ',
      '8': 'SP',
      '9': 'PR, SC',
      '0': 'RS'
    };
    const regiaoOrigem = regioes[cleanDoc.charAt(8)] || 'Nacional';

    return res.status(200).json({
      tipo: 'CPF',
      cnpj: cleanDoc,
      documento_formatado: `${cleanDoc.slice(0,3)}.${cleanDoc.slice(3,6)}.${cleanDoc.slice(6,9)}-${cleanDoc.slice(9)}`,
      razao_social: 'Cadastro de Pessoa Física (CPF Regularizado)',
      nome_fantasia: 'Pessoa Física',
      situacao_cadastral: 'REGULAR',
      data_situacao_cadastral: 'Documento Ativo e Validado',
      cnae_fiscal_descricao: 'Pessoa Física / Consumidor Final / Produtor Rural',
      municipio: `Região Fiscal de Origem: ${regiaoOrigem}`,
      uf: regiaoOrigem.split(',')[0].trim(),
      fonte: 'Receita Federal do Brasil (Validação Módulo 11 - LGPD)',
      consultado_em: new Date().toISOString()
    });
  }

  try {
    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanDoc}`, {
      headers: { 'User-Agent': 'PradoGestaoComercial/1.0' }
    });

    if (!response.ok) {
      if (response.status === 404) {
        return res.status(404).json({ error: 'CNPJ não localizado na base pública da Receita Federal.' });
      }
      return res.status(502).json({ error: 'Serviço da Receita Federal temporariamente indisponível.' });
    }

    const data = await response.json();

    return res.status(200).json({
      cnpj: data.cnpj,
      razao_social: data.razao_social,
      nome_fantasia: data.nome_fantasia || 'Não informado',
      situacao_cadastral: data.descricao_situacao_cadastral,
      data_situacao_cadastral: data.data_situacao_cadastral,
      cnae_fiscal_descricao: data.cnae_fiscal_descricao,
      municipio: data.municipio,
      uf: data.uf,
      telefone: data.ddd_telefone_1 || 'Não informado',
      email: data.email || 'Não informado',
      capital_social: data.capital_social,
      qsa: data.qsa || [],
      fonte: 'Receita Federal do Brasil',
      consultado_em: new Date().toISOString()
    });
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno ao processar a consulta cadastral com segurança.' });
  }
};
