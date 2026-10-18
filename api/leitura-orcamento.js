// Vercel Serverless Function — Extração inteligente de orçamentos com OpenAI (Hardened & Authenticated)
const rateLimits = new Map();

function isRateLimited(ip, limit = 8, windowMs = 60000) {
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
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  // 1. VERIFICAÇÃO DE AUTENTICAÇÃO
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

  if (!token || token.length < 20) {
    return res.status(401).json({
      error: 'Não autorizado. Faça login no sistema para processar documentos comerciais.',
      codigo: 'UNAUTHORIZED'
    });
  }

  // 2. RATE LIMITING
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  if (isRateLimited(clientIp, 8, 60000)) {
    return res.status(429).json({
      error: 'Limite de processamento de documentos excedido. Aguarde 1 minuto.',
      codigo: 'RATE_LIMIT_EXCEEDED'
    });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'Serviço de IA não configurado no servidor.' });
  }

  const { texto, nome_arquivo } = req.body || {};
  if (!texto && !nome_arquivo) {
    return res.status(400).json({ error: 'Envie o texto ou dados do documento para análise.' });
  }

  const cleanText = String(texto || '').trim().slice(0, 3000).replace(/[<>{}$`]/g, '');

  try {
    const prompt = `Você é um assistente sênior de extração de dados comerciais para a Prado Comércio & Soluções.
Extraia as seguintes informações do texto do orçamento/proposta/NF-e:
- Fornecedor ou Emitente (Razão Social e CNPJ se houver)
- Cliente ou Destinatário
- Itens/Produtos (descrição, quantidade, unidade, valor unitário, valor total)
- Valor Total da Proposta
- Frete (valor ou tipo: CIF/FOB)
- Prazo de entrega
- Validade da proposta
- Condições de pagamento

Responda ESTRITAMENTE em formato JSON com o seguinte schema:
{
  "fornecedor": { "nome": "", "cnpj": "" },
  "cliente": { "nome": "", "cnpj": "" },
  "itens": [
    { "descricao": "", "quantidade": 0, "unidade": "", "valor_unitario": 0, "valor_total": 0 }
  ],
  "valor_total": 0,
  "frete": "",
  "prazo_entrega": "",
  "validade": "",
  "condicoes_pagamento": "",
  "resumo": ""
}

Documento: ${String(nome_arquivo || 'Documento Comercial').slice(0, 100)}
Conteúdo:
${cleanText}`;

    const openAiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Você é um extrator de dados estruturados comerciais. Responda apenas com o JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      })
    });

    if (!openAiResponse.ok) {
      return res.status(502).json({ error: 'Falha temporária ao processar documento na OpenAI.' });
    }

    const data = await openAiResponse.json();
    const parsed = JSON.parse(data.choices[0].message.content);

    return res.status(200).json({
      sucesso: true,
      dados: parsed,
      processado_em: new Date().toISOString()
    });
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno ao processar a análise do documento com segurança.' });
  }
};
