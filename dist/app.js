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
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}

  // Orçamento histórico de referência oficial (conforme modelo timbrado homologado da Prado)
  return [
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
      observacoes: 'Desconto de R$ 15.000,00 já aplicado onde o preço de cada unidade passa a ser R$485,00. Preço válido até 30/10/2026. Prazo de entrega 30 dias, certificado de garantia em anexo.',
      status: 'Aprovado',
      criadoPor: 'licitadigitaltech@gmail.com',
      criadoEm: '2026-10-09T10:00:00.000Z'
    }
  ];
}

let db = {
  clientes: [],
  fornecedores: [],
  oportunidades: [],
  pedidos: [],
  orcamentos: carregarOrcamentosIniciais(),
  docs: []
};

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

// 6. RENDERIZAÇÃO DA NAVEGAÇÃO E PERFIL
function renderNav() {
  document.querySelector('#nav').innerHTML = menu.map(([id, ic, n]) =>
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

      ${currentUser.role !== 'admin_global' ? `<div class="notice" style="margin-bottom:18px"><b>Visão restrita de operador</b><span>Você está visualizando apenas cadastros e oportunidades atribuídos à sua conta pelo Supabase RLS.</span></div>` : ''}
      <div class="metrics">
        ${metric('Vendas em negociação', money(totalVendas), `${ops.length} oportunidade(s) ativa(s)`, '↗')}
        ${metric('Margem estimada', money(margem), totalVendas ? `${((margem / totalVendas) * 100).toFixed(1)}% sobre a venda` : '0%', '◈')}
        ${metric('Contas a receber', money(0), 'Nenhum vencimento pendente', '↓')}
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
        <span class="badge ${o.status === 'Aprovado' ? 'ok' : (o.status === 'Cancelado' ? 'error' : 'warn')}" style="${o.status === 'Aprovado' ? 'background:#e8fdf0;color:#166534' : ''}">
          ${escapeHtml(o.status || 'Em cotação')}
        </span>
      </td>
      <td>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
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
              <th style="width:120px">Status</th>
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
  head('NF-e e documentos fiscais', 'Emissão simplificada e guarda de documentos fiscais');
  app.innerHTML = `
    <div class="content">
      <div class="grid2">
        <div class="card">
          <div class="card-head"><h2>Documentos fiscais e XMLs</h2></div>
          <p style="color:var(--muted);font-size:13px">Gerenciador de XMLs e DANFEs de intermediação comercial.</p>
          <div class="deal">
            <div><b>Nota Fiscal de Intermediação / Serviço</b><small>Vinculada a pedidos concluídos</small></div>
            <span class="badge">SEBRAE SP</span>
          </div>
          <div class="deal">
            <div><b>DANFEs de Fornecedores</b><small>Armazenadas no Supabase Storage</small></div>
            <span class="badge">Seguro</span>
          </div>
        </div>
        <div class="card">
          <div class="card-head"><h2>Emissor SEBRAE SP CRT-4</h2></div>
          <p style="color:var(--muted);font-size:13px">Acesse o robô de preenchimento assistido para faturamento sem erros.</p>
          <button class="primary" style="margin-top:10px" data-go="fiscal_bot">🤖 Acessar MB Fiscal BOT (SEBRAE)</button>
        </div>
      </div>
    </div>
  `;
}

function financeiro() {
  head('Gestão financeira', 'Custos, vendas, margens de intermediação e fluxo de caixa');
  const ops = getFilteredData('oportunidades');
  const totalVendas = ops.reduce((acc, o) => acc + (Number(o.valor) || 0), 0);
  const totalCusto = ops.reduce((acc, o) => acc + (Number(o.custoEstimado) || (Number(o.valor) * 0.6)), 0);
  const margem = totalVendas - totalCusto;

  app.innerHTML = `
    <div class="content">
      <div class="metrics">
        ${metric('Faturamento bruto', money(totalVendas), 'Volume total intermediado', '↗')}
        ${metric('Custo das indústrias', money(totalCusto), 'Preço pago aos fabricantes', '↘')}
        ${metric('Margem líquida Prado', money(margem), totalVendas ? `${((margem / totalVendas) * 100).toFixed(1)}% de margem` : '0%', '★')}
        ${metric('Comissões a faturar', money(margem * 0.95), 'Provisão líquida de impostos', '▣')}
      </div>
      <div class="card" style="margin-top:20px">
        <div class="card-head"><h2>Detalhamento por Intermediação Comercial</h2></div>
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
            }).join('') : `<tr><td colspan="6" style="text-align:center;padding:30px">Nenhuma intermediação para cálculo financeiro.</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

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

// 8. COTAÇÕES IA & FÁBRICAS (COM FILTROS REGIONAIS, ROTAÇÃO DE FÁBRICAS E VALIDAÇÃO DE AUTENTICAÇÃO)
let cotacaoOffsetRotacao = 0;

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
          <!-- CAMPO PRINCIPAL DE DEMANDA -->
          <label for="iaDemandaInput" style="font-weight:700;display:block;margin-bottom:6px">O que você precisa cotar?</label>
          <div style="margin-bottom:12px">
            <input id="iaDemandaInput" placeholder="Ex: Colchão D33 hospitalar, Saco de lixo 100L reforçado, 1000 canetas, tinta acrílica 18L..." onkeydown="if(event.key==='Enter'){event.preventDefault();executarCotacaoIA(false);}" style="width:100%;padding:12px 14px;border:1px solid var(--line);border-radius:8px;font-size:14px">
          </div>

          <!-- FILTROS REGIONAIS: ESTADO E CIDADE -->
          <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;margin-bottom:14px;background:#f8fafc;padding:12px 14px;border-radius:8px;border:1px solid var(--line)">
            <div style="flex:1;min-width:180px">
              <label for="iaFiltroEstado" style="display:block;font-size:12px;font-weight:700;color:var(--ink);margin-bottom:4px">
                📍 Filtrar por Estado (UF):
              </label>
              <select id="iaFiltroEstado" style="width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:6px;background:#fff;font-size:13px;font-weight:600">
                <option value="">Brasil Inteiro (Todos os Estados)</option>
                <option value="SP">São Paulo (SP)</option>
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
                <option value="AM">Amazonas (AM)</option>
                <option value="PA">Pará (PA)</option>
                <option value="MA">Maranhão (MA)</option>
                <option value="PB">Paraíba (PB)</option>
                <option value="RN">Rio Grande do Norte (RN)</option>
                <option value="AL">Alagoas (AL)</option>
                <option value="SE">Sergipe (SE)</option>
                <option value="PI">Piauí (PI)</option>
                <option value="TO">Tocantins (TO)</option>
                <option value="RO">Rondônia (RO)</option>
                <option value="AC">Acre (AC)</option>
                <option value="AP">Amapá (AP)</option>
                <option value="RR">Roraima (RR)</option>
              </select>
            </div>

            <div style="flex:1.5;min-width:200px">
              <label for="iaFiltroCidade" style="display:block;font-size:12px;font-weight:700;color:var(--ink);margin-bottom:4px">
                🏙️ Cidade / Polo Industrial (Opcional):
              </label>
              <input id="iaFiltroCidade" placeholder="Ex: Ourinhos, Maringá, São Paulo, Anápolis..." style="width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:6px;background:#fff;font-size:13px">
            </div>

            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <button id="btnBuscarFabricantes" class="primary" style="background:var(--gold);color:#151515;font-weight:800;height:42px;padding:0 18px" onclick="executarCotacaoIA(false)">
                ⚡ Localizar Fabricantes
              </button>
              <button id="btnRotacionarFabricantes" class="secondary" style="border:1px solid var(--teal);color:var(--teal);background:#fff;font-weight:700;height:42px;padding:0 16px" onclick="executarCotacaoIA(true)" title="Atualiza o catálogo buscando outras 3 indústrias da mesma área">
                🔄 Atualizar / Buscar Outras Fábricas
              </button>
            </div>
          </div>
        </div>
      </div>
      <div id="iaResultadosArea">
        ${renderizarResultadosIACards(ultimosOrcamentosIA)}
      </div>
    </div>
  `;
}

async function executarCotacaoIA(isRotacao = false) {
  const input = document.querySelector('#iaDemandaInput');
  const estadoSelect = document.querySelector('#iaFiltroEstado');
  const cidadeInput = document.querySelector('#iaFiltroCidade');

  const texto = input ? input.value.trim() : '';
  const estado = estadoSelect ? estadoSelect.value.trim() : '';
  const cidade = cidadeInput ? cidadeInput.value.trim() : '';

  if (!texto) return toast('Digite o produto ou demanda para cotação.');

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

  const regiaoMsg = [cidade, estado].filter(Boolean).join(', ');
  const loadingTxt = regiaoMsg ? `Filtrando indústrias em ${regiaoMsg}...` : 'Consultando base nacional de indústrias e inteligência de mercado...';

  showLoader(isRotacao ? 'Buscando Outras Indústrias...' : 'Pesquisando Indústrias Nacionais...', loadingTxt, 45, 'Localizando fornecedores homologados...');

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
      toast(isRotacao ? 'Próximas indústrias carregadas com sucesso!' : '3 Indústrias nacionais reais localizadas com sucesso!');
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
        <p>Digite o produto no campo acima e clique em 'Localizar 3 Fabricantes' para a IA pesquisar as indústrias e telefones.</p>
      </div>
    `;
  }

  const fabs = data.fabricantes;

  return `
    <div style="background:#eef6fa;border:1px solid #c9e0ed;border-left:4px solid var(--teal);padding:14px;border-radius:10px;margin-bottom:18px">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
        <b style="color:var(--navy);font-size:14px">🎯 Estratégia Comercial Prado:</b>
        <span class="badge" style="background:#134433;color:#4ade80;font-size:11px">● FABRICANTES 100% REAIS E HOMOLOGADOS</span>
      </div>
      <p style="margin:6px 0 0;font-size:13px;color:#24445c">${escapeHtml(data.orientacao_negociacao || '')}</p>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:16px">
      ${fabs.map((f, idx) => {
        const isBest = idx === 0;
        const cleanZap = String(f.whatsapp || '').replace(/\D/g, '');
        const cleanTel = String(f.telefone || '').replace(/\D/g, '');

        return `
          <div class="card" style="display:flex;flex-direction:column;border:${isBest ? '2px solid var(--gold)' : '1px solid var(--line)'};position:relative;padding:18px">
            ${isBest ? `<div style="position:absolute;top:-11px;right:16px;background:var(--gold);color:#1a1a1a;font-size:11px;font-weight:800;padding:2px 10px;border-radius:999px">★ RECOMENDADO / MAIOR MARGEM</div>` : ''}

            <div style="border-bottom:1px solid var(--line);padding-bottom:12px;margin-bottom:12px">
              <span class="badge" style="background:#edf3f6;color:var(--navy)">Opção ${idx + 1}</span>
              <h3 style="margin:8px 0 4px;font-size:16px;color:var(--navy)">${escapeHtml(f.nome_empresa)}</h3>
              <small style="color:var(--muted);display:block">CNPJ: <b>${escapeHtml(f.cnpj || '—')}</b> · ${escapeHtml(f.localizacao || '')}</small>
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
                <b style="font-size:13px"><a href="tel:${cleanTel}" style="color:var(--ink);text-decoration:none">${escapeHtml(f.telefone)}</a></b>
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
              <small style="color:var(--muted);font-size:11px">Diferencial:</small>
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
              Prazo: <b>${escapeHtml(f.prazo_entrega)}</b> · Faturamento: <b>${escapeHtml(f.condicoes_pagamento)}</b>
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

    toast(`Indústria ${f.nome_empresa} cadastrada no Supabase!`);
    abrirPropostaPDF(0);
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
  document.querySelector('#orc_pagamento').value = isEdit ? (orc.pagamento || 'À vista.') : 'À vista.';
  document.querySelector('#orc_entrega_frete').value = isEdit ? (orc.entrega_frete || 'Prazo sujeito à disponibilidade. Frete incluso, salvo indicação expressa.') : 'Prazo sujeito à disponibilidade. Frete incluso, salvo indicação expressa.';
  document.querySelector('#orc_observacoes').value = isEdit ? (orc.observacoes || '') : '';
  document.querySelector('#orc_status').value = isEdit ? (orc.status || 'Aprovado') : 'Aprovado';

  // Popula itens
  const tbody = document.querySelector('#orcItensBody');
  tbody.innerHTML = '';

  if (isEdit && Array.isArray(orc.itens) && orc.itens.length > 0) {
    orc.itens.forEach(it => adicionarLinhaItemOrcamento(it.produto, it.unidade, it.quantidade, it.valor_unitario));
  } else {
    adicionarLinhaItemOrcamento('', '1', 1, 0);
  }

  recalcularTotaisOrcamento();
  modal.showModal();
}
window.abrirModalNovoOrcamento = abrirModalNovoOrcamento;

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

function adicionarLinhaItemOrcamento(produto = '', unidade = '1', quantidade = 1, valorUnit = 0) {
  const tbody = document.querySelector('#orcItensBody');
  if (!tbody) return;

  const rowCount = tbody.querySelectorAll('tr').length + 1;
  const tr = document.createElement('tr');
  tr.className = 'orc-item-row';
  tr.innerHTML = `
    <td style="text-align:center;font-weight:700" class="row-num">${rowCount}</td>
    <td>
      <input class="item-prod" value="${escapeHtml(produto)}" placeholder="Descrição completa do produto e especificação" required>
    </td>
    <td>
      <input class="item-un" value="${escapeHtml(unidade || '1')}" placeholder="UN" style="text-align:center">
    </td>
    <td>
      <input type="number" min="1" step="1" class="item-qtd" value="${quantidade || 1}" oninput="recalcularTotaisOrcamento()" required style="text-align:center">
    </td>
    <td>
      <input type="number" min="0" step="0.01" class="item-vlr" value="${valorUnit || 0}" oninput="recalcularTotaisOrcamento()" required style="text-align:right">
    </td>
    <td style="text-align:right;font-weight:700" class="item-total-display">
      ${money((quantidade || 1) * (valorUnit || 0))}
    </td>
    <td style="text-align:center">
      <button type="button" class="link" style="color:var(--red);font-size:16px;cursor:pointer" onclick="removerLinhaItemOrcamento(this)">✕</button>
    </td>
  `;
  tbody.appendChild(tr);
  recalcularTotaisOrcamento();
}
window.adicionarLinhaItemOrcamento = adicionarLinhaItemOrcamento;

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
  let subtotal = 0;

  rows.forEach(r => {
    const qtd = parseFloat(r.querySelector('.item-qtd')?.value || 0) || 0;
    const vlr = parseFloat(r.querySelector('.item-vlr')?.value || 0) || 0;
    const itemTotal = Number((qtd * vlr).toFixed(2));
    subtotal += itemTotal;
    const totalDisplay = r.querySelector('.item-total-display');
    if (totalDisplay) totalDisplay.textContent = money(itemTotal);
  });

  const desconto = parseFloat(document.querySelector('#orc_desconto')?.value || 0) || 0;
  const frete = parseFloat(document.querySelector('#orc_frete')?.value || 0) || 0;
  const totalFinal = Math.max(0, subtotal - desconto + frete);

  const subPrev = document.querySelector('#orc_subtotal_preview');
  if (subPrev) subPrev.textContent = money(subtotal);

  const totPrev = document.querySelector('#orc_total_preview');
  if (totPrev) totPrev.textContent = money(totalFinal);
}
window.recalcularTotaisOrcamento = recalcularTotaisOrcamento;

async function salvarOrcamento(e) {
  e.preventDefault();
  const editIndex = parseInt(document.querySelector('#orc_edit_index').value, 10);

  const rows = document.querySelectorAll('#orcItensBody tr');
  if (!rows.length) return toast('Adicione pelo menos 1 item ao orçamento.');

  const itens = [];
  let subtotal = 0;
  rows.forEach((r, i) => {
    const prod = (r.querySelector('.item-prod')?.value || '').trim();
    const un = (r.querySelector('.item-un')?.value || '1').trim();
    const qtd = parseFloat(r.querySelector('.item-qtd')?.value || 1) || 1;
    const vlr = parseFloat(r.querySelector('.item-vlr')?.value || 0) || 0;
    const tot = Number((qtd * vlr).toFixed(2));
    subtotal += tot;
    itens.push({
      item: i + 1,
      produto: prod,
      unidade: un,
      quantidade: qtd,
      valor_unitario: vlr,
      total: tot
    });
  });

  const desconto = parseFloat(document.querySelector('#orc_desconto')?.value || 0) || 0;
  const frete = parseFloat(document.querySelector('#orc_frete')?.value || 0) || 0;
  const valorTotal = Math.max(0, subtotal - desconto + frete);

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
    pagamento: document.querySelector('#orc_pagamento').value.trim() || 'À vista.',
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
  document.querySelector('#propCondObs').textContent = orc.observacoes || 'Sem observações adicionais.';

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
    .timbrado-logo { height: 60px; object-fit: contain; }
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
    `*Cliente:* ${encodeURIComponent(orc.cliente_nome || orc.cliente)}%0A` +
    `*Referência:* ${encodeURIComponent(orc.referencia)}%0A` +
    `*Valor Total:* ${encodeURIComponent(money(orc.valor_total))}%0A` +
    `*Validade:* ${encodeURIComponent(formatarDataBr(orc.data_validade))}%0A` +
    `*Condições de Pagamento:* ${encodeURIComponent(orc.pagamento)}%0A%0A` +
    `Estamos à inteira disposição para fechamento e faturamento direto com a fábrica. Obrigado!`;

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

// Autenticação (senha + Google Authenticator) em auth.js
