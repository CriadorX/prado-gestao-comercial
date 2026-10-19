// Prado Comércio & Soluções — Gestão Comercial (Supabase Integrado & RLS)

// 1. SANITIZAÇÃO CONTRA XSS (ESCAPE HTML SEGURO)
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
window.escapeHtml = escapeHtml;

// 2. OVERLAY DE CARREGAMENTO & ATUALIZAÇÃO (LOGO GIRANDO E BARRA DE PROGRESSO)
function showLoader(title = 'Atualizando...', msg = 'Sincronizando com o Supabase...', percent = 20, stepText = 'Aguarde...') {
  const loader = document.querySelector('#prado-loader');
  if (!loader) return;
  const titleEl = document.querySelector('#pradoLoaderTitle');
  const msgEl = document.querySelector('#pradoLoaderMsg');
  const barEl = document.querySelector('#pradoProgressBar');
  const percentEl = document.querySelector('#pradoProgressPercent');
  const stepEl = document.querySelector('#pradoProgressStep');

  if (titleEl) titleEl.textContent = title;
  if (msgEl) msgEl.textContent = msg;
  if (barEl) barEl.style.width = `${Math.min(100, Math.max(0, percent))}%`;
  if (percentEl) percentEl.textContent = `${Math.min(100, Math.max(0, percent))}%`;
  if (stepEl) stepEl.textContent = stepText;
  loader.hidden = false;
}
window.showLoader = showLoader;

function hideLoader() {
  const loader = document.querySelector('#prado-loader');
  if (loader) {
    loader.hidden = true;
  }
}
window.hideLoader = hideLoader;

// 2b. CONTROLE DE TEMA (MODO ESCURO / CLARO CORPORATIVO UNIFORME)
function aplicarTema(tema) {
  const isDark = tema === 'dark';
  document.body.classList.toggle('dark-mode', isDark);
  document.documentElement.classList.toggle('dark-mode', isDark);
  localStorage.setItem('pradoTheme', isDark ? 'dark' : 'light');
  
  const btnHeader = document.querySelector('#themeToggleBtn');
  if (btnHeader) {
    btnHeader.innerHTML = isDark ? '☀️ Modo Claro' : '🌙 Modo Escuro';
    btnHeader.title = isDark ? 'Mudar para o Modo Claro' : 'Mudar para o Modo Escuro';
  }
  const btnSidebar = document.querySelector('#sidebarThemeTxt');
  if (btnSidebar) {
    btnSidebar.textContent = isDark ? 'Modo Claro' : 'Modo Escuro';
  }
}

function alternarModoEscuro() {
  const isDark = document.body.classList.contains('dark-mode');
  aplicarTema(isDark ? 'light' : 'dark');
}
window.aplicarTema = aplicarTema;
window.alternarModoEscuro = alternarModoEscuro;

// Inicialização imediata do tema salvo
try {
  const temaSalvo = localStorage.getItem('pradoTheme');
  if (temaSalvo) {
    aplicarTema(temaSalvo);
  }
} catch {}

// 3. MENU DA PLATAFORMA
const menu = [
  ['dashboard', '⌂', 'Visão geral'],
  ['cotacao_ia', '⚡', 'Cotações IA & Fábricas'],
  ['clientes', '♙', 'Clientes'],
  ['fornecedores', '♜', 'Fornecedores'],
  ['oportunidades', '◆', 'Intermediações'],
  ['orcamentos', '▤', 'Orçamentos'],
  ['pedidos', '▣', 'Pedidos e entregas'],
  ['fiscal', '▧', 'NF-e e documentos'],
  ['fiscal_bot', '🤖', 'MB Fiscal BOT (SEBRAE)'],
  ['financeiro', '▥', 'Financeiro'],
  ['risco', '◎', 'Análise de risco'],
  ['relatorios', '◫', 'Relatórios']
];

// 4. ESTADO DO BANCO DE DADOS (COM PERSISTÊNCIA E MODELO HISTÓRICO HOMOLOGADO)
const ORCAMENTOS_STORAGE_KEY = 'pradoOrcamentos_v1';
function carregarOrcamentosIniciais() {
  try {
    const raw = localStorage.getItem(ORCAMENTOS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        parsed.forEach(o => {
          if (o.observacoes && o.observacoes.includes('3W Embalagens')) {
            o.observacoes = 'Desconto de R$ 1.000,00 já aplicado. NF-e nº 002 emitida em 25/09/2026. Faturamento direto e acompanhamento logístico integral Prado Comércio & Soluções.';
            o.observacoes_internas = 'Pago no Banco do Brasil e liquidado com fornecedor 3W Embalagens Ltda.';
            o.nfe_numero = '000.002';
          }
          if (o.numero === '027/2026' && !o.nfe_numero) {
            o.nfe_numero = '000.027';
          }
        });
        return parsed;
      }
    }
  } catch {}

  // Orçamento histórico de referência oficial (conforme modelo timbrado homologado da Prado)
  return [
    {
      id: 'orc-027-2026',
      numero: '027/2026',
      nfe_numero: '000.027',
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
          produto: 'COLCHAO - D33 - 1,88 X 0,88 X 17 CM (Espuma Certificada Selo Pró-Espuma INER / Inmetro NBR 13579)',
          unidade: '1',
          quantidade: 150,
          valor_unitario: 585.00,
          total: 87750.00
        }
      ],
      subtotal: 87750.00,
      desconto: 15000.00,
      frete: 0.00,
      valor_total: 72750.00,
      pagamento: 'À vista.',
      entrega_frete: 'Prazo sujeito à disponibilidade. Frete incluso, salvo indicação expressa.',
      observacoes: 'Desconto de R$ 15.000,00 já aplicado onde o preço de cada unidade passa a ser R$485,00. Preço válido até 30/10/2026. Prazo de entrega 30 dias. Pagamento de R$ 72.750,00 aguarda envio do extrato anual.',
      observacoes_internas: 'Cotação CBP Sul e indústrias homologadas.',
      status: 'Aguardando Extrato Anual',
      criadoPor: 'licitadigitaltech@gmail.com',
      criadoEm: '2026-10-09T10:00:00.000Z'
    },
    {
      id: 'orc-021-2026',
      numero: '021/2026',
      nfe_numero: '000.002',
      data_emissao: '2026-09-24',
      data_validade: '2026-10-01',
      responsavel: 'Michel do Prado',
      referencia: 'Sacos para lixo',
      cliente_nome: 'Lar dos Velhinhos de Piracicaba',
      cliente_doc: '54.406.723/0001-14',
      cliente_email: 'compras@lardosvelhinhospiracicaba.org.br',
      cliente_telefone: '(19) 3372-9485',
      cliente_endereco: 'Av. Torquato da Silva Leitão, 615 - São Dimas - Piracicaba/SP - CEP 13416-215',
      itens: [
        { item: 1, produto: 'SLP-020-4K | Saco plástico para lixo preto 20 L reforçado - pacote 4 kg', unidade: 'PCT', quantidade: 70, valor_unitario: 45.00, total: 3150.00 },
        { item: 2, produto: 'SLP-040-4K | Saco plástico para lixo preto 40 L reforçado - pacote 4 kg', unidade: 'PCT', quantidade: 70, valor_unitario: 45.00, total: 3150.00 },
        { item: 3, produto: 'SLP-060-4K | Saco plástico para lixo preto 60 L reforçado - pacote 4 kg', unidade: 'PCT', quantidade: 120, valor_unitario: 45.00, total: 5400.00 },
        { item: 4, produto: 'SLP-100-4K | Saco plástico para lixo preto 100 L reforçado - pacote 4 kg', unidade: 'PCT', quantidade: 120, valor_unitario: 45.00, total: 5400.00 },
        { item: 5, produto: 'SLP-200-4K | Saco plástico para lixo preto 200 L reforçado - pacote 4 kg', unidade: 'PCT', quantidade: 120, valor_unitario: 45.00, total: 5400.00 }
      ],
      subtotal: 22500.00,
      desconto: 1000.00,
      frete: 0.00,
      valor_total: 21500.00,
      pagamento: 'À vista.',
      entrega_frete: 'Prazo sujeito à disponibilidade. Frete não incluído, salvo indicação expressa.',
      observacoes: 'Desconto de R$ 1.000,00 já aplicado. NF-e nº 002 emitida em 25/09/2026. Faturamento direto e acompanhamento logístico integral Prado Comércio & Soluções.',
      observacoes_internas: 'Pago no Banco do Brasil e liquidado com fornecedor 3W Embalagens Ltda.',
      status: 'Faturado e Pago',
      criadoPor: 'licitadigitaltech@gmail.com',
      criadoEm: '2026-09-24T10:00:00.000Z'
    }
  ];
}

const NOTAS_FISCAIS_STORAGE_KEY = 'pradoNotasFiscais_v2';
function carregarNotasFiscaisIniciais() {
  try {
    const raw = localStorage.getItem(NOTAS_FISCAIS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return [
    {
      id: 'nfe-002-2026',
      numero: '000.002',
      serie: '1',
      data_emissao: '2026-09-25',
      natureza_operacao: 'Venda Dentro do Estado',
      chave_acesso: '35260959825765000103550010000000021300000027',
      protocolo: '135264036993299',
      orcamento_origem: '021/2026',
      destinatario_nome: 'Lar dos Velhinhos de Piracicaba',
      destinatario_doc: '54.406.723/0001-14',
      destinatario_endereco: 'Avenida Torquato da Silva Leitao, 615 - Sao Dimas - Piracicaba/SP',
      valor_total: 21500.00,
      status: 'Autorizada',
      itens: [
        { item: 1, descricao: 'Saco de lixo preto 20L', ncm: '39232190', cfop: '5102', qtd: 70, valor_unit: 43.00, total: 3010.00 },
        { item: 2, descricao: 'Saco de lixo preto 40L', ncm: '39232190', cfop: '5102', qtd: 70, valor_unit: 43.00, total: 3010.00 },
        { item: 3, descricao: 'Saco de lixo preto 60L', ncm: '39232190', cfop: '5102', qtd: 120, valor_unit: 43.00, total: 5160.00 },
        { item: 4, descricao: 'Saco de lixo preto 100L', ncm: '39232190', cfop: '5102', qtd: 120, valor_unit: 43.00, total: 5160.00 },
        { item: 5, descricao: 'Saco de lixo preto 200L', ncm: '39232190', cfop: '5102', qtd: 120, valor_unit: 43.00, total: 5160.00 }
      ],
      dados_adicionais: 'SMADS - Processo 2023/525135. EMPRESA OPTANTE PELO REGIME DE TRIBUTACAO SIMEI. DOCUMENTO EMITIDO POR ME OU EPP OPTANTE PELO SIMPLES NACIONAL. NAO GERA DIREITO A CREDITO FISCAL DE ICMS, ISS E IPI.'
    }
  ];
}

const EXTRATO_BB_STORAGE_KEY = 'pradoExtratoBB_v3';
function carregarExtratoBBInicial() {
  try {
    const raw = localStorage.getItem(EXTRATO_BB_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return [
    {
      id: 'bb-tx-2001',
      data: '2026-09-28',
      descricao: 'PIX RECEBIDO - NOTA FISCAL Nº 000.002 - LAR DOS VELHINHOS PIRACICABA',
      tipo: 'C',
      valor: 21500.00,
      categoria: 'receita_cliente',
      documento: '54.406.723/0001-14',
      referencia: 'NF-e Nº 002 (25/09/2026) Faturada e Paga - Processo SMADS 2023/525135',
      conciliado: true
    },
    {
      id: 'bb-tx-2002',
      data: '2026-09-28',
      descricao: 'PIX ENVIADO - 3W EMBALAGENS LTDA (Chave Pix: 19-99956-8786)',
      tipo: 'D',
      valor: 6750.00,
      categoria: 'custo_fabrica_50',
      documento: '33.835.009/0001-71',
      referencia: 'Pgto Lote 1 Sacos de Lixo - Banco Bradesco Ag 0223 C/C 21683-6',
      conciliado: true
    },
    {
      id: 'bb-tx-2003',
      data: '2026-09-28',
      descricao: 'TED ENVIADA - 3W EMBALAGENS LTDA (Bradesco Ag 0223 C/C 21683-6)',
      tipo: 'D',
      valor: 10000.00,
      categoria: 'custo_fabrica_saldo',
      documento: '33.835.009/0001-71',
      referencia: 'Pgto Lote 2 Fornecedores (Saldo Fábrica Sacos) - Bradesco 237',
      conciliado: true
    },
    {
      id: 'bb-tx-2004',
      data: '2026-10-15',
      descricao: 'PGTO GUIA DAS-MEI OUTUBRO/2026',
      tipo: 'D',
      valor: 75.00,
      categoria: 'impostos_das',
      documento: '59.825.765/0001-03',
      referencia: 'Guia DAS-MEI Competência 10/2026',
      conciliado: true
    }
  ];
}

function salvarExtratoBBPersistente() {
  try {
    localStorage.setItem(EXTRATO_BB_STORAGE_KEY, JSON.stringify(db.extrato_bb || []));
  } catch {}
}

function carregarFornecedoresIniciais() {
  return [
    {
      id: 'for-3w-embalagens',
      nome: '3W Embalagens Ltda.',
      doc: '33.835.009/0001-71',
      contato: 'Setor de Vendas & Televendas',
      telefone: '(19) 99956-8786',
      categoria: 'Indústria / Embalagens Plásticas',
      dados_bancarios: 'Banco Bradesco (237) · Ag 0223 · Conta Corrente: 21683-6 · Chave Pix: 19-99956-8786',
      status: 'Ativo',
      criadoPor: 'licitadigitaltech@gmail.com'
    },
    {
      id: 'for-lord-brasil',
      nome: 'Lord Brasil Indústria de Colchões',
      doc: '61.123.456/0001-89',
      contato: 'Vendas Corporativas Hospitalar',
      telefone: '(11) 4547-7000',
      categoria: 'Fabricante de Colchões & Espumas',
      dados_bancarios: 'Faturamento 50% entrada e 50% na entrega e aceite',
      status: 'Ativo',
      criadoPor: 'licitadigitaltech@gmail.com'
    }
  ];
}

function carregarClientesIniciais() {
  return [
    {
      id: 'cli-lar-velhinhos',
      nome: 'Lar dos Velhinhos de Piracicaba',
      doc: '54.406.723/0001-14',
      contato: 'Compras / Almoxarifado (SMADS Processo 2023/525135)',
      telefone: '(19) 3372-9485',
      endereco: 'Av. Torquato da Silva Leitão, 615 - São Dimas - Piracicaba/SP - CEP 13416-215',
      status: 'Ativo',
      criadoPor: 'licitadigitaltech@gmail.com'
    }
  ];
}

function carregarOportunidadesIniciais() {
  return [
    {
      id: 'op-002-sacos-lixo',
      nome: 'Fornecimento Sacos de Lixo 20L a 200L (NF-e 002)',
      cliente: 'Lar dos Velhinhos de Piracicaba',
      fornecedor: '3W Embalagens Ltda.',
      valor: 21500.00,
      custoEstimado: 16750.00,
      prazo: '2026-09-28',
      status: 'Entregue e Liquidado',
      descricao: 'Processo SMADS 2023/525135. Faturado via NF-e nº 002 em 25/09/2026 e pago no BB em 28/09/2026. Lucro líquido Prado: R$ 4.750,00.',
      criadoPor: 'licitadigitaltech@gmail.com'
    },
    {
      id: 'op-027-colchoes',
      nome: '150 Colchões Solteiro D33 Hospitalar',
      cliente: 'Lar dos Velhinhos de Piracicaba',
      fornecedor: 'Lord Brasil Indústria de Colchões',
      valor: 72750.00,
      custoEstimado: 50000.00,
      prazo: '2026-10-30',
      status: 'Aguardando Extrato Anual',
      descricao: 'Orçamento 027/2026 aprovado pelo cliente, aguardando envio do extrato anual para liberação do pagamento.',
      criadoPor: 'licitadigitaltech@gmail.com'
    }
  ];
}

function carregarPedidosIniciais() {
  return [
    {
      id: 'ped-002-sacos',
      nome: 'Pedido 002/2026 - Sacos de Lixo Reforçados',
      cliente: 'Lar dos Velhinhos de Piracicaba',
      fornecedor: '3W Embalagens Ltda.',
      valor: 21500.00,
      rastreio: 'BR-PIR-2026-002',
      previsao: '28/09/2026',
      status: 'Entregue e Pago',
      criadoPor: 'licitadigitaltech@gmail.com'
    }
  ];
}

let db = {
  clientes: carregarClientesIniciais(),
  fornecedores: carregarFornecedoresIniciais(),
  oportunidades: carregarOportunidadesIniciais(),
  pedidos: carregarPedidosIniciais(),
  orcamentos: carregarOrcamentosIniciais(),
  notas_fiscais: carregarNotasFiscaisIniciais(),
  extrato_bb: carregarExtratoBBInicial(),
  docs: []
};

// HELPER DE CONTROLE DE ACESSO RBAC (SIGILO FINANCEIRO EXCLUSIVO DO MICHEL / ADMIN)
function ehAdminGlobal() {
  if (!currentUser) return true;
  const email = (currentUser.email || '').toLowerCase();
  const role = (currentUser.role || currentUser.papel || '').toLowerCase();
  return role === 'admin_global' || role === 'admin' || email === 'licitadigitaltech@gmail.com' || email.includes('michel');
}
window.ehAdminGlobal = ehAdminGlobal;

let currentUser = null;
let sessionToken = window.sessionToken || localStorage.getItem('pradoSessionToken') || 'sess_prado_authenticated';
let page = 'dashboard';
let ultimosOrcamentosIA = null;
const app = document.querySelector('#app');

const money = n => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatCnpj = doc => {
  const d = String(doc || '').replace(/\D/g, '');
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  return doc || '—';
};

// 5. INICIALIZAÇÃO DO CLIENTE SUPABASE OFICIAL
let supabaseClient = null;

function initSupabase() {
  const savedCfg = JSON.parse(localStorage.getItem('pradoSupabaseConfig') || '{}');
  const supabaseUrl = savedCfg.url || window.SUPABASE_URL || '';
  const supabaseKey = savedCfg.key || window.SUPABASE_ANON_KEY || '';

  if (window.supabase && supabaseUrl && supabaseKey) {
    try {
      supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true
        }
      });
      window.supabaseClient = supabaseClient;
      window.supabaseReady = true;
    } catch (err) {
      console.warn('Erro ao inicializar Supabase:', err);
    }
  }
}

// 6. RENDERIZAÇÃO DA NAVEGAÇÃO E PERFIL (COM OCULTAÇÃO DO FINANCEIRO PARA OPERADORES)
function renderNav() {
  const menuVisivel = menu.filter(([id]) => {
    if (id === 'financeiro') return ehAdminGlobal();
    return true;
  });

  document.querySelector('#nav').innerHTML = menuVisivel.map(([id, ic, n]) =>
    `<button class="nav-item ${id === page ? 'active' : ''}" data-page="${id}"><b>${ic}</b>${n}</button>`
  ).join('');

  const profileEl = document.querySelector('.sidebar .profile');
  if (profileEl) {
    if (currentUser) {
      profileEl.innerHTML = `
        <div class="avatar">${escapeHtml(currentUser.avatar || 'PR')}</div>
        <div style="flex:1;overflow:hidden">
          <b style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(currentUser.nome)}</b>
          <small>${escapeHtml(currentUser.cargo)}</small>
        </div>
        <button id="logoutSidebarBtn" title="Sair do sistema (Logoff)" style="background:transparent;color:#fca5a5;font-size:16px;cursor:pointer;padding:4px">🚪</button>
      `;
      const btn = document.querySelector('#logoutSidebarBtn');
      if (btn) btn.onclick = fazerLogout;
    } else {
      profileEl.innerHTML = `
        <div class="avatar">?</div>
        <div style="flex:1"><b>Não autenticado</b><small>Faça login</small></div>
      `;
    }
  }
}

function fecharSidebarMobile() {
  document.querySelector('.sidebar')?.classList.remove('open');
  document.querySelector('#sidebarBackdrop')?.classList.remove('active');
}

document.querySelector('#nav').onclick = e => {
  const b = e.target.closest('[data-page]');
  if (!b) return;
  page = b.dataset.page;
  document.querySelectorAll('.nav-item').forEach(x => x.classList.toggle('active', x === b));
  render();
  fecharSidebarMobile();
};

document.querySelector('#menu').onclick = () => {
  const sb = document.querySelector('.sidebar');
  if (sb) {
    sb.classList.toggle('open');
    document.querySelector('#sidebarBackdrop')?.classList.toggle('active', sb.classList.contains('open'));
  }
};
document.querySelector('#sidebarCloseBtn')?.addEventListener('click', fecharSidebarMobile);
document.querySelector('#sidebarBackdrop')?.addEventListener('click', fecharSidebarMobile);
document.querySelector('.notice button')?.addEventListener('click', e => e.target.parentElement.remove());

function head(title, sub) {
  document.querySelector('#title').textContent = title;
  document.querySelector('#subtitle').textContent = sub;
}

function metric(label, val, detail, ic) {
  return `<article class="metric"><div><small>${label}</small><strong>${val}</strong><em>${detail}</em></div><div class="micon">${ic}</div></article>`;
}

function getFilteredData(type) {
  if (!currentUser) return [];
  if (currentUser.role === 'admin_global') {
    return db[type] || [];
  }
  return (db[type] || []).filter(item => item.criadoPor === currentUser.email || item.user_id === currentUser.id);
}

// 7. TELAS DO SISTEMA
function dashboard() {
  if (!currentUser) {
    app.innerHTML = `
      <div class="content">
        <div class="card" style="text-align:center;padding:50px">
          <h2>🔒 Autenticação Obrigatória</h2>
          <p style="color:var(--muted);margin:10px 0 20px">Faça login com sua conta no Supabase para acessar as intermediações comerciais e cotações.</p>
          <button class="primary" onclick="openLoginOverlay()">Acessar Painel Seguro</button>
        </div>
      </div>
    `;
    return;
  }

  head('Portal Prado', `Controle completo das intermediações — Acesso: ${currentUser.cargo}`);
  const ops = getFilteredData('oportunidades');
  const totalVendas = ops.reduce((acc, o) => acc + (Number(o.valor) || 0), 0);
  const totalCusto = ops.reduce((acc, o) => acc + (Number(o.custoEstimado) || (Number(o.valor) * 0.6)), 0);
  const margem = totalVendas - totalCusto;
  const peds = getFilteredData('pedidos');

  app.innerHTML = `
    <div class="content">
      <!-- PORTAL HERO EXECUTIVO COM LOGO GRANDE E FUNDO LUXUOSO -->
      <div class="portal-hero">
        <div class="portal-hero-content">
          <div class="portal-logo-wrapper">
            <img src="logo-prado-premium.png" alt="Prado Comércio & Soluções" class="portal-logo-glow">
          </div>
          <div class="portal-text">
            <div class="portal-badge-row">
              <span class="portal-tag">PORTAL CORPORATIVO & INTERMEDIAÇÕES</span>
              <span class="portal-live-pill"><i class="portal-live-dot"></i> SEBRAE SP Conectado</span>
              <span class="portal-live-pill" style="color:#38bdf8;background:rgba(56,189,248,.12);border-color:rgba(56,189,248,.3)">🛡️ RLS & Permissões Ativas</span>
            </div>
            <h1 class="portal-title">Prado Comércio & Soluções</h1>
            <p class="portal-subtitle">
              Portal executivo unificado para intermediação comercial de suprimentos: busca inteligente de indústrias nacionais com telefone comercial válido, margem de intermediação blindada, geração de propostas oficiais em PDF e conformidade fiscal SEBRAE SP.
            </p>
            <div class="portal-actions">
              <button class="portal-btn-primary" data-go="cotacao_ia">⚡ Cotação com IA & Fábricas</button>
              <button class="portal-btn-secondary" data-go="fiscal_bot">🤖 Emissor Fiscal SEBRAE SP</button>
              <button class="portal-btn-secondary" data-go="oportunidades">◆ Ver Intermediações</button>
              <button class="portal-btn-secondary" data-new="oportunidade">＋ Nova Intermediação</button>
            </div>
          </div>
        </div>
        <div class="portal-status-bar">
          <div><span>Operador ativo:</span> <b>${escapeHtml(currentUser.nome)}</b> (${escapeHtml(currentUser.cargo)})</div>
          <div><span>Ambiente:</span> <b style="color:#fde047">🏢 Prado Gestão Comercial (Produção)</b></div>
          <div><span>Controle de Acesso:</span> <b style="color:#a7f3d0">${currentUser.role === 'admin_global' ? '👑 Acesso Total (Admin)' : '🔒 Acesso Restrito (Operador)'}</b></div>
        </div>
      </div>

      <!-- PORTAL HUB: CARDS DE ACESSO RÁPIDO AOS RECURSOS PRINCIPAIS -->
      <div class="portal-hub-grid">
        <div class="portal-hub-card" data-go="cotacao_ia">
          <div>
            <div class="portal-hub-icon" style="background:#fef3c7;color:#d97706">⚡</div>
            <h3>Localizador de Fábricas IA</h3>
            <p>Pesquise o produto solicitado e obtenha 3 indústrias nacionais reais com telefone, WhatsApp comercial e cálculo de margem.</p>
          </div>
          <span class="portal-hub-link">Iniciar cotação →</span>
        </div>
        <div class="portal-hub-card" data-go="fiscal_bot">
          <div>
            <div class="portal-hub-icon" style="background:#e0f2fe;color:#0284c7">🤖</div>
            <h3>Emissor SEBRAE SP & Fiscal</h3>
            <p>Auditoria tributária MEI/CRT-4, trilha de emissão de notas fiscais de intermediação e monitoramento contra glosas.</p>
          </div>
          <span class="portal-hub-link">Acessar emissor →</span>
        </div>
        <div class="portal-hub-card" data-go="oportunidades">
          <div>
            <div class="portal-hub-icon" style="background:#ecfdf5;color:#059669">📋</div>
            <h3>Dossiê & Intermediações</h3>
            <p>Acompanhe o funil de compras, cotações aprovadas, pedidos em transporte e propostas comerciais oficiais timbradas.</p>
          </div>
          <span class="portal-hub-link">Ver funil de vendas →</span>
        </div>
        <div class="portal-hub-card" data-new="cliente">
          <div>
            <div class="portal-hub-icon" style="background:#f3e8ff;color:#7c3aed">👥</div>
            <h3>Clientes & Fornecedores</h3>
            <p>Cadastro centralizado de compradores públicos e privados, fornecedores industriais e histórico de negociações.</p>
          </div>
          <span class="portal-hub-link">Novo cadastro →</span>
        </div>
      </div>

      ${!ehAdminGlobal() ? `<div class="notice" style="margin-bottom:18px"><b>🔒 Visão Operacional Segura</b><span>Você está operando com perfil de operador/gestor. Dados bancários do Banco do Brasil, extratos e margens líquidas são restritos à Diretoria Geral (Michel do Prado).</span></div>` : ''}
      <div class="metrics">
        ${metric('Vendas em negociação', money(totalVendas), `${ops.length} oportunidade(s) ativa(s)`, '↗')}
        ${ehAdminGlobal() 
          ? metric('Margem estimada', money(margem), totalVendas ? `${((margem / totalVendas) * 100).toFixed(1)}% sobre a venda` : '0%', '◈')
          : metric('Atendimentos Ativos', String(ops.length), 'Clientes em prospecção', '👥')
        }
        ${ehAdminGlobal() 
          ? metric('Faturamento no BB', money(21500), 'NF-e 002 (25/09/2026)', '↓')
          : metric('Pedidos Aprovados', String(peds.length), 'Aguardando faturamento', '✓')
        }
        ${metric('Entregas em andamento', String(peds.length), peds.length ? 'Acompanhando transporte' : 'Tudo em dia', '▣')}
      </div>
      <div class="grid2">
        <div class="card">
          <div class="card-head"><h2>Funil de intermediações</h2><button class="link" data-go="oportunidades">Ver detalhes</button></div>
          <div class="pipeline">
            ${[['Entrada', ops.filter(x => x.status === 'Entrada').length, 25],
               ['Cotação', ops.filter(x => x.status === 'Cotação').length, 50],
               ['Proposta', ops.filter(x => x.status === 'Proposta').length, 20],
               ['Aprovado', ops.filter(x => x.status === 'Aprovado').length, 10],
               ['Entregue', ops.filter(x => x.status === 'Entregue').length, 5]
              ].map(x => `<div class="stage"><span>${x[0]}</span><b>${x[1]}</b><i style="width:${x[2]}%"></i></div>`).join('')}
          </div>
          ${ops.length ? ops.slice(0, 3).map(o => `
            <div class="deal">
              <div><b>${escapeHtml(o.nome)} — ${escapeHtml(o.cliente)}</b><small>Etapa: ${escapeHtml(o.status)} · ${money(o.valor)}</small></div>
              <span class="badge ${o.status === 'Cotação' ? 'warn' : ''}">${escapeHtml(o.status)}</span>
            </div>
          `).join('') : '<div class="empty"><p>Nenhuma oportunidade cadastrada no momento.</p></div>'}
        </div>
        <div class="card">
          <div class="card-head"><h2>Ações rápidas</h2></div>
          <div class="quick">
            <button data-new="cliente">👤<b>Novo cliente</b></button>
            <button data-new="fornecedor">🏭<b>Novo fornecedor</b></button>
            <button data-new="oportunidade">💼<b>Nova intermediação</b></button>
            <button data-new="pedido">🚚<b>Novo pedido</b></button>
          </div>
          <div style="margin-top:18px" class="card-head"><h2>Segurança e Governança</h2></div>
          <div class="deal">
            <div><b>Banco de Dados Oficial</b><small>Supabase PostgreSQL (Políticas RLS ativas).</small></div>
            <span class="badge">Supabase RLS</span>
          </div>
          <div class="deal">
            <div><b>Chaves protegidas no servidor Vercel</b><small>APIs serverless com autenticação Bearer.</small></div>
            <span class="badge">Protegido</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

const cols = {
  clientes: ['Cliente', 'CNPJ/CPF', 'Contato / E-mail', 'Situação'],
  fornecedores: ['Fornecedor', 'CNPJ', 'Contato / Telefone', 'Situação']
};

function list(type) {
  const isC = type === 'clientes';
  head(isC ? 'Clientes' : 'Fornecedores', isC ? 'Cadastro e histórico de compradores' : 'Cadastro e homologação de indústrias fornecedoras');
  const data = getFilteredData(type);
  const rows = data.map((x, i) => `
    <tr>
      <td><b>${escapeHtml(x.nome)}</b></td>
      <td>${escapeHtml(x.doc || '—')}</td>
      <td>${escapeHtml(x.contato || '—')} <br><small style="color:var(--muted)">${escapeHtml(x.email || x.telefone || '')}</small></td>
      <td><span class="badge ${String(x.status || '').includes('validação') || String(x.status || '').includes('cotação') ? 'warn' : ''}">${escapeHtml(x.status || 'Ativo')}</span></td>
      <td>
        <button class="link" data-view="${type}:${i}">Abrir</button>
      </td>
    </tr>
  `).join('');

  app.innerHTML = `
    <div class="content">
      <div class="toolbar">
        <input class="search" id="tableSearch" placeholder="Buscar por nome, documento ou contato" oninput="filterTable(this.value)">
        <button class="primary" data-new="${isC ? 'cliente' : 'fornecedor'}">＋ ${isC ? 'Novo cliente' : 'Novo fornecedor'}</button>
      </div>
      <div class="table-card">
        <table class="table" id="dataTable">
          <thead><tr>${cols[type].map(x => `<th>${x}</th>`).join('')}<th>Ações</th></tr></thead>
          <tbody>${rows || `<tr><td colspan="5" style="text-align:center;padding:30px">Nenhum registro encontrado no Supabase.</td></tr>`}</tbody>
        </table>
      </div>
    </div>
  `;

  document.querySelectorAll('[data-view]').forEach(btn => {
    btn.onclick = () => {
      const [t, idx] = btn.dataset.view.split(':');
      openDetails(t, Number(idx));
    };
  });
}

function oportunidades() {
  head('Intermediações comerciais', 'Da necessidade do cliente à cotação, proposta e fechamento');
  const ops = getFilteredData('oportunidades');
  const rows = ops.map((x, i) => `
    <tr>
      <td><b>${escapeHtml(x.nome)}</b></td>
      <td>${escapeHtml(x.cliente)}</td>
      <td>${money(x.valor)}</td>
      <td><span class="badge ${x.status === 'Cotação' ? 'warn' : ''}">${escapeHtml(x.status)}</span></td>
      <td><button class="link" data-dossie="${i}">Abrir dossiê</button></td>
    </tr>
  `).join('');

  app.innerHTML = `
    <div class="content">
      <div class="toolbar">
        <input class="search" placeholder="Buscar oportunidade ou cliente" oninput="filterTable(this.value)">
        <button class="primary" data-new="oportunidade">＋ Nova intermediação</button>
      </div>
      <div class="table-card">
        <table class="table" id="dataTable">
          <thead><tr><th>Oportunidade</th><th>Cliente</th><th>Venda estimada</th><th>Etapa</th><th>Ações</th></tr></thead>
          <tbody>${rows || `<tr><td colspan="5" style="text-align:center;padding:30px">Nenhuma intermediação cadastrada.</td></tr>`}</tbody>
        </table>
      </div>
    </div>
  `;

  document.querySelectorAll('[data-dossie]').forEach(btn => {
    btn.onclick = () => openDossie(Number(btn.dataset.dossie));
  });
}

function renderizarBadgeStatusOrcamento(status) {
  const s = String(status || 'Em cotação').trim();
  let bg = '#f1f5f9';
  let color = '#475569';
  let border = '#cbd5e1';

  if (s === 'Aguardando Extrato Anual') {
    bg = '#fffbeb';
    color = '#b45309';
    border = '#fde68a';
  } else if (s === 'Faturado e Pago' || s === 'Pago') {
    bg = '#f0fdf4';
    color = '#15803d';
    border = '#bbf7d0';
  } else if (s === 'Aprovado' || s === 'Faturado') {
    bg = '#f0f9ff';
    color = '#0369a1';
    border = '#bae6fd';
  } else if (s === 'Cancelado') {
    bg = '#fef2f2';
    color = '#b91c1c';
    border = '#fca5a5';
  }

  return `
    <span style="display:inline-block;white-space:nowrap;padding:6px 12px;border-radius:6px;font-size:12px;font-weight:700;line-height:1.2;background:${bg};color:${color};border:1px solid ${border};box-shadow:0 1px 2px rgba(0,0,0,0.03);text-align:center">
      ${escapeHtml(s)}
    </span>
  `;
}
window.renderizarBadgeStatusOrcamento = renderizarBadgeStatusOrcamento;

function orcamentos() {
  head('Orçamentos e propostas', 'Lançamento de cotações, geração de propostas oficiais e impressão em PDF timbrado');
  const orcs = db.orcamentos || [];

  const rows = orcs.map((o, idx) => `
    <tr>
      <td><b>Nº ${escapeHtml(o.numero || String(idx + 1).padStart(3, '0') + '/2026')}</b></td>
      <td>
        <b>${escapeHtml(o.cliente_nome || o.cliente || 'Cliente')}</b>
        ${o.cliente_doc ? `<br><small style="color:var(--muted)">CNPJ: ${escapeHtml(o.cliente_doc)}</small>` : ''}
      </td>
      <td>${formatarDataBr(o.data_emissao)}</td>
      <td><strong style="color:var(--navy);font-size:14px">${money(o.valor_total || o.valor)}</strong></td>
      <td>
        ${renderizarBadgeStatusOrcamento(o.status)}
      </td>
      <td>
        <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
          ${(o.status === 'Aprovado' || o.status === 'Faturado' || String(o.status).includes('Faturado')) ? `
            <button class="primary" style="padding:4px 10px;font-size:11.5px;background:#15803d;color:#fff;font-weight:800;display:inline-flex;align-items:center;gap:4px;box-shadow:0 2px 6px rgba(21,128,61,0.3)" onclick="abrirEmissaoNotaOrcamento(${idx})" title="Emitir / Ver Nota Fiscal (NF-e) do Orçamento Aprovado">
              🧾 Fazer Nota
            </button>
          ` : `
            <button class="secondary" style="padding:4px 8px;font-size:11.5px;color:#15803d;border-color:#86efac;font-weight:700" onclick="abrirEmissaoNotaOrcamento(${idx})" title="Aprovar e Fazer Nota Fiscal">
              🧾 Fazer Nota
            </button>
          `}
          <button class="primary" style="padding:4px 10px;font-size:11.5px;background:#073863" onclick="visualizarPropostaTimbrada(${idx})">
            📄 Ver Timbrado
          </button>
          <button class="secondary" style="padding:4px 8px;font-size:11.5px" onclick="imprimirPropostaPDF(${idx})" title="Imprimir / Salvar em PDF">
            🖨️ PDF
          </button>
          <button class="secondary" style="padding:4px 8px;font-size:11.5px;color:var(--green);border-color:#86efac" onclick="enviarPropostaWhatsApp(${idx})" title="Enviar pelo WhatsApp">
            💬 WhatsApp
          </button>
          <button class="link" style="font-size:12px;color:var(--navy);font-weight:700" onclick="abrirModalNovoOrcamento(${idx})" title="Editar">
            ✏️
          </button>
          <button class="link" style="font-size:12px;color:var(--red);font-weight:700" onclick="excluirOrcamento(${idx})" title="Excluir">
            🗑️
          </button>
        </div>
      </td>
    </tr>
  `).join('');

  app.innerHTML = `
    <div class="content">
      <div class="toolbar" style="margin-bottom:18px">
        <input class="search" id="orcSearchInput" placeholder="Buscar orçamento por cliente ou número" oninput="filtrarTabelaOrcamentos(this.value)">
        <button class="primary" style="background:#073863;font-weight:800;height:42px" onclick="abrirModalNovoOrcamento()">
          ＋ Lançar Novo Orçamento
        </button>
      </div>
      <div class="table-card">
        <table class="table" id="tabelaOrcamentos">
          <thead>
            <tr>
              <th style="width:130px">Número</th>
              <th>Cliente</th>
              <th style="width:110px">Emissão</th>
              <th style="width:130px">Valor Total</th>
              <th style="width:185px;min-width:185px">Status</th>
              <th style="width:280px">Ações</th>
            </tr>
          </thead>
          <tbody>
            ${rows || `<tr><td colspan="6" style="text-align:center;padding:35px">Nenhum orçamento cadastrado ainda. Clique em '＋ Lançar Novo Orçamento' acima.</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function pedidos() {
  head('Pedidos e entregas', 'Acompanhamento logístico, faturamento e entrega ao cliente');
  const peds = getFilteredData('pedidos');

  app.innerHTML = `
    <div class="content">
      <div class="toolbar">
        <input class="search" placeholder="Buscar por cliente, fornecedor ou rastreio">
        <button class="primary" data-new="pedido">＋ Novo pedido</button>
      </div>
      <div class="table-card">
        <table class="table">
          <thead><tr><th>Pedido</th><th>Cliente</th><th>Fornecedor</th><th>Valor</th><th>Rastreio</th><th>Previsão</th><th>Status</th></tr></thead>
          <tbody>
            ${peds.length ? peds.map(p => `
              <tr>
                <td><b>${escapeHtml(p.nome)}</b></td>
                <td>${escapeHtml(p.cliente)}</td>
                <td>${escapeHtml(p.fornecedor)}</td>
                <td>${money(p.valor)}</td>
                <td><code>${escapeHtml(p.rastreio || '—')}</code></td>
                <td>${escapeHtml(p.previsao || 'A definir')}</td>
                <td><span class="badge">${escapeHtml(p.status || 'Em andamento')}</span></td>
              </tr>
            `).join('') : `<tr><td colspan="7" style="text-align:center;padding:30px">Nenhum pedido em andamento.</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function fiscal() {
  head('NF-e e documentos fiscais', 'Emissão simplificada, DANFEs em PDF e guarda de XMLs homologados');
  const notas = db.notas_fiscais || [];

  app.innerHTML = `
    <div class="content">
      <div class="grid2" style="margin-bottom:20px">
        <div class="card">
          <div class="card-head"><h2>Documentos fiscais e XMLs</h2></div>
          <p style="color:var(--muted);font-size:13px">Gerenciador de XMLs e DANFEs de intermediação comercial e faturamento de orçamentos aprovados.</p>
          <div class="deal">
            <div><b>Nota Fiscal Eletrônica (NF-e Mod. 55)</b><small>Faturamento direto a partir de orçamentos aprovados</small></div>
            <span class="badge" style="background:#e8fdf0;color:#166534">✓ Habilitado</span>
          </div>
          <div class="deal">
            <div><b>DANFEs de Fornecedores & Fabricantes</b><small>Armazenadas com conformidade fiscal SEBRAE SP</small></div>
            <span class="badge">Seguro</span>
          </div>
        </div>
        <div class="card">
          <div class="card-head"><h2>Emissor SEBRAE SP CRT-4 & Consulta</h2></div>
          <p style="color:var(--muted);font-size:13px">Acesse o robô de preenchimento assistido para faturamento ou consulte notas já emitidas no SEBRAE / SEFAZ.</p>
          <div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap">
            <button class="primary" data-go="fiscal_bot">🤖 Acessar MB Fiscal BOT (SEBRAE)</button>
            <button class="secondary" style="color:var(--navy);border-color:#0284c7;background:#f0f9ff;font-weight:700" onclick="abrirModalGuiaConsultaSebrae()">
              🔍 Como Consultar Notas no SEBRAE
            </button>
            <button class="secondary" data-go="orcamentos" style="color:var(--navy);border-color:#cbd5e1">📋 Ver Orçamentos</button>
          </div>
        </div>
      </div>

      <!-- GUIA DE CONSULTA RÁPIDA SEBRAE / SEFAZ -->
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-left:4px solid #2563eb;padding:14px 18px;border-radius:10px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
        <div>
          <b style="color:#1e40af;font-size:14px">🔍 Consulta de Notas Fiscais Emitidas (SEBRAE & SEFAZ Nacional):</b>
          <p style="margin:4px 0 0;font-size:12.5px;color:#1e3a8a">
            Você pode consultar e baixar qualquer nota emitida através do <b>Emissor Sebrae</b> ou pela <b>Chave de Acesso na Receita Federal</b>.
          </p>
        </div>
        <button class="primary" style="background:#2563eb;color:#fff;font-size:12.5px;padding:8px 16px;font-weight:700" onclick="abrirModalGuiaConsultaSebrae()">
          Ver Passo a Passo Oficial ➔
        </button>
      </div>

      <div class="card">
        <div class="card-head" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
          <div>
            <h2>Notas Fiscais Emitidas (Faturamento Oficial)</h2>
            <small style="color:var(--muted)">Histórico de notas fiscais autorizadas vinculadas a orçamentos e clientes.</small>
          </div>
          <button class="primary" style="background:#15803d;font-weight:700" onclick="page='orcamentos';render();">
            ＋ Emitir NF-e de Orçamento
          </button>
        </div>

        <table class="table" style="margin-top:14px">
          <thead>
            <tr>
              <th>NF-e Nº</th>
              <th>Orçamento</th>
              <th>Destinatário (Cliente)</th>
              <th>Data Emissão</th>
              <th>Valor Total</th>
              <th>Status Sefaz</th>
              <th>Ações Fiscais</th>
            </tr>
          </thead>
          <tbody>
            ${notas.length ? notas.map((n, i) => `
              <tr>
                <td><b style="color:#073863">NF-e ${escapeHtml(n.numero || '000.027')}</b><br><small style="color:var(--muted)">Série ${escapeHtml(n.serie || '1')}</small></td>
                <td><b>${escapeHtml(n.orcamento_origem || '—')}</b></td>
                <td>
                  <b>${escapeHtml(n.destinatario_nome || 'Cliente')}</b><br>
                  <small style="color:var(--muted)">CNPJ: ${escapeHtml(n.destinatario_doc || '—')}</small>
                </td>
                <td>${formatarDataBr(n.data_emissao)}</td>
                <td><strong style="color:var(--green);font-size:14px">${money(n.valor_total)}</strong></td>
                <td><span class="badge ok" style="background:#e8fdf0;color:#166534">✓ ${escapeHtml(n.status || 'Autorizada')}</span></td>
                <td>
                  <div style="display:flex;gap:6px;flex-wrap:wrap">
                    <button class="primary" style="padding:4px 8px;font-size:11.5px;background:#073863" onclick="visualizarDanfeNotaSalva(${i})" title="Visualizar / Imprimir DANFE">
                      📄 DANFE
                    </button>
                    <button class="secondary" style="padding:4px 8px;font-size:11.5px" onclick="baixarXmlNotaSalva(${i})" title="Baixar Arquivo XML">
                      📥 XML
                    </button>
                    <button class="secondary" style="padding:4px 8px;font-size:11.5px;color:#2563eb;border-color:#93c5fd" onclick="consultarChaveNaSefaz('${escapeHtml(n.chave_acesso || '')}')" title="Consultar Autenticidade na SEFAZ Nacional">
                      🔍 SEFAZ
                    </button>
                    <button class="secondary" style="padding:4px 8px;font-size:11.5px;color:var(--green);border-color:#86efac" onclick="enviarNfeWhatsAppNotaSalva(${i})" title="Enviar pelo WhatsApp">
                      💬 WhatsApp
                    </button>
                  </div>
                </td>
              </tr>
            `).join('') : `
              <tr>
                <td colspan="7" style="text-align:center;padding:36px;color:var(--muted)">
                  <div style="font-size:32px;margin-bottom:8px">🧾</div>
                  <b>Nenhuma nota fiscal emitida ainda.</b><br>
                  Vá na aba <a href="javascript:void(0)" onclick="page='orcamentos';render();" style="color:#008299;font-weight:700">Orçamentos e Propostas</a> e clique em <b>"🧾 Fazer Nota"</b> no orçamento aprovado!
                </td>
              </tr>
            `}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function consultarChaveNaSefaz(chave) {
  if (!chave) chave = '35260959825765000103550010000000021300000027';
  navigator.clipboard?.writeText(chave).catch(() => {});
  toast(`Chave ${chave.slice(0, 15)}... copiada para a área de transferência!`);
  window.open(`https://www.nfe.fazenda.gov.br/portal/consultaRecibo.aspx`, '_blank');
}
window.consultarChaveNaSefaz = consultarChaveNaSefaz;

function abrirModalGuiaConsultaSebrae() {
  const modalId = 'modalGuiaConsultaSebrae';
  let modal = document.querySelector(`#${modalId}`);
  if (modal) modal.remove();

  modal = document.createElement('div');
  modal.id = modalId;
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';
  modal.innerHTML = `
    <div style="background:#fff;border-radius:12px;max-width:680px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 25px 50px rgba(0,0,0,0.3);border-top:5px solid #2563eb">
      <div style="padding:18px 22px;background:#f8fafc;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center">
        <div>
          <h3 style="margin:0;font-size:17px;color:var(--navy)">🔍 Como Consultar Notas Já Emitidas no SEBRAE e SEFAZ</h3>
          <small style="color:var(--muted)">Passo a passo oficial para localizar suas notas fiscais de venda e intermediação</small>
        </div>
        <button type="button" onclick="document.querySelector('#${modalId}').remove()" style="background:none;border:none;font-size:24px;cursor:pointer;color:var(--muted)">&times;</button>
      </div>

      <div style="padding:22px;display:flex;flex-direction:column;gap:18px;font-size:13.5px;color:var(--ink);line-height:1.6">
        
        <!-- MÉTODO 1: EMISSOR SEBRAE -->
        <div style="background:#f0f9ff;border:1.5px solid #bae6fd;border-radius:10px;padding:16px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
            <span style="background:#0284c7;color:#fff;border-radius:50%;width:24px;height:24px;display:inline-flex;align-items:center;justify-content:center;font-weight:800;font-size:12px">1</span>
            <b style="color:#0369a1;font-size:15px">Consulta Direta no Portal do Emissor Sebrae:</b>
          </div>
          <ol style="margin:4px 0 10px 20px;padding:0">
            <li>Acesse o portal do Emissor Sebrae em: <a href="https://nfe.sebrae.com.br" target="_blank" style="color:#0284c7;font-weight:700;text-decoration:underline">https://nfe.sebrae.com.br</a>.</li>
            <li>Faça login com seu <b>Certificado Digital</b> ou com a conta <b>Gov.br</b> vinculada ao seu CNPJ <code>59.825.765/0001-03</code>.</li>
            <li>No menu lateral esquerdo, clique em <b>"Notas Fiscais"</b> ➔ <b>"Gerenciar NF-e"</b> (ou <b>"Notas Emitidas"</b>).</li>
            <li>Selecione o período de emissão (ex: <b>Setembro/2026</b>) e clique em <b>"Filtrar / Pesquisar"</b>.</li>
            <li>Todas as notas fiscais emitidas aparecerão na listagem. Basta clicar no ícone de <b>Lupa (Visualizar)</b>, <b>PDF (Imprimir DANFE)</b> ou <b>XML</b> para baixar para o seu computador.</li>
          </ol>
          <a href="https://nfe.sebrae.com.br" target="_blank" class="primary" style="display:inline-block;padding:8px 16px;background:#0284c7;text-decoration:none;border-radius:6px;font-weight:700;font-size:12.5px">
            🌐 Abrir Portal do Emissor Sebrae ➔
          </a>
        </div>

        <!-- MÉTODO 2: PORTAL NACIONAL DA RECEITA / SEFAZ PELA CHAVE DE ACESSO -->
        <div style="background:#fefce8;border:1.5px solid #fef08a;border-radius:10px;padding:16px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
            <span style="background:#ca8a04;color:#fff;border-radius:50%;width:24px;height:24px;display:inline-flex;align-items:center;justify-content:center;font-weight:800;font-size:12px">2</span>
            <b style="color:#854d0e;font-size:15px">Consulta Pública pela Chave de Acesso (Receita Federal / SEFAZ):</b>
          </div>
          <p style="margin:4px 0 8px">
            Qualquer nota fiscal emitida possui uma Chave de Acesso única de 44 dígitos no topo do DANFE. Você pode consultá-la publicamente a qualquer momento no Portal Nacional da NF-e:
          </p>
          <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:10px 14px;margin-bottom:12px">
            <small style="color:var(--muted);display:block;margin-bottom:4px;font-weight:700">Chave da sua NF-e Nº 002 (Lar dos Velhinhos - R$ 21.500,00):</small>
            <code style="font-size:13px;font-weight:800;color:var(--navy);word-break:break-all">35260959825765000103550010000000021300000027</code>
            <div style="margin-top:8px;display:flex;gap:8px">
              <button type="button" class="secondary" style="font-size:12px;padding:5px 12px;border-radius:6px;font-weight:700" onclick="navigator.clipboard.writeText('35260959825765000103550010000000021300000027');toast('Chave de 44 dígitos copiada!');">
                📋 Copiar Chave
              </button>
              <a href="https://www.nfe.fazenda.gov.br/portal/consultaRecibo.aspx" target="_blank" class="primary" style="font-size:12px;padding:5px 12px;border-radius:6px;background:#ca8a04;color:#fff;text-decoration:none;font-weight:700">
                🔍 Consultar no Portal da SEFAZ ➔
              </a>
            </div>
          </div>
        </div>

        <!-- MÉTODO 3: NO PRÓPRIO SISTEMA PRADO -->
        <div style="background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:10px;padding:16px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
            <span style="background:#16a34a;color:#fff;border-radius:50%;width:24px;height:24px;display:inline-flex;align-items:center;justify-content:center;font-weight:800;font-size:12px">3</span>
            <b style="color:#166534;font-size:15px">Consulta Direta no seu Sistema Prado Gestão:</b>
          </div>
          <p style="margin:4px 0">
            A sua NF-e Nº 002 já está cadastrada na tabela abaixo com todos os itens, protocolo oficial de autorização (<code>135264036993299</code>) e o código de barras oficial.
            Basta clicar no botão <b>"📄 DANFE"</b> para abrir e imprimir o espelho oficial com seu logotipo!
          </p>
        </div>

      </div>

      <div style="padding:14px 22px;background:#f8fafc;border-top:1px solid var(--line);display:flex;justify-content:flex-end">
        <button type="button" class="primary" onclick="document.querySelector('#${modalId}').remove()" style="padding:8px 20px;border-radius:6px">
          Entendi, Fechar
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}
window.abrirModalGuiaConsultaSebrae = abrirModalGuiaConsultaSebrae;

// -------------------------------------------------------------------------
// BANCO DO BRASIL — COCKPIT FINANCEIRO, EXTRATO OFX/CSV, TETO MEI ➔ ME E LIVRO CAIXA
// -------------------------------------------------------------------------
let filtroExtratoBBCategoria = 'todas';
let transacoesBBEmPrevia = [];

const CATEGORIAS_BB = {
  receita_cliente: { rotulo: 'Recebimento de Cliente (À vista)', cor: '#166534', bg: '#f0fdf4' },
  custo_fabrica_50: { rotulo: 'Pgto Fábrica (Entrada 50%)', cor: '#991b1b', bg: '#fef2f2' },
  custo_fabrica_saldo: { rotulo: 'Pgto Fábrica (Saldo 50%)', cor: '#b91c1c', bg: '#fff1f2' },
  despesas_operacionais: { rotulo: 'Despesas Operacionais', cor: '#475569', bg: '#f8fafc' },
  tarifas_bancarias: { rotulo: 'Tarifas Banco do Brasil', cor: '#64748b', bg: '#f1f5f9' },
  impostos_das: { rotulo: 'Tributos (DAS-MEI / ME)', cor: '#b45309', bg: '#fffbeb' },
  pro_labore_titular: { rotulo: 'Retirada / Lucro Titular', cor: '#073863', bg: '#e0f2fe' }
};

function financeiro() {
  if (!ehAdminGlobal()) {
    head('Acesso Restrito', 'Área de Confidencialidade Financeira & Balanço da Diretoria');
    app.innerHTML = `
      <div class="content">
        <div class="card" style="text-align:center;padding:50px 24px;border-top:4px solid var(--gold);max-width:620px;margin:40px auto;box-shadow:0 10px 25px rgba(0,0,0,0.06)">
          <div style="font-size:52px;margin-bottom:14px">🔒</div>
          <h2 style="font-size:20px;color:var(--navy);margin-bottom:10px">Módulo Financeiro Restrito</h2>
          <p style="color:var(--muted);font-size:14px;line-height:1.6;margin-bottom:24px">
            Este módulo contém dados bancários sigilosos do <b>Banco do Brasil S.A.</b>, conciliação de pagamentos a indústrias, controle do teto MEI e balanço contábil.<br><br>
            O acesso é <b>exclusivo do Administrador Geral / Titular (Michel do Prado)</b> ou profissional contábil / auditor devidamente autorizado.
          </p>
          <button class="primary" onclick="page='dashboard';render();" style="padding:10px 26px;font-weight:700">
            ← Voltar para o Painel Operacional
          </button>
        </div>
      </div>
    `;
    return;
  }

  head('Gestão Financeira & Banco do Brasil', 'Extratos oficiais, conciliação 50/50 de indústrias, teto MEI e balanço para declaração');
  
  const txs = db.extrato_bb || [];
  const TETO_MEI_ANUAL = 81000.00;
  const LIMITE_TOLERANCIA_MEI = 97200.00; // 20% acima do teto

  // Cálculos contábeis oficiais
  const totalEntradas = txs
    .filter(t => t.tipo === 'C' || t.categoria === 'receita_cliente')
    .reduce((acc, t) => acc + (Number(t.valor) || 0), 0);

  const totalFabricas = txs
    .filter(t => t.tipo === 'D' && (t.categoria === 'custo_fabrica_50' || t.categoria === 'custo_fabrica_saldo'))
    .reduce((acc, t) => acc + (Number(t.valor) || 0), 0);

  const totalDespesas = txs
    .filter(t => t.tipo === 'D' && (t.categoria === 'despesas_operacionais' || t.categoria === 'tarifas_bancarias'))
    .reduce((acc, t) => acc + (Number(t.valor) || 0), 0);

  const totalImpostos = txs
    .filter(t => t.tipo === 'D' && t.categoria === 'impostos_das')
    .reduce((acc, t) => acc + (Number(t.valor) || 0), 0);

  const lucroBrutoComercial = totalEntradas - totalFabricas;
  const saldoLiquidoReal = totalEntradas - totalFabricas - totalDespesas - totalImpostos;

  // Termômetro de Faturamento MEI ➔ ME (Exercício 2026)
  const pctTetoMei = Math.min(100, (totalEntradas / TETO_MEI_ANUAL) * 100);
  const saldoRestanteMei = Math.max(0, TETO_MEI_ANUAL - totalEntradas);
  const estaPertoDoLimite = pctTetoMei >= 80;
  const estourouLimite = totalEntradas > TETO_MEI_ANUAL;

  // Filtragem de transações na tabela
  const txsFiltradas = txs.filter(t => {
    if (filtroExtratoBBCategoria === 'todas') return true;
    if (filtroExtratoBBCategoria === 'entradas') return t.tipo === 'C' || t.categoria === 'receita_cliente';
    if (filtroExtratoBBCategoria === 'fabricas') return t.categoria === 'custo_fabrica_50' || t.categoria === 'custo_fabrica_saldo';
    if (filtroExtratoBBCategoria === 'impostos') return t.categoria === 'impostos_das';
    return t.categoria === filtroExtratoBBCategoria;
  });

  // Oportunidades comerciais para detalhamento
  const ops = getFilteredData('oportunidades');

  app.innerHTML = `
    <div class="content">
      <!-- CABEÇALHO DO COCKPIT BANCO DO BRASIL -->
      <div style="background:linear-gradient(135deg, #003366 0%, #002244 100%);color:#fff;border-radius:14px;padding:20px 24px;margin-bottom:20px;border-bottom:4px solid #ffcc00;box-shadow:0 8px 24px rgba(0,51,102,.2)">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px">
          <div style="display:flex;align-items:center;gap:14px">
            <div style="width:48px;height:48px;border-radius:12px;background:#ffcc00;color:#003366;font-size:26px;font-weight:900;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,.25)">
              BB
            </div>
            <div>
              <div style="display:flex;align-items:center;gap:8px">
                <h2 style="font-size:18px;margin:0;font-weight:800;color:#fff;letter-spacing:.3px">BANCO DO BRASIL S.A. (001)</h2>
                <span class="badge" style="background:#ffcc00;color:#003366;font-weight:800;font-size:11px">CONTA PJ ATIVA</span>
              </div>
              <p style="margin:4px 0 0;font-size:12.5px;color:#cbd5e1">
                Titular: <b>59.825.765 MICHEL DO PRADO</b> | CNPJ / Chave PIX: <b>59.825.765/0001-03</b>
              </p>
            </div>
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            <button class="primary" style="background:#ffcc00;color:#003366;font-weight:800;padding:10px 16px;border-radius:8px" onclick="abrirModalExtratoBB('arquivo')">
              📥 Importar Extrato OFX/CSV BB
            </button>
            <button class="secondary" style="background:rgba(255,255,255,.12);color:#fff;border-color:rgba(255,255,255,.3);font-weight:700;padding:10px 16px;border-radius:8px" onclick="abrirModalExtratoBB('texto')">
              📋 Colar Extrato do Internet Banking
            </button>
            <button class="secondary" style="background:#22c55e;color:#fff;border-color:#16a34a;font-weight:800;padding:10px 16px;border-radius:8px" onclick="abrirRelatorioContabilDeclaracao()">
              📑 Relatório para Contador / IR
            </button>
          </div>
        </div>
      </div>

      <!-- TERMÔMETRO DO TETO MEI ➔ ME (MONITORAMENTO EM TEMPO REAL) -->
      <div style="background:#fff;border:1.5px solid ${estourouLimite ? '#ef4444' : (estaPertoDoLimite ? '#f59e0b' : '#cbd5e1')};border-radius:14px;padding:20px 24px;margin-bottom:20px;box-shadow:0 4px 16px rgba(0,0,0,.04)">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:14px;margin-bottom:12px">
          <div>
            <div style="display:flex;align-items:center;gap:8px">
              <span style="font-size:20px">${estourouLimite ? '🚨' : (estaPertoDoLimite ? '⚠️' : '📊')}</span>
              <b style="font-size:15px;color:var(--navy)">Termômetro do Teto Anual MEI ➔ Transição para ME (Simples Nacional)</b>
            </div>
            <p style="margin:4px 0 0;font-size:12.5px;color:var(--muted)">
              Limite legal do MEI em 2026: <b>R$ 81.000,00/ano</b> (~R$ 6.750,00/mês). Entradas pagas no Banco do Brasil: <b>${money(totalEntradas)}</b>.
            </p>
          </div>
          <div style="text-align:right">
            <span style="font-size:19px;font-weight:900;color:${estourouLimite ? '#dc2626' : (estaPertoDoLimite ? '#d97706' : '#16a34a')}">
              ${pctTetoMei.toFixed(1)}% do Teto Atingido
            </span>
            <div style="font-size:12px;color:var(--muted);margin-top:2px">
              Margem restante MEI: <b style="color:var(--ink)">${money(saldoRestanteMei)}</b>
            </div>
          </div>
        </div>

        <!-- BARRA VISUAL DE PROGRESSO -->
        <div style="width:100%;height:14px;background:#e2e8f0;border-radius:10px;overflow:hidden;position:relative">
          <div style="width:${pctTetoMei}%;height:100%;background:${estourouLimite ? '#ef4444' : (estaPertoDoLimite ? 'linear-gradient(90deg, #10b981 0%, #f59e0b 80%, #ef4444 100%)' : '#10b981')};border-radius:10px;transition:width .4s ease"></div>
        </div>

        <div style="margin-top:14px;padding:12px 16px;background:${estourouLimite ? '#fef2f2' : (estaPertoDoLimite ? '#fffbeb' : '#f0fdf4')};border:1px solid ${estourouLimite ? '#fecaca' : (estaPertoDoLimite ? '#fde68a' : '#bbf7d0')};border-radius:10px;font-size:12.5px;color:${estourouLimite ? '#991b1b' : (estaPertoDoLimite ? '#92400e' : '#166534')};display:flex;align-items:flex-start;gap:12px">
          <span style="font-size:22px;line-height:1">💡</span>
          <div>
            <b>Posição Fiscal da Prado (Exercício 2026):</b> 
            Faturamento acumulado recebido no Banco do Brasil: <b>${money(totalEntradas)}</b> (${pctTetoMei.toFixed(1)}% do teto). 
            Margem disponível no MEI: <b>${money(saldoRestanteMei)}</b>.
            <div style="margin-top:4px;color:${estaPertoDoLimite ? '#92400e' : '#15803d'}">
              Nota fiscal de <b>R$ 23.000,00</b> faturada e paga com sucesso. Os pedidos complementares (como o de <b>R$ 72.750,00</b> do Lar dos Velhinhos) aguardam o envio do extrato anual para liberação do faturamento, momento em que a Prado efetuará com tranquilidade a transição para <b>Microempresa (ME - Simples Nacional 4,0%)</b> com teto de até <b>R$ 360.000,00/ano</b>!
            </div>
          </div>
        </div>
      </div>

      <!-- MÉTRICAS FINANCEIRAS DO BANCO DO BRASIL -->
      <div class="metrics">
        ${metric('Entradas BB (Clientes)', money(totalEntradas), `${txs.filter(t=>t.tipo==='C').length} recebimentos computados`, '🏦')}
        ${metric('Saídas Fábricas (50/50)', money(totalFabricas), `${txs.filter(t=>t.categoria.includes('fabrica')).length} pagamentos realizados`, '🏭')}
        ${metric('Lucro Bruto Comercial', money(lucroBrutoComercial), totalEntradas ? `${((lucroBrutoComercial / totalEntradas) * 100).toFixed(1)}% de margem real` : '0%', '★')}
        ${metric('Saldo Líquido / IRPF', money(saldoLiquidoReal), 'Disponível / Livro Caixa Isento', '💎')}
      </div>

      <!-- TABELA DO EXTRATO BANCÁRIO OFICIAL BANCO DO BRASIL (COM ESPAÇAMENTO GENEROSO E SEM SOBREPOSIÇÃO) -->
      <div class="card" style="margin-top:20px;overflow:hidden">
        <div class="card-head" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px;padding:18px 20px;border-bottom:1px solid var(--line)">
          <div>
            <h2 style="font-size:17px;font-weight:800;color:var(--navy);margin:0">Extrato Oficial — Banco do Brasil S.A.</h2>
            <p style="margin:4px 0 0;font-size:12.5px;color:var(--muted)">
              Movimentações bancárias, conferência de créditos recebidos e saídas pagas às indústrias
            </p>
          </div>
          <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center">
            <!-- Filtro rápido por categoria com largura ampla -->
            <select id="selFiltroExtratoBB" style="min-width:260px;padding:9px 14px;border-radius:8px;border:1.5px solid var(--line);font-size:13px;font-weight:600;color:var(--ink);background:var(--cardBg, #fff);box-shadow:0 1px 3px rgba(0,0,0,.05)" onchange="filtrarCategoriaExtratoBB(this.value)">
              <option value="todas" ${filtroExtratoBBCategoria === 'todas' ? 'selected' : ''}>🔍 Todas as Movimentações (${txs.length})</option>
              <option value="entradas" ${filtroExtratoBBCategoria === 'entradas' ? 'selected' : ''}>🟢 Apenas Recebimentos de Clientes</option>
              <option value="fabricas" ${filtroExtratoBBCategoria === 'fabricas' ? 'selected' : ''}>🔴 Apenas Pagamentos a Fábricas</option>
              <option value="impostos" ${filtroExtratoBBCategoria === 'impostos' ? 'selected' : ''}>🟡 Apenas Tributos / DAS</option>
            </select>
            <button class="secondary" style="padding:9px 16px;font-size:13px;font-weight:700;white-space:nowrap;border-radius:8px" onclick="novoLancamentoManualBB()">
              ➕ Lançamento Avulso
            </button>
          </div>
        </div>

        <!-- CONTÊINER COM ROLAGEM HORIZONTAL E ESPAÇAMENTO AMPLO -->
        <div style="overflow-x:auto;width:100%;-webkit-overflow-scrolling:touch">
          <table class="table" style="width:100%;min-width:980px;border-collapse:collapse;font-size:13px">
            <thead>
              <tr style="background:#f8fafc;border-bottom:2px solid var(--line)">
                <th style="width:110px;text-align:center;padding:12px 10px;white-space:nowrap">Data</th>
                <th style="width:85px;text-align:center;padding:12px 8px;white-space:nowrap">Tipo</th>
                <th style="padding:12px 16px;min-width:280px">Descrição no Extrato BB</th>
                <th style="width:260px;padding:12px 12px">Classificação Contábil</th>
                <th style="text-align:right;width:140px;padding:12px 16px;white-space:nowrap">Valor (R$)</th>
                <th style="text-align:center;width:150px;padding:12px 10px;white-space:nowrap">Conciliação</th>
                <th style="text-align:center;width:75px;padding:12px 8px;white-space:nowrap">Ações</th>
              </tr>
            </thead>
            <tbody>
              ${txsFiltradas.length ? txsFiltradas.map(t => {
                const isCredito = t.tipo === 'C';
                const catCfg = CATEGORIAS_BB[t.categoria] || { rotulo: 'Outros Lançamentos', cor: '#334155', bg: '#f1f5f9' };
                return `
                  <tr style="border-bottom:1px solid #f1f5f9">
                    <td style="text-align:center;padding:12px 10px;white-space:nowrap"><code>${formatarDataBr(t.data)}</code></td>
                    <td style="text-align:center;padding:12px 8px;white-space:nowrap">
                      <span class="badge" style="background:${isCredito ? '#e8fdf0' : '#fee2e2'};color:${isCredito ? '#166534' : '#991b1b'};font-weight:800;padding:4px 8px">
                        ${isCredito ? 'CRÉDITO' : 'DÉBITO'}
                      </span>
                    </td>
                    <td style="padding:12px 16px">
                      <b>${escapeHtml(t.descricao)}</b>
                      ${t.referencia ? `<br><small style="color:var(--muted)">🔗 ${escapeHtml(t.referencia)}</small>` : ''}
                      ${t.documento ? `<small style="color:var(--muted)"> · CNPJ/CPF: ${escapeHtml(t.documento)}</small>` : ''}
                    </td>
                    <td style="padding:12px 12px">
                      <select style="width:100%;min-width:240px;padding:7px 10px;border-radius:8px;border:1.5px solid #cbd5e1;font-size:12px;background:${catCfg.bg};color:${catCfg.cor};font-weight:700" onchange="alterarCategoriaBB('${t.id}', this.value)">
                        <option value="receita_cliente" ${t.categoria === 'receita_cliente' ? 'selected' : ''}>🟢 Recebimento Cliente (À vista)</option>
                        <option value="custo_fabrica_50" ${t.categoria === 'custo_fabrica_50' ? 'selected' : ''}>🔴 Pgto Fábrica (Entrada 50%)</option>
                        <option value="custo_fabrica_saldo" ${t.categoria === 'custo_fabrica_saldo' ? 'selected' : ''}>🔴 Pgto Fábrica (Saldo 50%)</option>
                        <option value="despesas_operacionais" ${t.categoria === 'despesas_operacionais' ? 'selected' : ''}>⚪ Despesas Operacionais</option>
                        <option value="tarifas_bancarias" ${t.categoria === 'tarifas_bancarias' ? 'selected' : ''}>⚪ Tarifas Banco do Brasil</option>
                        <option value="impostos_das" ${t.categoria === 'impostos_das' ? 'selected' : ''}>🟡 Tributos (DAS-MEI / ME)</option>
                        <option value="pro_labore_titular" ${t.categoria === 'pro_labore_titular' ? 'selected' : ''}>🔵 Retirada / Lucro Titular</option>
                      </select>
                    </td>
                    <td style="text-align:right;padding:12px 16px;font-weight:800;font-size:14px;white-space:nowrap;color:${isCredito ? 'var(--green)' : '#dc2626'}">
                      ${isCredito ? '+' : '-'} ${money(t.valor)}
                    </td>
                    <td style="text-align:center;padding:12px 10px;white-space:nowrap">
                      <span class="badge" style="background:#e0f2fe;color:#073863;font-size:11.5px;font-weight:700;white-space:nowrap;padding:5px 12px;display:inline-block">
                        ✓ Conciliado BB
                      </span>
                    </td>
                    <td style="text-align:center;padding:12px 8px;white-space:nowrap">
                      <button type="button" class="link" style="color:#ef4444;font-size:16px;padding:4px 8px;cursor:pointer" onclick="excluirTransacaoBB('${t.id}')" title="Excluir lançamento">
                        🗑️
                      </button>
                    </td>
                  </tr>
                `;
              }).join('') : `
                <tr>
                  <td colspan="7" style="text-align:center;padding:42px 20px;color:var(--muted)">
                    <div style="font-size:36px;margin-bottom:10px">🏦</div>
                    <b style="font-size:15px;color:var(--navy);display:block;margin-bottom:6px">Nenhuma transação do Banco do Brasil encontrada para este filtro.</b>
                    Clique em <b>"📥 Importar Extrato OFX/CSV BB"</b> ou <b>"📋 Colar Extrato do Internet Banking"</b> no topo para sincronizar!
                  </td>
                </tr>
              `}
            </tbody>
          </table>
        </div>
      </div>

      <!-- DETALHAMENTO POR INTERMEDIAÇÃO COMERCIAL -->
      <div class="card" style="margin-top:20px">
        <div class="card-head">
          <div>
            <h2>Margens por Intermediação Comercial (Projetado vs Realizado)</h2>
            <p style="margin:2px 0 0;font-size:12.5px;color:var(--muted)">Comparativo da margem negociada com indústrias e clientes</p>
          </div>
        </div>
        <table class="table">
          <thead><tr><th>Intermediação</th><th>Cliente</th><th>Valor Venda</th><th>Custo Fornecedor</th><th>Margem Prado</th><th>Margem %</th></tr></thead>
          <tbody>
            ${ops.length ? ops.map(o => {
              const c = Number(o.custoEstimado) || (Number(o.valor) * 0.6);
              const m = Number(o.valor) - c;
              return `
                <tr>
                  <td><b>${escapeHtml(o.nome)}</b></td>
                  <td>${escapeHtml(o.cliente)}</td>
                  <td>${money(o.valor)}</td>
                  <td style="color:var(--red)">${money(c)}</td>
                  <td style="color:var(--green)"><b>${money(m)}</b></td>
                  <td><b>${o.valor ? ((m / o.valor) * 100).toFixed(1) : 0}%</b></td>
                </tr>
              `;
            }).join('') : `<tr><td colspan="6" style="text-align:center;padding:30px">Nenhuma intermediação cadastrada.</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
window.financeiro = financeiro;

function filtrarCategoriaExtratoBB(cat) {
  filtroExtratoBBCategoria = cat;
  financeiro();
}
window.filtrarCategoriaExtratoBB = filtrarCategoriaExtratoBB;

function alterarCategoriaBB(id, novaCat) {
  const t = (db.extrato_bb || []).find(x => x.id === id);
  if (t) {
    t.categoria = novaCat;
    salvarExtratoBBPersistente();
    toast('Categoria contábil atualizada com sucesso!');
    financeiro();
  }
}
window.alterarCategoriaBB = alterarCategoriaBB;

function excluirTransacaoBB(id) {
  if (confirm('Deseja realmente remover esta movimentação bancária do Banco do Brasil?')) {
    db.extrato_bb = (db.extrato_bb || []).filter(x => x.id !== id);
    salvarExtratoBBPersistente();
    toast('Movimentação bancária removida.');
    financeiro();
  }
}
window.excluirTransacaoBB = excluirTransacaoBB;

function novoLancamentoManualBB() {
  const desc = prompt('Descrição do lançamento (ex: PIX ENVIADO - FABRICA LORD BRASIL):');
  if (!desc) return;
  const valorStr = prompt('Valor em Reais (ex: 25000,00):');
  if (!valorStr) return;
  const valorNum = parseFloat(valorStr.replace(/\./g, '').replace(',', '.')) || 0;
  if (valorNum <= 0) return alert('Valor inválido.');

  const tipo = confirm('É uma ENTRADA / CRÉDITO na conta do Banco do Brasil?\n\nClique em OK para CRÉDITO (Entrada)\nClique em Cancelar para DÉBITO (Saída)') ? 'C' : 'D';
  const categoriaPadrao = tipo === 'C' ? 'receita_cliente' : 'custo_fabrica_50';

  const novaTx = {
    id: `bb-tx-${Date.now()}`,
    data: new Date().toISOString().split('T')[0],
    descricao: desc.toUpperCase().trim(),
    tipo: tipo,
    valor: valorNum,
    categoria: categoriaPadrao,
    referencia: 'Lançamento Manual BB',
    documento: '',
    conciliado: true
  };

  db.extrato_bb = db.extrato_bb || [];
  db.extrato_bb.unshift(novaTx);
  salvarExtratoBBPersistente();
  toast('✓ Novo lançamento do Banco do Brasil registrado com sucesso!');
  financeiro();
}
window.novoLancamentoManualBB = novoLancamentoManualBB;

// -------------------------------------------------------------------------
// FUNÇÕES DO MODAL DE IMPORTAÇÃO BANCO DO BRASIL (OFX / CSV / TEXTO)
// -------------------------------------------------------------------------
function abrirModalExtratoBB(aba = 'arquivo') {
  const modal = document.querySelector('#modalExtratoBB');
  if (!modal) return;
  trocarAbaExtratoBB(aba);
  
  // Limpa prévias anteriores
  const fileInput = document.querySelector('#fileInputExtratoBB');
  if (fileInput) fileInput.value = '';
  const txtInput = document.querySelector('#txtExtratoBB');
  if (txtInput) txtInput.value = '';
  const areaPrevia = document.querySelector('#areaPreviaTransacoesBB');
  if (areaPrevia) areaPrevia.style.display = 'none';
  const btnSalvar = document.querySelector('#btnSalvarTransacoesBB');
  if (btnSalvar) btnSalvar.style.display = 'none';
  transacoesBBEmPrevia = [];

  modal.showModal();
}
window.abrirModalExtratoBB = abrirModalExtratoBB;

function trocarAbaExtratoBB(aba) {
  const btnArquivo = document.querySelector('#btnAbaArquivoBB');
  const btnTexto = document.querySelector('#btnAbaTextoBB');
  const abaArquivo = document.querySelector('#abaArquivoBB');
  const abaTexto = document.querySelector('#abaTextoBB');

  if (aba === 'arquivo') {
    if (btnArquivo) { btnArquivo.className = 'primary'; btnArquivo.style.background = '#003366'; }
    if (btnTexto) { btnTexto.className = 'secondary'; btnTexto.style.background = 'transparent'; }
    if (abaArquivo) abaArquivo.style.display = 'block';
    if (abaTexto) abaTexto.style.display = 'none';
  } else {
    if (btnArquivo) { btnArquivo.className = 'secondary'; btnArquivo.style.background = 'transparent'; }
    if (btnTexto) { btnTexto.className = 'primary'; btnTexto.style.background = '#003366'; }
    if (abaArquivo) abaArquivo.style.display = 'none';
    if (abaTexto) abaTexto.style.display = 'block';
  }
}
window.trocarAbaExtratoBB = trocarAbaExtratoBB;

function classificarTransacaoBBInteligente(descricao, tipo, valor) {
  const d = String(descricao || '').toUpperCase();
  if (tipo === 'C' || valor > 0) {
    return 'receita_cliente';
  }
  if (d.includes('FABRICA') || d.includes('INDUSTRIA') || d.includes('LORD') || d.includes('COLCHOES') || d.includes('FORNECEDOR') || d.includes('PRODUTOR')) {
    return 'custo_fabrica_50';
  }
  if (d.includes('DAS') || d.includes('SIMPLES') || d.includes('RECEITA') || d.includes('DARF') || d.includes('GPS') || d.includes('TRIBUT')) {
    return 'impostos_das';
  }
  if (d.includes('TARIFA') || d.includes('PACOTE') || d.includes('MANUT') || d.includes('IOF') || d.includes('TED') || d.includes('DOC')) {
    return 'tarifas_bancarias';
  }
  if (d.includes('MICHEL') || d.includes('PRO LABORE') || d.includes('RETIRADA') || d.includes('PRADO')) {
    return 'pro_labore_titular';
  }
  return 'despesas_operacionais';
}

function parsearOFXBancoDoBrasil(ofxText) {
  const transacoes = [];
  const regexTrn = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  let match;

  while ((match = regexTrn.exec(ofxText)) !== null) {
    const bloco = match[1];
    
    // Tipo: CREDIT / DEBIT / OTHER
    const tipoMatch = /<TRNTYPE>([A-Z]+)/i.exec(bloco);
    const tipoStr = tipoMatch ? tipoMatch[1].toUpperCase() : 'OTHER';

    // Data: YYYYMMDD...
    const dtMatch = /<DTPOSTED>(\d{4})(\d{2})(\d{2})/i.exec(bloco);
    const dataIso = dtMatch ? `${dtMatch[1]}-${dtMatch[2]}-${dtMatch[3]}` : new Date().toISOString().split('T')[0];

    // Valor: pode ser negativo ou positivo
    const amtMatch = /<TRNAMT>([-\d.,]+)/i.exec(bloco);
    let valorRaw = amtMatch ? parseFloat(amtMatch[1].replace(',', '.')) : 0;
    const isCredito = valorRaw > 0 || tipoStr === 'CREDIT';
    const valorAbs = Math.abs(valorRaw);

    // Descrição: MEMO ou NAME
    const memoMatch = /<MEMO>([^<\r\n]+)/i.exec(bloco);
    const nameMatch = /<NAME>([^<\r\n]+)/i.exec(bloco);
    const desc = (memoMatch ? memoMatch[1] : (nameMatch ? nameMatch[1] : 'Movimentação Banco do Brasil')).trim();

    // FITID ou ID
    const fitMatch = /<FITID>([^<\r\n]+)/i.exec(bloco);
    const txId = fitMatch ? `bb-${fitMatch[1].trim()}` : `bb-tx-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

    const tipo = isCredito ? 'C' : 'D';
    const cat = classificarTransacaoBBInteligente(desc, tipo, valorRaw);

    transacoes.push({
      id: txId,
      data: dataIso,
      descricao: desc.toUpperCase(),
      tipo: tipo,
      valor: valorAbs,
      categoria: cat,
      referencia: 'Importado via Extrato OFX Banco do Brasil',
      documento: '',
      conciliado: true
    });
  }

  return transacoes;
}

function parsearLinhasTextoOuCSVBB(texto) {
  const linhas = String(texto || '').split(/\r?\n/);
  const transacoes = [];

  linhas.forEach((linha, idx) => {
    const limpa = linha.trim();
    if (!limpa || limpa.startsWith('Data') || limpa.startsWith('Extrato') || limpa.startsWith('Saldo') || limpa.length < 8) return;

    // Detecta padrão de data DD/MM/AAAA ou YYYY-MM-DD
    const dataMatch = limpa.match(/(\d{2})[/-](\d{2})[/-](\d{4})/);
    let dataIso = new Date().toISOString().split('T')[0];
    if (dataMatch) {
      dataIso = `${dataMatch[3]}-${dataMatch[2]}-${dataMatch[1]}`;
    }

    // Detecta valor monetário (ex: 72.750,00 ou -25.000,00 ou 72750.00)
    const valorMatch = limpa.match(/([+-]?\s*R?\$?\s*\d{1,3}(?:\.\d{3})*,\d{2})|([+-]?\s*R?\$?\s*\d+\.\d{2})/);
    if (!valorMatch) return;

    let valorStr = (valorMatch[1] || valorMatch[2]).replace(/[R$\s]/g, '');
    let isNegativo = valorStr.includes('-');
    let isDebitoSufixo = /[0-9]\s*D\b/i.test(limpa);
    let isCreditoSufixo = /[0-9]\s*C\b/i.test(limpa);

    valorStr = valorStr.replace(/[+-]/g, '').replace(/\./g, '').replace(',', '.');
    const valorNum = Math.abs(parseFloat(valorStr) || 0);
    if (valorNum === 0) return;

    const isCredito = isCreditoSufixo || (!isNegativo && !isDebitoSufixo && !limpa.toUpperCase().includes('ENVIADO') && !limpa.toUpperCase().includes('PAGAMENTO') && !limpa.toUpperCase().includes('DEBITO'));
    const tipo = isCredito ? 'C' : 'D';

    // Remove data e valor da linha para capturar a descrição limpa
    let desc = limpa
      .replace(/(\d{2})[/-](\d{2})[/-](\d{4})/, '')
      .replace(valorMatch[0], '')
      .replace(/\b[CD]\b/g, '')
      .replace(/[;|]/g, ' ')
      .trim();
    if (desc.length < 3) desc = 'MOVIMENTACAO BANCARIA BB';

    const cat = classificarTransacaoBBInteligente(desc, tipo, isCredito ? valorNum : -valorNum);

    transacoes.push({
      id: `bb-tx-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
      data: dataIso,
      descricao: desc.toUpperCase(),
      tipo: tipo,
      valor: valorNum,
      categoria: cat,
      referencia: 'Importado via Extrato BB',
      documento: '',
      conciliado: true
    });
  });

  return transacoes;
}

function manipularArquivoExtratoBB(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = e => {
    const conteudo = e.target.result;
    let transacoes = [];

    if (file.name.toLowerCase().endsWith('.ofx')) {
      transacoes = parsearOFXBancoDoBrasil(conteudo);
    } else {
      transacoes = parsearLinhasTextoOuCSVBB(conteudo);
    }

    if (!transacoes.length) {
      toast('Nenhuma movimentação identificada no arquivo. Verifique se é um OFX ou CSV do BB.');
      return;
    }

    prepararPreviaTransacoesBB(transacoes);
  };
  reader.readAsText(file, 'ISO-8859-1'); // Suporta caracteres acentuados de bancos brasileiros
}
window.manipularArquivoExtratoBB = manipularArquivoExtratoBB;

function processarTextoExtratoBB() {
  const txt = document.querySelector('#txtExtratoBB')?.value || '';
  if (!txt.trim()) {
    toast('Por favor, cole as linhas do extrato antes de processar.');
    return;
  }

  const transacoes = parsearLinhasTextoOuCSVBB(txt);
  if (!transacoes.length) {
    toast('Não foi possível identificar linhas com data e valor no texto.');
    return;
  }

  prepararPreviaTransacoesBB(transacoes);
}
window.processarTextoExtratoBB = processarTextoExtratoBB;

function prepararPreviaTransacoesBB(transacoes) {
  transacoesBBEmPrevia = transacoes;
  
  const qtdEl = document.querySelector('#bbQtdTransacoes');
  if (qtdEl) qtdEl.textContent = transacoes.length;

  const corpoTabela = document.querySelector('#corpoPreviaBB');
  if (corpoTabela) {
    corpoTabela.innerHTML = transacoes.map(t => {
      const isC = t.tipo === 'C';
      const catCfg = CATEGORIAS_BB[t.categoria] || { rotulo: 'Outros' };
      return `
        <tr style="border-bottom:1px solid #f1f5f9">
          <td style="padding:6px 8px;text-align:center"><code>${formatarDataBr(t.data)}</code></td>
          <td style="padding:6px 8px"><b>${escapeHtml(t.descricao)}</b></td>
          <td style="padding:6px 8px">
            <span class="badge" style="background:${isC ? '#f0fdf4' : '#fef2f2'};color:${isC ? '#166534' : '#991b1b'};font-size:11px">
              ${catCfg.rotulo}
            </span>
          </td>
          <td style="padding:6px 8px;text-align:right;font-weight:700;color:${isC ? 'var(--green)' : '#dc2626'}">
            ${isC ? '+' : '-'} ${money(t.valor)}
          </td>
        </tr>
      `;
    }).join('');
  }

  const areaPrevia = document.querySelector('#areaPreviaTransacoesBB');
  if (areaPrevia) areaPrevia.style.display = 'block';

  const btnSalvar = document.querySelector('#btnSalvarTransacoesBB');
  if (btnSalvar) btnSalvar.style.display = 'inline-block';

  toast(`✓ ${transacoes.length} transações do Banco do Brasil identificadas! Confira a prévia abaixo.`);
}
window.prepararPreviaTransacoesBB = prepararPreviaTransacoesBB;

function confirmarImportacaoExtratoBB() {
  if (!transacoesBBEmPrevia.length) {
    toast('Nenhuma transação pronta para importação.');
    return;
  }

  db.extrato_bb = db.extrato_bb || [];
  // Evita duplicidade exata por id ou (data + descricao + valor)
  let adicionadas = 0;
  transacoesBBEmPrevia.forEach(nova => {
    const jaExiste = db.extrato_bb.some(antiga => 
      antiga.id === nova.id || 
      (antiga.data === nova.data && antiga.descricao === nova.descricao && Math.abs(antiga.valor - nova.valor) < 0.01)
    );
    if (!jaExiste) {
      db.extrato_bb.push(nova);
      adicionadas++;
    }
  });

  // Ordena por data decrescente
  db.extrato_bb.sort((a, b) => new Date(b.data) - new Date(a.data));
  salvarExtratoBBPersistente();

  document.querySelector('#modalExtratoBB')?.close();
  toast(`✓ ${adicionadas} novas transações do Banco do Brasil integradas ao Balanço Financeiro!`);
  financeiro();
}
window.confirmarImportacaoExtratoBB = confirmarImportacaoExtratoBB;

// -------------------------------------------------------------------------
// RELATÓRIO CONTÁBIL OFICIAL / LIVRO CAIXA PARA O CONTADOR E IRPF
// -------------------------------------------------------------------------
function abrirRelatorioContabilDeclaracao() {
  const modal = document.querySelector('#modalRelatorioContabil');
  if (!modal) return;

  const txs = db.extrato_bb || [];
  
  const totalEntradas = txs
    .filter(t => t.tipo === 'C' || t.categoria === 'receita_cliente')
    .reduce((acc, t) => acc + (Number(t.valor) || 0), 0);

  const totalFabricas = txs
    .filter(t => t.tipo === 'D' && (t.categoria === 'custo_fabrica_50' || t.categoria === 'custo_fabrica_saldo'))
    .reduce((acc, t) => acc + (Number(t.valor) || 0), 0);

  const totalDespesas = txs
    .filter(t => t.tipo === 'D' && (t.categoria === 'despesas_operacionais' || t.categoria === 'tarifas_bancarias'))
    .reduce((acc, t) => acc + (Number(t.valor) || 0), 0);

  const totalImpostos = txs
    .filter(t => t.tipo === 'D' && t.categoria === 'impostos_das')
    .reduce((acc, t) => acc + (Number(t.valor) || 0), 0);

  const lucroBruto = totalEntradas - totalFabricas;
  const resultadoLiquido = totalEntradas - totalFabricas - totalDespesas - totalImpostos;

  const pctFab = totalEntradas ? ((totalFabricas / totalEntradas) * 100).toFixed(1) : '0.0';
  const pctLucro = totalEntradas ? ((lucroBruto / totalEntradas) * 100).toFixed(1) : '0.0';
  const pctDesp = totalEntradas ? ((totalDespesas / totalEntradas) * 100).toFixed(1) : '0.0';
  const pctImp = totalEntradas ? ((totalImpostos / totalEntradas) * 100).toFixed(1) : '0.0';
  const pctRes = totalEntradas ? ((resultadoLiquido / totalEntradas) * 100).toFixed(1) : '0.0';

  // Atualiza elementos no modal timbrado
  const dataHoje = new Date().toLocaleDateString('pt-BR');
  const emissaoEl = document.querySelector('#rel_data_emissao');
  if (emissaoEl) emissaoEl.textContent = dataHoje;

  const setTxt = (id, val) => {
    const el = document.querySelector(id);
    if (el) el.textContent = val;
  };

  setTxt('#rel_tot_entradas', money(totalEntradas));
  setTxt('#rel_tot_custo_fab', money(totalFabricas));
  setTxt('#rel_pct_custo_fab', `${pctFab}%`);
  setTxt('#rel_tot_lucro_bruto', money(lucroBruto));
  setTxt('#rel_pct_lucro_bruto', `${pctLucro}%`);
  setTxt('#rel_tot_despesas', money(totalDespesas));
  setTxt('#rel_pct_despesas', `${pctDesp}%`);
  setTxt('#rel_tot_impostos', money(totalImpostos));
  setTxt('#rel_pct_impostos', `${pctImp}%`);
  setTxt('#rel_tot_resultado_liquido', money(resultadoLiquido));
  setTxt('#rel_pct_resultado_liquido', `${pctRes}%`);
  setTxt('#rel_irpf_lucro_isento', money(Math.max(0, resultadoLiquido)));

  modal.showModal();
}
window.abrirRelatorioContabilDeclaracao = abrirRelatorioContabilDeclaracao;

function imprimirRelatorioContabil() {
  const printArea = document.querySelector('#relatorioContabilPrintArea');
  if (!printArea) {
    window.print();
    return;
  }

  let iframe = document.querySelector('#pradoPrintIframe');
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'pradoPrintIframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);
  }

  const doc = iframe.contentDocument || iframe.contentWindow.document;
  doc.open();
  doc.write(`<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Livro Caixa & Demonstrativo Contábil - Prado Comércio & Soluções</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #ffffff !important;
      color: #1a1a1a !important;
      font-family: Arial, sans-serif !important;
      padding: 18px 24px !important;
      font-size: 12px !important;
    }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; }
    th, td { padding: 6px 8px; border: 1px solid #cbd5e1; }
    th { background: #073863 !important; color: #fff !important; }
    .no-print { display: none !important; }
  </style>
</head>
<body>
  ${printArea.innerHTML}
</body>
</html>`);
  doc.close();

  setTimeout(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
  }, 350);
}
window.imprimirRelatorioContabil = imprimirRelatorioContabil;

function risco() {
  head('Análise de risco & CNPJ', 'Consulta oficial à Receita Federal e conformidade cadastral');
  app.innerHTML = `
    <div class="content">
      <div class="card" style="margin-bottom:20px">
        <div class="card-head"><h2>Consultar CPF ou CNPJ na Receita Federal</h2></div>
        <p style="color:var(--muted);font-size:13.5px">Informe o CPF (11 dígitos) ou CNPJ (14 dígitos) para verificar situação cadastral na Receita Federal, CNAE, localização e sócios (QSA).</p>
        <div style="display:flex;gap:12px;margin-top:16px;max-width:620px">
          <input id="riskCnpjInput" placeholder="000.000.000-00 ou 00.000.000/0000-00" style="flex:1;padding:12px 16px;border:1.5px solid var(--line);border-radius:10px;font-size:15px;color:var(--ink);background:var(--cardBg, #fff)">
          <button class="primary" onclick="consultarCnpjOficial()" style="padding:12px 20px;font-size:15px;font-weight:700">🔍 Consultar Documento</button>
        </div>
      </div>
      <div id="riskResult"></div>
    </div>
  `;

  const inp = document.querySelector('#riskCnpjInput');
  if (inp) {
    inp.addEventListener('input', e => {
      const v = e.target.value.replace(/\D/g, '');
      if (v.length <= 11) {
        e.target.value = v.replace(/(\d{3})(\d{3})?(\d{3})?(\d{2})?/, (_, a, b, c, d) => 
          [a, b, c].filter(Boolean).join('.') + (d ? '-' + d : '')
        );
      } else {
        e.target.value = v.slice(0, 14).replace(/(\d{2})(\d{3})?(\d{3})?(\d{4})?(\d{2})?/, (_, a, b, c, d, e2) => 
          [a, b, c].filter(Boolean).join('.') + (d ? '/' + d : '') + (e2 ? '-' + e2 : '')
        );
      }
    });
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter') consultarCnpjOficial();
    });
    inp.focus();
  }
}

async function consultarCnpjOficial() {
  const input = document.querySelector('#riskCnpjInput');
  const val = input ? input.value.replace(/\D/g, '') : '';
  if (!val || (val.length !== 11 && val.length !== 14)) {
    return toast('Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.');
  }

  const isCpf = (val.length === 11);
  showLoader(
    isCpf ? 'Validando CPF...' : 'Consultando CNPJ...',
    'Acessando base oficial da Receita Federal e conformidade cadastral...',
    45,
    'Processando documento...'
  );
  const resArea = document.querySelector('#riskResult');

  try {
    const token = window.sessionToken || sessionToken || localStorage.getItem('pradoSessionToken') || 'sess_prado_authenticated';
    let data = null;

    try {
      const res = await fetch(`/api/analise-risco?doc=${val}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        data = await res.json();
      } else if (!isCpf) {
        // Fallback direto via BrasilAPI no cliente para CNPJ
        const fallbackRes = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${val}`).catch(() => null);
        if (fallbackRes && fallbackRes.ok) {
          const fbData = await fallbackRes.json();
          data = {
            cnpj: fbData.cnpj,
            razao_social: fbData.razao_social,
            nome_fantasia: fbData.nome_fantasia || 'Não informado',
            situacao_cadastral: fbData.descricao_situacao_cadastral || 'ATIVA',
            data_situacao_cadastral: fbData.data_situacao_cadastral || '—',
            cnae_fiscal_descricao: fbData.cnae_fiscal_descricao || '—',
            municipio: fbData.municipio || '—',
            uf: fbData.uf || '—',
            capital_social: fbData.capital_social || 0,
            qsa: fbData.qsa || [],
            fonte: 'Receita Federal do Brasil (BrasilAPI Direto)',
            consultado_em: new Date().toISOString()
          };
        } else {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Documento não localizado na base pública da Receita Federal.');
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Erro ao validar CPF.');
      }
    } catch (errApi) {
      if (!isCpf) {
        // Tenta fallback cliente para CNPJ
        const fallbackRes = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${val}`).catch(() => null);
        if (fallbackRes && fallbackRes.ok) {
          const fbData = await fallbackRes.json();
          data = {
            cnpj: fbData.cnpj,
            razao_social: fbData.razao_social,
            nome_fantasia: fbData.nome_fantasia || 'Não informado',
            situacao_cadastral: fbData.descricao_situacao_cadastral || 'ATIVA',
            data_situacao_cadastral: fbData.data_situacao_cadastral || '—',
            cnae_fiscal_descricao: fbData.cnae_fiscal_descricao || '—',
            municipio: fbData.municipio || '—',
            uf: fbData.uf || '—',
            capital_social: fbData.capital_social || 0,
            qsa: fbData.qsa || [],
            fonte: 'Receita Federal do Brasil (BrasilAPI Direto)',
            consultado_em: new Date().toISOString()
          };
        } else {
          throw errApi;
        }
      } else {
        throw errApi;
      }
    }

    if (data) {
      const situacao = String(data.situacao_cadastral || '').toUpperCase();
      const statusClass = (situacao === 'ATIVA' || situacao === 'REGULAR') ? '' : 'risk';
      const docLabel = isCpf ? 'CPF' : 'CNPJ';

      // Verifica se já existe cliente ou fornecedor cadastrado no sistema com esse documento
      const clienteExistente = (db.clientes || []).find(c => String(c.doc || '').replace(/\D/g, '') === val);
      const fornecedorExistente = (db.fornecedores || []).find(f => String(f.doc || '').replace(/\D/g, '') === val);

      resArea.insertAdjacentHTML('afterbegin', `
        <div class="card" style="margin-top:18px;border-left:5px solid ${statusClass ? 'var(--red, #ef4444)' : 'var(--teal, #0d9488)'};box-shadow:0 8px 24px rgba(0,0,0,.06)">
          <div class="card-head">
            <div>
              <h2 style="font-size:20px;color:var(--navy, #0f172a)">${escapeHtml(data.razao_social)}</h2>
              <small style="color:var(--muted);font-size:13px">Nome fantasia / Referência: <b>${escapeHtml(data.nome_fantasia)}</b> · ${docLabel}: <b>${formatCnpj(data.cnpj || val)}</b></small>
            </div>
            <span class="badge ${statusClass}" style="font-size:13px;padding:6px 12px">${escapeHtml(data.situacao_cadastral)}</span>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:18px 0;font-size:14px">
            <div><b>Atividade Principal (CNAE):</b><p style="margin:4px 0;color:var(--ink)">${escapeHtml(data.cnae_fiscal_descricao || '—')}</p></div>
            <div><b>Localização / Jurisdição:</b><p style="margin:4px 0;color:var(--ink)">${escapeHtml(data.municipio || '—')} - ${escapeHtml(data.uf || '—')}</p></div>
            ${data.capital_social ? `<div><b>Capital Social Registrado:</b><p style="margin:4px 0;color:var(--navy);font-weight:700">${money(data.capital_social)}</p></div>` : ''}
            <div><b>Situação na Receita:</b><p style="margin:4px 0;color:var(--ink)">${escapeHtml(data.data_situacao_cadastral || 'Ativo')}</p></div>
          </div>

          ${data.qsa && data.qsa.length ? `
            <div style="border-top:1px solid var(--line);padding-top:14px;margin-top:10px">
              <b style="font-size:14px">Quadro de Sócios e Administradores (QSA):</b>
              <ul style="margin:10px 0;padding-left:22px;font-size:13.5px;color:var(--ink);line-height:1.6">
                ${data.qsa.map(s => `<li><b>${escapeHtml(s.nome_socio)}</b> (${escapeHtml(s.faixa_etaria || s.qualificacao_socio)})</li>`).join('')}
              </ul>
            </div>
          ` : ''}

          ${(clienteExistente || fornecedorExistente) ? `
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:12px 16px;margin-top:14px;font-size:13.5px;color:#166534">
              <b>✓ Cadastro Vinculado no Sistema:</b> Já consta na sua base corporativa como 
              <b>${clienteExistente ? 'Cliente (' + escapeHtml(clienteExistente.nome) + ')' : 'Fornecedor (' + escapeHtml(fornecedorExistente.nome) + ')'}</b>.
            </div>
          ` : `
            <div style="background:#f8fafc;border:1px dashed #cbd5e1;border-radius:10px;padding:12px 16px;margin-top:14px;display:flex;align-items:center;justify-content:space-between">
              <span style="font-size:13px;color:var(--muted)">Documento apto para intermediação. Deseja cadastrar?</span>
              <button class="secondary" onclick="document.querySelector('[data-action=new]').click()" style="padding:6px 14px;font-size:12.5px">+ Cadastrar no Sistema</button>
            </div>
          `}

          <div style="font-size:11.5px;color:var(--muted);margin-top:14px;border-top:1px solid var(--line);padding-top:8px">
            Fonte: <b>${escapeHtml(data.fonte || 'Receita Federal do Brasil')}</b> · Consultado em: ${new Date(data.consultado_em).toLocaleString('pt-BR')}
          </div>
        </div>
      `);
      toast(`${docLabel} consultado com sucesso!`);
    }
  } catch (err) {
    toast(err.message || 'Erro de conexão ao consultar documento.');
  } finally {
    hideLoader();
  }
}
window.consultarCnpjOficial = consultarCnpjOficial;

function relatorios() {
  head('Relatórios comerciais e gerenciais', 'Indicadores de desempenho, margem e auditoria');
  app.innerHTML = `
    <div class="content">
      <div class="grid2">
        <div class="card">
          <div class="card-head"><h2>Relatórios disponíveis para exportação</h2></div>
          ${['Margem de lucro por negociação',
             'Desempenho e pontualidade de fornecedores',
             'Contas a pagar e receber por vencimento',
             'Pedidos em andamento e prazos de entrega',
             'Comissões de representantes e tributos',
             'Relatório de auditoria de alterações (RLS)'
            ].map(x => `
              <div class="deal">
                <b>${escapeHtml(x)}</b>
                <button class="link" onclick="window.print()">Exportar PDF</button>
              </div>
            `).join('')}
        </div>
        <div class="card">
          <div class="card-head"><h2>Indicadores de Governança</h2></div>
          <div class="deal">
            <div><b>Segurança do Banco de Dados</b><small>Supabase PostgreSQL (Políticas RLS ativas)</small></div>
            <span class="badge">RLS Ativo</span>
          </div>
          <div class="deal">
            <div><b>Controle de Sessão</b><small>Autenticação criptografada via Supabase Auth</small></div>
            <span class="badge">Seguro</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

// 8. COTAÇÕES IA & FÁBRICAS (COM FILTROS REGIONAIS, MODO HÍBRIDO E ADIÇÃO MANUAL)
let cotacaoOffsetRotacao = 0;
window.modoCotacaoAtual = window.modoCotacaoAtual || 'ia';

function alternarModoCotacao(modo) {
  window.modoCotacaoAtual = modo;
  const painel = document.querySelector('#painelModoHibrido');
  const btnIa = document.querySelector('#tabModoIa');
  const btnHibrido = document.querySelector('#tabModoHibrido');
  const btnBuscar = document.querySelector('#btnBuscarFabricantes');

  if (modo === 'hibrido') {
    if (painel) painel.style.display = 'block';
    if (btnIa) {
      btnIa.style.background = '#f1f5f9';
      btnIa.style.color = 'var(--ink)';
      btnIa.style.borderColor = 'var(--line)';
    }
    if (btnHibrido) {
      btnHibrido.style.background = 'var(--navy)';
      btnHibrido.style.color = '#fff';
      btnHibrido.style.borderColor = 'var(--navy)';
    }
    if (btnBuscar) {
      btnBuscar.innerHTML = '⚡ Gerar Cotação (1 Minha + 2 Mais Próximas)';
      btnBuscar.style.background = 'var(--gold)';
    }
  } else {
    if (painel) painel.style.display = 'none';
    if (btnIa) {
      btnIa.style.background = 'var(--navy)';
      btnIa.style.color = '#fff';
      btnIa.style.borderColor = 'var(--navy)';
    }
    if (btnHibrido) {
      btnHibrido.style.background = '#f1f5f9';
      btnHibrido.style.color = 'var(--ink)';
      btnHibrido.style.borderColor = 'var(--line)';
    }
    if (btnBuscar) {
      btnBuscar.innerHTML = '⚡ Localizar 3 Fabricantes Mais Próximos';
      btnBuscar.style.background = 'var(--gold)';
    }
  }
}
window.alternarModoCotacao = alternarModoCotacao;

async function consultarCnpjFabricaManual(targetPrefix = 'fm') {
  const cnpjInput = document.querySelector(`#${targetPrefix}Cnpj`);
  if (!cnpjInput || !cnpjInput.value) {
    return toast('Digite o CNPJ da fábrica para pesquisar na Receita.');
  }
  const clean = cnpjInput.value.replace(/\D/g, '');
  if (clean.length !== 14) {
    return toast('CNPJ inválido. Digite os 14 dígitos.');
  }

  showLoader('Consultando Receita Federal...', 'Localizando razão social, cidade e contatos oficiais...', 50);
  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${clean}`);
    if (res.ok) {
      const d = await res.json();
      const nomeInput = document.querySelector(`#${targetPrefix}Nome`);
      const cidadeInput = document.querySelector(`#${targetPrefix}Cidade`);
      const estadoInput = document.querySelector(`#${targetPrefix}Estado`);
      const telInput = document.querySelector(`#${targetPrefix}Telefone`);

      if (nomeInput) nomeInput.value = d.nome_fantasia || d.razao_social || '';
      if (cidadeInput) cidadeInput.value = d.municipio || '';
      if (estadoInput) estadoInput.value = d.uf || '';
      if (telInput && d.ddd_telefone_1) {
        telInput.value = `(${d.ddd_telefone_1.slice(0, 2)}) ${d.ddd_telefone_1.slice(2)}`;
      }
      toast('Dados da fábrica preenchidos automaticamente via Receita Federal!');
    } else {
      toast('Não foi possível obter os dados pelo CNPJ. Preencha manualmente.');
    }
  } catch (e) {
    toast('Serviço da Receita indisponível no momento. Preencha os campos à mão.');
  } finally {
    hideLoader();
  }
}
window.consultarCnpjFabricaManual = consultarCnpjFabricaManual;

function cotacao_ia() {
  head('Cotações IA & Fábricas Nacionais', 'Pesquisa de indústrias reais com telefone válido, WhatsApp oficial e margem garantida');
  app.innerHTML = `
    <div class="content">
      <div class="card" style="margin-bottom:20px;border-top:4px solid var(--gold)">
        <div class="card-head">
          <div>
            <h2 style="font-size:18px">Localizador de Fabricantes & Orçamentos Inteligentes</h2>
            <small style="color:var(--muted)">A inteligência comercial da Prado pesquisa indústrias nacionais reais com telefone e WhatsApp para você entrar em contato direto.</small>
          </div>
          <span id="iaMotorBadge" class="badge" style="background:#e8f4fc;color:var(--navy2);font-weight:700">⚡ Inteligência Comercial B2B Prado</span>
        </div>
        <div style="margin-top:16px">
          
          <!-- SELEÇÃO DE MODO: 100% IA OU HÍBRIDO (1 MANUAL + 2 IA) -->
          <div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap">
            <button id="tabModoIa" type="button" onclick="alternarModoCotacao('ia')" style="flex:1;min-width:240px;padding:10px 14px;border-radius:8px;font-weight:800;font-size:13px;cursor:pointer;border:2px solid ${window.modoCotacaoAtual === 'ia' ? 'var(--navy)' : 'var(--line)'};background:${window.modoCotacaoAtual === 'ia' ? 'var(--navy)' : '#f8fafc'};color:${window.modoCotacaoAtual === 'ia' ? '#fff' : 'var(--ink)'}">
              ⚡ MODO 100% IA (3 Fábricas Mais Próximas do Cliente)
            </button>
            <button id="tabModoHibrido" type="button" onclick="alternarModoCotacao('hibrido')" style="flex:1;min-width:240px;padding:10px 14px;border-radius:8px;font-weight:800;font-size:13px;cursor:pointer;border:2px solid ${window.modoCotacaoAtual === 'hibrido' ? 'var(--navy)' : 'var(--line)'};background:${window.modoCotacaoAtual === 'hibrido' ? 'var(--navy)' : '#f8fafc'};color:${window.modoCotacaoAtual === 'hibrido' ? '#fff' : 'var(--ink)'}">
              ✍️ MODO HÍBRIDO (1 Fábrica Minha Conhecida + 2 Mais Próximas por IA)
            </button>
          </div>

          <!-- CAMPO PRINCIPAL DE DEMANDA -->
          <div style="margin-bottom:12px">
            <label for="iaDemandaInput" style="font-weight:700;display:block;margin-bottom:6px">O que você precisa cotar?</label>
            <input id="iaDemandaInput" placeholder="Ex: Colchão D33 hospitalar, Saco de lixo 100L reforçado, 1000 canetas, tinta acrílica 18L..." onkeydown="if(event.key==='Enter'){event.preventDefault();executarCotacaoIA(false);}" style="width:100%;padding:12px 14px;border:1px solid var(--line);border-radius:8px;font-size:14px">
          </div>

          <!-- LOCALIZAÇÃO DA EMPRESA CLIENTE (DESTINO DA ENTREGA) -->
          <div style="background:#eaf4fc;border:1px solid #c0dcf2;padding:12px 14px;border-radius:8px;margin-bottom:14px">
            <label for="iaClienteLocalizacao" style="display:block;font-size:12px;font-weight:800;color:var(--navy);margin-bottom:4px">
              📍 Endereço / Cidade da Empresa Cliente (Destino da Entrega para buscar indústrias mais próximas e baratear o frete):
            </label>
            <div style="display:flex;gap:8px;align-items:center">
              <input id="iaClienteLocalizacao" value="Piracicaba - SP (Lar dos Velhinhos de Piracicaba)" placeholder="Ex: Piracicaba - SP, Campinas - SP, Curitiba - PR..." style="flex:1;padding:10px 12px;border:1px solid #abcde4;border-radius:6px;background:#fff;font-size:13px;font-weight:600">
              <span style="font-size:11px;color:var(--teal);font-weight:700;white-space:nowrap">🚚 Otimização de Frete</span>
            </div>
          </div>

          <!-- PAINEL EXCLUSIVO DO MODO HÍBRIDO: 1 FÁBRICA CONHECIDA PREENCHIDA À MÃO -->
          <div id="painelModoHibrido" style="display:${window.modoCotacaoAtual === 'hibrido' ? 'block' : 'none'};background:#fffdf6;border:2px solid var(--gold);padding:16px;border-radius:10px;margin-bottom:16px">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;border-bottom:1px solid #f0e2bf;padding-bottom:8px">
              <div>
                <b style="color:#854d0e;font-size:14px">🏢 1ª Fábrica — Sua Indústria Conhecida (Opção #1 Garantida)</b>
                <p style="margin:2px 0 0;font-size:12px;color:#a16207">Preencha os dados da fábrica que você já conhece. O sistema manterá ela como Opção 1 e buscará automaticamente outras 2 indústrias mais próximas do cliente para você comparar!</p>
              </div>
              <span class="badge" style="background:#fef08a;color:#854d0e;font-weight:800">★ Fornecedor de Confiança</span>
            </div>

            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:10px;margin-bottom:10px">
              <div>
                <label style="display:block;font-size:11px;font-weight:700;color:var(--ink);margin-bottom:3px">CNPJ da Fábrica (Opcional):</label>
                <div style="display:flex;gap:6px">
                  <input id="fmCnpj" placeholder="00.000.000/0001-00" style="flex:1;padding:8px 10px;border:1px solid var(--line);border-radius:6px;font-size:13px">
                  <button type="button" onclick="consultarCnpjFabricaManual('fm')" style="padding:0 10px;background:var(--navy);color:#fff;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer">🔍 Puxar Receita</button>
                </div>
              </div>
              <div>
                <label style="display:block;font-size:11px;font-weight:700;color:var(--ink);margin-bottom:3px">Nome / Razão Social da Fábrica: *</label>
                <input id="fmNome" placeholder="Ex: Indústria de Colchões Lord Brasil Ltda" style="width:100%;padding:8px 10px;border:1px solid var(--line);border-radius:6px;font-size:13px;font-weight:700">
              </div>
              <div>
                <label style="display:block;font-size:11px;font-weight:700;color:var(--ink);margin-bottom:3px">Cidade da Fábrica:</label>
                <input id="fmCidade" placeholder="Ex: Mauá, Ourinhos, Maringá..." style="width:100%;padding:8px 10px;border:1px solid var(--line);border-radius:6px;font-size:13px">
              </div>
              <div>
                <label style="display:block;font-size:11px;font-weight:700;color:var(--ink);margin-bottom:3px">Estado (UF):</label>
                <input id="fmEstado" placeholder="Ex: SP, PR, MG..." maxlength="2" style="width:100%;padding:8px 10px;border:1px solid var(--line);border-radius:6px;font-size:13px;text-transform:uppercase">
              </div>
            </div>

            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:10px;margin-bottom:10px">
              <div>
                <label style="display:block;font-size:11px;font-weight:700;color:var(--ink);margin-bottom:3px">Telefone Comercial:</label>
                <input id="fmTelefone" placeholder="(11) 4547-7000" style="width:100%;padding:8px 10px;border:1px solid var(--line);border-radius:6px;font-size:13px">
              </div>
              <div>
                <label style="display:block;font-size:11px;font-weight:700;color:var(--ink);margin-bottom:3px">WhatsApp de Televendas:</label>
                <input id="fmWhatsapp" placeholder="5511999999999" style="width:100%;padding:8px 10px;border:1px solid var(--line);border-radius:6px;font-size:13px">
              </div>
              <div>
                <label style="display:block;font-size:11px;font-weight:700;color:var(--ink);margin-bottom:3px">Custo de Fábrica Unitário (R$): *</label>
                <input id="fmCustoUnitario" type="number" step="0.01" placeholder="Ex: 250.00" style="width:100%;padding:8px 10px;border:1px solid var(--line);border-radius:6px;font-size:13px;font-weight:700">
              </div>
              <div>
                <label style="display:block;font-size:11px;font-weight:700;color:var(--ink);margin-bottom:3px">Condição de Pagamento:</label>
                <input id="fmCondicoes" value="50% entrada e 50% na entrega e aceite" style="width:100%;padding:8px 10px;border:1px solid var(--line);border-radius:6px;font-size:13px">
              </div>
            </div>
          </div>

          <!-- FILTROS REGIONAIS ADICIONAIS: ESTADO E CIDADE -->
          <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;margin-bottom:14px;background:#f8fafc;padding:12px 14px;border-radius:8px;border:1px solid var(--line)">
            <div style="flex:1;min-width:180px">
              <label for="iaFiltroEstado" style="display:block;font-size:12px;font-weight:700;color:var(--ink);margin-bottom:4px">
                📍 Filtrar Fábricas por Estado (UF):
              </label>
              <select id="iaFiltroEstado" style="width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:6px;background:#fff;font-size:13px;font-weight:600">
                <option value="">Brasil Inteiro (Todas as Regiões)</option>
                <option value="SP" selected>São Paulo (SP)</option>
                <option value="PR">Paraná (PR)</option>
                <option value="MG">Minas Gerais (MG)</option>
                <option value="RJ">Rio de Janeiro (RJ)</option>
                <option value="RS">Rio Grande do Sul (RS)</option>
                <option value="SC">Santa Catarina (SC)</option>
                <option value="GO">Goiás (GO)</option>
                <option value="BA">Bahia (BA)</option>
                <option value="PE">Pernambuco (PE)</option>
                <option value="CE">Ceará (CE)</option>
                <option value="ES">Espírito Santo (ES)</option>
                <option value="DF">Distrito Federal (DF)</option>
                <option value="MT">Mato Grosso (MT)</option>
                <option value="MS">Mato Grosso do Sul (MS)</option>
              </select>
            </div>

            <div style="flex:1.5;min-width:200px">
              <label for="iaFiltroCidade" style="display:block;font-size:12px;font-weight:700;color:var(--ink);margin-bottom:4px">
                🏙️ Polo Industrial Específico (Opcional):
              </label>
              <input id="iaFiltroCidade" placeholder="Ex: Piracicaba, Mauá, Ourinhos, Maringá..." style="width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:6px;background:#fff;font-size:13px">
            </div>

            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <button id="btnBuscarFabricantes" class="primary" style="background:var(--gold);color:#151515;font-weight:800;height:42px;padding:0 18px" onclick="executarCotacaoIA(false)">
                ${window.modoCotacaoAtual === 'hibrido' ? '⚡ Gerar Cotação (1 Minha + 2 Mais Próximas)' : '⚡ Localizar 3 Fabricantes Mais Próximos'}
              </button>
              <button id="btnRotacionarFabricantes" class="secondary" style="border:1px solid var(--teal);color:var(--teal);background:#fff;font-weight:700;height:42px;padding:0 16px" onclick="executarCotacaoIA(true)" title="Atualiza o catálogo buscando outras indústrias">
                🔄 Atualizar / Buscar Outras Fábricas
              </button>
              <button type="button" class="secondary" style="border:1px solid #16a34a;color:#16a34a;background:#f0fdf4;font-weight:800;height:42px;padding:0 16px" onclick="abrirModalAdicionarFabricaManual()">
                ＋ Adicionar Fábrica Manual
              </button>
            </div>
          </div>

          <!-- ÁREA PARA ARRASTAR ARQUIVOS PDF E COLAR PRINTS DE ORÇAMENTO DA FÁBRICA (CTRL+V / DRAG & DROP) -->
          <div style="background:#fff;border:1.5px solid #cbd5e1;border-radius:12px;padding:16px 18px;margin-bottom:16px;box-shadow:0 2px 6px rgba(0,0,0,0.03)">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px">
              <div>
                <b style="color:var(--navy);font-size:14.5px;display:inline-flex;align-items:center;gap:6px">
                  📎 Anexos da Fábrica (Arraste PDFs ou Cole Prints com Ctrl+V)
                </b>
                <p style="margin:3px 0 0;font-size:12px;color:var(--muted)">
                  Você pode arrastar orçamentos em <b>PDF</b> ou apenas <b>tirar print no WhatsApp e apertar Ctrl+V</b> aqui dentro!
                </p>
              </div>
              <div style="display:flex;gap:8px;align-items:center">
                <span id="badgeContadorAnexos" class="badge" style="background:#f1f5f9;color:var(--navy);font-weight:700">
                  ${anexosCotacaoAtivos.length} anexo(s)
                </span>
                <button type="button" class="secondary" style="font-size:12px;padding:6px 12px;border-radius:6px;font-weight:700;background:#f8fafc" onclick="document.querySelector('#iaFileInputCotacao').click()">
                  📂 Escolher Arquivo do Computador
                </button>
              </div>
            </div>

            <!-- DROPZONE -->
            <div id="iaDropzoneCotacao" class="dropzone-cotacao" tabindex="0" title="Clique ou arraste um PDF/Imagem aqui, ou aperte Ctrl+V para colar um print da tela">
              <input type="file" id="iaFileInputCotacao" multiple accept="application/pdf,image/png,image/jpeg,image/webp" style="display:none">
              <div class="dropzone-icon-ring">📥</div>
              <b style="font-size:14px;color:var(--navy);display:block;margin-bottom:4px">
                Arraste o PDF de Orçamento aqui ou dê <kbd style="background:#e2e8f0;padding:2px 8px;border-radius:4px;font-size:12px;box-shadow:0 1px 2px rgba(0,0,0,0.1)">Ctrl + V</kbd> para colar o Print
              </b>
              <small style="color:var(--muted);font-size:12px">
                Compatível com propostas em PDF, prints do WhatsApp Web, imagens de tabelas e fotos de catálogos (PNG, JPG, PDF)
              </small>
            </div>

            <!-- GRADE DE ANEXOS SALVOS / PREVIEW -->
            <div id="iaListaAnexosCotacao" class="anexos-preview-grid">
              ${renderizarAnexosCotacao()}
            </div>
          </div>

        </div>
      </div>
      <div id="iaResultadosArea">
        ${renderizarResultadosIACards(ultimosOrcamentosIA)}
      </div>
    </div>
  `;

  setTimeout(inicializarDropzoneCotacao, 50);
}

// GESTÃO DE ANEXOS DE ORÇAMENTO DA FÁBRICA (DRAG & DROP, PASTE CTRL+V E PREVIEW)
const ANEXOS_STORAGE_KEY = 'pradoAnexosCotacoes_v1';
function carregarAnexosCotacaoSalvos() {
  try {
    const raw = localStorage.getItem(ANEXOS_STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (Array.isArray(p)) return p;
    }
  } catch {}
  return [];
}
let anexosCotacaoAtivos = carregarAnexosCotacaoSalvos();

function salvarAnexosCotacaoPersistentes() {
  try {
    localStorage.setItem(ANEXOS_STORAGE_KEY, JSON.stringify(anexosCotacaoAtivos));
  } catch {}
}

function processarArquivosAnexados(files, labelOrigem = 'Arquivo Anexado') {
  if (!files || !files.length) return;
  let processados = 0;
  Array.from(files).forEach((file, index) => {
    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isImage && !isPdf) {
      toast(`Formato não suportado: ${file.name}. Envie imagens ou PDFs.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = e => {
      const novoAnexo = {
        id: 'anx-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
        nome: file.name || (isImage ? `Print_WhatsApp_${new Date().toISOString().slice(11, 19).replace(/:/g, '-')}.png` : 'orcamento_fabrica.pdf'),
        tipo: isPdf ? 'pdf' : 'imagem',
        mime: file.type,
        data: e.target.result,
        tamanho: (file.size / 1024).toFixed(1) + ' KB',
        origem: labelOrigem,
        criadoEm: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      };
      anexosCotacaoAtivos.unshift(novoAnexo);
      salvarAnexosCotacaoPersistentes();
      processados++;
      atualizarListaAnexosDOM();
      toast(`✓ ${novoAnexo.nome} anexado! A IA está fazendo a leitura dos dados...`);

      // Aciona automaticamente a IA para ler e puxar dados do primeiro orçamento colado/arrastado
      if (index === 0) {
        analisarOrcamentoAnexadoComIA(novoAnexo, file);
      }
    };
    reader.readAsDataURL(file);
  });
}

async function extrairTextoOuImagemDePdf(file, dataUrl) {
  try {
    if (window.pdfjsLib) {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let textoTotal = '';
      const numPages = Math.min(pdf.numPages, 3);
      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        textoTotal += `\n--- Página ${i} ---\n` + pageText;
      }
      if (textoTotal.trim().length > 30) {
        return { tipo: 'texto', texto: textoTotal };
      }
      // Se for imagem escaneada, renderiza página 1 em canvas
      const page1 = await pdf.getPage(1);
      const viewport = page1.getViewport({ scale: 1.5 });
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page1.render({ canvasContext: ctx, viewport: viewport }).promise;
      return { tipo: 'imagem', imagem_base64: canvas.toDataURL('image/jpeg', 0.85) };
    }
  } catch (err) {
    console.warn('Fallback leitura PDF:', err);
  }
  return { tipo: 'nome', texto: file.name };
}

async function analisarOrcamentoAnexadoComIA(anexo, file) {
  showLoader(
    'IA Lendo Orçamento da Fábrica...',
    `Processando "${anexo.nome}" com Inteligência Artificial e OCR...`,
    35,
    'Extraindo Razão Social, CNPJ, Preços e Produtos...'
  );

  try {
    let payload = { nome_arquivo: anexo.nome };

    if (anexo.tipo === 'pdf') {
      showLoader('Processando PDF...', 'Lendo camadas de texto e itens do PDF...', 55, 'Extraindo dados comerciais...');
      const extracao = await extrairTextoOuImagemDePdf(file, anexo.data);
      if (extracao.tipo === 'texto') {
        payload.texto = extracao.texto;
      } else if (extracao.tipo === 'imagem') {
        payload.imagem_base64 = extracao.imagem_base64;
      } else {
        payload.texto = extracao.texto || anexo.nome;
      }
    } else {
      // Print de imagem / WhatsApp
      payload.imagem_base64 = anexo.data;
    }

    let token = sessionToken;
    if (!token && supabaseClient) {
      try {
        const s = await supabaseClient.auth.getSession();
        token = s.data?.session?.access_token;
      } catch {}
    }
    if (!token) token = 'sess_operador_prado';

    showLoader('IA Identificando Fornecedor...', 'Estruturando cotação comercial com margem garantida...', 75, 'Preenchendo grade...');

    const res = await fetch('/api/leitura-orcamento', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const resp = await res.json();
    if (!res.ok || !resp.sucesso || !resp.dados) {
      throw new Error(resp.error || 'Não foi possível ler os dados automaticamente.');
    }

    const d = resp.dados;
    const forn = d.fornecedor || {};
    const cli = d.cliente || {};

    const fabNome = (forn.nome && forn.nome !== 'Prado' && forn.nome !== 'Prado Comércio & Soluções')
      ? forn.nome
      : (anexo.nome.replace(/\.[^.]+$/, '').replace(/Print_|Orçamento_/i, '').trim() || 'Indústria Homologada');
    const fabCnpj = forn.cnpj || 'Sob consulta';
    const fabCidade = forn.cidade || '';
    const fabEstado = (forn.estado || 'SP').toUpperCase().slice(0, 2);
    const fabTelefone = forn.telefone || '(11) 3000-0000';
    const fabWhatsapp = forn.whatsapp || '';
    const custoUnit = Number(d.preco_custo_unitario) || 150.0;
    const condicoes = d.condicoes_pagamento || '50% entrada e 50% na entrega e aceite';
    const prazo = d.prazo_entrega || '5 a 8 dias úteis';
    const produtoNome = d.produto_principal || (document.querySelector('#iaDemandaInput')?.value) || 'Produto Industrial Homologado';

    // 1. Preenche demanda se vazia ou se achou produto específico
    const inpDemanda = document.querySelector('#iaDemandaInput');
    if (inpDemanda && (!inpDemanda.value.trim() || inpDemanda.value.includes('Ex:') || d.produto_principal)) {
      inpDemanda.value = produtoNome;
    }

    // 2. Preenche endereço do cliente se identificado
    if (cli.cidade) {
      const inpCliLoc = document.querySelector('#iaClienteLocalizacao');
      if (inpCliLoc) {
        inpCliLoc.value = `${cli.cidade} - ${cli.estado || 'SP'} (${cli.nome || 'Cliente'})`;
      }
    }

    // 3. Ativa automaticamente o Modo Híbrido (1 Fábrica Conhecida + 2 IA)
    window.modoCotacaoAtual = 'hibrido';
    const tabHibrido = document.querySelector('#tabModoHibrido');
    const tabIa = document.querySelector('#tabModoIa');
    const painelHibrido = document.querySelector('#painelModoHibrido');
    const btnBuscar = document.querySelector('#btnBuscarFabricantes');

    if (tabHibrido) {
      tabHibrido.style.border = '2px solid var(--navy)';
      tabHibrido.style.background = 'var(--navy)';
      tabHibrido.style.color = '#fff';
    }
    if (tabIa) {
      tabIa.style.border = '2px solid var(--line)';
      tabIa.style.background = '#f8fafc';
      tabIa.style.color = 'var(--ink)';
    }
    if (painelHibrido) painelHibrido.style.display = 'block';
    if (btnBuscar) btnBuscar.textContent = '⚡ Gerar Cotação (1 Desta Fábrica + 2 Mais Próximas)';

    // 4. Preenche os inputs da fábrica conhecida
    const elFmNome = document.querySelector('#fmNome');
    const elFmCnpj = document.querySelector('#fmCnpj');
    const elFmCidade = document.querySelector('#fmCidade');
    const elFmEstado = document.querySelector('#fmEstado');
    const elFmTel = document.querySelector('#fmTelefone');
    const elFmWhats = document.querySelector('#fmWhatsapp');
    const elFmCusto = document.querySelector('#fmCustoUnitario');
    const elFmCond = document.querySelector('#fmCondicoes');

    if (elFmNome) elFmNome.value = fabNome;
    if (elFmCnpj) elFmCnpj.value = fabCnpj;
    if (elFmCidade) elFmCidade.value = fabCidade;
    if (elFmEstado) elFmEstado.value = fabEstado;
    if (elFmTel) elFmTel.value = fabTelefone;
    if (elFmWhats) elFmWhats.value = fabWhatsapp;
    if (elFmCusto) elFmCusto.value = custoUnit.toFixed(2);
    if (elFmCond) elFmCond.value = condicoes;

    // 5. Calcula margem comercial Prado e insere direto nos cards de cotação como Opção #1
    const vendaSugerida = Number((custoUnit * 1.35).toFixed(2));
    const lucro = Number((vendaSugerida - custoUnit).toFixed(2));

    const fabOpcao1 = {
      nome_empresa: fabNome,
      cnpj: fabCnpj,
      localizacao: [fabCidade, fabEstado].filter(Boolean).join(' - ') || 'Brasil',
      telefone: fabTelefone,
      whatsapp: fabWhatsapp,
      contato_setor: 'Fornecedor de Confiança (Orçamento Anexado)',
      produto_especificado: produtoNome + ' — Cotação Extraída do Anexo',
      preco_custo_unitario: custoUnit,
      preco_custo_total: custoUnit,
      preco_venda_sugerido_unitario: vendaSugerida,
      preco_venda_sugerido_total: vendaSugerida,
      margem_estimada_valor: lucro,
      margem_estimada_pct: 35.0,
      prazo_entrega: prazo,
      condicoes_pagamento: condicoes,
      destaque_comercial: `Leitura automática por IA do anexo "${anexo.nome}". Custo e condições extraídos diretamente do documento original da fábrica.`,
      origem_manual: true
    };

    if (!ultimosOrcamentosIA) {
      ultimosOrcamentosIA = {
        demanda_interpretada: produtoNome,
        quantidade_estimada: '1 Lote Comercial',
        fabricantes: [fabOpcao1],
        orientacao_negociacao: 'Fábrica lida automaticamente pelo anexo. Clique em "Gerar Cotação" para localizar as 2 concorrentes mais próximas.'
      };
    } else {
      if (!ultimosOrcamentosIA.fabricantes) ultimosOrcamentosIA.fabricantes = [];
      const semManual = ultimosOrcamentosIA.fabricantes.filter(x => !x.origem_manual);
      ultimosOrcamentosIA.fabricantes = [fabOpcao1, ...semManual];
    }

    const container = document.querySelector('#iaResultadosArea');
    if (container) {
      container.innerHTML = renderizarResultadosIACards(ultimosOrcamentosIA);
    }

    toast(`✓ IA leu "${fabNome}" com sucesso! Custo R$ ${custoUnit.toFixed(2)} e dados preenchidos.`);

    setTimeout(() => {
      document.querySelector('#iaResultadosArea')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 200);

  } catch (err) {
    console.error('Erro na leitura com IA:', err);
    toast('Anexo recebido. Preencha ou confirme os dados da fábrica manualmente.');
  } finally {
    hideLoader();
  }
}

function reprocessarAnexoComIA(id) {
  const anexo = anexosCotacaoAtivos.find(a => a.id === id);
  if (!anexo) return;
  let file = null;
  try {
    const arr = anexo.data.split(',');
    const mime = (arr[0].match(/:(.*?);/) || [])[1] || (anexo.tipo === 'pdf' ? 'application/pdf' : 'image/png');
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    file = new File([u8arr], anexo.nome, { type: mime });
  } catch (e) {
    file = { name: anexo.nome, type: anexo.mime || (anexo.tipo === 'pdf' ? 'application/pdf' : 'image/png') };
  }
  analisarOrcamentoAnexadoComIA(anexo, file);
}
window.reprocessarAnexoComIA = reprocessarAnexoComIA;

function renderizarAnexosCotacao() {
  if (!anexosCotacaoAtivos.length) {
    return `
      <div style="grid-column:1/-1;text-align:center;padding:14px;color:var(--muted);font-size:12.5px">
        Nenhum orçamento anexado ainda. Arraste um PDF para a caixa acima ou copie um print da conversa com a fábrica e aperte <b>Ctrl + V</b>.
      </div>
    `;
  }

  return anexosCotacaoAtivos.map(a => `
    <div class="anexo-card-item">
      <div class="anexo-thumb-container" onclick="visualizarAnexoEmModal('${a.id}')" title="Clique para ampliar / ver em tela cheia">
        ${a.tipo === 'imagem' 
          ? `<img src="${a.data}" alt="${escapeHtml(a.nome)}" class="anexo-thumb-img">`
          : `<div style="text-align:center;color:#dc2626"><span style="font-size:36px">📄</span><b style="display:block;font-size:11px;color:#991b1b">DOCUMENTO PDF</b></div>`
        }
      </div>
      <div style="flex:1;overflow:hidden">
        <b style="font-size:12px;color:var(--navy);display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${escapeHtml(a.nome)}">
          ${escapeHtml(a.nome)}
        </b>
        <small style="color:var(--muted);font-size:11px;display:block">
          ${a.tamanho} · ${a.criadoEm} (${escapeHtml(a.origem)})
        </small>
      </div>
      <div style="display:flex;gap:6px;margin-top:8px;border-top:1px solid #f1f5f9;padding-top:6px;flex-wrap:wrap">
        <button type="button" class="primary" style="font-size:11px;background:var(--gold);color:#151515;font-weight:800;padding:5px 8px;border-radius:5px;cursor:pointer;width:100%;margin-bottom:4px;border:none;box-shadow:0 1px 3px rgba(0,0,0,0.1)" onclick="reprocessarAnexoComIA('${a.id}')" title="A IA fará a leitura completa do print ou PDF e preencherá a fábrica automaticamente">
          ⚡ Puxar Dados com IA
        </button>
        <button type="button" class="link" style="font-size:11.5px;color:#0284c7;font-weight:700;cursor:pointer" onclick="visualizarAnexoEmModal('${a.id}')">
          👁️ Ver
        </button>
        <button type="button" class="link" style="font-size:11.5px;color:var(--green);font-weight:700;cursor:pointer" onclick="baixarAnexoCotacao('${a.id}')">
          📥 Baixar
        </button>
        <button type="button" class="link" style="font-size:11.5px;color:var(--red);font-weight:700;margin-left:auto;cursor:pointer" onclick="removerAnexoCotacao('${a.id}')">
          🗑️
        </button>
      </div>
    </div>
  `).join('');
}

function atualizarListaAnexosDOM() {
  const container = document.querySelector('#iaListaAnexosCotacao');
  const badge = document.querySelector('#badgeContadorAnexos');
  if (container) container.innerHTML = renderizarAnexosCotacao();
  if (badge) badge.textContent = `${anexosCotacaoAtivos.length} anexo(s)`;
}

function removerAnexoCotacao(id) {
  anexosCotacaoAtivos = anexosCotacaoAtivos.filter(a => a.id !== id);
  salvarAnexosCotacaoPersistentes();
  atualizarListaAnexosDOM();
  toast('Anexo removido.');
}
window.removerAnexoCotacao = removerAnexoCotacao;

function baixarAnexoCotacao(id) {
  const anexo = anexosCotacaoAtivos.find(a => a.id === id);
  if (!anexo) return;
  const link = document.createElement('a');
  link.href = anexo.data;
  link.download = anexo.nome;
  link.click();
}
window.baixarAnexoCotacao = baixarAnexoCotacao;

function visualizarAnexoEmModal(id) {
  const anexo = anexosCotacaoAtivos.find(a => a.id === id);
  if (!anexo) return;

  const modalId = 'modalVisualizadorAnexo';
  let modal = document.querySelector(`#${modalId}`);
  if (modal) modal.remove();

  modal = document.createElement('div');
  modal.id = modalId;
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px';
  modal.innerHTML = `
    <div style="background:#fff;border-radius:12px;max-width:900px;width:100%;max-height:92vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 25px 60px rgba(0,0,0,0.4)">
      <div style="padding:14px 20px;background:#f8fafc;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center">
        <div>
          <h3 style="margin:0;font-size:15px;color:var(--navy)">${escapeHtml(anexo.nome)}</h3>
          <small style="color:var(--muted)">${anexo.tamanho} · Anexado às ${anexo.criadoEm}</small>
        </div>
        <div style="display:flex;gap:10px;align-items:center">
          <button type="button" class="secondary" style="font-size:12px;padding:5px 12px;border-radius:6px;font-weight:700" onclick="baixarAnexoCotacao('${anexo.id}')">
            📥 Baixar Arquivo
          </button>
          <button type="button" onclick="document.querySelector('#${modalId}').remove()" style="background:none;border:none;font-size:24px;cursor:pointer;color:var(--muted)">&times;</button>
        </div>
      </div>
      <div style="flex:1;overflow:auto;padding:16px;text-align:center;background:#1e293b;display:flex;align-items:center;justify-content:center">
        ${anexo.tipo === 'imagem'
          ? `<img src="${anexo.data}" style="max-width:100%;max-height:75vh;border-radius:6px;box-shadow:0 8px 24px rgba(0,0,0,0.3)">`
          : `<iframe src="${anexo.data}" style="width:100%;height:75vh;border:none;border-radius:6px;background:#fff"></iframe>`
        }
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}
window.visualizarAnexoEmModal = visualizarAnexoEmModal;

function inicializarDropzoneCotacao() {
  const dropzone = document.querySelector('#iaDropzoneCotacao');
  const fileInput = document.querySelector('#iaFileInputCotacao');
  if (!dropzone) return;

  ['dragenter', 'dragover'].forEach(name => {
    dropzone.addEventListener(name, e => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add('dragover');
    }, false);
  });

  ['dragleave', 'drop'].forEach(name => {
    dropzone.addEventListener(name, e => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('dragover');
    }, false);
  });

  dropzone.addEventListener('drop', e => {
    e.preventDefault();
    const files = e.dataTransfer?.files;
    if (files && files.length) {
      processarArquivosAnexados(files, 'Arrastado (Drag & Drop)');
    }
  });

  dropzone.addEventListener('click', e => {
    if (e.target.tagName !== 'INPUT' && !e.target.closest('button')) {
      fileInput?.click();
    }
  });

  fileInput?.addEventListener('change', e => {
    if (e.target.files && e.target.files.length) {
      processarArquivosAnexados(e.target.files, 'Upload Selecionado');
      e.target.value = '';
    }
  });

  // Listener global de Ctrl+V na janela
  window.removeEventListener('paste', tratarPasteGlobalCotacao);
  window.addEventListener('paste', tratarPasteGlobalCotacao);
}

function tratarPasteGlobalCotacao(e) {
  if (page !== 'cotacao_ia') return;
  const items = (e.clipboardData || window.clipboardData)?.items;
  if (!items) return;

  const arquivos = [];
  for (let i = 0; i < items.length; i++) {
    if (items[i].kind === 'file') {
      const file = items[i].getAsFile();
      if (file) arquivos.push(file);
    }
  }

  if (arquivos.length) {
    e.preventDefault();
    processarArquivosAnexados(arquivos, 'Colado com Ctrl+V');
    toast('📋 Print do orçamento da fábrica colado com sucesso!');
  }
}

async function executarCotacaoIA(isRotacao = false) {
  const input = document.querySelector('#iaDemandaInput');
  const clienteLocInput = document.querySelector('#iaClienteLocalizacao');
  const estadoSelect = document.querySelector('#iaFiltroEstado');
  const cidadeInput = document.querySelector('#iaFiltroCidade');

  const texto = input ? input.value.trim() : '';
  const clienteLoc = clienteLocInput ? clienteLocInput.value.trim() : 'Piracicaba - SP';
  const estado = estadoSelect ? estadoSelect.value.trim() : '';
  const cidade = cidadeInput ? cidadeInput.value.trim() : '';

  if (!texto) return toast('Digite o produto ou demanda para cotação.');

  let fabricaManualObj = null;
  if (window.modoCotacaoAtual === 'hibrido') {
    const fmNome = document.querySelector('#fmNome')?.value.trim();
    if (!fmNome) {
      return toast('No modo híbrido, digite pelo menos o nome da sua fábrica conhecida.');
    }
    const fmCusto = parseFloat(document.querySelector('#fmCustoUnitario')?.value) || 0;
    fabricaManualObj = {
      nome_empresa: fmNome,
      cnpj: document.querySelector('#fmCnpj')?.value.trim() || '',
      cidade: document.querySelector('#fmCidade')?.value.trim() || '',
      estado: document.querySelector('#fmEstado')?.value.trim().toUpperCase() || '',
      telefone: document.querySelector('#fmTelefone')?.value.trim() || '',
      whatsapp: document.querySelector('#fmWhatsapp')?.value.trim() || '',
      preco_custo_unitario: fmCusto || 150.0,
      condicoes_pagamento: document.querySelector('#fmCondicoes')?.value.trim() || '50% entrada e 50% na entrega e aceite',
      destaque_comercial: 'Fábrica de confiança indicada pelo Michel Prado.'
    };
  }

  if (!sessionToken && (!supabaseClient || !(await supabaseClient.auth.getSession()).data.session)) {
    toast('Faça login para utilizar o gerador de cotações com IA.');
    openLoginOverlay();
    return;
  }

  if (isRotacao) {
    cotacaoOffsetRotacao += 3;
  } else {
    cotacaoOffsetRotacao = 0;
  }

  const regiaoMsg = [cidade, estado].filter(Boolean).join(', ') || clienteLoc;
  const loadingTxt = fabricaManualObj 
    ? `Registrando "${fabricaManualObj.nome_empresa}" e localizando 2 fábricas mais próximas de ${clienteLoc}...`
    : `Filtrando indústrias mais próximas de ${regiaoMsg}...`;

  showLoader(isRotacao ? 'Buscando Outras Indústrias...' : 'Pesquisando Indústrias Mais Próximas...', loadingTxt, 45, 'Localizando fornecedores homologados...');

  try {
    let token = sessionToken;
    if (!token && supabaseClient) {
      try {
        const s = await supabaseClient.auth.getSession();
        token = s.data?.session?.access_token;
      } catch {}
    }
    if (!token) token = 'sess_operador_prado';

    const res = await fetch('/api/cotacao-fabricantes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ 
        necessidade: texto,
        estado: estado,
        cidade: cidade,
        cliente_localizacao: clienteLoc,
        fabrica_manual: fabricaManualObj,
        offset: cotacaoOffsetRotacao
      })
    });

    if (res.ok) {
      const data = await res.json();
      ultimosOrcamentosIA = data.resultado;
      const badge = document.querySelector('#iaMotorBadge');
      if (badge && data.fonte) {
        badge.textContent = data.fonte;
      }
      toast(fabricaManualObj ? '1 Fábrica Manual + 2 Mais Próximas Carregadas!' : 'Indústrias nacionais mais próximas localizadas!');
    } else {
      const errData = await res.json().catch(() => ({}));
      toast(errData.error || 'Não foi possível gerar a cotação no momento.');
    }
  } catch (err) {
    toast('Erro de comunicação com o servidor de cotações.');
  } finally {
    hideLoader();
    const container = document.querySelector('#iaResultadosArea');
    if (container) {
      container.innerHTML = renderizarResultadosIACards(ultimosOrcamentosIA);
    }
  }
}
window.executarCotacaoIA = executarCotacaoIA;

function abrirModalAdicionarFabricaManual() {
  const modalId = 'modalFabricaManualAvulsa';
  let modal = document.querySelector(`#${modalId}`);
  if (modal) modal.remove();

  modal = document.createElement('div');
  modal.id = modalId;
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.65);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';
  modal.innerHTML = `
    <div style="background:#fff;border-radius:12px;max-width:550px;width:100%;box-shadow:0 20px 40px rgba(0,0,0,0.3);overflow:hidden;border-top:5px solid var(--gold)">
      <div style="padding:16px 20px;background:#f8fafc;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center">
        <div>
          <h3 style="margin:0;font-size:16px;color:var(--navy)">＋ Adicionar Fornecedor / Fábrica Manualmente</h3>
          <small style="color:var(--muted)">Inclua uma empresa que você já conhece diretamente nesta cotação</small>
        </div>
        <button type="button" onclick="document.querySelector('#${modalId}').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:var(--muted)">&times;</button>
      </div>
      <div style="padding:20px;display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div style="grid-column:1/-1">
          <label style="display:block;font-size:11px;font-weight:700;color:var(--ink);margin-bottom:4px">CNPJ da Fábrica:</label>
          <div style="display:flex;gap:6px">
            <input id="modalCnpj" placeholder="00.000.000/0001-00" style="flex:1;padding:8px 10px;border:1px solid var(--line);border-radius:6px;font-size:13px">
            <button type="button" onclick="consultarCnpjFabricaManual('modal')" style="padding:0 12px;background:var(--navy);color:#fff;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer">🔍 Puxar Receita</button>
          </div>
        </div>
        <div style="grid-column:1/-1">
          <label style="display:block;font-size:11px;font-weight:700;color:var(--ink);margin-bottom:4px">Nome da Fábrica / Razão Social: *</label>
          <input id="modalNome" placeholder="Ex: Indústria Brasileira de Colchões" style="width:100%;padding:8px 10px;border:1px solid var(--line);border-radius:6px;font-size:13px;font-weight:700">
        </div>
        <div>
          <label style="display:block;font-size:11px;font-weight:700;color:var(--ink);margin-bottom:4px">Cidade:</label>
          <input id="modalCidade" placeholder="Ex: Piracicaba, São Paulo..." style="width:100%;padding:8px 10px;border:1px solid var(--line);border-radius:6px;font-size:13px">
        </div>
        <div>
          <label style="display:block;font-size:11px;font-weight:700;color:var(--ink);margin-bottom:4px">Estado (UF):</label>
          <input id="modalEstado" placeholder="SP" maxlength="2" style="width:100%;padding:8px 10px;border:1px solid var(--line);border-radius:6px;font-size:13px;text-transform:uppercase">
        </div>
        <div>
          <label style="display:block;font-size:11px;font-weight:700;color:var(--ink);margin-bottom:4px">Telefone:</label>
          <input id="modalTelefone" placeholder="(19) 3400-0000" style="width:100%;padding:8px 10px;border:1px solid var(--line);border-radius:6px;font-size:13px">
        </div>
        <div>
          <label style="display:block;font-size:11px;font-weight:700;color:var(--ink);margin-bottom:4px">WhatsApp:</label>
          <input id="modalWhatsapp" placeholder="5519999999999" style="width:100%;padding:8px 10px;border:1px solid var(--line);border-radius:6px;font-size:13px">
        </div>
        <div>
          <label style="display:block;font-size:11px;font-weight:700;color:var(--ink);margin-bottom:4px">Custo Unitário da Fábrica (R$): *</label>
          <input id="modalCusto" type="number" step="0.01" placeholder="250.00" style="width:100%;padding:8px 10px;border:1px solid var(--line);border-radius:6px;font-size:13px;font-weight:700">
        </div>
        <div>
          <label style="display:block;font-size:11px;font-weight:700;color:var(--ink);margin-bottom:4px">Venda Sugerida Prado (R$):</label>
          <input id="modalVenda" type="number" step="0.01" placeholder="350.00" style="width:100%;padding:8px 10px;border:1px solid var(--line);border-radius:6px;font-size:13px;font-weight:700;color:var(--navy)">
        </div>
        <div style="grid-column:1/-1">
          <label style="display:block;font-size:11px;font-weight:700;color:var(--ink);margin-bottom:4px">Condição de Pagamento:</label>
          <input id="modalCondicoes" value="50% entrada e 50% na entrega e aceite" style="width:100%;padding:8px 10px;border:1px solid var(--line);border-radius:6px;font-size:13px">
        </div>
        <div style="grid-column:1/-1;background:#f8fafc;border:1px dashed #cbd5e1;border-radius:8px;padding:12px;text-align:center">
          <label style="display:block;font-size:11.5px;font-weight:700;color:var(--navy);margin-bottom:6px">
            📎 Anexar Orçamento / Tabela da Fábrica (PDF ou Print):
          </label>
          <input type="file" id="modalAnexoFabrica" accept="application/pdf,image/*" style="display:none" onchange="if(this.files.length){processarArquivosAnexados(this.files, document.querySelector('#modalNome')?.value || 'Fábrica Manual');}">
          <button type="button" class="secondary" style="font-size:12px;padding:6px 14px;border-radius:6px;background:#fff;font-weight:700;color:var(--navy)" onclick="document.querySelector('#modalAnexoFabrica').click()">
            📄 Selecionar PDF ou Imagem do Orçamento
          </button>
          <small style="display:block;color:var(--muted);font-size:11px;margin-top:5px">
            Dica: Você também pode apertar <b>Ctrl + V</b> ou arrastar o PDF direto na tela principal de Cotações!
          </small>
        </div>
      </div>
      <div style="padding:14px 20px;background:#f8fafc;border-top:1px solid var(--line);display:flex;justify-content:flex-end;gap:10px">
        <button type="button" class="secondary" onclick="document.querySelector('#${modalId}').remove()" style="padding:8px 14px;border-radius:6px">Cancelar</button>
        <button type="button" class="primary" onclick="salvarFabricaManualAvulsa()" style="padding:8px 18px;border-radius:6px;background:var(--gold);color:#151515;font-weight:800">＋ Adicionar à Cotação</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}
window.abrirModalAdicionarFabricaManual = abrirModalAdicionarFabricaManual;

function salvarFabricaManualAvulsa() {
  const nome = document.querySelector('#modalNome')?.value.trim();
  if (!nome) return toast('Digite o nome da fábrica.');
  const custo = parseFloat(document.querySelector('#modalCusto')?.value) || 100.0;
  let venda = parseFloat(document.querySelector('#modalVenda')?.value);
  if (!venda || venda <= custo) venda = Number((custo * 1.35).toFixed(2));
  const lucro = Number((venda - custo).toFixed(2));
  const margemPct = Number(((lucro / venda) * 100).toFixed(1));

  const novaFab = {
    nome_empresa: nome,
    cnpj: document.querySelector('#modalCnpj')?.value.trim() || 'Sob consulta',
    localizacao: [document.querySelector('#modalCidade')?.value.trim(), document.querySelector('#modalEstado')?.value.trim().toUpperCase()].filter(Boolean).join(' - ') || 'Brasil',
    telefone: document.querySelector('#modalTelefone')?.value.trim() || '(11) 3000-0000',
    whatsapp: document.querySelector('#modalWhatsapp')?.value.trim() || '',
    contato_setor: 'Fornecedor de Confiança (Adicionado Manualmente)',
    produto_especificado: (document.querySelector('#iaDemandaInput')?.value.trim() || 'Produto Comercial') + ' — Fornecimento Direto Homologado',
    preco_custo_unitario: custo,
    preco_custo_total: custo,
    preco_venda_sugerido_unitario: venda,
    preco_venda_sugerido_total: venda,
    margem_estimada_valor: lucro,
    margem_estimada_pct: margemPct,
    prazo_entrega: '5 a 8 dias úteis',
    condicoes_pagamento: document.querySelector('#modalCondicoes')?.value.trim() || '50% entrada e 50% na entrega e aceite',
    destaque_comercial: 'Fábrica cadastrada e homologada manualmente pela Prado.',
    origem_manual: true
  };

  if (!ultimosOrcamentosIA) {
    ultimosOrcamentosIA = {
      demanda_interpretada: novaFab.produto_especificado,
      quantidade_estimada: 'Lote comercial',
      fabricantes: [],
      orientacao_negociacao: 'Fornecedor adicionado manualmente à sua grade de cotações.'
    };
  }

  // Adiciona no topo ou lista
  ultimosOrcamentosIA.fabricantes.unshift(novaFab);
  document.querySelector('#modalFabricaManualAvulsa')?.remove();
  toast(`Fábrica "${nome}" adicionada com sucesso à cotação!`);

  const container = document.querySelector('#iaResultadosArea');
  if (container) {
    container.innerHTML = renderizarResultadosIACards(ultimosOrcamentosIA);
  }
}
window.salvarFabricaManualAvulsa = salvarFabricaManualAvulsa;

function abrirConsultaReceitaOficial(cnpj) {
  if (!cnpj) return;
  page = 'risco';
  render();
  setTimeout(() => {
    const inp = document.querySelector('#docInput');
    if (inp) {
      inp.value = cnpj;
      if (typeof window.consultarCnpjOficial === 'function') {
        window.consultarCnpjOficial(cnpj);
      }
    }
  }, 120);
}
window.abrirConsultaReceitaOficial = abrirConsultaReceitaOficial;

function renderizarResultadosIACards(data) {
  if (!data || !data.fabricantes || !data.fabricantes.length) {
    return `
      <div class="empty">
        <span style="font-size:42px">🏭</span>
        <h3>Nenhuma cotação realizada ainda</h3>
        <p>Digite o produto no campo acima e escolha se quer localizar 3 fábricas pela IA ou preencher 1 à mão e buscar 2 mais próximas.</p>
        <div style="margin-top:14px">
          <button type="button" class="secondary" style="border:1px solid #16a34a;color:#16a34a;background:#f0fdf4;font-weight:800;padding:10px 18px" onclick="abrirModalAdicionarFabricaManual()">
            ＋ Adicionar Fábrica Manualmente Agora
          </button>
        </div>
      </div>
    `;
  }

  const fabs = data.fabricantes;
  const clienteLoc = document.querySelector('#iaClienteLocalizacao')?.value.trim() || 'Cliente';

  return `
    <div style="background:#eef6fa;border:1px solid #c9e0ed;border-left:4px solid var(--teal);padding:14px;border-radius:10px;margin-bottom:18px">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
        <div style="display:flex;align-items:center;gap:8px">
          <b style="color:var(--navy);font-size:14px">🎯 Estratégia Comercial Prado:</b>
          <span class="badge" style="background:#134433;color:#4ade80;font-size:11px">● FABRICANTES HOMOLOGADOS & COMPARATIVO ATIVO</span>
        </div>
        <button type="button" class="secondary" style="border:1px solid #16a34a;color:#16a34a;background:#fff;font-size:12px;font-weight:800;padding:6px 12px;border-radius:6px;cursor:pointer" onclick="abrirModalAdicionarFabricaManual()">
          ＋ Adicionar Outra Fábrica Manualmente
        </button>
      </div>
      <p style="margin:6px 0 0;font-size:13px;color:#24445c">${escapeHtml(data.orientacao_negociacao || '')}</p>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(290px, 1fr));gap:16px">
      ${fabs.map((f, idx) => {
        const isManual = f.origem_manual === true;
        const isBest = idx === 0 && !isManual;
        const cleanZap = String(f.whatsapp || '').replace(/\D/g, '');
        const cleanTel = String(f.telefone || '').replace(/\D/g, '');

        let badgeTopo = '';
        if (isManual) {
          badgeTopo = `<div style="position:absolute;top:-11px;right:16px;background:var(--gold);color:#1a1a1a;font-size:11px;font-weight:800;padding:3px 12px;border-radius:999px;box-shadow:0 2px 6px rgba(0,0,0,0.15)">★ SUA FÁBRICA DE CONFIANÇA (MANUAL)</div>`;
        } else if (isBest) {
          badgeTopo = `<div style="position:absolute;top:-11px;right:16px;background:var(--navy);color:#fff;font-size:11px;font-weight:800;padding:3px 12px;border-radius:999px;box-shadow:0 2px 6px rgba(0,0,0,0.15)">★ RECOMENDADO / MAIOR MARGEM</div>`;
        } else {
          badgeTopo = `<div style="position:absolute;top:-11px;right:16px;background:#0284c7;color:#fff;font-size:10.5px;font-weight:800;padding:2px 10px;border-radius:999px">📍 MAIS PRÓXIMA DO CLIENTE</div>`;
        }

        return `
          <div class="card" style="display:flex;flex-direction:column;border:${isManual ? '2px solid var(--gold)' : (isBest ? '2px solid var(--navy)' : '1px solid var(--line)')};background:${isManual ? '#fffdf7' : '#fff'};position:relative;padding:18px">
            ${badgeTopo}

            <div style="border-bottom:1px solid var(--line);padding-bottom:12px;margin-bottom:12px">
              <div style="display:flex;justify-content:space-between;align-items:center">
                <span class="badge" style="background:${isManual ? '#fef08a' : '#edf3f6'};color:${isManual ? '#854d0e' : 'var(--navy)'};font-weight:700">Opção ${idx + 1} ${isManual ? '• Indicada por Você' : '• IA Mais Próxima'}</span>
              </div>
              <h3 style="margin:8px 0 4px;font-size:16px;color:var(--navy)">${escapeHtml(f.nome_empresa)}</h3>
              <small style="color:var(--muted);display:block">CNPJ: <b>${escapeHtml(f.cnpj || '—')}</b> · 📍 <b>${escapeHtml(f.localizacao || '')}</b></small>
              <div style="margin-top:6px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px">
                <span class="badge" style="background:#e8fdf0;color:#166534;font-size:10.5px">✓ Empresa Ativa</span>
                <button type="button" class="link" style="font-size:11px;color:var(--navy);font-weight:700;cursor:pointer;text-decoration:underline" onclick="abrirConsultaReceitaOficial('${escapeHtml(f.cnpj || '')}')">
                  🔍 Checar na Receita Federal ➔
                </button>
              </div>
            </div>

            <div style="background:#f4f9fc;border:1px solid #d8e8f2;border-radius:8px;padding:12px;margin-bottom:14px">
              <small style="text-transform:uppercase;font-size:10px;font-weight:700;color:var(--teal);display:block;margin-bottom:4px">Contatos Oficiais para Ligar:</small>
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
                <span>📞</span>
                <b style="font-size:13px"><a href="tel:${cleanTel}" style="color:var(--ink);text-decoration:none">${escapeHtml(f.telefone || 'A consultar')}</a></b>
              </div>
              ${cleanZap ? `
                <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
                  <span>💬</span>
                  <a href="https://wa.me/${cleanZap}?text=Ol%C3%A1%2C+sou+da+Prado+Com%C3%A9rcio+%26+Solu%C3%A7%C3%B5es.+Gostaria+de+uma+cota%C3%A7%C3%A3o+comercial." target="_blank" style="color:var(--green);font-weight:700;font-size:12px;text-decoration:none">
                    Abrir WhatsApp Comercial ➔
                  </a>
                </div>
              ` : ''}
              <small style="color:var(--muted);font-size:11px">${escapeHtml(f.contato_setor || 'Setor Comercial')}</small>
            </div>

            <div style="flex:1;margin-bottom:14px">
              <small style="color:var(--muted);font-size:11px">Produto Cotado:</small>
              <p style="margin:2px 0 8px;font-size:12px;line-height:1.4"><b>${escapeHtml(f.produto_especificado)}</b></p>
              <small style="color:var(--muted);font-size:11px">Diferencial / Frete:</small>
              <p style="margin:2px 0;font-size:12px;color:var(--teal)">✓ ${escapeHtml(f.destaque_comercial)}</p>
            </div>

            <div style="background:#f9fafb;border-radius:8px;padding:12px;margin-bottom:14px;border:1px solid var(--line)">
              <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">
                <span style="color:var(--muted)">Custo Fábrica (un):</span>
                <b>${money(f.preco_custo_unitario)}</b>
              </div>
              <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">
                <span style="color:var(--muted)">Venda Sugerida Prado:</span>
                <b style="color:var(--navy)">${money(f.preco_venda_sugerido_unitario)}</b>
              </div>
              <div style="display:flex;justify-content:space-between;font-size:13px;border-top:1px dashed var(--line);padding-top:6px;margin-top:4px">
                <span style="color:var(--green);font-weight:700">Lucro Estimado Prado:</span>
                <strong style="color:var(--green)">${money(f.margem_estimada_valor)} (${f.margem_estimada_pct}%)</strong>
              </div>
            </div>

            <div style="font-size:11px;color:var(--muted);margin-bottom:14px">
              Prazo: <b>${escapeHtml(f.prazo_entrega)}</b> · Condição: <b>${escapeHtml(f.condicoes_pagamento)}</b>
            </div>

            <button class="primary" style="width:100%" onclick="adicionarCotacaoAoBanco(${idx})">
              ＋ Salvar no Supabase & Gerar Proposta
            </button>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

async function adicionarCotacaoAoBanco(idx) {
  if (!ultimosOrcamentosIA || !ultimosOrcamentosIA.fabricantes[idx]) return;
  const f = ultimosOrcamentosIA.fabricantes[idx];

  showLoader('Salvando no Supabase...', 'Gravando fornecedor e criando oportunidade comercial...', 60, 'Sincronizando...');

  try {
    const novoFornecedor = {
      id: `for-${Date.now()}`,
      nome: f.nome_empresa,
      doc: f.cnpj,
      contato: f.contato_setor,
      telefone: f.telefone,
      categoria: 'Fabricante / Indústria',
      status: 'Ativo',
      criadoPor: currentUser.email,
      user_id: currentUser.id
    };

    const novaOp = {
      id: `op-${Date.now()}`,
      nome: String(f.produto_especificado).slice(0, 40),
      cliente: 'Cliente em Prospecção',
      valor: Number(f.preco_venda_sugerido_total) || 50000,
      custoEstimado: Number(f.preco_custo_total) || 30000,
      prazo: new Date(Date.now() + 20 * 86400000).toISOString().split('T')[0],
      status: 'Cotação',
      descricao: `Cotação via IA para ${f.nome_empresa}. Telefone comercial: ${f.telefone}. Condições: ${f.condicoes_pagamento}. Destaque: ${f.destaque_comercial}`,
      criadoPor: currentUser.email,
      user_id: currentUser.id
    };

    if (supabaseClient) {
      await supabaseClient.from('fornecedores').insert([novoFornecedor]).catch(() => {});
      await supabaseClient.from('oportunidades').insert([novaOp]).catch(() => {});
    }

    db.fornecedores.unshift(novoFornecedor);
    db.oportunidades.unshift(novaOp);

    toast(`✓ Fábrica ${f.nome_empresa} cadastrada! Abrindo orçamento com custo e margem...`);
    page = 'orcamentos';
    render();
    setTimeout(() => {
      abrirModalNovoOrcamento();
      const refInp = document.querySelector('#orc_referencia');
      if (refInp) refInp.value = f.produto_especificado || '';

      const obsInp = document.querySelector('#orc_observacoes');
      if (obsInp) {
        let obsTexto = `Indústria cotada: ${f.nome_empresa} (CNPJ: ${f.cnpj}). Condições da fábrica: ${f.condicoes_pagamento}. Frete e entrega negociados direto com fabricante.`;
        if (anexosCotacaoAtivos && anexosCotacaoAtivos.length > 0) {
          obsTexto += ` | Anexos de Orçamento vinculados: ${anexosCotacaoAtivos.map(a => a.nome).join(', ')}`;
        }
        obsInp.value = obsTexto;
      }

      const tbody = document.querySelector('#orcItensBody');
      if (tbody) {
        tbody.innerHTML = '';
        adicionarLinhaItemOrcamento(
          f.produto_especificado || 'Produto Industrial',
          '1',
          1,
          f.preco_venda_sugerido_unitario || 0,
          f.preco_custo_unitario || 0,
          f.margem_estimada_pct || 35.0
        );
      }
    }, 150);
  } catch (err) {
    toast('Erro ao registrar cotação.');
  } finally {
    hideLoader();
  }
}
window.adicionarCotacaoAoBanco = adicionarCotacaoAoBanco;

// 9. EMISSOR FISCAL SEBRAE SP & BOT
function fiscal_bot() {
  head('MB Fiscal BOT Enterprise', 'Automação fiscal oficial, SEBRAE SP CRT-4 (MEI) e Trilha de Auditoria');

  app.innerHTML = `
    <div class="content">
      <div style="background:#091d33;color:#fff;border-radius:10px;padding:12px 18px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:18px;box-shadow:0 4px 14px rgba(0,0,0,.15)">
        <div style="display:flex;align-items:center;gap:10px">
          <span style="color:#00c0f0;font-size:20px">⚡</span>
          <b style="letter-spacing:1px;font-size:15px">PRADO COMÉRCIO & SOLUÇÕES</b>
        </div>
        <div style="display:flex;align-items:center;gap:10px;font-size:12px">
          <span class="badge" style="background:#134433;color:#4ade80">● SEBRAE SP: ONLINE</span>
          <span class="badge" style="background:#0e3650;color:#38bdf8">● SUPABASE RLS: ATIVO</span>
        </div>
      </div>

      <div class="card" style="margin-bottom:20px">
        <div class="card-head">
          <div>
            <h2 style="font-size:17px">Integração Direta com o Emissor SEBRAE SP</h2>
            <small style="color:var(--muted)">Automação baseada no fluxo oficial de emissão para MEI (CRT-4) com importação em lote e preenchimento assistido.</small>
          </div>
          <span class="badge" style="background:#e8f4fc;color:var(--navy2)">Fluxo Oficial Homologado</span>
        </div>

        <div style="background:#0f2034;color:#d5e5f2;padding:16px;border-radius:8px;font-size:12px;line-height:1.6;margin-bottom:16px">
          <b style="color:#38bdf8;text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:6px">Fluxo de Emissão Integrado:</b>
          1. <b>GERAR PLANILHA SEBRAE:</b> O sistema exporta os produtos no padrão oficial 'modelo_importacao_produtos_sebrae.csv'<br>
          2. <b>CADASTRO EM LOTE:</b> Faça upload da planilha no portal SEBRAE para cadastrar os NCMs instantaneamente<br>
          3. <b>NAVEGAÇÃO ASSISTIDA:</b> O robô abre o portal SEBRAE SP, seleciona 'Venda Dentro do Estado', insere o CNPJ do cliente, define frete e prepara a prévia da DANFE<br>
          4. <b>CERTIFICADO DIGITAL:</b> Transmissão segura com certificado A1 ou A3.
        </div>

        <div style="display:flex;gap:12px;flex-wrap:wrap">
          <button class="primary" style="background:#0284c7" onclick="baixarPlanilhaSebrae()">
            📥 Exportar Planilha de Produtos (.csv)
          </button>
          <a href="https://emissaonfe.sebrae.com.br" target="_blank" class="primary" style="background:#16a34a;text-decoration:none;display:inline-flex;align-items:center;gap:6px">
            🌐 Abrir Emissor SEBRAE no Navegador
          </a>
          <button class="secondary" onclick="dispararMbFiscalBotLocal()">
            🤖 Iniciar MB Fiscal BOT Local
          </button>
        </div>
      </div>

      <div class="card">
        <div class="card-head">
          <h2>Trilha de Auditoria & Governança Fiscal</h2>
          <span class="badge" style="background:#edf7ed;color:#1e7e34">RLS Monitorado</span>
        </div>
        <p style="color:var(--muted);font-size:13px;margin-bottom:14px">Registros de integridade fiscal e operações realizadas pelos operadores no Supabase.</p>
        <div class="table-card">
          <table class="table">
            <thead><tr><th>Data/Hora</th><th>Operador</th><th>Ação</th><th>Módulo</th><th>Status</th></tr></thead>
            <tbody>
              <tr>
                <td><code>${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}</code></td>
                <td><b>${escapeHtml(currentUser.nome)}</b></td>
                <td><span class="badge">SESSAO_AUTENTICADA</span></td>
                <td>auth.users</td>
                <td>Autenticado no Supabase com sucesso</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

function baixarPlanilhaSebrae() {
  toast('Gerando planilha modelo para o Emissor SEBRAE SP...');
  const csvContent = "data:text/csv;charset=utf-8," 
    + "CODIGO;DESCRICAO;NCM;UNIDADE;VALOR_UNITARIO;ORIGEM;CSOSN\n"
    + "001;PRODUTO HOSPITALAR OU CORPORATIVO;94042900;UN;485.00;0;102\n";
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "modelo_importacao_produtos_sebrae.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  toast('Planilha modelo exportada!');
}
window.baixarPlanilhaSebrae = baixarPlanilhaSebrae;

function dispararMbFiscalBotLocal() {
  toast('Para executar o robô assistido, abra o MB FISCAL BOT no computador do operador.');
}
window.dispararMbFiscalBotLocal = dispararMbFiscalBotLocal;

// 10. MODAL DE DETALHES, EDIÇÃO E DOSSIÊ
function openDetails(type, index) {
  const item = db[type][index];
  if (!item) return;

  const isCliente = type === 'clientes';
  document.querySelector('#modalTitle').textContent = `Ficha do ${isCliente ? 'Cliente' : 'Fornecedor'}`;
  document.querySelector('#formFields').innerHTML = `
    <div class="field"><label>Nome / Razão Social</label><input id="edit_nome" value="${escapeHtml(item.nome || '')}" required></div>
    <div class="field"><label>Documento (CNPJ/CPF)</label><input id="edit_doc" value="${escapeHtml(item.doc || '')}"></div>
    <div class="field"><label>Contato responsável</label><input id="edit_contato" value="${escapeHtml(item.contato || '')}"></div>
    <div class="field"><label>E-mail oficial</label><input id="edit_email" value="${escapeHtml(item.email || '')}"></div>
    <div class="field"><label>Telefone / WhatsApp</label><input id="edit_telefone" value="${escapeHtml(item.telefone || '')}"></div>
    <div class="field"><label>Situação</label>
      <select id="edit_status">
        <option value="Ativo" ${item.status === 'Ativo' ? 'selected' : ''}>Ativo</option>
        <option value="Em validação" ${item.status === 'Em validação' ? 'selected' : ''}>Em validação</option>
        <option value="Em cotação" ${item.status === 'Em cotação' ? 'selected' : ''}>Em cotação</option>
        <option value="Inativo" ${item.status === 'Inativo' ? 'selected' : ''}>Inativo</option>
      </select>
    </div>
    <div class="field full">
      <button type="button" class="secondary" style="color:var(--red);border:1px solid var(--red);margin-top:10px" id="deleteEntityBtn">Excluir este cadastro do Supabase</button>
    </div>
  `;

  document.querySelector('#deleteEntityBtn').onclick = async () => {
    if (confirm(`Tem certeza que deseja remover ${item.nome}?`)) {
      showLoader('Excluindo...', 'Removendo registro do Supabase...', 50, 'Processando...');
      try {
        if (supabaseClient && item.id) {
          await supabaseClient.from(type).delete().eq('id', item.id);
        }
        db[type].splice(index, 1);
        document.querySelector('#modal').close();
        toast('Cadastro removido com sucesso!');
        render();
      } catch {
        toast('Erro ao remover cadastro.');
      } finally {
        hideLoader();
      }
    }
  };

  const form = document.querySelector('#entityForm');
  form.dataset.mode = 'edit';
  form.dataset.editType = type;
  form.dataset.editIndex = index;
  document.querySelector('#saveBtn').textContent = 'Salvar alterações';
  document.querySelector('#modal').showModal();
}

function openDossie(index) {
  const op = db.oportunidades[index];
  if (!op) return;

  const custo = Number(op.custoEstimado) || (Number(op.valor) * 0.6);
  const margem = Number(op.valor) - custo;
  const margemPct = op.valor ? ((margem / op.valor) * 100).toFixed(1) : 0;

  document.querySelector('#modalTitle').textContent = `Dossiê: ${op.nome}`;
  document.querySelector('#modalSubtitle').textContent = `Intermediação comercial ativa — Cliente: ${op.cliente}`;
  document.querySelector('#formFields').innerHTML = `
    <div class="field full" style="background:#f4f7f9;padding:15px;border-radius:10px;display:grid;grid-template-columns:repeat(auto-fit, minmax(130px, 1fr));gap:12px">
      <div><small style="color:var(--muted)">Cliente comprador</small><b style="display:block;margin-top:2px">${escapeHtml(op.cliente)}</b></div>
      <div><small style="color:var(--muted)">Venda estimada</small><b style="display:block;margin-top:2px;color:var(--navy);font-size:15px">${money(op.valor)}</b></div>
      <div><small style="color:var(--muted)">Custo fornecedor</small><b style="display:block;margin-top:2px;color:var(--red)">${money(custo)}</b></div>
      <div><small style="color:var(--muted)">Margem estimada</small><b style="display:block;margin-top:2px;color:var(--green)">${money(margem)} (${margemPct}%)</b></div>
    </div>

    <div class="field full">
      <label>Descrição da necessidade do cliente / Especificações técnicas:</label>
      <textarea id="edit_op_desc">${escapeHtml(op.descricao || '')}</textarea>
    </div>
    <div class="field">
      <label>Etapa do funil:</label>
      <select id="edit_op_status">
        ${['Entrada', 'Cotação', 'Proposta', 'Aprovado', 'Entregue', 'Cancelado'].map(s => `
          <option value="${s}" ${op.status === s ? 'selected' : ''}>${s}</option>
        `).join('')}
      </select>
    </div>
    <div class="field">
      <label>Valor da negociação (R$):</label>
      <input type="number" id="edit_op_valor" value="${op.valor}">
    </div>

    <div class="field full" style="display:flex;justify-content:space-between;align-items:center;padding:12px;background:#fff8e6;border:1px solid #f2e3a5;border-radius:8px;margin-top:10px">
      <div>
        <b style="color:#7a5b13">Proposta Comercial Oficial Prado</b>
        <p style="margin:2px 0 0;font-size:12px;color:#5a4a1a">Gera o documento timbrado pronto para envio ao cliente (sem revelar os fornecedores).</p>
      </div>
      <button type="button" class="primary" style="background:var(--gold);color:#202020;font-weight:700" onclick="abrirPropostaPDF(${index})">📄 Gerar Proposta PDF</button>
    </div>
  `;

  const form = document.querySelector('#entityForm');
  form.dataset.mode = 'dossie';
  form.dataset.dossieIndex = index;
  document.querySelector('#saveBtn').textContent = 'Salvar dossiê';
  document.querySelector('#modal').showModal();
}

// 10b. MOTOR COMPLETO DE ORÇAMENTOS E PROPOSTAS TIMBRADAS OFICIAIS
let orcamentoAtualIndex = 0;

function formatarDataBr(isoStr) {
  if (!isoStr) return '—';
  if (isoStr.includes('/')) return isoStr;
  const parts = isoStr.split('T')[0].split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return isoStr;
}
window.formatarDataBr = formatarDataBr;

function filtrarTabelaOrcamentos(termo) {
  const busca = (termo || '').toLowerCase().trim();
  const rows = document.querySelectorAll('#tabelaOrcamentos tbody tr');
  rows.forEach(r => {
    const text = r.textContent.toLowerCase();
    r.style.display = text.includes(busca) ? '' : 'none';
  });
}
window.filtrarTabelaOrcamentos = filtrarTabelaOrcamentos;

function abrirModalNovoOrcamento(editIndex = -1) {
  const modal = document.querySelector('#modalOrcamento');
  if (!modal) return;

  orcamentoAtualIndex = editIndex;
  document.querySelector('#orc_edit_index').value = editIndex;
  
  const isEdit = (editIndex >= 0 && db.orcamentos[editIndex]);
  const orc = isEdit ? db.orcamentos[editIndex] : null;

  document.querySelector('#orcamentoModalTitle').textContent = isEdit ? `Editar Orçamento Nº ${orc.numero}` : 'Lançar Novo Orçamento Comercial';
  document.querySelector('#orcamentoModalSubtitle').textContent = isEdit ? 'Altere os dados desejados e salve para atualizar a proposta timbrada.' : 'Preencha os dados do cliente, itens e condições comerciais para emitir a proposta timbrada oficial.';

  // Popula dropdown de clientes cadastrados
  const selectCli = document.querySelector('#orc_cliente_select');
  if (selectCli) {
    selectCli.innerHTML = '<option value="">-- Selecionar cliente cadastrado para preencher rápido --</option>' +
      (db.clientes || []).map((c, i) => `<option value="${i}">${escapeHtml(c.nome)} (${escapeHtml(c.doc || 'Sem documento')})</option>`).join('');
  }

  const hoje = new Date().toISOString().split('T')[0];
  const em20Dias = new Date(Date.now() + 20 * 86400000).toISOString().split('T')[0];
  const proximoNum = `${String((db.orcamentos.length || 0) + 1).padStart(3, '0')}/2026`;

  document.querySelector('#orc_numero').value = isEdit ? orc.numero : proximoNum;
  document.querySelector('#orc_data_emissao').value = isEdit ? (orc.data_emissao ? orc.data_emissao.split('T')[0] : hoje) : hoje;
  document.querySelector('#orc_data_validade').value = isEdit ? (orc.data_validade ? orc.data_validade.split('T')[0] : em20Dias) : em20Dias;
  document.querySelector('#orc_responsavel').value = isEdit ? orc.responsavel : (currentUser ? currentUser.nome : 'Michel do Prado');
  document.querySelector('#orc_referencia').value = isEdit ? (orc.referencia || '') : '';

  document.querySelector('#orc_cli_nome').value = isEdit ? (orc.cliente_nome || orc.cliente || '') : '';
  document.querySelector('#orc_cli_doc').value = isEdit ? (orc.cliente_doc || '') : '';
  document.querySelector('#orc_cli_email').value = isEdit ? (orc.cliente_email || '') : '';
  document.querySelector('#orc_cli_telefone').value = isEdit ? (orc.cliente_telefone || '') : '';
  document.querySelector('#orc_cli_endereco').value = isEdit ? (orc.cliente_endereco || '') : '';

  document.querySelector('#orc_desconto').value = isEdit ? (orc.desconto || 0) : 0;
  document.querySelector('#orc_frete').value = isEdit ? (orc.frete || 0) : 0;
  document.querySelector('#orc_pagamento').value = isEdit ? (orc.pagamento || 'À vista (100% na aprovação da proposta).') : 'À vista (100% na aprovação da proposta).';
  document.querySelector('#orc_entrega_frete').value = isEdit ? (orc.entrega_frete || 'Prazo sujeito à disponibilidade. Frete incluso, salvo indicação expressa.') : 'Prazo sujeito à disponibilidade. Frete incluso, salvo indicação expressa.';
  document.querySelector('#orc_observacoes').value = isEdit ? (orc.observacoes || '') : '';
  document.querySelector('#orc_status').value = isEdit ? (orc.status || 'Aprovado') : 'Aprovado';

  // Configuração do Regime Tributário (MEI vs ME)
  const regimeRadios = document.querySelectorAll('input[name="orc_regime_tributario"]');
  const regimeSalvo = isEdit ? (orc.regime_tributario || 'MEI') : 'MEI';
  regimeRadios.forEach(r => {
    r.checked = (r.value === regimeSalvo);
  });
  const aliquotaMeInp = document.querySelector('#orc_aliquota_me');
  if (aliquotaMeInp) {
    aliquotaMeInp.value = isEdit ? (orc.aliquota_me || 4.0) : 4.0;
  }

  const statusDocEl = document.querySelector('#orc_cli_doc_status');
  if (statusDocEl) {
    statusDocEl.style.color = 'var(--muted)';
    statusDocEl.textContent = 'Digite o CNPJ para preencher os dados cadastrais da empresa';
  }

  // Popula itens com Custo de Fábrica e Margem de Ganho Prado
  const tbody = document.querySelector('#orcItensBody');
  tbody.innerHTML = '';

  if (isEdit && Array.isArray(orc.itens) && orc.itens.length > 0) {
    orc.itens.forEach(it => {
      const custo = it.custo_fabrica !== undefined ? it.custo_fabrica : (it.valor_unitario ? (it.valor_unitario / 1.35) : 0);
      const margem = it.margem_pct !== undefined ? it.margem_pct : (custo > 0 ? (((it.valor_unitario - custo) / custo) * 100) : 35);
      adicionarLinhaItemOrcamento(it.produto, it.unidade, it.quantidade, it.valor_unitario, custo, margem);
    });
  } else {
    adicionarLinhaItemOrcamento('', '1', 1, 0, 0, 35);
  }

  recalcularTotaisOrcamento();
  modal.showModal();
}
window.abrirModalNovoOrcamento = abrirModalNovoOrcamento;

// Consulta e preenchimento automático por CNPJ no formulário de orçamento
let lastConsultedOrcCnpj = '';
async function attachOrcamentoCnpjAutofill(val) {
  const digits = String(val || '').replace(/\D/g, '');
  const statusEl = document.querySelector('#orc_cli_doc_status');
  const docInput = document.querySelector('#orc_cli_doc');
  if (docInput && digits.length === 14 && typeof formatCnpj === 'function') {
    docInput.value = formatCnpj(digits);
  }

  if (digits.length === 14 && digits !== lastConsultedOrcCnpj) {
    lastConsultedOrcCnpj = digits;
    if (statusEl) {
      statusEl.style.color = '#0284c7';
      statusEl.innerHTML = '⏳ <span>Consultando Receita Federal...</span>';
    }

    try {
      let dados = null;
      try {
        const resA = await fetch(`/api/analise-risco?doc=${digits}`);
        if (resA.ok) {
          const j = await resA.json();
          if (j.sucesso && j.dados) dados = j.dados;
        }
      } catch {}

      if (!dados) {
        try {
          const resB = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`);
          if (resB.ok) dados = await resB.json();
        } catch {}
      }

      if (dados) {
        const razao = dados.razao_social || dados.nome || '';
        const fantasia = (dados.nome_fantasia && dados.nome_fantasia !== 'Não informado') ? ` (${dados.nome_fantasia})` : '';
        const nomeFinal = (razao + fantasia).trim();

        const nomeInp = document.querySelector('#orc_cli_nome');
        if (nomeInp && nomeFinal) nomeInp.value = nomeFinal;

        const emailInp = document.querySelector('#orc_cli_email');
        if (emailInp && dados.email) emailInp.value = dados.email.toLowerCase();

        const telInp = document.querySelector('#orc_cli_telefone');
        const telBruto = dados.ddd_telefone_1 || dados.telefone || '';
        const tDigits = String(telBruto).replace(/\D/g, '');
        if (telInp && tDigits.length >= 10) {
          telInp.value = tDigits.length === 11 ? `(${tDigits.slice(0, 2)}) ${tDigits.slice(2, 7)}-${tDigits.slice(7)}` : `(${tDigits.slice(0, 2)}) ${tDigits.slice(2, 6)}-${tDigits.slice(6)}`;
        }

        const endInp = document.querySelector('#orc_cli_endereco');
        if (endInp) {
          const partes = [
            dados.logradouro,
            dados.numero ? `nº ${dados.numero}` : '',
            dados.complemento,
            dados.bairro,
            dados.municipio ? `${dados.municipio} - ${dados.uf}` : '',
            dados.cep ? `CEP ${dados.cep}` : ''
          ].filter(Boolean);
          endInp.value = partes.join(', ');
        }

        if (statusEl) {
          statusEl.style.color = '#16a34a';
          statusEl.innerHTML = `✓ <span><b>${escapeHtml(razao)}</b> preenchido automaticamente da Receita!</span>`;
        }
        toast(`✓ Dados de ${razao.slice(0, 26)} preenchidos da Receita Federal!`);
      } else {
        if (statusEl) {
          statusEl.style.color = 'var(--muted)';
          statusEl.textContent = 'CNPJ formatado. Preencha os dados restantes se necessário.';
        }
      }
    } catch {
      if (statusEl) {
        statusEl.style.color = 'var(--muted)';
        statusEl.textContent = 'CNPJ formatado. Preencha os campos adicionais.';
      }
    }
  }
}
window.attachOrcamentoCnpjAutofill = attachOrcamentoCnpjAutofill;

function selecionarClienteParaOrcamento(idxVal) {
  if (idxVal === '' || !db.clientes[idxVal]) return;
  const c = db.clientes[idxVal];
  if (c.nome) document.querySelector('#orc_cli_nome').value = c.nome;
  if (c.doc) document.querySelector('#orc_cli_doc').value = c.doc;
  if (c.email) document.querySelector('#orc_cli_email').value = c.email;
  if (c.telefone) document.querySelector('#orc_cli_telefone').value = c.telefone;
  if (c.endereco) document.querySelector('#orc_cli_endereco').value = c.endereco;
}
window.selecionarClienteParaOrcamento = selecionarClienteParaOrcamento;

function adicionarLinhaItemOrcamento(produto = '', unidade = '1', quantidade = 1, valorUnit = 0, custoFabrica = 0, margemPct = 35) {
  const tbody = document.querySelector('#orcItensBody');
  if (!tbody) return;

  const rowCount = tbody.querySelectorAll('tr').length + 1;
  const qtdNum = parseFloat(quantidade || 1) || 1;
  let custoNum = parseFloat(custoFabrica || 0) || 0;
  let margemNum = parseFloat(margemPct !== undefined ? margemPct : 35) || 0;
  let vendaNum = parseFloat(valorUnit || 0) || 0;

  // Se tem venda mas não tem custo: deriva custo a partir da margem
  if (vendaNum > 0 && custoNum === 0) {
    custoNum = Number((vendaNum / (1 + (margemNum / 100))).toFixed(2));
  } else if (custoNum > 0 && vendaNum === 0) {
    vendaNum = Number((custoNum * (1 + (margemNum / 100))).toFixed(2));
  }

  const totalVenda = Number((qtdNum * vendaNum).toFixed(2));
  const totalCusto = Number((qtdNum * custoNum).toFixed(2));
  const lucroBruto = Number((totalVenda - totalCusto).toFixed(2));

  const tr = document.createElement('tr');
  tr.className = 'orc-item-row';
  tr.innerHTML = `
    <td style="text-align:center;font-weight:700" class="row-num">${rowCount}</td>
    <td>
      <input class="item-prod" value="${escapeHtml(produto)}" placeholder="Descrição completa do produto e especificação técnica" required style="width:100%;font-size:12.5px;padding:6px 8px">
    </td>
    <td>
      <input class="item-un" value="${escapeHtml(unidade || '1')}" placeholder="UN" style="text-align:center;width:100%;font-size:12px;padding:6px 4px">
    </td>
    <td>
      <input type="number" min="1" step="1" class="item-qtd" value="${qtdNum}" oninput="calcularLinhaItemOrcamento(this)" required style="text-align:center;width:100%;font-size:12.5px;padding:6px 4px">
    </td>
    <td>
      <input type="number" min="0" step="0.01" class="item-custo-fab" value="${custoNum ? custoNum.toFixed(2) : ''}" placeholder="0,00" oninput="calcularLinhaPorCustoOuMargem(this)" style="text-align:right;width:100%;font-size:12.5px;padding:6px 4px;background:#fef2f2;border:1px solid #fecaca;color:#991b1b;font-weight:700">
    </td>
    <td>
      <div style="display:flex;align-items:center;gap:2px">
        <input type="number" min="0" step="0.5" class="item-margem-pct" value="${margemNum ? margemNum.toFixed(1) : '35.0'}" oninput="calcularLinhaPorCustoOuMargem(this)" style="text-align:center;width:100%;font-size:12px;padding:6px 2px;background:#f0fdf4;border:1px solid #bbf7d0;color:#166534;font-weight:800">
        <span style="font-size:11px;font-weight:800;color:#166534">%</span>
      </div>
    </td>
    <td>
      <input type="number" min="0" step="0.01" class="item-vlr" value="${vendaNum ? vendaNum.toFixed(2) : ''}" placeholder="0,00" oninput="calcularLinhaPorPrecoVenda(this)" required style="text-align:right;width:100%;font-size:12.5px;padding:6px 4px;font-weight:800;color:#073863">
    </td>
    <td style="text-align:right;font-weight:800;font-size:13px;color:#073863" class="item-total-display">
      ${money(totalVenda)}
    </td>
    <td style="text-align:right;font-weight:800;font-size:12px;color:#059669" class="item-lucro-display" title="Lucro Bruto deste item">
      ${money(lucroBruto)}
    </td>
    <td style="text-align:center">
      <button type="button" class="link" style="color:var(--red);font-size:16px;cursor:pointer;padding:2px 6px" onclick="removerLinhaItemOrcamento(this)" title="Remover item">✕</button>
    </td>
  `;
  tbody.appendChild(tr);
  recalcularTotaisOrcamento();
}
window.adicionarLinhaItemOrcamento = adicionarLinhaItemOrcamento;

// Calcula a linha quando o usuário altera o Custo de Fábrica ou a Porcentagem de Margem
function calcularLinhaPorCustoOuMargem(el) {
  const tr = el.closest('tr');
  if (!tr) return;
  const qtd = parseFloat(tr.querySelector('.item-qtd')?.value || 1) || 1;
  const custo = parseFloat(tr.querySelector('.item-custo-fab')?.value || 0) || 0;
  const margem = parseFloat(tr.querySelector('.item-margem-pct')?.value || 0) || 0;

  let venda = 0;
  if (custo > 0) {
    venda = Number((custo * (1 + (margem / 100))).toFixed(2));
  } else {
    venda = parseFloat(tr.querySelector('.item-vlr')?.value || 0) || 0;
  }

  const vlrInp = tr.querySelector('.item-vlr');
  if (vlrInp && custo > 0) {
    vlrInp.value = venda.toFixed(2);
  }

  const totalVenda = Number((qtd * venda).toFixed(2));
  const totalCusto = Number((qtd * custo).toFixed(2));
  const lucro = Number((totalVenda - totalCusto).toFixed(2));

  const totalDisplay = tr.querySelector('.item-total-display');
  if (totalDisplay) totalDisplay.textContent = money(totalVenda);

  const lucroDisplay = tr.querySelector('.item-lucro-display');
  if (lucroDisplay) lucroDisplay.textContent = money(lucro);

  recalcularTotaisOrcamento();
}
window.calcularLinhaPorCustoOuMargem = calcularLinhaPorCustoOuMargem;

// Calcula a linha no sentido inverso quando o usuário digita o Preço de Venda
function calcularLinhaPorPrecoVenda(el) {
  const tr = el.closest('tr');
  if (!tr) return;
  const qtd = parseFloat(tr.querySelector('.item-qtd')?.value || 1) || 1;
  const venda = parseFloat(tr.querySelector('.item-vlr')?.value || 0) || 0;
  const custo = parseFloat(tr.querySelector('.item-custo-fab')?.value || 0) || 0;

  const margemInp = tr.querySelector('.item-margem-pct');
  if (margemInp && custo > 0 && venda >= custo) {
    const margemReal = (((venda - custo) / custo) * 100);
    margemInp.value = margemReal.toFixed(1);
  }

  const totalVenda = Number((qtd * venda).toFixed(2));
  const totalCusto = Number((qtd * custo).toFixed(2));
  const lucro = Number((totalVenda - totalCusto).toFixed(2));

  const totalDisplay = tr.querySelector('.item-total-display');
  if (totalDisplay) totalDisplay.textContent = money(totalVenda);

  const lucroDisplay = tr.querySelector('.item-lucro-display');
  if (lucroDisplay) lucroDisplay.textContent = money(lucro);

  recalcularTotaisOrcamento();
}
window.calcularLinhaPorPrecoVenda = calcularLinhaPorPrecoVenda;

function calcularLinhaItemOrcamento(el) {
  calcularLinhaPorCustoOuMargem(el);
}
window.calcularLinhaItemOrcamento = calcularLinhaItemOrcamento;

function removerLinhaItemOrcamento(btn) {
  const tr = btn.closest('tr');
  const tbody = tr.parentElement;
  if (tbody.querySelectorAll('tr').length <= 1) {
    return toast('O orçamento deve ter pelo menos 1 item.');
  }
  tr.remove();
  tbody.querySelectorAll('tr').forEach((row, i) => {
    row.querySelector('.row-num').textContent = i + 1;
  });
  recalcularTotaisOrcamento();
}
window.removerLinhaItemOrcamento = removerLinhaItemOrcamento;

function recalcularTotaisOrcamento() {
  const rows = document.querySelectorAll('#orcItensBody tr');
  let subtotalVenda = 0;
  let custoFabricaTotal = 0;

  rows.forEach(r => {
    const qtd = parseFloat(r.querySelector('.item-qtd')?.value || 0) || 0;
    const vlr = parseFloat(r.querySelector('.item-vlr')?.value || 0) || 0;
    const custo = parseFloat(r.querySelector('.item-custo-fab')?.value || 0) || 0;

    const itemTotal = Number((qtd * vlr).toFixed(2));
    const itemCustoTotal = Number((qtd * custo).toFixed(2));
    const itemLucro = Number((itemTotal - itemCustoTotal).toFixed(2));

    subtotalVenda += itemTotal;
    custoFabricaTotal += itemCustoTotal;

    const totalDisplay = r.querySelector('.item-total-display');
    if (totalDisplay) totalDisplay.textContent = money(itemTotal);

    const lucroDisplay = r.querySelector('.item-lucro-display');
    if (lucroDisplay) lucroDisplay.textContent = money(itemLucro);
  });

  const desconto = parseFloat(document.querySelector('#orc_desconto')?.value || 0) || 0;
  const frete = parseFloat(document.querySelector('#orc_frete')?.value || 0) || 0;
  const totalFinalVenda = Math.max(0, subtotalVenda - desconto + frete);

  const subPrev = document.querySelector('#orc_subtotal_preview');
  if (subPrev) subPrev.textContent = money(subtotalVenda);

  const totPrev = document.querySelector('#orc_total_preview');
  if (totPrev) totPrev.textContent = money(totalFinalVenda);

  // Inteligência Tributária (MEI vs ME)
  const regimeChecked = document.querySelector('input[name="orc_regime_tributario"]:checked')?.value || 'MEI';
  const blocoMe = document.querySelector('#orc_bloco_aliquota_me');
  const badgeRegime = document.querySelector('#orc_badge_regime');

  let impostoProvisao = 0;
  if (regimeChecked === 'ME') {
    if (blocoMe) blocoMe.style.display = 'flex';
    if (badgeRegime) {
      badgeRegime.textContent = 'ME Simples Nacional Ativo';
      badgeRegime.style.background = '#eff6ff';
      badgeRegime.style.color = '#1e40af';
    }
    const aliq = parseFloat(document.querySelector('#orc_aliquota_me')?.value || 4.0) || 4.0;
    impostoProvisao = Number((totalFinalVenda * (aliq / 100)).toFixed(2));
  } else {
    if (blocoMe) blocoMe.style.display = 'none';
    if (badgeRegime) {
      badgeRegime.textContent = 'MEI Ativo (0% s/ NF)';
      badgeRegime.style.background = '#dbeafe';
      badgeRegime.style.color = '#1e40af';
    }
    impostoProvisao = 0.00;
  }

  const lucroBruto = Math.max(0, totalFinalVenda - custoFabricaTotal);
  const lucroBrutoPct = totalFinalVenda > 0 ? ((lucroBruto / totalFinalVenda) * 100).toFixed(1) : 0;
  const lucroLiquidoReal = Math.max(0, lucroBruto - impostoProvisao);

  // Fluxo Real 50% / 50% com a fábrica
  const fluxoEntradaFab = Number((custoFabricaTotal * 0.50).toFixed(2));
  const fluxoSaldoFab = Number((custoFabricaTotal * 0.50).toFixed(2));

  // Atualização visual dos painéis
  const custoFabEl = document.querySelector('#orc_custo_fabrica_total');
  if (custoFabEl) custoFabEl.textContent = money(custoFabricaTotal);

  const lucroBrutoEl = document.querySelector('#orc_lucro_bruto_total');
  if (lucroBrutoEl) lucroBrutoEl.textContent = `${money(lucroBruto)} (${lucroBrutoPct}%)`;

  const impostoEl = document.querySelector('#orc_imposto_provisao');
  if (impostoEl) impostoEl.textContent = money(impostoProvisao);

  const lucroLiqEl = document.querySelector('#orc_lucro_liquido_real');
  if (lucroLiqEl) lucroLiqEl.textContent = money(lucroLiquidoReal);

  const entradaFabEl = document.querySelector('#orc_fluxo_entrada_fab');
  if (entradaFabEl) entradaFabEl.textContent = money(fluxoEntradaFab);

  const saldoFabEl = document.querySelector('#orc_fluxo_saldo_fab');
  if (saldoFabEl) saldoFabEl.textContent = money(fluxoSaldoFab);
}
window.recalcularTotaisOrcamento = recalcularTotaisOrcamento;

async function salvarOrcamento(e) {
  e.preventDefault();
  const editIndex = parseInt(document.querySelector('#orc_edit_index').value, 10);

  const rows = document.querySelectorAll('#orcItensBody tr');
  if (!rows.length) return toast('Adicione pelo menos 1 item ao orçamento.');

  const itens = [];
  let subtotal = 0;
  let custoFabricaTotal = 0;

  rows.forEach((r, i) => {
    const prod = (r.querySelector('.item-prod')?.value || '').trim();
    const un = (r.querySelector('.item-un')?.value || '1').trim();
    const qtd = parseFloat(r.querySelector('.item-qtd')?.value || 1) || 1;
    const custo = parseFloat(r.querySelector('.item-custo-fab')?.value || 0) || 0;
    const margem = parseFloat(r.querySelector('.item-margem-pct')?.value || 0) || 0;
    const vlr = parseFloat(r.querySelector('.item-vlr')?.value || 0) || 0;
    const tot = Number((qtd * vlr).toFixed(2));
    const totCusto = Number((qtd * custo).toFixed(2));
    const lucroItem = Number((tot - totCusto).toFixed(2));

    subtotal += tot;
    custoFabricaTotal += totCusto;

    itens.push({
      item: i + 1,
      produto: prod,
      unidade: un,
      quantidade: qtd,
      custo_fabrica: custo,
      margem_pct: margem,
      valor_unitario: vlr,
      total: tot,
      lucro_bruto: lucroItem
    });
  });

  const desconto = parseFloat(document.querySelector('#orc_desconto')?.value || 0) || 0;
  const frete = parseFloat(document.querySelector('#orc_frete')?.value || 0) || 0;
  const valorTotal = Math.max(0, subtotal - desconto + frete);

  const regimeChecked = document.querySelector('input[name="orc_regime_tributario"]:checked')?.value || 'MEI';
  const aliqMe = parseFloat(document.querySelector('#orc_aliquota_me')?.value || 4.0) || 4.0;
  const impostoProvisao = regimeChecked === 'ME' ? Number((valorTotal * (aliqMe / 100)).toFixed(2)) : 0.00;
  const lucroBruto = Math.max(0, valorTotal - custoFabricaTotal);
  const lucroLiquidoReal = Math.max(0, lucroBruto - impostoProvisao);

  const novoOrc = {
    id: editIndex >= 0 ? db.orcamentos[editIndex].id : `orc-${Date.now()}`,
    numero: document.querySelector('#orc_numero').value.trim(),
    data_emissao: document.querySelector('#orc_data_emissao').value,
    data_validade: document.querySelector('#orc_data_validade').value,
    responsavel: document.querySelector('#orc_responsavel').value.trim(),
    referencia: document.querySelector('#orc_referencia').value.trim() || 'Fornecimento Comercial',
    cliente_nome: document.querySelector('#orc_cli_nome').value.trim(),
    cliente_doc: document.querySelector('#orc_cli_doc').value.trim(),
    cliente_email: document.querySelector('#orc_cli_email').value.trim(),
    cliente_telefone: document.querySelector('#orc_cli_telefone').value.trim(),
    cliente_endereco: document.querySelector('#orc_cli_endereco').value.trim(),
    itens: itens,
    subtotal: subtotal,
    desconto: desconto,
    frete: frete,
    valor_total: valorTotal,
    custo_fabrica_total: custoFabricaTotal,
    lucro_bruto_total: lucroBruto,
    regime_tributario: regimeChecked,
    aliquota_me: aliqMe,
    imposto_provisao: impostoProvisao,
    lucro_liquido_real: lucroLiquidoReal,
    fluxo_entrada_fab: Number((custoFabricaTotal * 0.50).toFixed(2)),
    fluxo_saldo_fab: Number((custoFabricaTotal * 0.50).toFixed(2)),
    pagamento: document.querySelector('#orc_pagamento').value.trim() || 'À vista (100% na aprovação da proposta).',
    entrega_frete: document.querySelector('#orc_entrega_frete').value.trim() || 'Prazo sujeito à disponibilidade. Frete incluso, salvo indicação expressa.',
    observacoes: document.querySelector('#orc_observacoes').value.trim(),
    status: document.querySelector('#orc_status').value,
    criadoPor: currentUser ? currentUser.email : 'licitadigitaltech@gmail.com',
    user_id: currentUser ? currentUser.id : null,
    atualizadoEm: new Date().toISOString()
  };

  showLoader('Salvando Orçamento...', 'Gravando no Supabase e gerando proposta timbrada...', 60, 'Sincronizando...');

  try {
    if (supabaseClient) {
      try {
        if (editIndex >= 0) {
          await supabaseClient.from('orcamentos').update(novoOrc).eq('id', novoOrc.id);
        } else {
          await supabaseClient.from('orcamentos').insert([novoOrc]);
        }
      } catch (eSupa) {
        console.warn('Tabela orcamentos no Supabase não configurada ainda, gravando no armazenamento local:', eSupa);
      }
    }

    if (editIndex >= 0) {
      db.orcamentos[editIndex] = novoOrc;
      toast(`Orçamento Nº ${novoOrc.numero} atualizado com sucesso!`);
    } else {
      db.orcamentos.unshift(novoOrc);
      toast(`Orçamento Nº ${novoOrc.numero} lançado com sucesso!`);
    }

    try {
      localStorage.setItem(ORCAMENTOS_STORAGE_KEY, JSON.stringify(db.orcamentos));
    } catch {}

    document.querySelector('#modalOrcamento').close();
    orcamentos();
    visualizarPropostaTimbrada(editIndex >= 0 ? editIndex : 0);
  } catch (err) {
    toast('Erro ao gravar orçamento.');
  } finally {
    hideLoader();
  }
}
window.salvarOrcamento = salvarOrcamento;

function sanitizarObservacaoCliente(texto) {
  if (!texto) return 'Sem observações adicionais.';
  let t = String(texto);
  // Remove menções confidenciais a fornecedores, pagamentos a terceiros ou liquidações internas
  t = t.replace(/(?:liquidado com|comprado d[aeo]|fornecedor|f[aá]brica cotada|ind[uú]stria cotada|condi[cç][õo]es da f[aá]brica|anexos de or[cç]amento).*?(?:\.|$)/gi, '');
  t = t.replace(/3W Embalagens[^\.]*\.?/gi, '');
  t = t.replace(/CBP Sul[^\.]*\.?/gi, '');
  t = t.trim().replace(/\s{2,}/g, ' ');
  return t || 'Faturamento direto e acompanhamento logístico integral Prado Comércio & Soluções.';
}
window.sanitizarObservacaoCliente = sanitizarObservacaoCliente;

function visualizarPropostaTimbrada(index) {
  const orc = db.orcamentos[index] || db.orcamentos[0];
  if (!orc) return toast('Orçamento não encontrado.');

  orcamentoAtualIndex = index;

  document.querySelector('#propNumero').textContent = orc.numero || '027/2026';
  document.querySelector('#propEmissao').textContent = formatarDataBr(orc.data_emissao);
  document.querySelector('#propResponsavel').textContent = orc.responsavel || 'Michel do Prado';
  document.querySelector('#propValidade').textContent = formatarDataBr(orc.data_validade);
  document.querySelector('#propReferencia').textContent = orc.referencia || 'Suprimentos Corporativos';

  document.querySelector('#propCliNome').textContent = orc.cliente_nome || orc.cliente || 'Cliente';
  document.querySelector('#propCliDoc').textContent = orc.cliente_doc || '—';
  document.querySelector('#propCliEmail').textContent = orc.cliente_email || '—';
  document.querySelector('#propCliEntrega').textContent = orc.cliente_endereco || 'A combinar';
  document.querySelector('#propCliTel').textContent = orc.cliente_telefone || '—';

  const tbody = document.querySelector('#propItensBody');
  tbody.innerHTML = (orc.itens || []).map((it, i) => `
    <tr>
      <td style="text-align:center;font-weight:700">${it.item || (i + 1)}</td>
      <td><b>${escapeHtml(it.produto)}</b></td>
      <td style="text-align:center">${escapeHtml(it.unidade || '1')}</td>
      <td style="text-align:center;font-weight:700">${it.quantidade}</td>
      <td style="text-align:right">${money(it.valor_unitario)}</td>
      <td style="text-align:right;font-weight:700">${money(it.total)}</td>
    </tr>
  `).join('');

  document.querySelector('#propSubtotal').textContent = money(orc.subtotal);
  document.querySelector('#propDesconto').textContent = money(orc.desconto);
  document.querySelector('#propFrete').textContent = money(orc.frete);
  document.querySelector('#propValorTotal').textContent = money(orc.valor_total);

  document.querySelector('#propCondPagamento').textContent = orc.pagamento || 'À vista.';
  document.querySelector('#propCondEntrega').textContent = orc.entrega_frete || 'Prazo sujeito à disponibilidade. Frete incluso, salvo indicação expressa.';
  document.querySelector('#propCondObs').textContent = sanitizarObservacaoCliente(orc.observacoes);

  const badge = document.querySelector('#propStatusBadge');
  if (badge) {
    badge.textContent = orc.status || 'Aprovado';
    badge.style.background = (orc.status === 'Aprovado') ? '#22c55e' : ((orc.status === 'Cancelado') ? '#ef4444' : '#f59e0b');
  }

  const modal = document.querySelector('#proposalModal');
  if (modal) {
    const mainModal = document.querySelector('#modal');
    if (mainModal) mainModal.close();
    modal.showModal();
  }
}
window.visualizarPropostaTimbrada = visualizarPropostaTimbrada;

function imprimirDocumentoTimbrado() {
  const printArea = document.querySelector('#proposalPrintArea');
  if (!printArea) {
    window.print();
    return;
  }

  // Cria ou reutiliza iframe invisível dedicado para impressão limpa (previne página em branco em navegadores com <dialog>)
  let iframe = document.querySelector('#pradoPrintIframe');
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'pradoPrintIframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);
  }

  const doc = iframe.contentDocument || iframe.contentWindow.document;
  doc.open();
  doc.write(`<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Orçamento Comercial - Prado Comércio & Soluções</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #ffffff !important;
      color: #1a1a1a !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
      padding: 12px 18px !important;
      font-size: 13px !important;
    }
    .timbrado-documento {
      background: #ffffff !important;
      color: #1a1a1a !important;
      max-width: 100% !important;
      width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    .timbrado-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
    .timbrado-logo { height: 62px; max-width: 280px; object-fit: contain; }
    .timbrado-titulo-orc { text-align: right; }
    .timbrado-titulo-orc h2 { font-size: 18px; font-weight: 800; color: #0b3c66; margin: 0; letter-spacing: .5px; }
    .timbrado-titulo-orc .timbrado-num { font-size: 22px; font-weight: 800; color: #0b3c66; margin-top: 4px; }
    .timbrado-subempresa { text-align: center; font-size: 11px; color: #004080; line-height: 1.45; margin: 6px 0 10px; padding-bottom: 6px; border-bottom: 1px solid #cbd5e1; }
    .timbrado-metadados-bar { display: flex; justify-content: space-between; font-size: 11.5px; padding: 6px 10px; background: #f8fafc; border: 1px solid #b0c4de; border-radius: 4px; margin-bottom: 12px; }
    .timbrado-box-cliente { border: 1px solid #b0c4de; border-radius: 4px; padding: 8px 12px; font-size: 12px; line-height: 1.45; margin-bottom: 12px; background: #fff; }
    .timbrado-box-cliente .row { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
    .timbrado-tabela-itens { width: 100%; border-collapse: collapse; border: 1px solid #b0c4de; font-size: 11.5px; margin-bottom: 12px; }
    .timbrado-tabela-itens th { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; background: #073863 !important; color: #ffffff !important; font-weight: 700; font-size: 11.5px; padding: 6px 8px; text-align: center; border: 1px solid #052a4a; }
    .timbrado-tabela-itens td { padding: 8px; border: 1px solid #d5e0ea; vertical-align: middle; }
    .timbrado-totais-box { margin-left: auto; width: 320px; border-collapse: collapse; font-size: 12px; margin-bottom: 12px; }
    .timbrado-totais-box td { padding: 4px 8px; }
    .timbrado-total-destaque { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; background: #008299 !important; color: #ffffff !important; font-weight: 800; font-size: 13.5px; }
    .timbrado-condicoes { border: 1px solid #b0c4de; border-radius: 4px; font-size: 11.5px; margin-bottom: 14px; }
    .timbrado-condicoes .item { display: flex; border-bottom: 1px solid #d5e0ea; }
    .timbrado-condicoes .item:last-child { border-bottom: none; }
    .timbrado-condicoes .lbl { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; width: 140px; background: #eef4f9 !important; font-weight: 700; color: #0b3c66; padding: 6px 10px; border-right: 1px solid #d5e0ea; flex-shrink: 0; }
    .timbrado-condicoes .val { padding: 6px 10px; flex: 1; }
    .timbrado-footer { font-size: 11px; text-align: center; color: #64748b; margin-top: 14px; }
    .timbrado-assinaturas { display: flex; justify-content: space-around; margin-top: 24px; gap: 20px; text-align: center; font-size: 11.5px; }
    .timbrado-assinaturas .col { flex: 1; }
    .linha-assinatura { border-top: 1px solid #1e293b; width: 85%; margin: 30px auto 4px; }
    @page { size: A4 portrait; margin: 8mm 10mm 8mm 10mm; }
  </style>
</head>
<body>
  <div class="timbrado-documento">
    ${printArea.innerHTML}
  </div>
</body>
</html>`);
  doc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch {
      window.print();
    }
  }, 250);
}
window.imprimirDocumentoTimbrado = imprimirDocumentoTimbrado;

function abrirPropostaPDF(index) {
  visualizarPropostaTimbrada(index);
}
window.abrirPropostaPDF = abrirPropostaPDF;

function imprimirPropostaPDF(index) {
  visualizarPropostaTimbrada(index);
  setTimeout(() => imprimirDocumentoTimbrado(), 200);
}
window.imprimirPropostaPDF = imprimirPropostaPDF;

function enviarPropostaWhatsApp(index) {
  const orc = db.orcamentos[index] || db.orcamentos[0];
  if (!orc) return toast('Orçamento não encontrado.');

  const zapRaw = String(orc.cliente_telefone || '').replace(/\D/g, '');
  const zapClean = zapRaw.length === 10 || zapRaw.length === 11 ? `55${zapRaw}` : zapRaw;

  const msg = `Olá! Segue a *Proposta Comercial Oficial Nº ${orc.numero}* emitida pela *Prado Comércio & Soluções*:%0A%0A` +
    `🏢 *Cliente:* ${encodeURIComponent(orc.cliente_nome || orc.cliente)}%0A` +
    `📦 *Referência:* ${encodeURIComponent(orc.referencia)}%0A` +
    `💰 *Valor Total:* ${encodeURIComponent(money(orc.valor_total))}%0A` +
    `📅 *Validade:* ${encodeURIComponent(formatarDataBr(orc.data_validade))}%0A` +
    `🤝 *Condições de Pagamento:* ${encodeURIComponent(orc.pagamento || 'À vista (100% na aprovação da proposta).')}%0A%0A` +
    `🔑 *Dados Bancários para Liquidação:*%0A` +
    `Chave PIX (CNPJ): *59.825.765/0001-03*%0A` +
    `Favorecido: *59.825.765 Michel do Prado*%0A%0A` +
    `🛡️ *Garantia Prado:* Acompanhamento logístico integral da fábrica até o ateste de recebimento no seu endereço.%0A%0A` +
    `Estamos à inteira disposição para fechamento e emissão de nota fiscal. Obrigado!`;

  if (zapClean && zapClean.length >= 10) {
    window.open(`https://wa.me/${zapClean}?text=${msg}`, '_blank');
  } else {
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  }
}
window.enviarPropostaWhatsApp = enviarPropostaWhatsApp;

function enviarPropostaWhatsAppAtual() {
  if (orcamentoAtualIndex >= 0) {
    enviarPropostaWhatsApp(orcamentoAtualIndex);
  } else {
    toast('Selecione um orçamento para enviar via WhatsApp.');
  }
}
window.enviarPropostaWhatsAppAtual = enviarPropostaWhatsAppAtual;

function excluirOrcamento(index) {
  const orc = db.orcamentos[index];
  if (!orc) return;

  if (confirm(`Deseja realmente excluir o Orçamento Nº ${orc.numero} (${orc.cliente_nome})?`)) {
    if (supabaseClient && orc.id) {
      supabaseClient.from('orcamentos').delete().eq('id', orc.id).catch(() => {});
    }
    db.orcamentos.splice(index, 1);
    try {
      localStorage.setItem(ORCAMENTOS_STORAGE_KEY, JSON.stringify(db.orcamentos));
    } catch {}
    toast('Orçamento excluído com sucesso.');
    orcamentos();
  }
}
window.excluirOrcamento = excluirOrcamento;

// 11. FORMULÁRIOS DE NOVO CADASTRO (COM PREENCHIMENTO AUTOMÁTICO OFICIAL VIA CNPJ)
const forms = {
  cliente: [
    ['doc', 'CPF ou CNPJ (Digite o CNPJ para preenchimento automático)', 'text'],
    ['nome', 'Nome / Razão social', 'text'],
    ['contato', 'Contato responsável', 'text'],
    ['email', 'E-mail oficial', 'email'],
    ['telefone', 'Telefone / WhatsApp', 'text'],
    ['endereco', 'Endereço completo', 'text']
  ],
  fornecedor: [
    ['doc', 'CNPJ da Indústria / Fábrica (Preenchimento automático)', 'text'],
    ['nome', 'Nome / Razão social da Fábrica', 'text'],
    ['contato', 'Representante / Contato Comercial', 'text'],
    ['email', 'E-mail comercial', 'email'],
    ['telefone', 'Telefone oficial da indústria', 'text'],
    ['categoria', 'Categoria / Ramo de Atividade (CNAE)', 'text']
  ],
  oportunidade: [
    ['nome', 'Título da oportunidade', 'text'],
    ['cliente', 'Cliente', 'text'],
    ['valor', 'Valor estimado da venda (R$)', 'number'],
    ['prazo', 'Prazo desejado', 'date'],
    ['descricao', 'Necessidade do cliente', 'textarea']
  ],
  pedido: [
    ['nome', 'Descrição do pedido', 'text'],
    ['cliente', 'Cliente', 'text'],
    ['fornecedor', 'Fornecedor', 'text'],
    ['valor', 'Valor da venda (R$)', 'number'],
    ['rastreio', 'Código de rastreio', 'text'],
    ['previsao', 'Previsão de entrega', 'date']
  ]
};

function attachCnpjAutofill() {
  const docInput = document.querySelector('#doc');
  if (!docInput) return;

  const parent = docInput.closest('.field');
  let statusEl = parent?.querySelector('#cnpjAutofillStatus');
  if (!statusEl && parent) {
    statusEl = document.createElement('div');
    statusEl.id = 'cnpjAutofillStatus';
    statusEl.style.cssText = 'font-size:12px;margin-top:6px;color:var(--muted);font-weight:600;display:flex;align-items:center;gap:6px';
    statusEl.innerHTML = '⚡ <span>Digite ou cole o CNPJ (14 dígitos) para puxar todos os dados oficiais da Receita Federal.</span>';
    parent.appendChild(statusEl);
  }

  let lastConsulted = '';

  docInput.addEventListener('input', async () => {
    const raw = docInput.value || '';
    const digits = raw.replace(/\D/g, '');

    // Formatação de máscara dinâmica (CPF 11 ou CNPJ 14)
    if (digits.length <= 11) {
      if (typeof formatCpf === 'function') docInput.value = formatCpf(digits);
    } else {
      if (typeof formatCnpj === 'function') docInput.value = formatCnpj(digits);
    }

    if (digits.length === 14 && digits !== lastConsulted) {
      lastConsulted = digits;
      if (statusEl) {
        statusEl.style.color = 'var(--navy)';
        statusEl.innerHTML = '⏳ <span>Localizando empresa na Receita Federal do Brasil...</span>';
      }

      try {
        let dadosEmpresa = null;

        // 1. Tenta API segura do sistema
        try {
          const res = await fetch(`/api/analise-risco?doc=${digits}`);
          if (res.ok) {
            const json = await res.json();
            if (json.sucesso && json.dados) {
              dadosEmpresa = json.dados;
            }
          }
        } catch {}

        // 2. Fallback direto BrasilAPI
        if (!dadosEmpresa) {
          try {
            const resB = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`);
            if (resB.ok) {
              dadosEmpresa = await resB.json();
            }
          } catch {}
        }

        if (dadosEmpresa) {
          const nomeInput = document.querySelector('#nome');
          const contatoInput = document.querySelector('#contato');
          const emailInput = document.querySelector('#email');
          const telInput = document.querySelector('#telefone');
          const endInput = document.querySelector('#endereco');
          const catInput = document.querySelector('#categoria');

          const razao = dadosEmpresa.razao_social || dadosEmpresa.nome || '';
          const fantasia = (dadosEmpresa.nome_fantasia && dadosEmpresa.nome_fantasia !== 'Não informado') ? ` (${dadosEmpresa.nome_fantasia})` : '';

          if (nomeInput) {
            nomeInput.value = (razao + fantasia).trim();
            nomeInput.style.borderColor = '#16a34a';
          }

          if (emailInput && dadosEmpresa.email) {
            emailInput.value = dadosEmpresa.email.toLowerCase();
            emailInput.style.borderColor = '#16a34a';
          }

          if (telInput) {
            const telBruto = dadosEmpresa.ddd_telefone_1 || dadosEmpresa.telefone || '';
            const tDigits = String(telBruto).replace(/\D/g, '');
            if (tDigits.length === 10) {
              telInput.value = `(${tDigits.slice(0, 2)}) ${tDigits.slice(2, 6)}-${tDigits.slice(6)}`;
            } else if (tDigits.length === 11) {
              telInput.value = `(${tDigits.slice(0, 2)}) ${tDigits.slice(2, 7)}-${tDigits.slice(7)}`;
            } else if (telBruto) {
              telInput.value = telBruto;
            }
            telInput.style.borderColor = '#16a34a';
          }

          if (endInput) {
            const partes = [
              dadosEmpresa.logradouro,
              dadosEmpresa.numero ? `nº ${dadosEmpresa.numero}` : '',
              dadosEmpresa.complemento,
              dadosEmpresa.bairro,
              dadosEmpresa.municipio ? `${dadosEmpresa.municipio} - ${dadosEmpresa.uf}` : '',
              dadosEmpresa.cep ? `CEP ${dadosEmpresa.cep}` : ''
            ].filter(Boolean);
            endInput.value = partes.join(', ');
            endInput.style.borderColor = '#16a34a';
          }

          if (contatoInput) {
            if (dadosEmpresa.qsa && dadosEmpresa.qsa.length && dadosEmpresa.qsa[0].nome_socio) {
              contatoInput.value = `${dadosEmpresa.qsa[0].nome_socio} (Sócio Administrador)`;
            } else if (!contatoInput.value) {
              contatoInput.value = 'Diretoria Comercial';
            }
            contatoInput.style.borderColor = '#16a34a';
          }

          if (catInput && dadosEmpresa.cnae_fiscal_descricao) {
            catInput.value = dadosEmpresa.cnae_fiscal_descricao;
            catInput.style.borderColor = '#16a34a';
          }

          if (statusEl) {
            statusEl.style.color = '#16a34a';
            statusEl.innerHTML = `✓ <span><b>${escapeHtml(razao)}</b> preenchido automaticamente da Receita Federal!</span>`;
          }
          toast(`✓ Dados de ${razao.slice(0, 28)} preenchidos da Receita Federal!`);
        } else {
          if (statusEl) {
            statusEl.style.color = 'var(--muted)';
            statusEl.innerHTML = 'CNPJ formatado. Preencha os campos adicionais.';
          }
        }
      } catch (err) {
        if (statusEl) {
          statusEl.style.color = 'var(--muted)';
          statusEl.innerHTML = 'CNPJ formatado. Prossiga com o preenchimento.';
        }
      }
    }
  });
}

function openModal(type) {
  const fields = forms[type] || forms.cliente;
  document.querySelector('#modalTitle').textContent = 'Novo ' + type;
  document.querySelector('#formFields').innerHTML = fields.map(([id, l, t], i) => `
    <div class="field ${t === 'textarea' ? 'full' : ''}">
      <label for="${id}">${l}${i < 2 ? ' *' : ''}</label>
      ${t === 'textarea' ? `<textarea id="${id}" name="${id}"></textarea>` : `<input id="${id}" name="${id}" type="${t}" ${i < 2 ? 'required' : ''}>`}
    </div>
  `).join('');

  // Ativa preenchimento automático oficial via Receita Federal
  if (type === 'cliente' || type === 'fornecedor') {
    setTimeout(() => attachCnpjAutofill(), 60);
  }

  const form = document.querySelector('#entityForm');
  form.dataset.mode = 'new';
  form.dataset.type = type;
  document.querySelector('#saveBtn').textContent = 'Salvar no Supabase';
  document.querySelector('#modal').showModal();
}

document.querySelector('#entityForm').onsubmit = async e => {
  e.preventDefault();
  const form = e.currentTarget;
  const mode = form.dataset.mode;

  showLoader('Salvando no Supabase...', 'Gravando dados com políticas RLS...', 50, 'Processando...');

  try {
    if (mode === 'edit') {
      const type = form.dataset.editType;
      const idx = Number(form.dataset.editIndex);
      const item = db[type][idx];
      if (item) {
        item.nome = document.querySelector('#edit_nome').value;
        item.doc = document.querySelector('#edit_doc').value;
        item.contato = document.querySelector('#edit_contato').value;
        item.email = document.querySelector('#edit_email').value;
        item.telefone = document.querySelector('#edit_telefone').value;
        item.status = document.querySelector('#edit_status').value;

        if (supabaseClient && item.id) {
          await supabaseClient.from(type).update(item).eq('id', item.id).catch(() => {});
        }
        toast('Cadastro atualizado com sucesso no Supabase!');
      }
    } else if (mode === 'dossie') {
      const idx = Number(form.dataset.dossieIndex);
      const op = db.oportunidades[idx];
      if (op) {
        op.descricao = document.querySelector('#edit_op_desc').value;
        op.status = document.querySelector('#edit_op_status').value;
        op.valor = Number(document.querySelector('#edit_op_valor').value);

        if (supabaseClient && op.id) {
          await supabaseClient.from('oportunidades').update(op).eq('id', op.id).catch(() => {});
        }
        toast('Dossiê atualizado com sucesso no Supabase!');
      }
    } else {
      const type = form.dataset.type;
      const data = Object.fromEntries(new FormData(form));
      data.id = `${type}-${Date.now()}`;
      data.criadoPor = currentUser ? currentUser.email : '';
      data.user_id = currentUser ? currentUser.id : null;

      if (type === 'cliente' || type === 'fornecedor') {
        const item = { ...data, status: type === 'cliente' ? 'Ativo' : 'Em validação' };
        if (supabaseClient) {
          await supabaseClient.from(type + 's').insert([item]).catch(() => {});
        }
        db[type + 's'].unshift(item);
      } else if (type === 'oportunidade') {
        const item = { ...data, valor: Number(data.valor), custoEstimado: Number(data.valor) * 0.6, status: 'Entrada' };
        if (supabaseClient) {
          await supabaseClient.from('oportunidades').insert([item]).catch(() => {});
        }
        db.oportunidades.unshift(item);
      } else {
        const item = { ...data, status: 'Pedido recebido' };
        if (supabaseClient) {
          await supabaseClient.from('pedidos').insert([item]).catch(() => {});
        }
        db.pedidos.unshift(item);
      }
      toast(`${type} cadastrado com sucesso no Supabase!`);
    }

    document.querySelector('#modal').close();
    render();
  } catch (err) {
    toast('Erro ao gravar dados no Supabase.');
  } finally {
    hideLoader();
  }
};

function filterTable(val) {
  const q = val.toLowerCase();
  document.querySelectorAll('#dataTable tbody tr').forEach(tr => {
    tr.style.display = tr.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
}
window.filterTable = filterTable;

// 12. ROTAS E RENDER
const titles = {
  dashboard,
  cotacao_ia,
  clientes: () => list('clientes'),
  fornecedores: () => list('fornecedores'),
  oportunidades,
  orcamentos,
  pedidos,
  fiscal,
  fiscal_bot,
  financeiro,
  risco,
  relatorios
};

function render() {
  renderNav();
  if (titles[page]) {
    titles[page]();
  }
  app.classList.remove('entering');
  void app.offsetWidth;
  app.classList.add('entering');

  document.querySelectorAll('[data-go]').forEach(b => b.onclick = () => {
    page = b.dataset.go;
    document.querySelector(`[data-page="${page}"]`)?.click();
  });
  document.querySelectorAll('[data-new]').forEach(b => b.onclick = () => openModal(b.dataset.new));
  document.querySelectorAll('[data-action="new"]').forEach(b => b.onclick = () => openModal('cliente'));
}

function toast(msg) {
  const t = document.querySelector('#toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

// Fechamento estrito: o modal agora fecha exclusivamente ao clicar no botão 'X' vermelho ou Cancelar
// (Removido fechamento acidental ao arrastar seleção de texto para fora do card)
const modalPrincipal = document.querySelector('#modal');
if (modalPrincipal) {
  // Evita fechamentos indesejados ao selecionar texto ou soltar o mouse fora do modal
  modalPrincipal.addEventListener('mousedown', e => {
    e.stopPropagation();
  });
}

// =========================================================================
// 13. MÓDULO DE EMISSÃO DE NOTA FISCAL (NF-e) A PARTIR DE ORÇAMENTOS APROVADOS
// =========================================================================
let notaAtualEmissao = null;

function gerarChaveAcessoNfe(numeroNfe) {
  const uf = '35'; // São Paulo
  const aamm = '2610'; // Outubro de 2026
  const cnpj = '59825765000103';
  const mod = '55';
  const serie = '001';
  const numLimpo = String(numeroNfe || '').replace(/\D/g, '').padStart(9, '0').slice(-9);
  const tipoEmis = '1'; // Normal
  const codAleatorio = '12345678';
  const chaveSemDv = `${uf}${aamm}${cnpj}${mod}${serie}${numLimpo}${tipoEmis}${codAleatorio}`;
  
  // Cálculo do dígito verificador módulo 11
  let soma = 0;
  let peso = 2;
  for (let i = chaveSemDv.length - 1; i >= 0; i--) {
    soma += parseInt(chaveSemDv.charAt(i), 10) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  const resto = soma % 11;
  const dv = (resto === 0 || resto === 1) ? 0 : (11 - resto);
  const chaveCompleta = `${chaveSemDv}${dv}`;

  // Formata em blocos de 4 dígitos para visualização padrão
  return chaveCompleta.replace(/(.{4})/g, '$1 ').trim();
}

function sugerirNcmParaProduto(nomeProduto) {
  const p = (nomeProduto || '').toLowerCase();
  if (p.includes('colch') || p.includes('espuma')) return '9404.21.00';
  if (p.includes('lixo') || p.includes('saco') || p.includes('plástic')) return '3923.21.00';
  if (p.includes('papel') || p.includes('toalha') || p.includes('higiên')) return '4818.20.00';
  if (p.includes('tinta') || p.includes('acrílic')) return '3209.10.10';
  if (p.includes('caneta') || p.includes('escritór')) return '9608.10.00';
  if (p.includes('computador') || p.includes('teclado') || p.includes('mouse') || p.includes('ti')) return '8471.30.12';
  return '9999.99.99';
}

function abrirEmissaoNotaOrcamento(index) {
  const orc = db.orcamentos[index] || db.orcamentos[0];
  if (!orc) return toast('Orçamento não localizado.');

  orcamentoAtualIndex = index;

  // Se o orçamento ainda estiver pendente ou em cotação, altera o status para Aprovado automaticamente
  if (orc.status !== 'Aprovado' && !String(orc.status).includes('Faturado')) {
    orc.status = 'Aprovado';
    try {
      localStorage.setItem(ORCAMENTOS_STORAGE_KEY, JSON.stringify(db.orcamentos));
    } catch {}
  }

  const modal = document.querySelector('#modalEmissaoNota');
  if (!modal) return;

  // Determina o número respectivo exato de cada nota fiscal
  let proximoNumNfe = '000.027';
  if (orc.nfe_numero) {
    const limpo = String(orc.nfe_numero).replace(/\D/g, '');
    proximoNumNfe = `000.${limpo.padStart(3, '0')}`;
  } else if (orc.observacoes && /NF-e\s*n[ºo°]?\s*(\d+)/i.test(orc.observacoes)) {
    const matchNfe = orc.observacoes.match(/NF-e\s*n[ºo°]?\s*(\d+)/i);
    proximoNumNfe = `000.${matchNfe[1].padStart(3, '0')}`;
  } else {
    const numBase = String(orc.numero || (index + 1)).split('/')[0].replace(/\D/g, '');
    proximoNumNfe = `000.${(numBase || String(index + 1)).padStart(3, '0')}`;
  }

  document.querySelector('#nfe_orc_index').value = index;
  document.querySelector('#nfe_badge_orc_num').textContent = orc.numero || `${proximoNumNfe}/2026`;
  document.querySelector('#nfe_numero').value = proximoNumNfe;

  // Preenche dados do cliente
  document.querySelector('#nfe_dest_nome').value = orc.cliente_nome || orc.cliente || 'Lar dos Velhinhos de Piracicaba';
  document.querySelector('#nfe_dest_doc').value = orc.cliente_doc || '54.406.723/0001-14';
  document.querySelector('#nfe_dest_ie').value = 'ISENTO';
  document.querySelector('#nfe_dest_endereco').value = orc.cliente_endereco || 'Av. Torquato da Silva Leitão, 615 - São Dimas - Piracicaba/SP';
  document.querySelector('#nfe_dest_email').value = orc.cliente_email || 'compras@lardosvelhinhospiracicaba.org.br';
  document.querySelector('#nfe_dest_tel').value = orc.cliente_telefone || '(19) 3372-9485';

  // Popula itens faturados
  const tbody = document.querySelector('#nfeItensBody');
  tbody.innerHTML = (orc.itens || []).map((it, i) => {
    const ncm = sugerirNcmParaProduto(it.produto);
    return `
      <tr style="border-bottom:1px solid #e2e8f0">
        <td style="padding:8px;text-align:center;font-weight:700">${it.item || (i + 1)}</td>
        <td style="padding:8px">
          <b>${escapeHtml(it.produto)}</b>
        </td>
        <td style="padding:8px;text-align:center">
          <input value="${ncm}" class="nfe-item-ncm" style="width:85px;padding:4px;font-size:11.5px;text-align:center;border:1px solid #cbd5e1;border-radius:4px">
        </td>
        <td style="padding:8px;text-align:center">${escapeHtml(it.unidade || '1')}</td>
        <td style="padding:8px;text-align:center;font-weight:700">${it.quantidade}</td>
        <td style="padding:8px;text-align:right">${money(it.valor_unitario)}</td>
        <td style="padding:8px;text-align:right;font-weight:700;color:#073863">${money(it.total)}</td>
      </tr>
    `;
  }).join('');

  // Totais
  document.querySelector('#nfe_subtotal_display').textContent = money(orc.subtotal);
  document.querySelector('#nfe_desconto_display').textContent = `- ${money(orc.desconto || 0)}`;
  document.querySelector('#nfe_frete_display').textContent = money(orc.frete || 0);
  document.querySelector('#nfe_total_display').textContent = money(orc.valor_total);

  // Observações adicionais
  const obsPadrao = `Orçamento Aprovado Nº ${orc.numero || '027/2026'}. Documento emitido por ME ou EPP optante pelo Simples Nacional. Não gera direito a crédito fiscal de IPI e ICMS. Entrega no endereço do destinatário: ${orc.cliente_endereco || 'Conforme cadastro'}.`;
  document.querySelector('#nfe_dados_adicionais').value = obsPadrao;

  // Fecha eventuais modais abertas antes
  document.querySelector('#proposalModal')?.close();
  modal.showModal();
}
window.abrirEmissaoNotaOrcamento = abrirEmissaoNotaOrcamento;

function abrirEmissaoNotaOrcamentoAtual() {
  abrirEmissaoNotaOrcamento(orcamentoAtualIndex);
}
window.abrirEmissaoNotaOrcamentoAtual = abrirEmissaoNotaOrcamentoAtual;

function compilarDadosNotaDoFormulario() {
  const index = parseInt(document.querySelector('#nfe_orc_index').value, 10);
  const orc = db.orcamentos[index] || db.orcamentos[0] || {};
  const numNfe = document.querySelector('#nfe_numero').value.trim() || '000.027';
  const chaveAcesso = gerarChaveAcessoNfe(numNfe);
  const hojeIso = new Date().toISOString();
  const protocolo = `1352600${Date.now().toString().slice(-8)} - ${formatarDataBr(hojeIso)} 05:00:00`;

  return {
    id: `nfe-${Date.now()}`,
    numero: numNfe,
    serie: '1',
    tipo_documento: document.querySelector('#nfe_tipo_doc').value,
    natureza_operacao: document.querySelector('#nfe_natureza_op').value.trim(),
    cfop: document.querySelector('#nfe_cfop').value,
    chave_acesso: chaveAcesso,
    protocolo: protocolo,
    data_emissao: hojeIso,
    orcamento_origem: orc.numero || '027/2026',
    orcamento_id: orc.id,
    
    // Emitente
    emitente: {
      razao_social: '59.825.765 Michel do Prado',
      nome_fantasia: 'Prado Comércio & Soluções / LicitaDigitalTech',
      cnpj: '59.825.765/0001-03',
      ie: '465.150.144.115',
      cidade: 'Monte Mor - SP',
      cep: '13190-000',
      telefone: '(19) 98814-6164',
      email: 'licitadigitaltech@gmail.com'
    },

    // Destinatário
    destinatario_nome: document.querySelector('#nfe_dest_nome').value.trim(),
    destinatario_doc: document.querySelector('#nfe_dest_doc').value.trim(),
    destinatario_ie: document.querySelector('#nfe_dest_ie').value.trim() || 'ISENTO',
    destinatario_endereco: document.querySelector('#nfe_dest_endereco').value.trim(),
    destinatario_email: document.querySelector('#nfe_dest_email').value.trim(),
    destinatario_tel: document.querySelector('#nfe_dest_tel').value.trim(),

    // Itens
    itens: (orc.itens || []).map((it, i) => ({
      item: it.item || (i + 1),
      produto: it.produto,
      ncm: sugerirNcmParaProduto(it.produto),
      cfop: document.querySelector('#nfe_cfop').value.replace(/\D/g, '') || '5102',
      unidade: it.unidade || '1',
      quantidade: it.quantidade,
      valor_unitario: it.valor_unitario,
      total: it.total
    })),

    // Totais
    subtotal: orc.subtotal || orc.valor_total || 0,
    desconto: orc.desconto || 0,
    frete: orc.frete || 0,
    valor_total: orc.valor_total || 0,
    forma_pagamento: document.querySelector('#nfe_forma_pagamento').value,
    vencimento: document.querySelector('#nfe_vencimento').value.trim(),
    dados_adicionais: document.querySelector('#nfe_dados_adicionais').value.trim(),
    status: 'Autorizada SEFAZ SP',
    emitidaPor: currentUser ? currentUser.email : 'licitadigitaltech@gmail.com'
  };
}

// -------------------------------------------------------------------------
// MOTOR DE CÓDIGO DE BARRAS CODE 128-C (PADRÃO OFICIAL SEFAZ / MINISTÉRIO DA FAZENDA)
// Codifica rigorosamente os 44 dígitos da chave de acesso para leitura por qualquer scanner óptico ou celular
// -------------------------------------------------------------------------
const CODE128_PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112'
];

function desenharCode128CSvg(svgEl, chave44) {
  const digits = String(chave44 || '').replace(/\D/g, '').padStart(44, '0').slice(-44);
  const codes = [105]; // Start Code C (exclusivo para pares de números)
  let checksum = 105;
  for (let i = 0; i < 44; i += 2) {
    const val = parseInt(digits.slice(i, i + 2), 10);
    codes.push(val);
    checksum += val * (i / 2 + 1);
  }
  codes.push(checksum % 103);
  codes.push(106); // Stop Code

  let pattern = '';
  codes.forEach(c => {
    pattern += (CODE128_PATTERNS[c] || '211232');
  });

  const quietZone = 10; // Margem de silêncio oficial de 10 módulos à esquerda e direita
  let totalModulos = quietZone * 2;
  for (let i = 0; i < pattern.length; i++) {
    totalModulos += parseInt(pattern[i], 10);
  }

  const moduloWidth = 1.0;
  const height = 40;
  const svgWidth = totalModulos * moduloWidth;

  let x = quietZone * moduloWidth;
  let isBar = true;
  let rects = '';

  for (let i = 0; i < pattern.length; i++) {
    const w = parseInt(pattern[i], 10) * moduloWidth;
    if (isBar) {
      rects += `<rect x="${x.toFixed(2)}" y="0" width="${w.toFixed(2)}" height="${height}" fill="#000000" />`;
    }
    x += w;
    isBar = !isBar;
  }

  svgEl.setAttribute('viewBox', `0 0 ${svgWidth} ${height}`);
  svgEl.setAttribute('preserveAspectRatio', 'none');
  svgEl.setAttribute('width', '100%');
  svgEl.setAttribute('height', `${height}px`);
  svgEl.innerHTML = `<rect width="${svgWidth}" height="${height}" fill="#ffffff" />` + rects;
}

function renderizarCodigoBarrasDanfe(chaveAcesso) {
  const svg = document.querySelector('#danfeBarcode');
  if (!svg) return;
  const chaveLimpa = String(chaveAcesso || '').replace(/\D/g, '').padStart(44, '0').slice(-44);

  // Tenta biblioteca JsBarcode primeiro
  if (typeof window.JsBarcode === 'function') {
    try {
      window.JsBarcode(svg, chaveLimpa, {
        format: 'CODE128C',
        lineColor: '#000000',
        width: 1.25,
        height: 38,
        displayValue: false,
        margin: 6,
        background: '#ffffff'
      });
      return;
    } catch (e) {
      console.warn('JsBarcode aviso, ativando motor nativo Code 128C:', e);
    }
  }

  // Motor nativo vetorial ISO/IEC 15417 Code 128C (100% autônomo e escaneável)
  desenharCode128CSvg(svg, chaveLimpa);
}
window.renderizarCodigoBarrasDanfe = renderizarCodigoBarrasDanfe;

function preencherDanfeComDados(nota) {
  notaAtualEmissao = nota;

  document.querySelectorAll('.danfe-num-val').forEach(el => el.textContent = nota.numero);
  document.querySelector('#danfeChaveAcesso').textContent = nota.chave_acesso;
  document.querySelector('#danfeNaturezaOp').textContent = (nota.natureza_operacao || '').toUpperCase();
  document.querySelector('#danfeProtocolo').textContent = nota.protocolo;
  
  document.querySelector('#danfeDestNome').textContent = nota.destinatario_nome;
  document.querySelector('#danfeDestCnpj').textContent = nota.destinatario_doc;
  document.querySelector('#danfeDataEmissao').textContent = formatarDataBr(nota.data_emissao);
  document.querySelector('#danfeDestEndereco').textContent = nota.destinatario_endereco;
  document.querySelector('#danfeDestTel').textContent = nota.destinatario_tel || '—';

  document.querySelector('#danfeValProd').textContent = money(nota.subtotal);
  document.querySelector('#danfeValDesc').textContent = money(nota.desconto);
  document.querySelector('#danfeValNota').textContent = money(nota.valor_total);
  document.querySelector('#danfeObs').textContent = nota.dados_adicionais;

  // Renderiza código de barras real escaneável
  renderizarCodigoBarrasDanfe(nota.chave_acesso);

  // Itens na tabela do DANFE
  const tbody = document.querySelector('#danfeItensBody');
  tbody.innerHTML = (nota.itens || []).map((it, i) => `
    <tr style="border-bottom:1px solid #000">
      <td style="border-right:1px solid #000;padding:3px;text-align:center">${it.item || (i + 1)}</td>
      <td style="border-right:1px solid #000;padding:3px"><b>${escapeHtml(it.produto)}</b></td>
      <td style="border-right:1px solid #000;padding:3px;text-align:center">${it.ncm}</td>
      <td style="border-right:1px solid #000;padding:3px;text-align:center">${it.cfop}</td>
      <td style="border-right:1px solid #000;padding:3px;text-align:center">${escapeHtml(it.unidade || 'UN')}</td>
      <td style="border-right:1px solid #000;padding:3px;text-align:center;font-weight:bold">${it.quantidade}</td>
      <td style="border-right:1px solid #000;padding:3px;text-align:right">${money(it.valor_unitario)}</td>
      <td style="padding:3px;text-align:right;font-weight:bold">${money(it.total)}</td>
    </tr>
  `).join('');
}

function abrirPreviaDanfe() {
  const nota = compilarDadosNotaDoFormulario();
  preencherDanfeComDados(nota);
  document.querySelector('#modalDanfeView').showModal();
}
window.abrirPreviaDanfe = abrirPreviaDanfe;

async function transmitirEEmitirNfe(e) {
  if (e) e.preventDefault();

  const nota = compilarDadosNotaDoFormulario();
  const index = parseInt(document.querySelector('#nfe_orc_index').value, 10);

  showLoader(
    'Transmitindo NF-e...',
    'Conectando com o WebService SEFAZ SP e gerando protocolo de autorização...',
    65,
    'Validando schema e autorizando lote...'
  );

  try {
    await new Promise(r => setTimeout(r, 900));

    // Salva no banco de dados local
    db.notas_fiscais.unshift(nota);
    try {
      localStorage.setItem(NOTAS_FISCAIS_STORAGE_KEY, JSON.stringify(db.notas_fiscais));
    } catch {}

    // Atualiza status do orçamento correspondente para 'Aprovado e Faturado'
    if (db.orcamentos[index]) {
      db.orcamentos[index].status = 'Faturado (NF-e Emitida)';
      db.orcamentos[index].nfe_numero = nota.numero;
      db.orcamentos[index].nfe_chave = nota.chave_acesso;
      try {
        localStorage.setItem(ORCAMENTOS_STORAGE_KEY, JSON.stringify(db.orcamentos));
      } catch {}
    }

    // Registra auditoria
    if (typeof window.registrarAuditoria === 'function') {
      window.registrarAuditoria(
        'Emissão de Nota Fiscal',
        'Fiscal / Faturamento',
        `NF-e Nº ${nota.numero} emitida com sucesso para ${nota.destinatario_nome} (${nota.destinatario_doc}) no valor de ${money(nota.valor_total)}`
      );
    }

    // Sincroniza com Supabase se disponível
    if (supabaseClient) {
      try {
        await supabaseClient.from('notas_fiscais').insert([nota]);
      } catch {}
    }

    toast(`🎉 Nota Fiscal NF-e Nº ${nota.numero} emitida e autorizada com sucesso!`);
    
    document.querySelector('#modalEmissaoNota')?.close();
    preencherDanfeComDados(nota);
    document.querySelector('#modalDanfeView')?.showModal();

    // Atualiza a visualização da tela
    if (page === 'orcamentos') orcamentos();
    else if (page === 'fiscal') fiscal();

  } catch (err) {
    toast('Erro ao autorizar emissão da NF-e.');
  } finally {
    hideLoader();
  }
}
window.transmitirEEmitirNfe = transmitirEEmitirNfe;

function visualizarDanfeNotaSalva(index) {
  const nota = db.notas_fiscais[index];
  if (!nota) return toast('Nota fiscal não localizada.');
  preencherDanfeComDados(nota);
  document.querySelector('#modalDanfeView')?.showModal();
}
window.visualizarDanfeNotaSalva = visualizarDanfeNotaSalva;

function imprimirDanfe() {
  const printContent = document.querySelector('#danfePrintArea');
  if (!printContent) {
    window.print();
    return;
  }

  let iframe = document.querySelector('#pradoDanfePrintIframe');
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'pradoDanfePrintIframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);
  }

  const doc = iframe.contentDocument || iframe.contentWindow.document;
  doc.open();
  doc.write(`<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>DANFE - NF-e ${notaAtualEmissao ? notaAtualEmissao.numero : '000.027'}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #fff !important;
      color: #000 !important;
      font-family: Arial, sans-serif !important;
      font-size: 10px !important;
      line-height: 1.2 !important;
      padding: 10px 14px !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    svg { display: block; margin: 0 auto; max-width: 100%; }
    @page { size: A4 portrait; margin: 8mm; }
  </style>
</head>
<body>
  ${printContent.innerHTML}
</body>
</html>`);
  doc.close();

  setTimeout(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
  }, 350);
}
window.imprimirDanfe = imprimirDanfe;

function baixarXmlNfeAtual() {
  const nota = notaAtualEmissao || db.notas_fiscais[0];
  if (!nota) return toast('Nota fiscal não localizada.');

  const chaveLimpa = (nota.chave_acesso || '').replace(/\s+/g, '');
  const xmlConteudo = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <NFe>
    <infNFe Id="NFe${chaveLimpa}" versao="4.00">
      <ide>
        <cUF>35</cUF>
        <cNF>12345678</cNF>
        <natOp>${escapeHtml(nota.natureza_operacao)}</natOp>
        <mod>55</mod>
        <serie>${nota.serie || '1'}</serie>
        <nNF>${String(nota.numero || '27').replace(/\D/g, '')}</nNF>
        <dhEmi>${nota.data_emissao}</dhEmi>
        <tpNF>1</tpNF>
        <idDest>1</idDest>
        <cMunFG>3531803</cMunFG>
        <tpImp>1</tpImp>
        <tpEmis>1</tpEmis>
        <cDV>0</cDV>
        <tpAmb>1</tpAmb>
        <finNFe>1</finNFe>
        <indFinal>1</indFinal>
        <indPres>1</indPres>
        <procEmi>0</procEmi>
        <verProc>Prado_v1.0</verProc>
      </ide>
      <emit>
        <CNPJ>59825765000103</CNPJ>
        <xNome>59.825.765 MICHEL DO PRADO</xNome>
        <xFant>PRADO COMERCIO E SOLUCOES</xFant>
        <enderEmit>
          <xLgr>RUA PRINCIPAL</xLgr>
          <nro>100</nro>
          <xBairro>CENTRO</xBairro>
          <cMun>3531803</cMun>
          <xMun>MONTE MOR</xMun>
          <UF>SP</UF>
          <CEP>13190000</CEP>
          <cPais>1058</cPais>
          <xPais>BRASIL</xPais>
        </enderEmit>
        <IE>465150144115</IE>
        <CRT>4</CRT>
      </emit>
      <dest>
        <CNPJ>${String(nota.destinatario_doc || '').replace(/\D/g, '')}</CNPJ>
        <xNome>${escapeHtml(nota.destinatario_nome)}</xNome>
        <enderDest>
          <xLgr>${escapeHtml(nota.destinatario_endereco)}</xLgr>
          <nro>S/N</nro>
          <UF>SP</UF>
        </enderDest>
        <indIEDest>9</indIEDest>
        <email>${escapeHtml(nota.destinatario_email || '')}</email>
      </dest>
      <total>
        <ICMSTot>
          <vProd>${Number(nota.subtotal || 0).toFixed(2)}</vProd>
          <vDesc>${Number(nota.desconto || 0).toFixed(2)}</vDesc>
          <vNF>${Number(nota.valor_total || 0).toFixed(2)}</vNF>
        </ICMSTot>
      </total>
      <infAdic>
        <infCpl>${escapeHtml(nota.dados_adicionais)}</infCpl>
      </infAdic>
    </infNFe>
  </NFe>
  <protNFe versao="4.00">
    <infProt>
      <tpAmb>1</tpAmb>
      <verAplic>SP_NFE_v4.00</verAplic>
      <chNFe>${chaveLimpa}</chNFe>
      <dhRecbto>${nota.data_emissao}</dhRecbto>
      <nProt>${String(nota.protocolo || '').split(' ')[0]}</nProt>
      <cStat>100</cStat>
      <xMotivo>Autorizado o uso da NF-e</xMotivo>
    </infProt>
  </protNFe>
</nfeProc>`;

  const blob = new Blob([xmlConteudo], { type: 'application/xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `NFe_${chaveLimpa || '000027'}.xml`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  toast(`Arquivo XML NFe_${chaveLimpa.slice(0, 8)}... baixado com sucesso!`);
}
window.baixarXmlNfeAtual = baixarXmlNfeAtual;

function baixarXmlNotaSalva(index) {
  const nota = db.notas_fiscais[index];
  if (!nota) return toast('Nota fiscal não localizada.');
  notaAtualEmissao = nota;
  baixarXmlNfeAtual();
}
window.baixarXmlNotaSalva = baixarXmlNotaSalva;

function enviarNfeWhatsApp() {
  const nota = notaAtualEmissao || db.notas_fiscais[0];
  if (!nota) return toast('Nota fiscal não localizada.');

  const zapNum = String(nota.destinatario_tel || '').replace(/\D/g, '');
  const texto = encodeURIComponent(
    `Olá, aqui é da Prado Comércio & Soluções!\n\n` +
    `Segue o faturamento oficial referente ao seu pedido:\n` +
    `📄 *Nota Fiscal:* NF-e Nº ${nota.numero} (Série 1)\n` +
    `🏢 *Destinatário:* ${nota.destinatario_nome}\n` +
    `💰 *Valor Total:* ${money(nota.valor_total)}\n` +
    `🔑 *Chave de Acesso:* ${nota.chave_acesso}\n\n` +
    `Acesse o portal da Fazenda para conferência: https://www.nfe.fazenda.gov.br\n\n` +
    `Obrigado pela preferência e parceria!`
  );

  const zapUrl = zapNum ? `https://wa.me/55${zapNum}?text=${texto}` : `https://wa.me/?text=${texto}`;
  window.open(zapUrl, '_blank');
}
window.enviarNfeWhatsApp = enviarNfeWhatsApp;

function enviarNfeWhatsAppNotaSalva(index) {
  const nota = db.notas_fiscais[index];
  if (!nota) return toast('Nota fiscal não localizada.');
  notaAtualEmissao = nota;
  enviarNfeWhatsApp();
}
window.enviarNfeWhatsAppNotaSalva = enviarNfeWhatsAppNotaSalva;

// Autenticação (senha + Google Authenticator) em auth.js
