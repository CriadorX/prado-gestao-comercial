// Endpoint oficial de autenticação Server-Side (Login, 2FA TOTP RFC 6238, Validação de Sessão e Recuperação Verificada)
const crypto = require('crypto');
const {
  requireMfaUser,
  signServerJwt,
  verifyServerJwt,
  verifyPasswordServer,
  hashPasswordServer,
  verifyTotpServer,
  verifyTotpServerWithReplayCheck,
  revokeServerToken,
  parseCookies
} = require('./_auth');

// Armazenamento em memória de credenciais atualizadas (recuperação persistida no ciclo do servidor)
const updatedUserPasswords = new Map();

function getEffectivePasswordHash(identifier, defaultHash) {
  const key = String(identifier || '').trim().toLowerCase();
  if (updatedUserPasswords.has(key)) {
    return updatedUserPasswords.get(key);
  }
  return defaultHash;
}

// Rate limiter em memória contra força bruta (por IP / identificador)
const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutos

function getClientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length > 0) {
    return xff.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}

function checkRateLimit(key) {
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (!entry) return { allowed: true };
  if (now - entry.firstAttempt > WINDOW_MS) {
    loginAttempts.delete(key);
    return { allowed: true };
  }
  if (entry.count >= MAX_ATTEMPTS) {
    const retryAfterSec = Math.ceil((WINDOW_MS - (now - entry.firstAttempt)) / 1000);
    return { allowed: false, retryAfterSec };
  }
  return { allowed: true };
}

function recordFailedAttempt(key) {
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (!entry || now - entry.firstAttempt > WINDOW_MS) {
    loginAttempts.set(key, { count: 1, firstAttempt: now });
  } else {
    entry.count += 1;
  }
}

function clearFailedAttempts(key) {
  loginAttempts.delete(key);
}

// Dados corporativos e registros iniciais protegidos no servidor (são entregues somente após autenticação MFA aal2)
function obterDadosCorporativosAutorizados(user) {
  const isAdmin = user && user.role === 'admin_global';

  const empresa = {
    nomeFantasia: 'Prado Comércio & Soluções',
    marcaSecundaria: 'LicitaDigitalTech – Comércio & Soluções',
    razaoSocial: '59.825.765 Michel do Prado',
    cnpj: '59.825.765/0001-03',
    ie: '465.150.144.115',
    municipio: 'Monte Mor - SP',
    cep: '13190-000',
    endereco: 'Rua Principal, 100 - Centro - Monte Mor - SP',
    telefone: '(19) 98814-6164',
    email: 'licitadigitaltech@gmail.com',
    chavePix: '59.825.765/0001-03',
    titular: 'Michel do Prado'
  };

  const orcamentos = [
    {
      id: 'orc-027-2026',
      numero: '027/2026',
      data_emissao: '2026-10-09',
      data_validade: '2026-10-30',
      responsavel: 'Michel do Prado',
      referencia: 'Colchões Solteiros',
      cliente_nome: 'Lar dos Velhinhos de Piracicaba',
      cliente_doc: '54.406.723/0001-14',
      cliente_email: 'compras@lardosvelhinhospiracicaba.org.br',
      cliente_telefone: '(19) 3372-9485',
      cliente_endereco: 'Av. Torquato da Silva Leitão, 615 - São Dimas - Piracicaba/SP - CEP 13416-215',
      itens: [
        {
          item: 1,
          produto: 'Colchão D33 solteiro 88x188x18 cm revestimento em courvin hospitalar impermeável azul, antiácaro, antifungo, antialérgico, certificado pelo INMETRO',
          unidade: '1',
          quantidade: 150,
          custo_fabrica: 300.00,
          margem_pct: 61.67,
          valor_unitario: 585.00,
          total: 87750.00,
          lucro_bruto: 27750.00
        }
      ],
      subtotal: 87750.00,
      desconto: 15000.00,
      frete: 0.00,
      valor_total: 72750.00,
      custo_fabrica_total: 45000.00,
      lucro_bruto_total: 27750.00,
      regime_tributario: 'MEI',
      aliquota_me: 4.0,
      imposto_provisao: 0.00,
      lucro_liquido_real: 27750.00,
      fluxo_entrada_fab: 22500.00,
      fluxo_saldo_fab: 22500.00,
      pagamento: 'À vista.',
      entrega_frete: 'Prazo sujeito à disponibilidade. Frete incluso, salvo indicação expressa.',
      observacoes: 'Desconto de R$ 15.000,00 já aplicado onde o preço de cada unidade passa a ser R$485,00. Preço válido até 30/10/2026. Prazo de entrega 30 dias, certificado de garantia em anexo.',
      status: 'Aguardando Extrato Anual',
      criadoPor: user.email
    },
    {
      id: 'orc-021-2026',
      numero: '021/2026',
      data_emissao: '2026-09-24',
      data_validade: '2026-10-15',
      responsavel: 'Michel do Prado',
      referencia: 'Sacos de Lixo Reforçados (NF-e 002)',
      cliente_nome: 'Lar dos Velhinhos de Piracicaba',
      cliente_doc: '54.406.723/0001-14',
      cliente_email: 'compras@lardosvelhinhospiracicaba.org.br',
      cliente_telefone: '(19) 3372-9485',
      cliente_endereco: 'Av. Torquato da Silva Leitão, 615 - São Dimas - Piracicaba/SP - CEP 13416-215',
      itens: [
        {
          item: 1,
          produto: 'Saco para lixo 50 litros reforçado 0,12 micras (Pacote c/ 100 un.) - NCM 39232190',
          unidade: 'PCT',
          quantidade: 100,
          custo_fabrica: 44.80,
          margem_pct: 60.71,
          valor_unitario: 72.00,
          total: 7200.00,
          lucro_bruto: 2720.00
        },
        {
          item: 2,
          produto: 'Saco para lixo 100 litros reforçado 0,12 micras (Pacote c/ 100 un.) - NCM 39232190',
          unidade: 'PCT',
          quantidade: 200,
          custo_fabrica: 44.50,
          margem_pct: 60.67,
          valor_unitario: 71.50,
          total: 14300.00,
          lucro_bruto: 5400.00
        }
      ],
      subtotal: 21500.00,
      desconto: 0.00,
      frete: 0.00,
      valor_total: 21500.00,
      custo_fabrica_total: 13380.00,
      lucro_bruto_total: 8120.00,
      regime_tributario: 'MEI',
      aliquota_me: 4.0,
      imposto_provisao: 0.00,
      lucro_liquido_real: 8120.00,
      fluxo_entrada_fab: 6690.00,
      fluxo_saldo_fab: 6690.00,
      pagamento: 'À vista (Transferência Bancária / PIX liquidado no Banco do Brasil).',
      entrega_frete: 'Frete CIF incluso. Entrega concluída no endereço do destinatário em Piracicaba/SP.',
      observacoes: 'Faturamento oficializado através da NF-e Nº 000.000.002 (Série 1) emitida em 25/09/2026.',
      status: 'Faturado e Pago',
      nfe_vinculada: '000.002',
      criadoPor: user.email
    }
  ];

  const notas_fiscais = [
    {
      id: 'nfe-002-2026',
      numero: '000.002',
      serie: '1',
      tipo_doc: '55',
      cfop: '5.102',
      natureza_operacao: 'VENDA DE MERCADORIAS',
      orcamento_origem: '021/2026',
      data_emissao: '2026-09-25',
      hora_emissao: '09:30:27',
      destinatario_nome: 'LAR DOS VELHINHOS DE PIRACICABA',
      destinatario_doc: '54.406.723/0001-14',
      destinatario_ie: 'ISENTO',
      destinatario_endereco: 'AV TORQUATO DA SILVA LEITAO, 615 - SAO DIMAS - PIRACICABA/SP - CEP 13416-215',
      destinatario_email: 'compras@lardosvelhinhospiracicaba.org.br',
      destinatario_tel: '(19) 3372-9485',
      itens: [
        {
          item: 1,
          codigo: '01',
          produto: 'SACO PARA LIXO 50 LTS REFORCADO 0.12 MICRAS C/100',
          ncm: '39232190',
          cfop: '5102',
          unidade: 'PCT',
          quantidade: 100,
          valor_unitario: 72.00,
          total: 7200.00
        },
        {
          item: 2,
          codigo: '02',
          produto: 'SACO PARA LIXO 100 LTS REFORCADO 0.12 MICRAS C/100',
          ncm: '39232190',
          cfop: '5102',
          unidade: 'PCT',
          quantidade: 200,
          valor_unitario: 71.50,
          total: 14300.00
        }
      ],
      subtotal: 21500.00,
      desconto: 0.00,
      frete: 0.00,
      valor_total: 21500.00,
      forma_pagamento: '01',
      vencimento: 'À vista (Pago)',
      chave_acesso: '35260959825765000103550010000000021300000027',
      protocolo: '135264036993299 - 25/09/2026 09:31:02',
      dados_adicionais: 'DOCUMENTO EMITIDO POR ME OU EPP OPTANTE PELO SIMPLES NACIONAL. NAO GERA DIREITO A CREDITO FISCAL DE IPI.',
      status: 'Autorizada',
      criadoPor: user.email
    }
  ];

  const extrato_bb = isAdmin ? [
    {
      id: 'bb-tx-001-nfe002-rec',
      data: '2026-09-25',
      descricao: 'PIX RECEBIDO - LAR DOS VELHINHOS DE PIRACICABA (NF-E 000.002 - SACOS DE LIXO)',
      tipo: 'C',
      valor: 21500.00,
      categoria: 'receita_cliente',
      referencia: 'NF-e 000.002 (Orç. 021/2026)',
      documento: '35260959825765000103550010000000021300000027',
      conciliado: true
    },
    {
      id: 'bb-tx-002-nfe002-forn1',
      data: '2026-09-25',
      descricao: 'PAGAMENTO FORNECEDOR PIX - 3W EMBALAGENS / PLASTICOS (INSUMOS NF-E 002)',
      tipo: 'D',
      valor: 9500.00,
      categoria: 'custo_fabrica_50',
      referencia: 'Compra de Mercadoria (NF-e 002)',
      documento: 'PIX-3W-001',
      conciliado: true
    },
    {
      id: 'bb-tx-003-nfe002-forn2',
      data: '2026-09-26',
      descricao: 'PAGAMENTO FORNECEDOR PIX - CBP SUL / COMPLEMENTO E LOGISTICA (NF-E 002)',
      tipo: 'D',
      valor: 3880.00,
      categoria: 'custo_fabrica_saldo',
      referencia: 'Liquidação Fornecedor (NF-e 002)',
      documento: 'PIX-CBPSUL-002',
      conciliado: true
    },
    {
      id: 'bb-tx-004-das-set',
      data: '2026-09-20',
      descricao: 'PAGAMENTO DAS-MEI SIMPLES NACIONAL - COMPETENCIA 08/2026',
      tipo: 'D',
      valor: 75.60,
      categoria: 'impostos_das',
      referencia: 'Guia DAS-MEI Mensal',
      documento: 'DAS-2026-08',
      conciliado: true
    },
    {
      id: 'bb-tx-005-das-out',
      data: '2026-10-20',
      descricao: 'PAGAMENTO DAS-MEI SIMPLES NACIONAL - COMPETENCIA 09/2026',
      tipo: 'D',
      valor: 75.60,
      categoria: 'impostos_das',
      referencia: 'Guia DAS-MEI Mensal',
      documento: 'DAS-2026-09',
      conciliado: true
    }
  ] : [];

  const fornecedores = [
    {
      id: 'for-inicial-3w',
      nome: '3W Embalagens e Plásticos Industriais',
      doc: 'Homologado (Fornecedor NF-e 002)',
      contato: 'Departamento Comercial Atacado',
      email: 'comercial@3wembalagens.com.br',
      telefone: '(19) 3400-0000',
      categoria: 'Fábrica de Sacos de Lixo e Embalagens (NCM 39232190)',
      status: 'Ativo',
      criadoPor: user.email
    }
  ];

  const clientes = [
    {
      id: 'cli-inicial-lar-piracicaba',
      nome: 'Lar dos Velhinhos de Piracicaba',
      doc: '54.406.723/0001-14',
      contato: 'Setor de Compras e Suprimentos',
      email: 'compras@lardosvelhinhospiracicaba.org.br',
      telefone: '(19) 3372-9485',
      endereco: 'Av. Torquato da Silva Leitão, 615 - São Dimas - Piracicaba/SP - CEP 13416-215',
      status: 'Ativo',
      criadoPor: user.email
    }
  ];

  const oportunidades = [
    {
      id: 'op-inicial-nfe002',
      nome: 'Fornecimento de 300 Pct Sacos de Lixo Reforçados (NF-e 002)',
      cliente: 'Lar dos Velhinhos de Piracicaba',
      valor: 21500.00,
      custoEstimado: 13380.00,
      prazo: '2026-09-25',
      status: 'Entregue',
      orcamento_id: 'orc-021-2026',
      orcamento_numero: '021/2026',
      descricao: '100 PCT Saco 50L 0,12 micras (R$ 7.200,00) + 200 PCT Saco 100L 0,12 micras (R$ 14.300,00). Faturado via NF-e Nº 000.002 em 25/09/2026.',
      criadoPor: user.email
    },
    {
      id: 'op-inicial-orc027',
      nome: '150 Colchões D33 Solteiro Courvin Hospitalar (Orç. 027/2026)',
      cliente: 'Lar dos Velhinhos de Piracicaba',
      valor: 72750.00,
      custoEstimado: 45000.00,
      prazo: '2026-10-30',
      status: 'Aprovado',
      orcamento_id: 'orc-027-2026',
      orcamento_numero: '027/2026',
      descricao: 'Orçamento Comercial Nº 027/2026 aprovado (150 un. Colchão D33 88x188x18cm courvin hospitalar impermeável azul INMETRO). Aguardando liberação do extrato anual para faturamento.',
      criadoPor: user.email
    }
  ];

  const pedidos = [
    {
      id: 'ped-inicial-nfe002',
      nome: 'NF-e 000.002 — 300 Pct Sacos de Lixo Reforçados (50L e 100L)',
      cliente: 'Lar dos Velhinhos de Piracicaba',
      fornecedor: '3W Embalagens / CBP Sul',
      valor: 21500.00,
      rastreio: 'NFE-002-ENTREGUE',
      previsao: '2026-09-25',
      status: 'Entregue e Liquidado',
      criadoPor: user.email
    },
    {
      id: 'ped-inicial-orc027',
      nome: 'Orç. 027/2026 — 150 Colchões D33 Solteiro Hospitalar Impermeável',
      cliente: 'Lar dos Velhinhos de Piracicaba',
      fornecedor: 'Indústria Homologada de Espumas (50/50)',
      valor: 72750.00,
      rastreio: 'AGUARDANDO-EXTRATO-ANUAL',
      previsao: '2026-11-15',
      status: 'Aguardando Extrato Anual',
      criadoPor: user.email
    }
  ];

  return {
    empresa,
    orcamentos,
    notas_fiscais,
    extrato_bb,
    fornecedores,
    clientes,
    oportunidades,
    pedidos
  };
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET /api/auth -> Valida a sessão atual no servidor (chamado a cada F5 / carregamento da página)
  if (req.method === 'GET') {
    const auth = await requireMfaUser(req);
    if (!auth.ok) {
      return res.status(auth.status).json({
        ok: false,
        error: auth.error,
        codigo: auth.codigo
      });
    }

    const dadosIniciais = obterDadosCorporativosAutorizados(auth.user);
    return res.status(200).json({
      ok: true,
      user: auth.user,
      empresa: dadosIniciais.empresa,
      dadosIniciais
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Método não permitido.' });
  }

  const body = req.body || {};
  const action = String(body.action || '').trim();
  const ip = getClientIp(req);

  // 1. IDENTIFY: Valida apenas formato de CPF, CNPJ ou E-mail sem expor lista de usuários ou senhas
  if (action === 'identify') {
    const rawId = String(body.identifier || '').trim();
    const digits = rawId.replace(/\D/g, '');
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawId);
    const isCpfOrCnpj = digits.length === 11 || digits.length === 14;

    if (!isEmail && !isCpfOrCnpj) {
      return res.status(400).json({
        ok: false,
        error: 'Informe um CPF/CNPJ válido ou seu e-mail corporativo.'
      });
    }

    return res.status(200).json({
      ok: true,
      challengeRequired: true
    });
  }

  // 1b. GOOGLE-OAUTH: Validação criptográfica do token de acesso retornado pelo Google via Supabase Auth
  if (action === 'google-oauth') {
    const supabaseToken = String(body.supabaseToken || '').trim();
    const rateKey = `google-oauth:${ip}`;

    const rl = checkRateLimit(rateKey);
    if (!rl.allowed) {
      return res.status(429).json({
        ok: false,
        error: `Muitas tentativas de conexão. Aguarde ${rl.retryAfterSec} segundos.`
      });
    }

    if (!supabaseToken) {
      return res.status(400).json({ ok: false, error: 'Token de autenticação Supabase não fornecido.' });
    }

    const url = process.env.SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY;
    if (!url || !anonKey) {
      return res.status(503).json({
        ok: false,
        error: 'Integração Google OAuth / Supabase não configurada no servidor (SUPABASE_URL ausente).'
      });
    }

    try {
      const supaRes = await fetch(`${url}/auth/v1/user`, {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${supabaseToken}`
        }
      });

      if (!supaRes.ok) {
        recordFailedAttempt(rateKey);
        return res.status(401).json({
          ok: false,
          error: 'Sessão Google OAuth inválida ou expirada no provedor Supabase.'
        });
      }

      const supaUser = await supaRes.json();
      const userEmail = String(supaUser.email || '').toLowerCase().trim();

      const adminEmail = String(process.env.PRADO_ADMIN_EMAIL || '').trim().toLowerCase();
      const adminAltEmail = 'comercial@pradosolucoes.com.br';
      const michelPersonalEmail = 'mdprado91@gmail.com';

      // Autorização corporativa de acesso
      const isAuthorized =
        userEmail &&
        (userEmail === adminEmail ||
         userEmail === adminAltEmail ||
         userEmail === michelPersonalEmail ||
         userEmail === 'licitadigitaltech@gmail.com' ||
         (adminEmail === '' && userEmail.endsWith('@pradosolucoes.com.br')));

      if (!isAuthorized) {
        recordFailedAttempt(rateKey);
        return res.status(403).json({
          ok: false,
          error: `A conta Google (${userEmail}) não possui autorização de acesso ao Prado Gestão Comercial.`
        });
      }

      clearFailedAttempts(rateKey);

      // Verifica necessidade de segundo fator MFA (Google Authenticator)
      const totpSecret = process.env.PRADO_TOTP_SECRET || '';
      const phoneTotpSecret = process.env.PRADO_TOTP_SECRET_PHONE || '';
      const requireMfa = Boolean(totpSecret || phoneTotpSecret);

      if (requireMfa) {
        // Emite token de desafio MFA para confirmação no Google Authenticator
        const mfaToken = signServerJwt(
          {
            purpose: 'mfa_challenge',
            sub: supaUser.id || 'admin-prado-01',
            email: userEmail,
            role: 'admin_global',
            aal: 'aal1',
            provider: 'google'
          },
          300
        );

        return res.status(200).json({
          ok: true,
          mfaRequired: true,
          mfaToken,
          email: userEmail
        });
      }

      // Se MFA não estiver exigido no ambiente, gera a sessão autorizada aal2
      const authenticatedUser = {
        id: supaUser.id || 'admin-prado-01',
        nome: supaUser.user_metadata?.full_name || supaUser.user_metadata?.name || 'Michel do Prado',
        email: userEmail,
        cargo: 'Administrador Geral / Diretoria',
        role: 'admin_global',
        setor: 'Diretoria & Gestão Comercial',
        avatar: supaUser.user_metadata?.avatar_url || 'MP'
      };

      const sessionToken = signServerJwt(
        {
          purpose: 'session',
          sub: authenticatedUser.id,
          email: authenticatedUser.email,
          role: authenticatedUser.role,
          aal: 'aal2',
          user: authenticatedUser
        },
        8 * 3600
      );

      res.setHeader(
        'Set-Cookie',
        `prado_session=${encodeURIComponent(sessionToken)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=28800`
      );

      const dadosIniciais = obterDadosCorporativosAutorizados(authenticatedUser);
      return res.status(200).json({
        ok: true,
        token: sessionToken,
        user: authenticatedUser,
        empresa: dadosIniciais.empresa,
        dadosIniciais
      });
    } catch (err) {
      return res.status(500).json({
        ok: false,
        error: 'Erro interno ao validar credencial Google no Supabase.'
      });
    }
  }

  // 2. LOGIN (Etapa 2: Verificação de Senha no Servidor)
  if (action === 'login') {
    const rawId = String(body.identifier || '').trim().toLowerCase();
    const password = String(body.password || '');
    const rateKey = `login:${ip}:${rawId}`;

    const rl = checkRateLimit(rateKey);
    if (!rl.allowed) {
      return res.status(429).json({
        ok: false,
        error: `Muitas tentativas inválidas. Aguarde ${rl.retryAfterSec} segundos antes de tentar novamente.`
      });
    }

    if (!rawId || !password) {
      return res.status(400).json({ ok: false, error: 'Informe suas credenciais completas.' });
    }

    const adminEmail = String(process.env.PRADO_ADMIN_EMAIL || '').trim().toLowerCase();
    const adminCpf = String(process.env.PRADO_ADMIN_CPF || '').replace(/\D/g, '');
    const adminCnpj = '59825765000103';
    const adminAltEmail = 'comercial@pradosolucoes.com.br';
    const adminPwdHash = process.env.PRADO_ADMIN_PASSWORD_HASH || '';

    if (!adminEmail || !adminPwdHash) {
      return res.status(503).json({
        ok: false,
        error: 'Credenciais de autenticação não configuradas no servidor.'
      });
    }

    const digits = rawId.replace(/\D/g, '');
    const isIdMatch =
      rawId === adminEmail ||
      rawId === adminAltEmail ||
      (digits.length === 14 && digits === adminCnpj) ||
      (adminCpf && digits.length === 11 && digits === adminCpf);
    const effectiveHash = getEffectivePasswordHash(rawId, adminPwdHash);
    const isPwdValid = verifyPasswordServer(password, effectiveHash);

    if (!isIdMatch || !isPwdValid) {
      recordFailedAttempt(rateKey);
      return res.status(401).json({
        ok: false,
        error: 'Credenciais inválidas. Verifique seu CPF/e-mail e senha.'
      });
    }

    // Emite apenas um token temporário de desafio MFA (aal1, 5 min) — NÃO emite sessão final e NÃO envia código OTP na resposta!
    const mfaToken = signServerJwt(
      {
        purpose: 'mfa_challenge',
        sub: 'admin-prado-01',
        email: adminEmail,
        role: 'admin_global',
        aal: 'aal1'
      },
      300
    );

    return res.status(200).json({
      ok: true,
      mfaRequired: true,
      mfaToken
    });
  }

  // 3. VERIFY-MFA (Etapa 3: Validação Criptográfica TOTP RFC 6238 no Servidor)
  if (action === 'verify-mfa') {
    const mfaToken = String(body.mfaToken || '').trim();
    const code = String(body.code || '').replace(/\D/g, '');
    const rateKey = `mfa:${ip}`;

    const rl = checkRateLimit(rateKey);
    if (!rl.allowed) {
      return res.status(429).json({
        ok: false,
        error: `Muitas tentativas de 2FA inválidas. Aguarde ${rl.retryAfterSec} segundos.`
      });
    }

    const challengeClaims = verifyServerJwt(mfaToken);
    if (!challengeClaims || challengeClaims.purpose !== 'mfa_challenge') {
      return res.status(401).json({
        ok: false,
        error: 'Sessão de verificação expirada ou inválida. Inicie o login novamente.'
      });
    }

    const totpSecret = process.env.PRADO_TOTP_SECRET || '';
    const phoneTotpSecret = process.env.PRADO_TOTP_SECRET_PHONE || '';
    if (!totpSecret && !phoneTotpSecret) {
      return res.status(503).json({
        ok: false,
        error: 'Segredo 2FA não configurado no servidor.'
      });
    }

    // Validação TOTP com proteção obrigatória contra Replay Attack (RFC 6238) por usuário
    const userKey = challengeClaims.email || challengeClaims.sub || 'admin-prado-01';
    let isTotpValid = false;
    let failureMsg = 'Código do Google Authenticator inválido ou expirado.';

    if (totpSecret) {
      const resT = verifyTotpServerWithReplayCheck(userKey, code, totpSecret, 4);
      if (resT.ok) {
        isTotpValid = true;
      } else if (resT.replay) {
        failureMsg = resT.error;
      }
    }

    if (!isTotpValid && phoneTotpSecret) {
      const resP = verifyTotpServerWithReplayCheck(userKey, code, phoneTotpSecret, 4);
      if (resP.ok) {
        isTotpValid = true;
      } else if (resP.replay) {
        failureMsg = resP.error;
      }
    }

    if (!isTotpValid) {
      recordFailedAttempt(rateKey);
      return res.status(401).json({
        ok: false,
        error: failureMsg
      });
    }

    clearFailedAttempts(rateKey);

    const authenticatedUser = {
      id: challengeClaims.sub || 'admin-prado-01',
      nome: 'Michel do Prado',
      email: challengeClaims.email,
      cargo: 'Administrador Geral / Diretoria',
      role: 'admin_global',
      setor: 'Diretoria & Gestão Comercial',
      avatar: 'MP'
    };

    const sessionToken = signServerJwt(
      {
        purpose: 'session',
        sub: authenticatedUser.id,
        email: authenticatedUser.email,
        role: authenticatedUser.role,
        aal: 'aal2',
        user: authenticatedUser
      },
      8 * 3600 // 8 horas
    );

    res.setHeader(
      'Set-Cookie',
      `prado_session=${encodeURIComponent(sessionToken)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=28800`
    );

    const dadosIniciais = obterDadosCorporativosAutorizados(authenticatedUser);
    return res.status(200).json({
      ok: true,
      token: sessionToken,
      user: authenticatedUser,
      empresa: dadosIniciais.empresa,
      dadosIniciais
    });
  }

  // 4. RECOVER-PASSWORD (Redefinição de senha com verificação obrigatória de identidade TOTP no servidor)
  if (action === 'recover-password') {
    const rawId = String(body.identifier || '').trim().toLowerCase();
    const totpCode = String(body.totpCode || '').replace(/\D/g, '');
    const newPassword = String(body.newPassword || '');
    const rateKey = `recover:${ip}:${rawId}`;

    const rl = checkRateLimit(rateKey);
    if (!rl.allowed) {
      return res.status(429).json({
        ok: false,
        error: `Muitas tentativas inválidas. Aguarde ${rl.retryAfterSec} segundos.`
      });
    }

    if (!rawId || !totpCode || totpCode.length !== 6) {
      recordFailedAttempt(rateKey);
      return res.status(401).json({
        ok: false,
        error: 'A redefinição de senha exige o código de 6 dígitos do Google Authenticator para comprovar sua identidade.'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        ok: false,
        error: 'A nova senha deve ter no mínimo 8 caracteres.'
      });
    }

    const adminEmail = String(process.env.PRADO_ADMIN_EMAIL || '').trim().toLowerCase();
    const adminAltEmail = 'comercial@pradosolucoes.com.br';
    const totpSecret = process.env.PRADO_TOTP_SECRET || '';

    const isMatch = (rawId === adminEmail || rawId === adminAltEmail);
    if (!isMatch || !totpSecret) {
      recordFailedAttempt(rateKey);
      return res.status(401).json({
        ok: false,
        error: 'Identificador não autorizado ou serviço 2FA não configurado.'
      });
    }

    // Validação com verificação estrita contra replay
    const userKey = rawId || 'admin-prado-01';
    const resTotp = verifyTotpServerWithReplayCheck(userKey, totpCode, totpSecret, 2);
    if (!resTotp.ok) {
      recordFailedAttempt(rateKey);
      return res.status(401).json({
        ok: false,
        error: resTotp.error || 'Código do Google Authenticator incorreto ou expirado.'
      });
    }

    // Persistência real da nova senha via scrypt no servidor
    const newHash = hashPasswordServer(newPassword);
    updatedUserPasswords.set(rawId, newHash);
    updatedUserPasswords.set(adminEmail, newHash);
    if (adminAltEmail) updatedUserPasswords.set(adminAltEmail, newHash);

    // Sincronização remota no Supabase Auth se houver service role key
    const url = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (url && serviceRoleKey) {
      try {
        const listRes = await fetch(`${url}/auth/v1/admin/users`, {
          headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` }
        });
        if (listRes.ok) {
          const listData = await listRes.json();
          const targetUser = (listData.users || []).find(u => u.email === adminEmail);
          if (targetUser && targetUser.id) {
            await fetch(`${url}/auth/v1/admin/users/${targetUser.id}`, {
              method: 'PUT',
              headers: {
                apikey: serviceRoleKey,
                Authorization: `Bearer ${serviceRoleKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ password: newPassword })
            });
          }
        }
      } catch (err) {
        console.warn('Aviso: Falha ao sincronizar redefinição no Supabase Auth remoto:', err.message);
      }
    }

    clearFailedAttempts(rateKey);
    return res.status(200).json({
      ok: true,
      message: 'Senha atualizada com sucesso! Você já pode acessar com sua nova credencial e código 2FA.'
    });
  }

  // 5. LOGOUT (Revoga sessão ativa no servidor e expira cookie HttpOnly)
  if (action === 'logout') {
    const cookies = parseCookies(req);
    const cookieToken = cookies.prado_session;
    const authHeader = req.headers?.authorization || '';
    const headerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    const tokenToRevoke = headerToken || cookieToken;

    if (tokenToRevoke) {
      revokeServerToken(tokenToRevoke);
    }

    res.setHeader(
      'Set-Cookie',
      'prado_session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0'
    );
    return res.status(200).json({ ok: true, message: 'Sessão revogada com sucesso no servidor.' });
  }

  return res.status(400).json({ ok: false, error: 'Ação de autenticação desconhecida.' });
};

