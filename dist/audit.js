// Prado Gestão Comercial — Sistema de Auditoria Silenciosa & Monitoramento de Presença
// Módulo de uso estrito e exclusivo do Administrador Global (Michel do Prado)

(function() {
  const ONLINE_KEY = 'prado_sessoes_online';
  const AUDIT_KEY = 'prado_auditoria_logs';
  const USERS_KEY = 'prado_usuarios_cadastrados';

  // ---------- FUNÇÕES DE DATA/HORA NO FUSO LOCAL BRASILEIRO (UTC-3) ----------
  function formatarDataLocal(d) {
    if (!d) return '';
    const dateObj = typeof d === 'number' ? new Date(d) : (d instanceof Date ? d : new Date(d));
    if (isNaN(dateObj.getTime())) return '';
    const ano = dateObj.getFullYear();
    const mes = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dia = String(dateObj.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }
  window.formatarDataLocal = formatarDataLocal;

  function formatarDataBR(d) {
    if (!d) return '';
    if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
      const parts = d.split('-');
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    const dateObj = typeof d === 'number' ? new Date(d) : (d instanceof Date ? d : new Date(d));
    if (isNaN(dateObj.getTime())) return String(d);
    const dia = String(dateObj.getDate()).padStart(2, '0');
    const mes = String(dateObj.getMonth() + 1).padStart(2, '0');
    const ano = dateObj.getFullYear();
    return `${dia}/${mes}/${ano}`;
  }
  window.formatarDataBR = formatarDataBR;

  function getLogDataISO(l) {
    if (!l) return '';
    if (l.timestamp) return formatarDataLocal(l.timestamp);
    return l.data || '';
  }

  // ---------- LISTA DE USUÁRIOS BASE / CADASTRADOS ----------
  function getUsuariosCadastrados() {
    const defaultUsers = [];
    if (window.currentUser && window.currentUser.email) {
      defaultUsers.push({
        id: window.currentUser.id || 'admin-01',
        nome: window.currentUser.nome || 'Administrador Geral',
        email: window.currentUser.email,
        cargo: window.currentUser.cargo || 'Administrador Geral',
        papel: window.currentUser.role || 'admin_global',
        setor: window.currentUser.role === 'admin_global' ? 'master' : 'comercial',
        avatar: window.currentUser.avatar || 'MP',
        dataCadastro: '2026-01-10'
      });
    }
    try {
      const saved = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
      const merged = [...defaultUsers];
      saved.forEach(u => {
        if (u && u.email && !merged.some(m => m.email.toLowerCase() === u.email.toLowerCase())) {
          if (!u.setor) u.setor = (u.papel === 'admin_global' || u.role === 'admin_global') ? 'master' : 'comercial';
          merged.push(u);
        }
      });
      return merged;
    } catch {
      return defaultUsers;
    }
  }
  window.getUsuariosCadastrados = getUsuariosCadastrados;

  function salvarNovoUsuario(usuario) {
    const list = getUsuariosCadastrados();
    const idx = list.findIndex(u => u.email.toLowerCase() === usuario.email.toLowerCase());
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...usuario };
    } else {
      if (!usuario.setor) usuario.setor = (usuario.papel === 'admin_global' || usuario.role === 'admin_global') ? 'master' : 'comercial';
      list.push(usuario);
    }
    localStorage.setItem(USERS_KEY, JSON.stringify(list));
  }
  window.salvarNovoUsuario = salvarNovoUsuario;

  // ---------- RASTREADOR DE AUDITORIA SILENCIOSA ----------
  function registrarAuditoria(acao, modulo = 'Geral', detalhes = '') {
    const user = window.currentUser || {
      nome: 'Visitante / Não autenticado',
      email: 'anonimo@prado.com.br',
      cargo: 'Operador',
      role: 'operador'
    };

    const agora = new Date();
    const dataStr = formatarDataLocal(agora);
    const horaStr = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const logEntry = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      data: dataStr,
      hora: horaStr,
      timestamp: agora.getTime(),
      userId: user.id || 'usr_' + (user.email || 'anonimo'),
      nome: user.nome || 'Operador',
      email: user.email || 'anonimo@prado.com.br',
      cargo: user.cargo || 'Comercial',
      acao: acao,
      modulo: modulo,
      detalhes: detalhes || 'Acesso registrado com sucesso.',
      dispositivo: navigator.userAgent.includes('Mobile') ? 'Smartphone' : 'Computador / Desktop'
    };

    try {
      const logs = JSON.parse(localStorage.getItem(AUDIT_KEY) || '[]');
      logs.unshift(logEntry);
      // Mantém últimos 3000 registros
      if (logs.length > 3000) logs.length = 3000;
      localStorage.setItem(AUDIT_KEY, JSON.stringify(logs));
    } catch {}

    // Sincroniza silenciosamente com Supabase se disponível
    if (window.supabaseClient && window.sessionToken) {
      window.supabaseClient.from('auditoria_logs').insert([{
        user_id: user.id,
        acao: acao,
        tabela: modulo,
        detalhes: {
          nome: user.nome,
          email: user.email,
          cargo: user.cargo,
          info: detalhes,
          dispositivo: logEntry.dispositivo,
          timestamp: logEntry.timestamp
        }
      }]).then(() => {}).catch(() => {});
    }
  }
  window.registrarAuditoria = registrarAuditoria;

  // ---------- RASTREADOR DE PRESENÇA (QUEM ESTÁ ONLINE) ----------
  function atualizarPresencaOnline() {
    if (!window.currentUser) return;
    const user = window.currentUser;
    const agora = Date.now();

    try {
      const sessoes = JSON.parse(localStorage.getItem(ONLINE_KEY) || '{}');
      const foto = (typeof window.getFotoUsuario === 'function') ? window.getFotoUsuario(user) : (user.photo || user.avatar);
      sessoes[user.email] = {
        nome: user.nome,
        email: user.email,
        cargo: user.cargo,
        avatar: foto || user.avatar || 'OP',
        photo: foto || '',
        paginaAtual: window.page || 'dashboard',
        ultimoPing: agora,
        status: 'online'
      };
      localStorage.setItem(ONLINE_KEY, JSON.stringify(sessoes));
    } catch {}
  }
  window.atualizarPresencaOnline = atualizarPresencaOnline;

  // Heartbeat a cada 20 segundos
  setInterval(atualizarPresencaOnline, 20000);

  function getOperadoresOnline() {
    try {
      const sessoes = JSON.parse(localStorage.getItem(ONLINE_KEY) || '{}');
      const limiteOnline = Date.now() - (2.5 * 60 * 1000); // 2.5 minutos
      const online = [];
      for (const email in sessoes) {
        const s = sessoes[email];
        if (s.ultimoPing >= limiteOnline) {
          online.push(s);
        }
      }
      return online;
    } catch {
      return [];
    }
  }
  window.getOperadoresOnline = getOperadoresOnline;

  // ---------- INSERÇÃO DO BOTÃO NO MENU DO ADMINISTRADOR ----------
  function ensureAuditButton() {
    const user = window.currentUser;
    const isAdmin = typeof window.ehAdminGlobal === 'function'
      ? window.ehAdminGlobal()
      : Boolean(window.__pradoServerVerified && user && user.role === 'admin_global');
    const existing = document.querySelector('#nav [data-page="auditoria"]');

    if (isAdmin) {
      if (!existing) {
        const btn = document.createElement('button');
        btn.className = 'nav-item' + (window.page === 'auditoria' ? ' active' : '');
        btn.dataset.page = 'auditoria';
        btn.innerHTML = '<b>🛡️</b>Auditoria & Equipe';
        document.querySelector('#nav')?.append(btn);
      }
    } else if (existing) {
      existing.remove();
    }
  }

  // Hook no renderNav
  const originalRenderNav = window.renderNav;
  if (typeof originalRenderNav === 'function') {
    window.renderNav = function() {
      originalRenderNav();
      ensureAuditButton();
    };
  }

  // Captura automática de navegação para auditoria silenciosa
  let ultimaPaginaLogada = '';
  const monitorarNavegacao = () => {
    if (window.currentUser && window.page && window.page !== ultimaPaginaLogada) {
      ultimaPaginaLogada = window.page;
      const nomesPaginas = {
        dashboard: 'Visão Geral / Portal',
        cotacao_ia: 'Cotações IA & Fábricas',
        clientes: 'Carteira de Clientes',
        fornecedores: 'Cadastro de Fornecedores',
        oportunidades: 'Intermediações Comerciais',
        orcamentos: 'Elaboração de Orçamentos',
        pedidos: 'Pedidos e Entregas',
        fiscal: 'NF-e e Documentos Fiscais',
        fiscal_bot: 'MB Fiscal BOT (SEBRAE)',
        financeiro: 'Lançamentos Financeiros',
        risco: 'Análise de Risco de Crédito',
        relatorios: 'Relatórios Gerenciais',
        configuracoes: 'Configurações de Perfil',
        auditoria: 'Painel de Auditoria e Equipe'
      };
      const nomeModulo = nomesPaginas[window.page] || window.page;
      // Não duplica logs de navegação no painel de auditoria
      if (window.page !== 'auditoria') {
        registrarAuditoria('Navegou no sistema', nomeModulo, `Acessou a tela de ${nomeModulo}`);
      }
      atualizarPresencaOnline();
    }
  };
  setInterval(monitorarNavegacao, 1500);

  // ---------- TELA DO ADMINISTRADOR: AUDITORIA & EQUIPE ----------
  const renderAuditoria = function() {
    const user = window.currentUser;
    const isAdmin = typeof window.ehAdminGlobal === 'function'
      ? window.ehAdminGlobal()
      : Boolean(window.__pradoServerVerified && user && user.role === 'admin_global');

    if (!isAdmin) {
      document.querySelector('#title').textContent = 'Acesso Restrito';
      document.querySelector('#subtitle').textContent = 'Permissão exclusiva do Administrador';
      document.querySelector('#app').innerHTML = `
        <div class="content">
          <div class="card" style="text-align:center;padding:50px">
            <h2>🔒 Área Restrita</h2>
            <p style="color:var(--muted)">Esta área de auditoria é confidencial e exclusiva do Administrador Geral.</p>
          </div>
        </div>
      `;
      return;
    }

    document.querySelector('#title').textContent = 'Auditoria & Equipe';
    document.querySelector('#subtitle').textContent = 'Monitoramento em tempo real de operadores online e relatório diário de atividades';

    const onlineList = getOperadoresOnline();
    const todosUsuarios = getUsuariosCadastrados();
    const hojeStr = formatarDataLocal(new Date());
    const todosLogs = JSON.parse(localStorage.getItem(AUDIT_KEY) || '[]');
    const logsHoje = todosLogs.filter(l => {
      const dataLog = getLogDataISO(l);
      return dataLog === hojeStr || l.data === hojeStr;
    });

    const nomesPaginas = {
      dashboard: 'Visão Geral',
      cotacao_ia: 'Cotações IA',
      clientes: 'Clientes',
      fornecedores: 'Fornecedores',
      oportunidades: 'Intermediações',
      orcamentos: 'Orçamentos',
      pedidos: 'Pedidos',
      fiscal: 'NF-e e Fiscais',
      fiscal_bot: 'MB Fiscal BOT',
      financeiro: 'Financeiro',
      risco: 'Análise de Risco',
      relatorios: 'Relatórios',
      configuracoes: 'Configurações',
      auditoria: 'Auditoria'
    };

    document.querySelector('#app').innerHTML = `
      <div class="content">
        <!-- MÉTRICAS DO MONITORAMENTO -->
        <div class="grid4" style="margin-bottom:20px">
          <article class="metric" style="border-left:4px solid #10b981">
            <div>
              <small>Operadores Online Agora</small>
              <strong style="color:#059669;display:flex;align-items:center;gap:8px">
                <span style="display:inline-block;width:10px;height:10px;background:#10b981;border-radius:50%;box-shadow:0 0 10px #10b981;animation:pulse 1.5s infinite"></span>
                ${onlineList.length}
              </strong>
              <em>conectados no momento</em>
            </div>
            <div class="micon" style="background:#ecfdf5;color:#059669">🟢</div>
          </article>

          <article class="metric">
            <div>
              <small>Total de Usuários</small>
              <strong>${todosUsuarios.length}</strong>
              <em>cadastrados no sistema</em>
            </div>
            <div class="micon">👥</div>
          </article>

          <article class="metric">
            <div>
              <small>Ações Monitoradas Hoje</small>
              <strong id="metricAcoesHoje">${logsHoje.length}</strong>
              <em>atividades em ${formatarDataBR(hojeStr)}</em>
            </div>
            <div class="micon">📝</div>
          </article>

          <article class="metric">
            <div>
              <small>Auditoria Confidencial</small>
              <strong style="font-size:16px;color:var(--navy)">100% Oculta</strong>
              <em>visão restrita ao Michel</em>
            </div>
            <div class="micon">🛡️</div>
          </article>
        </div>

        <!-- QUEM ESTÁ ONLINE AGORA -->
        <section class="card" style="margin-bottom:24px">
          <div class="card-head" style="display:flex;justify-content:space-between;align-items:center">
            <div>
              <h2 style="display:flex;align-items:center;gap:8px">
                <span style="display:inline-block;width:10px;height:10px;background:#10b981;border-radius:50%;box-shadow:0 0 8px #10b981"></span>
                Quem está online agora
              </h2>
              <small style="color:var(--muted)">Monitoramento em tempo real da tela em que cada operador está navegando</small>
            </div>
            <button class="secondary" id="btnRecarregarOnline" style="font-size:12px;padding:6px 12px">🔄 Atualizar lista</button>
          </div>

          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px;margin-top:16px">
            ${onlineList.length ? onlineList.map(op => `
              <div style="background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:14px;padding:14px 16px;display:flex;align-items:center;gap:12px;box-shadow:0 2px 6px rgba(0,0,0,.03)">
                <div style="position:relative">
                  ${(typeof window.renderAvatarHtml === 'function') 
                    ? window.renderAvatarHtml(op, 42, 'box-shadow:0 2px 6px rgba(0,0,0,0.12);background:#07355f;color:#fff') 
                    : `<div class="avatar" style="width:42px;height:42px;font-size:14px;background:#07355f;color:#fff">${window.escapeHtml(op.avatar || op.nome.slice(0, 2).toUpperCase())}</div>`}
                  <span style="position:absolute;bottom:0;right:0;width:11px;height:11px;background:#10b981;border:2px solid #fff;border-radius:50%"></span>
                </div>
                <div style="flex:1;overflow:hidden">
                  <b style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:14px">${window.escapeHtml(op.nome)}</b>
                  <small style="color:#64748b;display:block;font-size:11.5px">${window.escapeHtml(op.cargo)} · ${window.escapeHtml(op.email)}</small>
                  <span style="display:inline-block;margin-top:4px;padding:2px 8px;border-radius:99px;background:#e0f2fe;color:#0369a1;font-size:11px;font-weight:700">
                    📍 ${window.escapeHtml(nomesPaginas[op.paginaAtual] || op.paginaAtual)}
                  </span>
                </div>
              </div>
            `).join('') : `
              <div style="grid-column:1/-1;text-align:center;padding:24px;color:var(--muted)">
                Nenhum operador conectado nos últimos 2 minutos além de você.
              </div>
            `}
          </div>
        </section>

        <!-- GESTÃO DE OPERADORES & PROMOÇÃO POR SETOR (EXCLUSIVO MASTER) -->
        <section class="card" style="margin-bottom:24px">
          <div class="card-head" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
            <div>
              <h2 style="display:flex;align-items:center;gap:8px">
                <span>👥</span>
                Gestão de Equipe & Promoção de Setor
              </h2>
              <small style="color:var(--muted)">Promova operadores para seus setores respectivos (Comercial, Financeiro, Fiscal ou Jurídico) liberando acesso correspondente</small>
            </div>
            <span style="font-size:12px;padding:4px 10px;background:#fef3c7;color:#92400e;border-radius:99px;font-weight:700">👑 Painel Exclusivo Master</span>
          </div>

          <div style="overflow-x:auto;margin-top:16px">
            <table style="width:100%;border-collapse:collapse;font-size:13px">
              <thead>
                <tr style="border-bottom:2px solid #e2e8f0;text-align:left;color:#64748b">
                  <th style="padding:10px 12px">Operador</th>
                  <th style="padding:10px 12px">E-mail</th>
                  <th style="padding:10px 12px">Papel Atual</th>
                  <th style="padding:10px 12px">Setor / Área de Acesso</th>
                  <th style="padding:10px 12px;text-align:right">Ações</th>
                </tr>
              </thead>
              <tbody>
                ${todosUsuarios.map(u => {
                  const isUserMaster = (u.papel === 'admin_global' || u.role === 'admin_global');
                  const setorAtual = u.setor || (isUserMaster ? 'master' : 'comercial');
                  return `
                    <tr style="border-bottom:1px solid #f1f5f9;background:#fff">
                      <td style="padding:12px;font-weight:600;display:flex;align-items:center;gap:10px">
                        ${(typeof window.renderAvatarHtml === 'function') 
                          ? window.renderAvatarHtml(u, 32, 'font-size:12px') 
                          : `<div class="avatar" style="width:32px;height:32px;font-size:12px">${window.escapeHtml(u.avatar || 'OP')}</div>`}
                        <span>${window.escapeHtml(u.nome)}</span>
                      </td>
                      <td style="padding:12px;color:#64748b">${window.escapeHtml(u.email)}</td>
                      <td style="padding:12px">
                        <span style="padding:3px 8px;border-radius:6px;font-size:11.5px;font-weight:700;${isUserMaster ? 'background:#fef3c7;color:#b45309' : 'background:#f1f5f9;color:#475569'}">
                          ${isUserMaster ? '👑 Administrador Geral' : (u.cargo || 'Operador')}
                        </span>
                      </td>
                      <td style="padding:12px">
                        ${isUserMaster ? `
                          <span style="color:#059669;font-weight:700">👑 Acesso Total Irrestrito (Master)</span>
                        ` : `
                          <select class="select-setor-operador" data-email="${window.escapeHtml(u.email)}" style="padding:6px 10px;border-radius:6px;border:1px solid #cbd5e1;font-size:12.5px;background:#fff">
                            <option value="comercial" ${setorAtual === 'comercial' ? 'selected' : ''}>💼 Setor Comercial (Vendas / Cotações / Propostas)</option>
                            <option value="financeiro" ${setorAtual === 'financeiro' ? 'selected' : ''}>💰 Setor Financeiro (Contas / Caixa / Relatórios)</option>
                            <option value="fiscal" ${setorAtual === 'fiscal' ? 'selected' : ''}>📑 Setor Fiscal (NF-e / DANFE / Tributos)</option>
                            <option value="juridico" ${setorAtual === 'juridico' ? 'selected' : ''}>⚖️ Setor Jurídico (Licitações / Contratos)</option>
                          </select>
                        `}
                      </td>
                      <td style="padding:12px;text-align:right">
                        ${isUserMaster ? `
                          <span style="color:#94a3b8;font-size:11.5px">—</span>
                        ` : `
                          <button type="button" class="primary btn-salvar-promocao" data-email="${window.escapeHtml(u.email)}" style="padding:6px 12px;font-size:12px;font-weight:600">
                            ✓ Salvar Promoção
                          </button>
                        `}
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </section>

        <!-- RELATÓRIO DO FIM DO DIA (AUDITORIA DAS ATIVIDADES) -->
        <section class="card" id="secaoRelatorioAuditoria">
          <div class="card-head" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
            <div>
              <h2>📋 Relatório de Atividades dos Operadores (Auditoria do Dia)</h2>
              <small style="color:var(--muted)">Veja exatamente o que cada perfil fez no sistema com filtros em tempo real</small>
            </div>
            <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
              <span id="auditContadorBadge" class="badge" style="background:#07355f;color:#fff;font-size:12px;padding:6px 12px;font-weight:700">
                ${logsHoje.length} ${logsHoje.length === 1 ? 'registro' : 'registros'}
              </span>
              <button class="primary" id="btnImprimirAuditoria" style="display:flex;align-items:center;gap:6px">
                🖨️ Exportar / Imprimir Relatório
              </button>
            </div>
          </div>

          <!-- BOTÕES DE ATALHO RÁPIDO DE DATA -->
          <div style="display:flex;gap:8px;margin:14px 0 6px 0;flex-wrap:wrap;align-items:center">
            <span style="font-size:12px;font-weight:700;color:#64748b">Filtros rápidos:</span>
            <button type="button" class="secondary" id="btnQuickHoje" style="padding:4px 10px;font-size:11.5px;height:30px;font-weight:700">📅 Hoje</button>
            <button type="button" class="secondary" id="btnQuickOntem" style="padding:4px 10px;font-size:11.5px;height:30px">Ontem</button>
            <button type="button" class="secondary" id="btnQuick7Dias" style="padding:4px 10px;font-size:11.5px;height:30px">Últimos 7 dias</button>
            <button type="button" class="secondary" id="btnQuickTodos" style="padding:4px 10px;font-size:11.5px;height:30px;background:#e0f2fe;color:#0369a1;border-color:#bae6fd;font-weight:700">Ver Todos os Dias</button>
            <button type="button" class="secondary" id="btnQuickLimpar" style="padding:4px 10px;font-size:11.5px;height:30px;color:#ef4444;border-color:#fecaca">✕ Limpar</button>
          </div>

          <!-- FILTROS DO RELATÓRIO COM ATUALIZAÇÃO AUTOMÁTICA -->
          <div style="display:flex;gap:12px;margin:8px 0 16px 0;flex-wrap:wrap;background:#f1f5f9;padding:12px 16px;border-radius:12px;align-items:center">
            <div style="display:flex;align-items:center;gap:6px">
              <span style="font-size:12.5px;font-weight:700;color:#334155">Data:</span>
              <input type="date" id="filtroAuditData" value="${hojeStr}" style="height:36px;border-radius:8px;border:1px solid #cbd5e1;padding:0 8px;background:#fff" title="Selecione a data para filtrar instantaneamente">
            </div>

            <div style="display:flex;align-items:center;gap:6px">
              <span style="font-size:12.5px;font-weight:700;color:#334155">Operador:</span>
              <select id="filtroAuditUser" style="height:36px;border-radius:8px;border:1px solid #cbd5e1;padding:0 8px;background:#fff">
                <option value="">Todos os operadores</option>
                ${todosUsuarios.map(u => `<option value="${window.escapeHtml(u.email)}">${window.escapeHtml(u.nome)} (${window.escapeHtml(u.cargo)})</option>`).join('')}
              </select>
            </div>

            <div style="display:flex;align-items:center;gap:6px;flex:1;min-width:200px">
              <span style="font-size:12.5px;font-weight:700;color:#334155">Buscar:</span>
              <input type="text" id="filtroAuditBusca" placeholder="Ação, produto, módulo..." style="height:36px;border-radius:8px;border:1px solid #cbd5e1;padding:0 10px;background:#fff;width:100%">
            </div>

            <button type="button" class="secondary" id="btnFiltrarAudit" style="height:36px;padding:0 14px">Filtrar</button>
          </div>

          <!-- TABELA DE AUDITORIA -->
          <div class="table-wrap">
            <table id="tabelaAuditoria">
              <thead>
                <tr>
                  <th style="width:130px">Data / Horário</th>
                  <th>Operador / Usuário</th>
                  <th>Ação Realizada</th>
                  <th>Módulo</th>
                  <th>Detalhes da Operação</th>
                  <th style="width:110px">Dispositivo</th>
                </tr>
              </thead>
              <tbody id="auditTableBody">
                ${renderLinhasAuditoria(logsHoje)}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    `;

    // Função unificada de filtragem instantânea
    function aplicarFiltro(mostrarNotificacao = false) {
      const dataInput = document.querySelector('#filtroAuditData');
      const userInput = document.querySelector('#filtroAuditUser');
      const buscaInput = document.querySelector('#filtroAuditBusca');
      if (!dataInput) return;

      const dataFiltro = dataInput.value;
      const userFiltro = userInput ? userInput.value.trim().toLowerCase() : '';
      const termoBusca = buscaInput ? buscaInput.value.trim().toLowerCase() : '';

      const logs = JSON.parse(localStorage.getItem(AUDIT_KEY) || '[]');

      // Suporte para filtro de 7 dias
      const is7Dias = dataInput.dataset.range === '7d';
      const seteDiasAtras = new Date();
      seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
      const seteDiasStr = formatarDataLocal(seteDiasAtras);

      const filtrados = logs.filter(l => {
        const dataDoLog = getLogDataISO(l);
        
        let bateData = true;
        if (is7Dias) {
          bateData = dataDoLog >= seteDiasStr && dataDoLog <= hojeStr;
        } else if (dataFiltro) {
          bateData = (dataDoLog === dataFiltro) || (l.data === dataFiltro);
        }

        const bateUser = !userFiltro || (l.email && l.email.toLowerCase() === userFiltro);
        
        const bateBusca = !termoBusca || (
          (l.acao && l.acao.toLowerCase().includes(termoBusca)) ||
          (l.modulo && l.modulo.toLowerCase().includes(termoBusca)) ||
          (l.detalhes && l.detalhes.toLowerCase().includes(termoBusca)) ||
          (l.nome && l.nome.toLowerCase().includes(termoBusca)) ||
          (l.email && l.email.toLowerCase().includes(termoBusca))
        );

        return bateData && bateUser && bateBusca;
      });

      const tbody = document.querySelector('#auditTableBody');
      if (tbody) {
        tbody.innerHTML = renderLinhasAuditoria(filtrados);
      }

      const badge = document.querySelector('#auditContadorBadge');
      if (badge) {
        const descData = is7Dias ? 'últimos 7 dias' : (dataFiltro ? formatarDataBR(dataFiltro) : 'todos os dias');
        badge.textContent = `${filtrados.length} ${filtrados.length === 1 ? 'registro' : 'registros'} (${descData})`;
      }

      if (mostrarNotificacao && typeof window.toast === 'function') {
        window.toast(`${filtrados.length} atividades encontradas.`);
      }
    }

    // Ouvintes reativos: atualiza IMEDIATAMENTE ao escolher no calendário ou mudar de operador
    const dtEl = document.querySelector('#filtroAuditData');
    if (dtEl) {
      dtEl.addEventListener('change', () => {
        delete dtEl.dataset.range;
        aplicarFiltro(false);
      });
      dtEl.addEventListener('input', () => {
        delete dtEl.dataset.range;
        aplicarFiltro(false);
      });
    }

    const usrEl = document.querySelector('#filtroAuditUser');
    if (usrEl) {
      usrEl.addEventListener('change', () => aplicarFiltro(false));
    }

    const buscaEl = document.querySelector('#filtroAuditBusca');
    if (buscaEl) {
      buscaEl.addEventListener('input', () => aplicarFiltro(false));
    }

    document.querySelector('#btnFiltrarAudit')?.addEventListener('click', () => {
      aplicarFiltro(true);
    });

    // Botões de atalho rápido
    document.querySelector('#btnQuickHoje')?.addEventListener('click', () => {
      const el = document.querySelector('#filtroAuditData');
      if (el) {
        delete el.dataset.range;
        el.value = hojeStr;
      }
      aplicarFiltro(true);
    });

    document.querySelector('#btnQuickOntem')?.addEventListener('click', () => {
      const ontem = new Date();
      ontem.setDate(ontem.getDate() - 1);
      const el = document.querySelector('#filtroAuditData');
      if (el) {
        delete el.dataset.range;
        el.value = formatarDataLocal(ontem);
      }
      aplicarFiltro(true);
    });

    document.querySelector('#btnQuick7Dias')?.addEventListener('click', () => {
      const el = document.querySelector('#filtroAuditData');
      if (el) {
        el.dataset.range = '7d';
        el.value = '';
      }
      aplicarFiltro(true);
    });

    document.querySelector('#btnQuickTodos')?.addEventListener('click', () => {
      const el = document.querySelector('#filtroAuditData');
      if (el) {
        delete el.dataset.range;
        el.value = '';
      }
      aplicarFiltro(true);
    });

    document.querySelector('#btnQuickLimpar')?.addEventListener('click', () => {
      const el = document.querySelector('#filtroAuditData');
      if (el) {
        delete el.dataset.range;
        el.value = '';
      }
      const uEl = document.querySelector('#filtroAuditUser');
      if (uEl) uEl.value = '';
      const bEl = document.querySelector('#filtroAuditBusca');
      if (bEl) bEl.value = '';
      aplicarFiltro(true);
    });

    // Recarregar operadores online
    document.querySelector('#btnRecarregarOnline')?.addEventListener('click', () => {
      window.titles.auditoria();
      if (typeof window.toast === 'function') {
        window.toast('Lista de operadores online atualizada!');
      }
    });

    // Imprimir / Exportar
    document.querySelector('#btnImprimirAuditoria')?.addEventListener('click', () => {
      if (typeof window.registrarAuditoria === 'function') {
        window.registrarAuditoria(
          'Exportação de Relatório',
          'Auditoria & Equipe',
          `Exportou ou imprimiu relatório de atividades dos operadores`
        );
      }
      window.print();
    });

    // Salvar Promoção de Setor pelo Master
    document.querySelectorAll('.btn-salvar-promocao').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetEmail = btn.dataset.email;
        const row = btn.closest('tr');
        const select = row?.querySelector('.select-setor-operador');
        const novoSetor = select ? select.value : 'comercial';
        
        const list = getUsuariosCadastrados();
        const userObj = list.find(u => u.email.toLowerCase() === targetEmail.toLowerCase());
        if (userObj) {
          userObj.setor = novoSetor;
          const mapCargos = {
            comercial: 'Representante Comercial',
            financeiro: 'Analista Financeiro',
            fiscal: 'Analista Fiscal & NF-e',
            juridico: 'Analista de Contratos & Licitações'
          };
          userObj.cargo = mapCargos[novoSetor] || 'Operador';
          localStorage.setItem(USERS_KEY, JSON.stringify(list));

          try {
            const pKey = `pradoProfile_${targetEmail}`;
            const prof = JSON.parse(localStorage.getItem(pKey) || '{}');
            prof.cargo = userObj.cargo;
            prof.setor = novoSetor;
            localStorage.setItem(pKey, JSON.stringify(prof));
          } catch {}

          if (typeof window.registrarAuditoria === 'function') {
            window.registrarAuditoria(
              'Promoção de Operador',
              'Auditoria & Equipe',
              `Master promoveu ${userObj.nome} (${userObj.email}) para o Setor ${novoSetor.toUpperCase()} (${userObj.cargo})`
            );
          }
          if (typeof window.toast === 'function') {
            window.toast(`✓ Promoção salva: ${userObj.nome} agora atua no Setor ${novoSetor.toUpperCase()}!`);
          }
          window.titles.auditoria();
        }
      });
    });
  };
  window.renderAuditoria = renderAuditoria;
  if (!window.titles) window.titles = {};
  window.titles.auditoria = renderAuditoria;
  if (typeof titles !== 'undefined') {
    titles.auditoria = renderAuditoria;
  }

  function getBadgeEstilo(acao) {
    const a = (acao || '').toLowerCase();
    if (a.includes('cotação') || a.includes('fornecedor')) {
      return 'background:#ecfdf5;color:#047857;border:1px solid #a7f3d0';
    }
    if (a.includes('nota') || a.includes('faturamento') || a.includes('orçamento')) {
      return 'background:#ede9fe;color:#6d28d9;border:1px solid #ddd6fe';
    }
    if (a.includes('login') || a.includes('segurança') || a.includes('autenticação') || a.includes('2fa')) {
      return 'background:#fef3c7;color:#92400e;border:1px solid #fde68a';
    }
    if (a.includes('bloqueio') || a.includes('falha') || a.includes('incorreta')) {
      return 'background:#fee2e2;color:#b91c1c;border:1px solid #fecaca';
    }
    return 'background:#f1f5f9;color:#475569;border:1px solid #cbd5e1';
  }

  function renderLinhasAuditoria(logs) {
    if (!logs || !logs.length) {
      return `<tr><td colspan="6" style="text-align:center;padding:34px;color:var(--muted);font-size:13.5px">Nenhuma atividade registrada para os filtros selecionados.<br><small style="color:#94a3b8">Dica: Selecione outra data ou clique em <b>"Ver Todos os Dias"</b>.</small></td></tr>`;
    }
    return logs.map(l => {
      const dataFormatada = l.timestamp ? formatarDataBR(l.timestamp) : (l.data ? formatarDataBR(l.data) : '—');
      const estiloBadge = getBadgeEstilo(l.acao);

      return `
        <tr>
          <td style="white-space:nowrap">
            <strong style="color:#0f172a;font-size:12.5px">${window.escapeHtml(dataFormatada)}</strong>
            <br>
            <small style="color:#64748b;font-weight:600">🕒 ${window.escapeHtml(l.hora || '--:--')}</small>
          </td>
          <td>
            <div style="font-size:13px;font-weight:700;color:#07355f">${window.escapeHtml(l.nome)}</div>
            <small style="color:#64748b">${window.escapeHtml(l.email)} · ${window.escapeHtml(l.cargo)}</small>
          </td>
          <td>
            <span class="badge" style="${estiloBadge};font-weight:700;padding:4px 8px;border-radius:6px;display:inline-block">
              ${window.escapeHtml(l.acao)}
            </span>
          </td>
          <td><b style="font-size:12px;color:#334155">${window.escapeHtml(l.modulo)}</b></td>
          <td style="color:#334155;font-size:12.5px;max-width:380px;line-height:1.4">${window.escapeHtml(l.detalhes)}</td>
          <td><small style="color:#64748b;font-size:11px">${window.escapeHtml(l.dispositivo || 'Computador')}</small></td>
        </tr>
      `;
    }).join('');
  }
})();
