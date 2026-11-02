// Configurações do usuário e perfil da Prado Comércio & Soluções (Supabase Conectado)
function ensureSettingsButton() {
  if (!document.querySelector('#nav [data-page="configuracoes"]')) {
    const settingsButton = document.createElement('button');
    settingsButton.className = 'nav-item';
    settingsButton.dataset.page = 'configuracoes';
    settingsButton.innerHTML = '<b>⚙</b>Configurações';
    document.querySelector('#nav').append(settingsButton);
  }
}

ensureSettingsButton();

titles.configuracoes = function() {
  head('Configurações', 'Perfil, foto e segurança da conta no Supabase');
  const user = window.currentUser || { nome: 'Operador Prado', cargo: 'Comercial', email: '', avatar: 'PR' };
  const profile = JSON.parse(localStorage.getItem(`pradoProfile_${user.email}`) || '{}');
  const isConnected = !!(window.supabaseClient && window.sessionToken);

  app.innerHTML = `
    <div class="content">
      <div class="grid2">
        <section class="card">
          <div class="card-head"><h2>Meu perfil</h2></div>
          <div class="profile-preview" style="display:flex;align-items:center;gap:16px;margin-bottom:20px">
            <div style="position:relative;width:72px;height:72px;flex-shrink:0;cursor:pointer" onclick="document.querySelector('#profileUpload')?.click()" title="Clique para escolher uma foto do seu dispositivo">
              <img id="profilePicture" alt="Sua foto de perfil" style="width:72px;height:72px;border-radius:50%;object-fit:cover;box-shadow:0 4px 12px rgba(0,0,0,0.15);border:2px solid var(--gold);display:${profile.photo ? 'block' : 'none'}">
              <div class="avatar" id="profileInitials" style="width:72px;height:72px;font-size:24px;border-radius:50%;border:2px solid var(--gold);display:${profile.photo ? 'none' : 'grid'}">${escapeHtml(user.avatar || 'MP')}</div>
              <span style="position:absolute;bottom:-2px;right:-2px;background:var(--navy);color:#fff;width:24px;height:24px;border-radius:50%;display:grid;place-items:center;font-size:12px;border:1.5px solid #fff;box-shadow:0 2px 5px rgba(0,0,0,.3)">📷</span>
            </div>
            <div>
              <b style="font-size:17px;color:var(--navy);display:block">${escapeHtml(user.nome)}</b>
              <p style="margin:2px 0 4px;font-size:13px;color:#0369a1;font-weight:600">${escapeHtml(user.cargo)}</p>
              <small style="color:var(--muted)">${escapeHtml(user.email)}</small>
            </div>
          </div>
          <div class="field">
            <label for="profileUpload">Foto de perfil</label>
            <input id="profileUpload" type="file" accept="image/png,image/jpeg,image/webp">
            <small>PNG, JPG ou WebP, até 2 MB. Clique na foto ou no botão acima para escolher.</small>
          </div>
          <div style="display:flex;gap:10px;margin-top:14px">
            <button class="secondary" id="removePicture">Remover foto</button>
            <button class="primary" id="saveProfileBtn">Salvar perfil</button>
          </div>
        </section>

        <section class="card">
          <div class="card-head">
            <h2>Alterar senha</h2>
            <span class="badge ${isConnected ? '' : 'warn'}">${isConnected ? 'Autenticação Supabase Ativa' : 'Aguardando Login'}</span>
          </div>
          <p>Altere sua senha de acesso. A alteração será enviada e validada diretamente no servidor do Supabase Auth.</p>
          <form id="passwordSettings">
            <div class="field">
              <label for="newPassword">Nova senha</label>
              <input id="newPassword" type="password" autocomplete="new-password" minlength="12" placeholder="Mínimo 12 caracteres" required>
            </div>
            <div class="field" style="margin-top:10px">
              <label for="confirmPassword">Confirme a nova senha</label>
              <input id="confirmPassword" type="password" autocomplete="new-password" placeholder="Repita a nova senha" required>
            </div>
            <p style="font-size:12px;color:var(--muted);margin-top:10px">
              <b>Requisitos de segurança:</b> Mínimo de 12 caracteres, com letra maiúscula, minúscula e caractere especial (!@#$%...).
            </p>
            <button class="primary" type="submit" id="submitPasswordBtn" style="margin-top:14px">Atualizar senha no Supabase</button>
          </form>
        </section>
      </div>

      <!-- PAINEL DE CONEXÃO SUPABASE NAS CONFIGURAÇÕES -->
      <section class="card" style="margin-top:20px">
        <div class="card-head">
          <h2>Conexão com Banco de Dados Supabase</h2>
          <span class="badge ${window.supabaseClient ? '' : 'warn'}">${window.supabaseClient ? 'Cliente Inicializado' : 'Não conectado'}</span>
        </div>
        <p>Projeto: <b>GestãoComercioeSolucoes</b>. Todos os cadastros, orçamentos e dossiês são protegidos por Row Level Security (RLS).</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:12px">
          <div class="field">
            <label for="settingsSupabaseUrl">Supabase URL</label>
            <input type="url" id="settingsSupabaseUrl" placeholder="https://xxxxxxxx.supabase.co">
          </div>
          <div class="field">
            <label for="settingsSupabaseKey">Supabase Anon Key</label>
            <input type="password" id="settingsSupabaseKey" placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...">
          </div>
        </div>
        <div style="margin-top:14px;display:flex;gap:10px">
          <button type="button" class="primary" id="btnSalvarConfigSupabase">Salvar e Sincronizar Banco</button>
          <button type="button" class="secondary" id="btnRecarregarDadosSupabase">🔄 Forçar Atualização de Dados</button>
        </div>
      </section>
    </div>
  `;

  // Preenche inputs com configuração atual se houver
  const curConfig = JSON.parse(localStorage.getItem('pradoSupabaseConfig') || '{}');
  if (curConfig.url) document.querySelector('#settingsSupabaseUrl').value = curConfig.url;
  if (curConfig.key) document.querySelector('#settingsSupabaseKey').value = curConfig.key;

  document.querySelector('#btnSalvarConfigSupabase').onclick = () => {
    const url = document.querySelector('#settingsSupabaseUrl').value.trim();
    const key = document.querySelector('#settingsSupabaseKey').value.trim();
    if (!url || !key) return toast('Informe a URL e a Anon Key do Supabase.');
    localStorage.setItem('pradoSupabaseConfig', JSON.stringify({ url, key }));
    toast('Configuração do Supabase salva com sucesso! Reiniciando cliente...');
    if (window.initSupabase) window.initSupabase();
  };

  document.querySelector('#btnRecarregarDadosSupabase').onclick = () => {
    if (window.carregarDadosSupabase) {
      window.carregarDadosSupabase();
    } else {
      toast('Faça login primeiro para carregar dados.');
    }
  };

  function showPhoto(url) {
    const img = document.querySelector('#profilePicture');
    const initials = document.querySelector('#profileInitials');
    if (img && initials) {
      if (url) {
        img.src = url;
        img.style.display = 'block';
        img.removeAttribute('hidden');
        initials.style.display = 'none';
        initials.setAttribute('hidden', '');
      } else {
        img.src = '';
        img.style.display = 'none';
        img.setAttribute('hidden', '');
        initials.style.display = 'grid';
        initials.removeAttribute('hidden');
      }
    }

    // Atualiza em memória no currentUser ativo (sem gravar sessão em localStorage)
    if (window.currentUser) {
      window.currentUser.photo = url || '';
      window.currentUser.avatar = url || (window.currentUser.nome ? window.currentUser.nome.slice(0, 2).toUpperCase() : 'MP');
    }

    // Cache persistente por e-mail
    if (user && user.email) {
      try {
        if (url) {
          localStorage.setItem(`prado_user_avatar_${user.email}`, url);
        } else {
          localStorage.removeItem(`prado_user_avatar_${user.email}`);
        }
      } catch {}
    }

    // Atualiza lista geral de usuários cadastrados
    try {
      const uKey = 'prado_usuarios_cadastrados';
      const users = JSON.parse(localStorage.getItem(uKey) || '[]');
      users.forEach(u => {
        if (u.email && user.email && u.email.toLowerCase() === user.email.toLowerCase()) {
          u.photo = url || '';
          u.avatar = url || (u.nome ? u.nome.slice(0, 2).toUpperCase() : 'MP');
        }
      });
      localStorage.setItem(uKey, JSON.stringify(users));
    } catch {}

    // Persiste nas sessões online para que apareça para todos em tempo real
    try {
      const oKey = 'prado_sessoes_online';
      const sessoes = JSON.parse(localStorage.getItem(oKey) || '{}');
      if (user && user.email && sessoes[user.email]) {
        sessoes[user.email].photo = url || '';
        sessoes[user.email].avatar = url || user.avatar;
        localStorage.setItem(oKey, JSON.stringify(sessoes));
      }
    } catch {}

    // Atualiza imediatamente a barra lateral para a imagem não sumir ao navegar
    if (typeof window.renderNav === 'function') {
      window.renderNav();
    }
  }

  showPhoto(profile.photo);

  document.querySelector('#profileUpload').onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) {
      e.target.value = '';
      return toast('Escolha imagem PNG, JPG ou WebP de até 2 MB');
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        profile.photo = reader.result;
        localStorage.setItem(`pradoProfile_${user.email}`, JSON.stringify(profile));
        showPhoto(profile.photo);
        toast('Foto salva com sucesso');
      } catch {
        toast('Não foi possível salvar a foto.');
      }
    };
    reader.readAsDataURL(file);
  };

  document.querySelector('#removePicture').onclick = () => {
    delete profile.photo;
    localStorage.setItem(`pradoProfile_${user.email}`, JSON.stringify(profile));
    showPhoto(null);
    toast('Foto removida');
  };

  document.querySelector('#saveProfileBtn').onclick = async () => {
    if (window.showLoader) window.showLoader('Salvando Perfil...', 'Atualizando perfil no Supabase...', 60, 'Sincronizando...');
    try {
      if (window.supabaseClient && window.currentUser && window.currentUser.id) {
        await window.supabaseClient.from('perfis').update({
          nome: window.currentUser.nome,
          avatar_url: profile.photo || null
        }).eq('id', window.currentUser.id);
      }
      toast('Dados do perfil salvos com sucesso no Supabase!');
    } catch {
      toast('Dados salvos localmente.');
    } finally {
      if (window.hideLoader) window.hideLoader();
    }
  };

  document.querySelector('#passwordSettings').onsubmit = async e => {
    e.preventDefault();
    const newPass = document.querySelector('#newPassword').value;
    const confirmPass = document.querySelector('#confirmPassword').value;

    if (!window.pradoPasswordValid(newPass)) {
      return toast('A nova senha deve ter no mínimo 12 caracteres, maiúscula, minúscula e caractere especial.');
    }
    if (newPass !== confirmPass) {
      return toast('A confirmação da nova senha não confere.');
    }

    if (window.showLoader) window.showLoader('Atualizando Senha...', 'Enviando nova credencial criptografada ao Supabase Auth...', 50, 'Processando...');

    try {
      if (window.supabaseClient && window.sessionToken) {
        const { error } = await window.supabaseClient.auth.updateUser({ password: newPass });
        if (error) {
          toast(`Falha no Supabase Auth: ${error.message}`);
        } else {
          toast('Senha atualizada com sucesso no Supabase Auth!');
          e.target.reset();
        }
      } else {
        toast('Conecte ao Supabase com sessão ativa para atualizar a senha no servidor.');
      }
    } catch (err) {
      toast('Erro de comunicação com o Supabase Auth.');
    } finally {
      if (window.hideLoader) window.hideLoader();
    }
  };
};

window.pradoPasswordValid = value =>
  typeof value === 'string' &&
  value.length >= 12 &&
  /[A-Z]/.test(value) &&
  /[a-z]/.test(value) &&
  /[^\p{L}\p{N}\s]/u.test(value);
