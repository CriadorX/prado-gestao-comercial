// Prado Gestão Comercial — Autenticação Corporativa Server-Side (Zero Segredos no Cliente)
// Fluxo: 1. Identificação (CPF/CNPJ/E-mail) → 2. Senha (Servidor) → 3. MFA TOTP RFC 6238 (Servidor)

const LAST_USER_KEY = 'pradoLastUser';

let authUser = '';
let authMfaChallengeToken = null;
let authCarouselInterval = null;
let currentSlideIndex = 0;

const $ = sel => document.querySelector(sel);

// ---------- MÁSCARA INTELIGENTE DE CPF / CNPJ / E-MAIL ----------
function formatCpfOrCnpj(val) {
  const digits = val.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 11) {
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
  }
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

function isLikelyNumericDoc(val) {
  const trimmed = val.trim();
  if (!trimmed) return false;
  if (/[a-zA-Z@]/.test(trimmed)) return false;
  return /^[\d.\-\/\s]+$/.test(trimmed);
}

function isValidIdentifier(val) {
  const v = String(val || '').trim();
  if (!v) return false;
  if (v.includes('@')) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }
  const digits = v.replace(/\D/g, '');
  return digits.length === 11 || digits.length === 14;
}

function maskUserDisplay(val) {
  const v = String(val || '').trim();
  if (v.includes('@')) return v.toLowerCase();
  const d = v.replace(/\D/g, '');
  if (d.length === 11) {
    return `${d.slice(0, 3)}.***.***-${d.slice(9, 11)}`;
  }
  if (d.length === 14) {
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/0001-${d.slice(12, 14)}`;
  }
  return v;
}

function setStepError(stepName, msg) {
  const sec = document.querySelector(`.auth-step[data-step="${stepName}"]`);
  if (!sec) return;
  const errEl = sec.querySelector('.auth-error');
  if (!errEl) return;
  if (msg) {
    errEl.textContent = msg;
    errEl.hidden = false;
  } else {
    errEl.textContent = '';
    errEl.hidden = true;
  }
}

// ---------- CARROSSEL DE SLIDES INSTITUCIONAIS ----------
function initCarousel() {
  const slides = document.querySelectorAll('.auth-slide');
  const dots = document.querySelectorAll('#authCarouselDots .auth-dot, .auth-dot');
  const prevBtn = $('#authCarouselPrev');
  const nextBtn = $('#authCarouselNext');

  if (!slides.length) return;

  function goToSlide(index) {
    currentSlideIndex = (index + slides.length) % slides.length;
    slides.forEach((s, i) => s.classList.toggle('active', i === currentSlideIndex));
    dots.forEach((d, i) => d.classList.toggle('active', i === currentSlideIndex));
  }

  if (prevBtn) {
    prevBtn.onclick = () => {
      goToSlide(currentSlideIndex - 1);
      resetInterval();
    };
  }
  if (nextBtn) {
    nextBtn.onclick = () => {
      goToSlide(currentSlideIndex + 1);
      resetInterval();
    };
  }

  dots.forEach((dot, i) => {
    dot.onclick = () => {
      const idx = Number(dot.dataset.index ?? dot.dataset.slide ?? i);
      goToSlide(idx);
      resetInterval();
    };
  });

  function resetInterval() {
    if (authCarouselInterval) clearInterval(authCarouselInterval);
    authCarouselInterval = setInterval(() => {
      goToSlide(currentSlideIndex + 1);
    }, 6500);
  }

  resetInterval();
}

// ---------- NAVEGAÇÃO ENTRE ETAPAS DO LOGIN (COMPATÍVEL COM DATA-STEP DO INDEX.HTML) ----------
function setStep(stepInput) {
  const stepMap = {
    1: 'email',
    2: 'password',
    3: 'token',
    register: 'signup'
  };
  const stepName = stepMap[stepInput] || stepInput;

  const sections = document.querySelectorAll('.auth-step');
  sections.forEach(sec => {
    const isTarget = sec.dataset.step === stepName;
    sec.hidden = !isTarget;
    sec.classList.toggle('active', isTarget);
    const err = sec.querySelector('.auth-error');
    if (err) {
      err.textContent = '';
      err.hidden = true;
    }
  });

  if (stepName === 'saved') {
    const savedLabel = $('#authSavedEmail');
    if (savedLabel) savedLabel.textContent = maskUserDisplay(authUser);
  } else if (stepName === 'email') {
    setTimeout(() => {
      const inp = $('#authEmail');
      if (inp) inp.focus();
    }, 50);
  } else if (stepName === 'password') {
    const pwdEmail = $('#authPwdEmail');
    if (pwdEmail) pwdEmail.value = authUser;
    const pwdInput = $('#authPassword');
    if (pwdInput) {
      pwdInput.value = '';
      setTimeout(() => pwdInput.focus(), 50);
    }
  } else if (stepName === 'token') {
    const sub = $('#authTokenSub');
    if (sub) {
      sub.textContent = 'Abra o aplicativo Google Authenticator no seu celular e digite o código de 6 dígitos.';
    }
    const tipBox = $('#authTokenTipBox');
    if (tipBox) {
      tipBox.innerHTML = `
        🔐 <b>Autenticação Server-Side (Google Authenticator):</b><br>
        <small id="authTokenSentTarget" style="display:block;margin-top:6px;color:#1d4ed8;font-weight:600">
          Digite os 6 dígitos gerados no seu aplicativo autenticador para a conta ${maskUserDisplay(authUser)}.
        </small>
      `;
    }
    const resendBtn = $('#authBtnResendToken');
    if (resendBtn) resendBtn.hidden = true;

    clearOtpInputs();
    setTimeout(() => {
      const first = document.querySelector('#otpToken .otp-box');
      if (first) first.focus();
    }, 60);
  } else if (stepName === 'recovery') {
    ensureRecoveryTotpInput();
    const recInput = $('#authRecoveryInput');
    if (recInput) {
      recInput.readOnly = false;
      if (authUser) recInput.value = authUser;
    }
    const succ = $('#authRecoverySuccess');
    if (succ) succ.hidden = true;
  } else if (stepName === 'google-account') {
    setTimeout(() => {
      const gInput = $('#authGoogleEmailInput');
      if (gInput) gInput.focus();
    }, 50);
  }
}

function ensureRecoveryTotpInput() {
  const recForm = $('#authRecoveryForm');
  if (!recForm || $('#recTotpCode')) return;
  const userField = $('#authRecoveryInput')?.closest('.auth-field');
  if (userField) {
    const wrapper = document.createElement('label');
    wrapper.className = 'auth-field';
    wrapper.innerHTML = `
      <span>Código do Google Authenticator (6 dígitos) *</span>
      <div class="auth-input-wrap">
        <span class="auth-input-icon">🔐</span>
        <input id="recTotpCode" type="text" inputmode="numeric" maxlength="6" placeholder="000000" required autocomplete="one-time-code">
      </div>
    `;
    userField.insertAdjacentElement('afterend', wrapper);
  }
}

// ---------- CAIXAS DE 6 DÍGITOS DO GOOGLE AUTHENTICATOR (#otpToken .otp-box) ----------
function clearOtpInputs() {
  const digits = document.querySelectorAll('#otpToken .otp-box');
  digits.forEach(d => {
    d.value = '';
    d.classList.remove('filled', 'error');
  });
  const confirmBtn = $('#authTokenConfirm');
  if (confirmBtn) confirmBtn.disabled = true;
  setStepError('token', '');
}

function getOtpValue() {
  const digits = document.querySelectorAll('#otpToken .otp-box');
  return Array.from(digits).map(d => d.value.trim()).join('');
}

function setupOtpInputs() {
  const digits = Array.from(document.querySelectorAll('#otpToken .otp-box'));
  if (!digits.length) return;
  const confirmBtn = $('#authTokenConfirm');

  digits.forEach((input, idx) => {
    input.addEventListener('input', e => {
      const val = e.target.value.replace(/\D/g, '');
      e.target.value = val.slice(-1);
      e.target.classList.toggle('filled', !!e.target.value);
      digits.forEach(d => d.classList.remove('error'));
      setStepError('token', '');

      if (val && idx < digits.length - 1) {
        digits[idx + 1].focus();
      }
      const fullCode = getOtpValue();
      if (confirmBtn) confirmBtn.disabled = fullCode.length < 6;
      if (fullCode.length === 6) {
        verifyTotp();
      }
    });

    input.addEventListener('keydown', e => {
      if (e.key === 'Backspace' && !input.value && idx > 0) {
        digits[idx - 1].value = '';
        digits[idx - 1].classList.remove('filled');
        digits[idx - 1].focus();
        if (confirmBtn) confirmBtn.disabled = true;
      }
    });

    input.addEventListener('paste', e => {
      e.preventDefault();
      const pasted = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '').slice(0, 6);
      if (!pasted) return;
      pasted.split('').forEach((ch, i) => {
        if (digits[i]) {
          digits[i].value = ch;
          digits[i].classList.add('filled');
        }
      });
      const focusIdx = Math.min(pasted.length, digits.length - 1);
      digits[focusIdx].focus();
      if (confirmBtn) confirmBtn.disabled = pasted.length < 6;
      if (pasted.length === 6) {
        verifyTotp();
      }
    });
  });
}

// ---------- ATUALIZAÇÃO DOS DADOS DA EMPRESA E PERFIL NO DOM ----------
function applyAuthenticatedSessionToApp(data) {
  if (!data || !data.user) return;

  window.__pradoServerVerified = true;
  currentUser = data.user;
  window.currentUser = data.user;

  if (data.token) {
    sessionToken = data.token;
    window.sessionToken = data.token;
    try {
      sessionStorage.setItem('pradoSessionToken', data.token);
      // Blindagem: evita persistência permanente de token bearer no localStorage (mitigação de XSS)
      localStorage.removeItem('pradoSessionToken');
    } catch {}
  }

  if (data.empresa) {
    window.pradoEmpresa = data.empresa;
  }

  if (data.dadosIniciais && typeof db === 'object' && db) {
    const di = data.dadosIniciais;
    if (!Array.isArray(db.orcamentos) || db.orcamentos.length === 0) db.orcamentos = di.orcamentos || [];
    if (!Array.isArray(db.notas_fiscais) || db.notas_fiscais.length === 0) db.notas_fiscais = di.notas_fiscais || [];
    if (!Array.isArray(db.extrato_bb) || db.extrato_bb.length === 0) db.extrato_bb = di.extrato_bb || [];
    if (!Array.isArray(db.fornecedores) || db.fornecedores.length === 0) db.fornecedores = di.fornecedores || [];
    if (!Array.isArray(db.clientes) || db.clientes.length === 0) db.clientes = di.clientes || [];
    if (!Array.isArray(db.oportunidades) || db.oportunidades.length === 0) db.oportunidades = di.oportunidades || [];
    if (!Array.isArray(db.pedidos) || db.pedidos.length === 0) db.pedidos = di.pedidos || [];
  }
}

function clearClientAuthState() {
  window.__pradoServerVerified = false;
  authMfaChallengeToken = null;
  currentUser = null;
  window.currentUser = null;
  sessionToken = null;
  window.sessionToken = null;

  try {
    localStorage.removeItem('pradoCurrentUser');
    localStorage.removeItem('pradoSessionToken');
    sessionStorage.removeItem('pradoSessionToken');
    sessionStorage.removeItem('prado_expected_token');
  } catch {}

  if (typeof db === 'object' && db) {
    db.clientes = [];
    db.fornecedores = [];
    db.oportunidades = [];
    db.pedidos = [];
    db.orcamentos = [];
    db.notas_fiscais = [];
    db.extrato_bb = [];
    db.docs = [];
  }
}

// ---------- VALIDAÇÃO DO TOKEN 2FA NO SERVIDOR ----------
async function verifyTotp(e) {
  if (e && e.preventDefault) e.preventDefault();
  const code = getOtpValue();
  const digits = document.querySelectorAll('#otpToken .otp-box');
  const btn = $('#authTokenConfirm');

  if (code.length < 6) {
    setStepError('token', 'Digite os 6 dígitos do código do Google Authenticator.');
    digits.forEach(d => d.classList.add('error'));
    return;
  }

  if (!authMfaChallengeToken) {
    setStepError('token', 'Sessão de autenticação expirada. Faça login novamente.');
    setStep('email');
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Verificando no servidor...';
  }

  try {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'verify-mfa',
        mfaToken: authMfaChallengeToken,
        code
      })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok || !data.token || !data.user) {
      setStepError('token', data.error || 'Código inválido ou expirado.');
      digits.forEach(d => d.classList.add('error'));
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Confirmar e acessar conta';
      }
      return;
    }

    authMfaChallengeToken = null;
    await finalizeLogin(data);
  } catch {
    setStepError('token', 'Erro de comunicação com o servidor de autenticação.');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Confirmar e acessar conta';
    }
  }
}

async function finalizeLogin(authData) {
  const rememberEl = $('#authRememberUser');
  if (rememberEl && rememberEl.checked && authUser) {
    try { localStorage.setItem(LAST_USER_KEY, authUser); } catch {}
  } else if (rememberEl && !rememberEl.checked) {
    try { localStorage.removeItem(LAST_USER_KEY); } catch {}
  }

  applyAuthenticatedSessionToApp(authData);

  const uName = $('#userName');
  const uRole = $('#userRole');
  const uAvatar = $('#userAvatar');
  if (uName && currentUser) uName.textContent = currentUser.nome;
  if (uRole && currentUser) uRole.textContent = `${currentUser.cargo} · Sessão Criptografada`;
  if (uAvatar && currentUser) uAvatar.textContent = currentUser.avatar || 'MP';

  if (typeof window.registrarAuditoria === 'function' && currentUser) {
    window.registrarAuditoria(
      'Login Autenticado (2FA Server-Side)',
      'Segurança & Sessão',
      `Acesso liberado pelo servidor para ${currentUser.nome} (${currentUser.cargo})`
    );
  }

  closeLoginOverlay();

  if (typeof loadDatabaseFromSupabase === 'function') {
    await loadDatabaseFromSupabase();
  }
  if (typeof render === 'function') {
    render();
  }
  if (typeof toast === 'function' && currentUser) {
    toast(`Bem-vindo(a), ${currentUser.nome}! Sessão autenticada com 2FA.`);
  }
}

// ---------- GOOGLE OAUTH REAL VIA SUPABASE AUTH ----------
async function getOrInitSupabaseClient() {
  if (window.supabaseClient) return window.supabaseClient;

  let supabaseUrl = window.SUPABASE_URL || '';
  let supabaseKey = window.SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseKey) {
    try {
      const savedCfg = JSON.parse(localStorage.getItem('pradoSupabaseConfig') || '{}');
      supabaseUrl = savedCfg.url || supabaseUrl;
      supabaseKey = savedCfg.key || supabaseKey;
    } catch {}
  }

  // Se não estiver no cache local ou variáveis globais, busca de /api/config
  if (!supabaseUrl || !supabaseKey) {
    try {
      const cfgRes = await fetch('/api/config');
      if (cfgRes.ok) {
        const cfg = await cfgRes.json();
        if (cfg.url && cfg.anonKey) {
          supabaseUrl = cfg.url;
          supabaseKey = cfg.anonKey;
          window.SUPABASE_URL = supabaseUrl;
          window.SUPABASE_ANON_KEY = supabaseKey;
        }
      }
    } catch {}
  }

  if (window.supabase && supabaseUrl && supabaseKey) {
    try {
      const client = window.supabase.createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });
      window.supabaseClient = client;
      window.supabaseReady = true;
      return client;
    } catch (err) {
      console.warn('Erro ao inicializar Supabase Client para OAuth:', err);
    }
  }
  return null;
}
window.getOrInitSupabaseClient = getOrInitSupabaseClient;

async function iniciarGoogleOAuth() {
  setStepError('email', '');
  setStepError('google-account', '');

  const client = await getOrInitSupabaseClient();
  if (!client) {
    const msg = 'Integração Google OAuth / Supabase não configurada no servidor.';
    setStepError('email', msg);
    setStepError('google-account', msg);
    return;
  }

  try {
    const currentRedirect = window.location.origin + window.location.pathname;
    const { data, error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: currentRedirect,
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account'
        }
      }
    });

    if (error) {
      const errMsg = `Falha ao iniciar autenticação Google: ${error.message}`;
      setStepError('email', errMsg);
      setStepError('google-account', errMsg);
    }
  } catch (err) {
    const errMsg = 'Erro de comunicação ao redirecionar para o Google OAuth.';
    setStepError('email', errMsg);
    setStepError('google-account', errMsg);
  }
}
window.iniciarGoogleOAuth = iniciarGoogleOAuth;

async function checkGoogleOAuthCallback() {
  const client = await getOrInitSupabaseClient();
  if (!client) return false;

  // Verifica se há sessão retornada ou ativa no Supabase
  const { data, error } = await client.auth.getSession();
  if (error || !data || !data.session || !data.session.access_token) {
    return false;
  }

  const session = data.session;

  // Limpa o hash/query da URL se contiver fragmentos de autenticação OAuth
  if (window.location.hash.includes('access_token=') || window.location.search.includes('code=')) {
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  // Valida o token OAuth do Supabase no backend corporativo (/api/auth)
  try {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'google-oauth',
        supabaseToken: session.access_token
      })
    });

    const respData = await res.json().catch(() => ({}));

    if (res.ok && respData.ok) {
      if (respData.mfaRequired && respData.mfaToken) {
        // Exige segundo fator TOTP RFC 6238 (Google Authenticator)
        authMfaChallengeToken = respData.mfaToken;
        authUser = respData.email || session.user?.email || '';
        const userBadge = $('#authTargetUser');
        if (userBadge) userBadge.textContent = maskUserDisplay(authUser);
        openLoginOverlay();
        setStep('token');
        return true;
      }

      if (respData.token && respData.user) {
        // Sessão corporativa totalmente verificada
        await finalizeLogin(respData);
        return true;
      }
    } else {
      openLoginOverlay();
      setStep('email');
      setStepError('email', respData.error || 'Autenticação Google não autorizada no servidor.');
      return true;
    }
  } catch (err) {
    openLoginOverlay();
    setStep('email');
    setStepError('email', 'Falha ao validar credencial Google no servidor corporativo.');
    return true;
  }

  return false;
}

// ---------- ABRIR / FECHAR OVERLAY ----------
function openLoginOverlay() {
  document.documentElement.classList.remove('usuario-ja-logado');
  const overlay = $('#loginOverlay');
  if (!overlay) return;
  overlay.hidden = false;
  overlay.style.display = 'flex';

  const savedUser = (localStorage.getItem(LAST_USER_KEY) || '').trim();
  const emailInput = $('#authEmail');
  if (savedUser && isValidIdentifier(savedUser)) {
    authUser = savedUser;
    if (emailInput) emailInput.value = savedUser;
    setStep('saved');
  } else {
    setStep('email');
  }
}
window.openLoginOverlay = openLoginOverlay;

function closeLoginOverlay() {
  if (!window.__pradoServerVerified || !currentUser) return;
  document.documentElement.classList.add('usuario-ja-logado');
  const overlay = $('#loginOverlay');
  if (!overlay) return;
  overlay.hidden = true;
  overlay.style.display = 'none';
}
window.closeLoginOverlay = closeLoginOverlay;

// ---------- INICIALIZAÇÃO DOS EVENTOS ----------
function initMontebravoAuth() {
  initCarousel();
  setupOtpInputs();
  ensureRecoveryTotpInput();

  const emailInput = $('#authEmail');
  if (emailInput) {
    emailInput.addEventListener('input', e => {
      setStepError('email', '');
      const raw = e.target.value;
      if (isLikelyNumericDoc(raw)) {
        e.target.value = formatCpfOrCnpj(raw);
      }
    });
  }

  // Etapa 1a: Usuário Salvo
  const savedContinueBtn = $('#authSavedContinue');
  if (savedContinueBtn) {
    savedContinueBtn.addEventListener('click', () => {
      if (authUser && isValidIdentifier(authUser)) {
        setStep('password');
      } else {
        setStep('email');
      }
    });
  }

  const switchUserBtn = $('#authSwitchUser');
  if (switchUserBtn) {
    switchUserBtn.addEventListener('click', () => {
      try { localStorage.removeItem(LAST_USER_KEY); } catch {}
      authUser = '';
      if (emailInput) emailInput.value = '';
      setStep('email');
    });
  }

  // Etapa 1b: Identificação (CPF, CNPJ ou E-mail)
  const emailForm = $('#authEmailForm');
  if (emailForm) {
    emailForm.addEventListener('submit', async e => {
      e.preventDefault();
      const val = emailInput ? emailInput.value.trim() : '';
      if (!isValidIdentifier(val)) {
        setStepError('email', 'Informe seu e-mail corporativo cadastrado ou CPF/CNPJ válido.');
        return;
      }

      const submitBtn = $('#authEmailSubmit');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Verificando...';
      }

      try {
        const res = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'identify', identifier: val })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) {
          setStepError('email', data.error || 'Identificador inválido.');
          return;
        }
        authUser = val;
        setStep('password');
      } catch {
        setStepError('email', 'Falha ao conectar ao servidor de autenticação.');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = '➜ Acessar';
        }
      }
    });
  }

  // Botão "Esqueci minha conta"
  const forgotAccBtn = $('#authForgotAccBtn');
  if (forgotAccBtn) {
    forgotAccBtn.addEventListener('click', () => {
      setStepError('email', 'Utilize seu e-mail corporativo cadastrado ou o documento da empresa.');
    });
  }

  // Botões "Continuar com o Google" (OAuth Real via Supabase)
  const googleLoginBtn = $('#authBtnGoogleLogin');
  const googleSavedBtns = document.querySelectorAll('.auth-google-btn-action');
  if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', (e) => {
      e.preventDefault();
      iniciarGoogleOAuth();
    });
  }
  googleSavedBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      iniciarGoogleOAuth();
    });
  });

  const googleForm = $('#authGoogleForm');
  if (googleForm) {
    googleForm.addEventListener('submit', async e => {
      e.preventDefault();
      await iniciarGoogleOAuth();
    });
  }

  const googleSubmitBtn = $('#authGoogleSubmitBtn');
  if (googleSubmitBtn) {
    googleSubmitBtn.addEventListener('click', (e) => {
      e.preventDefault();
      iniciarGoogleOAuth();
    });
  }

  const googleBackBtn = $('#authGoogleBack');
  if (googleBackBtn) {
    googleBackBtn.addEventListener('click', () => setStep('email'));
  }

  // Etapa 2: Validação de Senha no Servidor
  const togglePwdBtn = $('#authTogglePwd');
  const pwdInput = $('#authPassword');
  if (togglePwdBtn && pwdInput) {
    togglePwdBtn.addEventListener('click', () => {
      const isPwd = pwdInput.type === 'password';
      pwdInput.type = isPwd ? 'text' : 'password';
      togglePwdBtn.textContent = isPwd ? '🙈' : '👁';
    });
  }

  const backToEmailBtn = $('#authBackToEmail');
  if (backToEmailBtn) {
    backToEmailBtn.addEventListener('click', () => {
      authMfaChallengeToken = null;
      setStep('email');
    });
  }

  const pwdForm = $('#authPasswordForm');
  if (pwdForm) {
    pwdForm.addEventListener('submit', async e => {
      e.preventDefault();
      const pwd = pwdInput ? pwdInput.value : '';
      if (!pwd || pwd.length < 4) {
        setStepError('password', 'Por favor, digite sua senha de acesso.');
        return;
      }

      const btn = $('#authBtnAcessar');
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Autenticando no servidor...';
      }

      try {
        const res = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'login',
            identifier: authUser,
            password: pwd
          })
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok || !data.mfaToken) {
          setStepError('password', data.error || 'Credenciais inválidas.');
          return;
        }

        authMfaChallengeToken = data.mfaToken;
        setStep('token');
      } catch {
        setStepError('password', 'Erro de conexão com o servidor de autenticação.');
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.textContent = '➜ Acessar';
        }
      }
    });
  }

  // Etapa 3: Confirmação do Token 2FA (Google Authenticator)
  const tokenConfirmBtn = $('#authTokenConfirm');
  if (tokenConfirmBtn) {
    tokenConfirmBtn.addEventListener('click', verifyTotp);
  }

  const cancelMfaBtns = document.querySelectorAll('.auth-cancel-mfa');
  cancelMfaBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      authMfaChallengeToken = null;
      setStep('password');
    });
  });

  // Redefinição de senha com verificação obrigatória de identidade TOTP no servidor
  const forgotPwdBtn = $('#authForgotPwd');
  if (forgotPwdBtn) {
    forgotPwdBtn.addEventListener('click', () => setStep('recovery'));
  }

  const backFromRecBtn = $('#authBackFromRecovery');
  if (backFromRecBtn) {
    backFromRecBtn.addEventListener('click', () => setStep('password'));
  }

  const toggleNewPwdBtn = $('#authToggleNewPwd');
  const newPwdInput = $('#authNewPassword');
  if (toggleNewPwdBtn && newPwdInput) {
    toggleNewPwdBtn.addEventListener('click', () => {
      const isPwd = newPwdInput.type === 'password';
      newPwdInput.type = isPwd ? 'text' : 'password';
      toggleNewPwdBtn.textContent = isPwd ? '🙈' : '👁';
    });
  }

  const recForm = $('#authRecoveryForm');
  if (recForm) {
    recForm.addEventListener('submit', async e => {
      e.preventDefault();
      setStepError('recovery', '');

      const userVal = ($('#authRecoveryInput')?.value || authUser || '').trim();
      const totpCode = ($('#recTotpCode')?.value || '').replace(/\D/g, '');
      const newPwd = $('#authNewPassword')?.value || '';
      const confPwd = $('#authConfirmNewPassword')?.value || '';

      if (!isValidIdentifier(userVal)) {
        setStepError('recovery', 'Informe seu e-mail corporativo ou CPF/CNPJ válido.');
        return;
      }
      if (totpCode.length !== 6) {
        setStepError('recovery', 'Informe o código de 6 dígitos do Google Authenticator para comprovar sua identidade.');
        return;
      }
      if (newPwd.length < 8) {
        setStepError('recovery', 'A nova senha deve ter pelo menos 8 caracteres.');
        return;
      }
      if (newPwd !== confPwd) {
        setStepError('recovery', 'A confirmação de senha não confere.');
        return;
      }

      const submitBtn = $('#authRecoverySubmit');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Validando identidade no servidor...';
      }

      try {
        const res = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'recover-password',
            identifier: userVal,
            totpCode,
            newPassword: newPwd
          })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) {
          setStepError('recovery', data.error || 'Falha na verificação de identidade.');
          return;
        }

        const succ = $('#authRecoverySuccess');
        if (succ) {
          succ.textContent = data.message || '✓ Identidade validada com sucesso via 2FA!';
          succ.hidden = false;
        }
      } catch {
        setStepError('recovery', 'Erro de comunicação com o servidor.');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Salvar nova senha e continuar';
        }
      }
    });
  }

  // Cadastro de Novo Operador (bloqueado para auto-provisionamento anônimo)
  const goToSignupBtn = $('#authGoToSignup');
  if (goToSignupBtn) {
    goToSignupBtn.addEventListener('click', () => setStep('signup'));
  }

  const backFromSignupBtn = $('#authBackFromSignup');
  if (backFromSignupBtn) {
    backFromSignupBtn.addEventListener('click', () => setStep('email'));
  }

  const toggleSignupPwdBtn = $('#authToggleSignupPwd');
  const signupPwdInput = $('#authSignupPassword');
  if (toggleSignupPwdBtn && signupPwdInput) {
    toggleSignupPwdBtn.addEventListener('click', () => {
      const isPwd = signupPwdInput.type === 'password';
      signupPwdInput.type = isPwd ? 'text' : 'password';
      toggleSignupPwdBtn.textContent = isPwd ? '🙈' : '👁';
    });
  }

  const signupForm = $('#authSignupForm');
  if (signupForm) {
    signupForm.addEventListener('submit', e => {
      e.preventDefault();
      setStepError('signup', 'Por segurança corporativa, novos operadores devem ser habilitados diretamente pela Diretoria no servidor.');
    });
  }
}

window.logoutSistema = async function () {
  if (typeof window.registrarAuditoria === 'function' && currentUser) {
    window.registrarAuditoria('Logout do Sistema', 'Segurança & Sessão', `Sessão encerrada por ${currentUser.nome}`);
  }

  try {
    await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' })
    });
  } catch {}

  const sClient = window.supabaseClient;
  if (sClient && sClient.auth) {
    try { await sClient.auth.signOut(); } catch {}
  }

  clearClientAuthState();

  const appContainer = document.querySelector('#app');
  if (appContainer) appContainer.innerHTML = '';

  openLoginOverlay();
  if (typeof toast === 'function') {
    toast('Sessão encerrada com segurança.');
  }
};
window.fazerLogout = window.logoutSistema;

// ---------- INICIALIZAÇÃO DA PÁGINA COM VALIDAÇÃO SERVER-SIDE OBRIGATÓRIA ----------
async function startApp() {
  initMontebravoAuth();

  // Nunca confia em pradoCurrentUser salvo localmente no navegador!
  try { localStorage.removeItem('pradoCurrentUser'); } catch {}

  // 1. Verifica retorno de callback do Google OAuth via Supabase
  try {
    const oauthHandled = await checkGoogleOAuthCallback();
    if (oauthHandled) return;
  } catch (err) {
    console.warn('Erro ao verificar retorno do Google OAuth:', err);
  }

  // 2. Valida token de sessão existente no backend (via cabeçalho Authorization ou cookie HttpOnly seguro)
  const candidateToken = sessionStorage.getItem('pradoSessionToken') || localStorage.getItem('pradoSessionToken') || '';

  try {
    const headers = {};
    if (candidateToken) {
      headers['Authorization'] = `Bearer ${candidateToken}`;
    }
    const res = await fetch('/api/auth', {
      method: 'GET',
      headers,
      credentials: 'include'
    });

    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (data && data.ok && data.user) {
        data.token = candidateToken || data.token || '';
        await finalizeLogin(data);
        return;
      }
    }
  } catch {}

  // Token ausente, expirado ou forjado -> limpa estado e exibe a tela de login
  clearClientAuthState();
  openLoginOverlay();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp);
} else {
  startApp();
}
