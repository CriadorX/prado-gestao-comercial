// Prado Gestão Comercial — Sistema de Auditoria Silenciosa & Monitoramento de Presença
// Módulo de uso estrito e exclusivo do Administrador Global (Michel do Prado)

(function() {
  const ONLINE_KEY = 'prado_sessoes_online';
  const AUDIT_KEY = 'prado_auditoria_logs';
  const USERS_KEY = 'prado_usuarios_cadastrados';

  // ---------- LISTA DE USUÁRIOS BASE / CADASTRADOS ----------
  function getUsuariosCadastrados() {
    const defaultUsers = [
      {
        id: 'admin-01',
        nome: 'Michel do Prado',
        email: 'licitadigitaltech@gmail.com',
        cargo: 'Administrador Geral',
        papel: 'admin_global',
        avatar: 'MP',
        dataCadastro: '2026-01-10'
      }
    ];
    try {
      const saved = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
      // Garante que o Michel sempre exista
      const merged = [...defaultUsers];
      saved.forEach(u => {
        if (!merged.some(m => m.email.toLowerCase() === u.email.toLowerCase())) {
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
    if (!list.some(u => u.email.toLowerCase() === usuario.email.toLowerCase())) {
      list.push(usuario);
      localStorage.setItem(USERS_KEY, JSON.stringify(list));
    }
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
    const dataStr = agora.toISOString().slice(0, 10);
    const horaStr = agora.toLocaleTimeString('pt-BR');

    const logEntry = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      data: dataStr,
      hora: horaStr,
      timestamp: agora.getTime(),
      userId: user.id || 'usr_' + user.email,
      nome: user.nome || 'Operador',
      email: user.email,
      cargo: user.cargo || 'Comercial',
      acao: acao,
      modulo: modulo,
      detalhes: detalhes || 'Acesso registrado com sucesso.',
      dispositivo: navigator.userAgent.includes('Mobile') ? 'Smartphone' : 'Computador / Desktop'
    };

    try {
      const logs = JSON.parse(localStorage.getItem(AUDIT_KEY) || '[]');
      logs.unshift(logEntry);
      // Mantém últimos 2000 registros
      if (logs.length > 2000) logs.length = 2000;
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
          dispositivo: logEntry.dispositivo
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
      sessoes[user.email] = {
        nome: user.nome,
        email: user.email,
        cargo: user.cargo,
        avatar: user.avatar || 'OP',
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
    const isAdmin = user && (user.role === 'admin_global' || user.email === 'licitadigitaltech@gmail.com');
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
      registrarAuditoria('Navegou no sistema', nomeModulo, `Acessou a tela de ${nomeModulo}`);
      atualizarPresencaOnline();
    }
  };
  setInterval(monitorarNavegacao, 1500);

  // ---------- TELA DO ADMINISTRADOR: AUDITORIA & EQUIPE ----------
  if (!window.titles) window.titles = {};

  window.titles.auditoria = function() {
    const user = window.currentUser;
    if (!user || (user.role !== 'admin_global' && user.email !== 'licitadigitaltech@gmail.com')) {
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
    const hojeStr = new Date().toISOString().slice(0, 10);
    const todosLogs = JSON.parse(localStorage.getItem(AUDIT_KEY) || '[]');
    const logsHoje = todosLogs.filter(l => l.data === hojeStr);

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
              <strong>${logsHoje.length}</strong>
              <em>atividades registradas</em>
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
                  <div class="avatar" style="width:42px;height:42px;font-size:14px;background:#07355f;color:#fff">${window.escapeHtml(op.avatar || op.nome.slice(0, 2).toUpperCase())}</div>
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

        <!-- RELATÓRIO DO FIM DO DIA (AUDITORIA DAS ATIVIDADES) -->
        <section class="card" id="secaoRelatorioAuditoria">
          <div class="card-head" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
            <div>
              <h2>📋 Relatório de Atividades dos Operadores (Auditoria do Dia)</h2>
              <small style="color:var(--muted)">Veja exatamente o que cada perfil fez hoje no sistema das 08h até o encerramento do expediente</small>
            </div>
            <div style="display:flex;gap:10px;align-items:center">
              <button class="primary" id="btnImprimirAuditoria" style="display:flex;align-items:center;gap:6px">
                🖨️ Exportar / Imprimir Relatório
              </button>
            </div>
          </div>

          <!-- FILTROS DO RELATÓRIO -->
          <div style="display:flex;gap:12px;margin:16px 0;flex-wrap:wrap;background:#f1f5f9;padding:12px 16px;border-radius:12px;align-items:center">
            <div style="display:flex;align-items:center;gap:6px">
              <span style="font-size:12.5px;font-weight:700;color:#334155">Data:</span>
              <input type="date" id="filtroAuditData" value="${hojeStr}" style="height:36px;border-radius:8px;border:1px solid #cbd5e1;padding:0 8px;background:#fff">
            </div>

            <div style="display:flex;align-items:center;gap:6px">
              <span style="font-size:12.5px;font-weight:700;color:#334155">Operador:</span>
              <select id="filtroAuditUser" style="height:36px;border-radius:8px;border:1px solid #cbd5e1;padding:0 8px;background:#fff">
                <option value="">Todos os operadores</option>
                ${todosUsuarios.map(u => `<option value="${window.escapeHtml(u.email)}">${window.escapeHtml(u.nome)} (${window.escapeHtml(u.cargo)})</option>`).join('')}
              </select>
            </div>

            <button type="button" class="secondary" id="btnFiltrarAudit" style="height:36px;padding:0 14px">Filtrar</button>
          </div>

          <!-- TABELA DE AUDITORIA -->
          <div class="table-wrap">
            <table id="tabelaAuditoria">
              <thead>
                <tr>
                  <th style="width:90px">Horário</th>
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

    // Eventos da tela de Auditoria
    document.querySelector('#btnRecarregarOnline')?.addEventListener('click', () => {
      window.titles.auditoria();
      window.toast('Lista de operadores online atualizada!');
    });

    document.querySelector('#btnFiltrarAudit')?.addEventListener('click', () => {
      const dataFiltro = document.querySelector('#filtroAuditData').value;
      const userFiltro = document.querySelector('#filtroAuditUser').value.toLowerCase();
      const logs = JSON.parse(localStorage.getItem(AUDIT_KEY) || '[]');

      const filtrados = logs.filter(l => {
        const bateData = !dataFiltro || l.data === dataFiltro;
        const bateUser = !userFiltro || (l.email && l.email.toLowerCase() === userFiltro);
        return bateData && bateUser;
      });

      document.querySelector('#auditTableBody').innerHTML = renderLinhasAuditoria(filtrados);
      window.toast(`${filtrados.length} ações encontradas.`);
    });

    document.querySelector('#btnImprimirAuditoria')?.addEventListener('click', () => {
      const dataFiltro = document.querySelector('#filtroAuditData').value;
      const userFiltro = document.querySelector('#filtroAuditUser').value;
      window.print();
    });
  };

  function renderLinhasAuditoria(logs) {
    if (!logs || !logs.length) {
      return `<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--muted)">Nenhuma atividade registrada para os filtros selecionados.</td></tr>`;
    }
    return logs.map(l => `
      <tr>
        <td><strong style="color:#0f172a;font-size:12.5px">${window.escapeHtml(l.hora)}</strong></td>
        <td>
          <div style="font-size:13px;font-weight:700;color:#07355f">${window.escapeHtml(l.nome)}</div>
          <small style="color:#64748b">${window.escapeHtml(l.email)} · ${window.escapeHtml(l.cargo)}</small>
        </td>
        <td><span class="badge" style="background:#edeaf7;color:#5b4db7;font-weight:700">${window.escapeHtml(l.acao)}</span></td>
        <td><b style="font-size:12px;color:#334155">${window.escapeHtml(l.modulo)}</b></td>
        <td style="color:#475569;font-size:12.5px">${window.escapeHtml(l.detalhes)}</td>
        <td><small style="color:#64748b;font-size:11px">${window.escapeHtml(l.dispositivo || 'Computador')}</small></td>
      </tr>
    `).join('');
  }
})();
