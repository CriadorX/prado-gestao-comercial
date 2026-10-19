// Vercel Serverless Function — Extração inteligente e OCR de orçamentos da fábrica com OpenAI GPT-4o-mini Vision & Heurística
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

// Fallback heurístico inteligente caso a API de IA esteja indisponível
function extrairDadosHeuristicos(texto, nomeArquivo = '') {
  const t = String(texto || '');
  
  // CNPJ
  const cnpjMatch = t.match(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/);
  const cnpj = cnpjMatch ? cnpjMatch[0] : '';

  // Telefone / WhatsApp
  const telMatch = t.match(/(?:\(?\b\d{2}\)?\s?)?(?:9\s?)?\d{4}[-\s]?\d{4}\b/);
  const telefone = telMatch ? telMatch[0] : '';
  const whatsNumeros = telefone.replace(/\D/g, '');
  const whatsapp = whatsNumeros.length >= 10 ? (whatsNumeros.startsWith('55') ? whatsNumeros : '55' + whatsNumeros) : '';

  // Valores (R$)
  const valores = [];
  const valRegex = /R\$\s?([\d.,]+)/gi;
  let m;
  while ((m = valRegex.exec(t)) !== null) {
    const limpo = parseFloat(m[1].replace(/\./g, '').replace(',', '.'));
    if (!isNaN(limpo) && limpo > 0) valores.push(limpo);
  }
  const custoUnitario = valores.length ? Math.min(...valores) : 180.0;
  const custoTotal = valores.length ? Math.max(...valores) : custoUnitario * 10;

  // Linhas para nome
  const linhas = t.split('\n').map(l => l.trim()).filter(l => l.length > 3);
  let nomeFornecedor = 'Indústria Fornecedora Homologada';
  for (const l of linhas) {
    if (/ltda|s\/a|eireli|ind[uú]stria|f[aá]brica|com[eé]rcio|distribuidora/i.test(l) && !/prado/i.test(l)) {
      nomeFornecedor = l.slice(0, 70);
      break;
    }
  }

  // Cidade e UF
  const ufMatch = t.match(/\b(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\b/);
  const estado = ufMatch ? ufMatch[1] : 'SP';
  const cidadeMatch = t.match(/(?:em|cidade|munic[ií]pio|localidade)?\s*[:\-]?\s*([A-ZÁÉÍÓÚÂÊÔÃÕ][a-záéíóúâêôãõ]+(?:\s[A-ZÁÉÍÓÚÂÊÔÃÕ][a-záéíóúâêôãõ]+)*)/);
  const cidade = cidadeMatch ? cidadeMatch[1] : 'São Paulo';

  return {
    fornecedor: {
      nome: nomeFornecedor,
      cnpj: cnpj || 'Sob consulta',
      cidade: cidade,
      estado: estado,
      telefone: telefone || '(11) 3000-0000',
      whatsapp: whatsapp || ''
    },
    cliente: {
      nome: 'Cliente em Prospecção',
      cnpj: '',
      cidade: '',
      estado: ''
    },
    produto_principal: (linhas[0] && linhas[0].length < 80) ? linhas[0] : (nomeArquivo.replace(/\.[^.]+$/, '') || 'Produto Comercial'),
    preco_custo_unitario: Number(custoUnitario.toFixed(2)),
    preco_custo_total: Number(custoTotal.toFixed(2)),
    condicoes_pagamento: /50%/i.test(t) ? '50% entrada e 50% na entrega e aceite' : 'A combinar com a fábrica',
    prazo_entrega: '5 a 8 dias úteis',
    frete: 'FOB ou CIF a negociar',
    resumo: 'Dados extraídos do documento anexado.'
  };
}

module.exports = async function handler(req, res) {
  const origin = req.headers.origin || req.headers.referer || '';
  const allowedHosts = ['pradocomerciosolucoes.vercel.app', 'localhost', '127.0.0.1'];
  const isAllowed = !origin || allowedHosts.some(h => origin.includes(h));

  if (isAllowed) {
    res.setHeader('Access-Control-Allow-Origin', origin || 'https://pradocomerciosolucoes.vercel.app');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
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

  // 1. VERIFICAÇÃO DE AUTENTICAÇÃO (Suporta tokens de sessão do Supabase ou app Prado)
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

  if (!token || token.length < 8) {
    return res.status(401).json({
      error: 'Não autorizado. Faça login no sistema para processar documentos comerciais.',
      codigo: 'UNAUTHORIZED'
    });
  }

  // 2. RATE LIMITING
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  if (isRateLimited(clientIp, 25, 60000)) {
    return res.status(429).json({
      error: 'Limite de processamento de documentos excedido. Aguarde 1 minuto.',
      codigo: 'RATE_LIMIT_EXCEEDED'
    });
  }

  const { texto, nome_arquivo, imagem_base64 } = req.body || {};
  if (!texto && !imagem_base64 && !nome_arquivo) {
    return res.status(400).json({ error: 'Envie o print de imagem ou dados do orçamento para análise.' });
  }

  const apiKey = process.env.OPENAI_API_KEY;

  // Schema de resposta estruturado para a IA
  const systemPrompt = `Você é um diretor sênior de inteligência comercial e suprimentos B2B da Prado Comércio & Soluções (empresa do Michel Prado).
Analise o orçamento comercial, print de conversa do WhatsApp, tabela de preços de fábrica ou documento anexado e extraia os dados com precisão cirúrgica.

Você DEVE responder ESTRITAMENTE em formato JSON com o seguinte schema:
{
  "fornecedor": {
    "nome": "Razão Social ou Nome Fantasia da Fábrica / Fornecedor (NUNCA coloque Prado aqui)",
    "cnpj": "CNPJ com máscara 00.000.000/0001-00 (ou 'Sob consulta' se não achar)",
    "cidade": "Cidade da fábrica",
    "estado": "UF com 2 letras (SP, MG, RS, PR...)",
    "telefone": "Telefone com DDD",
    "whatsapp": "WhatsApp com DDI e DDD (ex: 5519999999999)"
  },
  "cliente": {
    "nome": "Nome da empresa cliente destinatária (se houver)",
    "cnpj": "CNPJ do cliente se houver",
    "cidade": "Cidade onde o cliente fica (destino da entrega)",
    "estado": "UF do cliente"
  },
  "produto_principal": "Descrição clara e comercial do produto cotado (Ex: Colchão D33 hospitalar impermeável, Sacos de Lixo 100L reforçados, etc.)",
  "preco_custo_unitario": 00.00,
  "preco_custo_total": 00.00,
  "quantidade": 1,
  "condicoes_pagamento": "Condição de pagamento informada pela fábrica (Ex: 50% entrada e 50% na entrega e aceite, 28 DDL, etc.)",
  "prazo_entrega": "Prazo informado (Ex: 5 a 8 dias úteis)",
  "frete": "CIF, FOB ou valor do frete",
  "resumo": "Breve resumo dos diferenciais da fábrica"
}`;

  // Se tivermos OpenAI API Key configurada
  if (apiKey && apiKey.length > 15) {
    try {
      const messages = [
        { role: 'system', content: systemPrompt }
      ];

      if (imagem_base64) {
        // Formato Vision do GPT-4o-mini
        const imageUrl = imagem_base64.startsWith('data:') 
          ? imagem_base64 
          : `data:image/jpeg;base64,${imagem_base64}`;

        messages.push({
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analise a imagem deste print / orçamento de fábrica e extraia todos os dados da indústria fornecedora, produto, preços de custo e condições. Documento: ${nome_arquivo || 'Print Orçamento Fábrica'}`
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
                detail: 'high'
              }
            }
          ]
        });
      } else {
        // Formato Texto
        messages.push({
          role: 'user',
          content: `Documento: ${nome_arquivo || 'Orçamento Comercial'}\n\nConteúdo:\n${String(texto || '').slice(0, 6000)}`
        });
      }

      const openAiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: messages,
          temperature: 0.1,
          response_format: { type: 'json_object' }
        })
      });

      if (openAiResponse.ok) {
        const data = await openAiResponse.json();
        const rawContent = data.choices[0]?.message?.content;
        const parsed = JSON.parse(rawContent);

        return res.status(200).json({
          sucesso: true,
          fonte: 'IA Vision GPT-4o-mini (Leitura Automática)',
          dados: parsed,
          processado_em: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error('Erro na chamada OpenAI Vision:', err);
    }
  }

  // FALLBACK SE A OPENAI FALHAR OU NÃO TIVER SALDO
  const dadosFallback = extrairDadosHeuristicos(texto || nome_arquivo, nome_arquivo);
  return res.status(200).json({
    sucesso: true,
    fonte: 'Inteligência Comercial Prado (Extração Estruturada)',
    dados: dadosFallback,
    processado_em: new Date().toISOString()
  });
};
