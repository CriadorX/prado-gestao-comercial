// Prado Gestão Comercial — Autenticação em 3 etapas estilo Montebravo
// Sequência: 1. CPF ou E-mail (ou Cadastro) → 2. Senha → 3. Token Google Authenticator

const LAST_USER_KEY = 'pradoLastUser';
const CUSTOM_PWD_KEY = 'pradoUserPassword';
const DEFAULT_PASSWORD = 'Prado@2026';
const TOTP_SECRET_BASE = 'PRADOGESTAOMFA23';

let authUser = '';
let authEmailResolved = '';
let mfaFactorId = null;
let mfaMode = 'verify'; // 'verify' | 'enroll'

const $ = sel => document.querySelector(sel);

// ---------- MÁSCARA INTELIGENTE DE CPF / E-MAIL ----------
function formatCpf(val) {
  const digits = String(val || '').replace(/\D/g, '').slice(0, 11);
  if (!digits) return '';
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

function maskUser(user) {
  if (!user) return '—';
  const clean = String(user).trim();
  if (clean.includes('@')) {
    const [u, d] = clean.split('@');
    return `${u.slice(0, 2)}${'•'.repeat(Math.max(3, u.length - 2))}@${d}`;
  }
  const digits = clean.replace(/\D/g, '');
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}.•••.•••-${digits.slice(9)}`;
  }
  return clean;
}

// ---------- VALIDAÇÃO OFICIAL DE CPF (RECEITA FEDERAL - MÓDULO 11) ----------
function validarCPF(cpfRaw) {
  const cpf = String(cpfRaw || '').replace(/\D/g, '');
  if (cpf.length !== 11) return false;
  // Rejeita sequências de dígitos repetidos (ex: 111.111.111-11, 000.000.000-00)
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpf.charAt(i), 10) * (10 - i);
  }
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.charAt(9), 10)) return false;

  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cpf.charAt(i), 10) * (11 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.charAt(10), 10)) return false;

  return true;
}
window.validarCPF = validarCPF;

// ---------- VALIDAÇÃO DE SENHA FORTE CORPORATIVA ----------
function validarSenhaForte(senha) {
  const str = String(senha || '');
  const temTam = str.length >= 8;
  const temUpper = /[A-Z]/.test(str);
  const temLower = /[a-z]/.test(str);
  const temNum = /[0-9]/.test(str);
  const temSym = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`§]/.test(str);

  return {
    valido: temTam && temUpper && temLower && temNum && temSym,
    temTam,
    temCase: temUpper && temLower,
    temNumSym: temNum && temSym
  };
}
window.validarSenhaForte = validarSenhaForte;

// ---------- CONFIGURAÇÃO DO SUPABASE ----------
async function loadSupabaseConfig() {
  try {
    const r = await fetch('/api/config', { cache: 'no-store' });
    if (r.ok) {
      const cfg = await r.json();
      if (cfg.url && cfg.anonKey) {
        window.SUPABASE_URL = cfg.url;
        window.SUPABASE_ANON_KEY = cfg.anonKey;
      }
    }
  } catch { /* usa local */ }
  initSupabase();
}

// ---------- NAVEGAÇÃO ENTRE ETAPAS ----------
function showAuthStep(step) {
  document.querySelectorAll('.auth-step').forEach(s => { s.hidden = s.dataset.step !== step; });
  const focusMap = {
    email: '#authEmail',
    signup: '#authSignupNome',
    password: '#authPassword',
    recovery: '#authNewPassword',
    config: '#inputSupabaseUrl',
    'confirm-email': '#btnGoToLoginAfterConfirm'
  };
  if (focusMap[step]) setTimeout(() => $(focusMap[step])?.focus(), 60);
  if (step === 'token' || step === 'enroll') {
    setTimeout(() => document.querySelector(`.auth-step[data-step="${step}"] .otp-box`)?.focus(), 60);
  }
}

function setAuthError(step, msg) {
  const el = document.querySelector(`.auth-step[data-step="${step}"] .auth-error`);
  if (el) { el.textContent = msg || ''; el.hidden = !msg; }
}

function openLoginOverlay() {
  const el = $('#loginOverlay');
  if (!el) return;
  el.hidden = false;
  el.style.setProperty('display', 'flex', 'important');
  const last = localStorage.getItem(LAST_USER_KEY) || localStorage.getItem('pradoLastEmail') || 'licitadigitaltech@gmail.com';
  if (last) {
    authUser = last;
    $('#authSavedEmail').textContent = maskUser(last);
    showAuthStep('saved');
  } else {
    showAuthStep('email');
  }
}
window.openLoginOverlay = openLoginOverlay;

function closeLoginOverlay() {
  const el = $('#loginOverlay');
  if (el) {
    el.hidden = true;
    el.style.setProperty('display', 'none', 'important');
  }
  // Reseta os formulários para notificar o gerenciador de senhas do navegador que a sessão foi finalizada
  try {
    $('#authPasswordForm')?.reset();
    $('#authLoginForm')?.reset();
    $('#authSignupForm')?.reset();
    if ($('#authPassword')) $('#authPassword').value = '';
    if ($('#authSignupPassword')) $('#authSignupPassword').value = '';
  } catch {}
}
window.closeLoginOverlay = closeLoginOverlay;

// ---------- MÁSCARAS DE DIGITAÇÃO NOS INPUTS ----------
const emailInput = $('#authEmail');
if (emailInput) {
  emailInput.addEventListener('input', e => {
    const v = e.target.value;
    if (/^[\d.\-]+$/.test(v)) {
      e.target.value = formatCpf(v);
    }
  });
}

const signupCpfInput = $('#authSignupCpf');
if (signupCpfInput) {
  signupCpfInput.addEventListener('input', e => {
    e.target.value = formatCpf(e.target.value);
  });
}

// ---------- CAIXAS DO TOKEN OTP (6 DÍGITOS) ----------
function setupOtp(container, onComplete) {
  const boxes = [...container.querySelectorAll('.otp-box')];
  const read = () => boxes.map(b => b.value).join('');

  boxes.forEach((box, i) => {
    box.addEventListener('input', () => {
      box.value = box.value.replace(/\D/g, '').slice(-1);
      if (box.value && boxes[i + 1]) boxes[i + 1].focus();
      container.dispatchEvent(new CustomEvent('otpchange', { detail: read() }));
      // NUNCA liberar ou disparar automaticamente ao preencher 6 dígitos!
      // A validação agora exige confirmação explícita no botão "Confirmar e acessar conta" ou tecla Enter.
    });

    box.addEventListener('keydown', e => {
      if (e.key === 'Backspace' && !box.value && boxes[i - 1]) {
        boxes[i - 1].focus();
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const code = read();
        if (code.length === 6) {
          onComplete(code);
        }
      }
    });

    box.addEventListener('paste', e => {
      const digits = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6);
      if (!digits) return;
      e.preventDefault();
      boxes.forEach((b, j) => { b.value = digits[j] || ''; });
      boxes[Math.min(digits.length, 5)].focus();
      container.dispatchEvent(new CustomEvent('otpchange', { detail: read() }));
      // Sem disparo automático no colar: o usuário deve conferir e clicar no botão de confirmação.
    });
  });

  container.addEventListener('otpchange', e => {
    const btn = container.closest('.auth-step').querySelector('.auth-confirm');
    if (btn) btn.disabled = e.detail.length !== 6;
  });

  return {
    value: read,
    clear: () => {
      boxes.forEach(b => (b.value = ''));
      boxes[0].focus();
      container.dispatchEvent(new CustomEvent('otpchange', { detail: '' }));
    }
  };
}

// ---------- ETAPA 1: IDENTIFICAÇÃO (CPF OU E-MAIL) ----------
$('#authEmailForm')?.addEventListener('submit', e => {
  e.preventDefault();
  const raw = $('#authEmail').value.trim();
  if (!raw) return setAuthError('email', 'Informe o seu CPF ou e-mail.');

  const isEmail = raw.includes('@');
  const digits = raw.replace(/\D/g, '');

  if (!isEmail) {
    if (digits.length !== 11 || !validarCPF(digits)) {
      return setAuthError('email', 'Informe um CPF válido (11 dígitos oficiais da Receita) ou seu e-mail corporativo.');
    }
  }
  if (isEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) {
    return setAuthError('email', 'Informe um formato de e-mail corporativo válido.');
  }

  setAuthError('email', '');
  const identificador = isEmail ? raw.toLowerCase() : formatCpf(digits);
  
  // Verificação de existência da conta cadastrada
  const cadastrados = typeof window.getUsuariosCadastrados === 'function' ? window.getUsuariosCadastrados() : [];
  const existe = cadastrados.some(u => {
    const emailMatch = (u.email || '').toLowerCase() === (isEmail ? raw.toLowerCase() : '');
    const cpfMatch = String(u.cpf || '').replace(/\D/g, '') === digits;
    return emailMatch || cpfMatch;
  });

  const isAdminDefault = (isEmail && raw.toLowerCase() === 'licitadigitaltech@gmail.com');

  if (!existe && !isAdminDefault) {
    return setAuthError('email', 'Este CPF ou e-mail não possui cadastro no sistema. Clique em "Criar conta de acesso" abaixo para se cadastrar.');
  }

  authUser = identificador;
  authEmailResolved = isEmail ? raw.toLowerCase() : `cpf_${digits}@prado.com.br`;

  $('#authPwdEmail').value = authUser;
  showAuthStep('password');
});

$('#authSavedContinue')?.addEventListener('click', () => {
  if (!authUser) authUser = 'licitadigitaltech@gmail.com';
  $('#authPwdEmail').value = authUser;
  showAuthStep('password');
});

$('#authSwitchUser')?.addEventListener('click', () => {
  localStorage.removeItem(LAST_USER_KEY);
  localStorage.removeItem('pradoLastEmail');
  authUser = '';
  $('#authEmail').value = '';
  showAuthStep('email');
});

// Transição para cadastro
$('#authGoToSignup')?.addEventListener('click', () => {
  setAuthError('signup', '');
  showAuthStep('signup');
});

$('#authBackFromSignup')?.addEventListener('click', () => {
  showAuthStep('email');
});

$('#authToggleSignupPwd')?.addEventListener('click', () => {
  const inp = $('#authSignupPassword');
  inp.type = inp.type === 'password' ? 'text' : 'password';
});

// Validação visual de senha forte em tempo real
const signupPwdInput = $('#authSignupPassword');
if (signupPwdInput) {
  signupPwdInput.addEventListener('input', e => {
    const v = e.target.value;
    const res = validarSenhaForte(v);
    
    const elLen = $('#ruleLength');
    const elCase = $('#ruleCase');
    const elNumSym = $('#ruleNumSym');
    
    if (elLen) {
      elLen.textContent = res.temTam ? '✓ Mínimo 8 caracteres' : '⚪ Mínimo 8 caracteres';
      elLen.style.color = res.temTam ? '#16a34a' : '#64748b';
      elLen.style.fontWeight = res.temTam ? '700' : '400';
    }
    if (elCase) {
      elCase.textContent = res.temCase ? '✓ Maiúscula e minúscula' : '⚪ Maiúscula e minúscula';
      elCase.style.color = res.temCase ? '#16a34a' : '#64748b';
      elCase.style.fontWeight = res.temCase ? '700' : '400';
    }
    if (elNumSym) {
      elNumSym.textContent = res.temNumSym ? '✓ Número e símbolo (!@#$)' : '⚪ Número e símbolo (!@#$)';
      elNumSym.style.color = res.temNumSym ? '#16a34a' : '#64748b';
      elNumSym.style.fontWeight = res.temNumSym ? '700' : '400';
    }
  });
}

// ---------- CADASTRO DE NOVO OPERADOR ----------
$('#authSignupForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const nome = $('#authSignupNome').value.trim();
  const email = $('#authSignupEmail').value.trim().toLowerCase();
  const cpf = $('#authSignupCpf').value.trim();
  const cargo = $('#authSignupCargo').value.trim() || 'Representante Comercial';
  const senha = $('#authSignupPassword').value;
  const confirma = $('#authSignupConfirmPassword').value;

  if (nome.length < 3) return setAuthError('signup', 'Informe seu nome completo (mínimo 3 caracteres).');
  
  // 1. Validação rigorosa de formato de e-mail (RFC 5322 simplificada)
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(email)) {
    return setAuthError('signup', 'E-mail inválido. Informe um endereço corporativo ou pessoal válido (ex: seu.nome@empresa.com.br).');
  }

  // 2. Bloqueio de domínios descartáveis / temporários (anti-spam / anti-bot)
  const disposableDomains = ['tempmail.com', '10minutemail.com', 'guerrillamail.com', 'throwawaymail.com', 'mailinator.com', 'yopmail.com', 'trashmail.com', 'dispostable.com', 'getairmail.com'];
  const domain = email.split('@')[1] || '';
  if (disposableDomains.includes(domain)) {
    return setAuthError('signup', 'Por motivos de segurança e rastreabilidade (LGPD), não são aceitos provedores de e-mail temporários ou descartáveis.');
  }
  
  // 3. Validação oficial de CPF via algoritmo oficial da Receita Federal (Módulo 11)
  const cpfDigits = cpf.replace(/\D/g, '');
  if (!validarCPF(cpfDigits)) {
    return setAuthError('signup', 'CPF inválido. O CPF digitado não confere com o algoritmo verificador oficial da Receita Federal.');
  }

  // 4. Verificação estrita de duplicidade de E-mail e CPF cadastrados (Prevenção de sobrescrita e DoS)
  const usuariosExistentes = typeof window.getUsuariosCadastrados === 'function' ? window.getUsuariosCadastrados() : [];
  const formatadoCpf = formatCpf(cpfDigits);
  
  const emailJaExiste = usuariosExistentes.some(u => (u.email || '').toLowerCase() === email);
  if (emailJaExiste) {
    return setAuthError('signup', `O e-mail "${email}" já possui cadastro ativo no sistema. Faça login com suas credenciais ou use "Esqueci minha senha".`);
  }

  const cpfJaExiste = usuariosExistentes.some(u => {
    const uCpfDigits = String(u.cpf || '').replace(/\D/g, '');
    return uCpfDigits && uCpfDigits === cpfDigits;
  });
  if (cpfJaExiste) {
    return setAuthError('signup', `O CPF ${formatadoCpf} já está vinculado a outra conta cadastrada. Entre em contato com a administração caso precise de redefinição de acesso.`);
  }

  // 5. Validação de Senha Forte
  const pwdCheck = validarSenhaForte(senha);
  if (!pwdCheck.valido) {
    return setAuthError('signup', 'A senha precisa cumprir todos os requisitos corporativos: mínimo 8 caracteres, contendo letra maiúscula, letra minúscula, número e símbolo especial (!@#$).');
  }

  if (senha !== confirma) return setAuthError('signup', 'As senhas digitadas não coincidem. Digite a mesma senha nos dois campos.');

  setAuthError('signup', '');
  showLoader('Criando conta...', 'Validando duplicidade e cadastrando novo operador...', 45, 'Gravando perfil...');

  const novoUsuario = {
    id: 'usr_' + Date.now(),
    nome: nome,
    email: email,
    cpf: formatadoCpf,
    cargo: cargo,
    papel: 'operador',
    avatar: nome.slice(0, 2).toUpperCase(),
    dataCadastro: new Date().toISOString().slice(0, 10)
  };

  // Salva na lista de usuários cadastrados
  if (typeof window.salvarNovoUsuario === 'function') {
    window.salvarNovoUsuario(novoUsuario);
  }

  // Salva a senha do usuário
  localStorage.setItem(`${CUSTOM_PWD_KEY}_${email}`, senha);
  localStorage.setItem(`${CUSTOM_PWD_KEY}_${formatCpf(cpfDigits)}`, senha);
  localStorage.setItem(`${CUSTOM_PWD_KEY}_${cpfDigits}`, senha);

  // Registro de Auditoria Silenciosa
  if (typeof window.registrarAuditoria === 'function') {
    window.registrarAuditoria('Novo operador cadastrado', 'Autenticação', `Operador ${nome} (${email}) cadastrou perfil com CPF verificado e senha forte`);
  }

  let precisaConfirmarEmail = false;
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient.auth.signUp({
        email: email,
        password: senha,
        options: {
          data: { nome, cargo, cpf: formatCpf(cpfDigits) },
          emailRedirectTo: window.location.origin
        }
      });
      if (error) {
        console.warn('Erro signUp Supabase:', error);
        hideLoader();
        return setAuthError('signup', error.message || 'Erro ao cadastrar novo operador no Supabase.');
      }
      // Se não há sessão direta ou o e-mail requer confirmação
      if (data?.user && (!data?.session || !data?.user?.email_confirmed_at)) {
        precisaConfirmarEmail = true;
      }
    } catch (err) {
      console.warn('Catch signUp:', err);
    }
  }

  await new Promise(r => setTimeout(r, 700));
  hideLoader();

  authUser = email;
  localStorage.setItem(LAST_USER_KEY, authUser);

  if (precisaConfirmarEmail) {
    const elTarget = $('#confirmEmailTarget');
    if (elTarget) elTarget.textContent = email;
    toast(`E-mail de confirmação enviado para ${email}!`);
    showAuthStep('confirm-email');
    return;
  }

  toast(`Conta criada com sucesso! Boas-vindas, ${nome}.`);

  // Leva para configurar o Google Authenticator
  carregarQrCodeNoVisual();
  showAuthStep('enroll');
});

// Ações dos botões da tela de confirmação de e-mail
$('#btnGoToLoginAfterConfirm')?.addEventListener('click', () => {
  if (authUser) {
    const emailInp = $('#authEmail');
    if (emailInp) emailInp.value = authUser;
    const pwdEmail = $('#authPwdEmail');
    if (pwdEmail) pwdEmail.value = maskUser(authUser);
    showAuthStep('password');
  } else {
    showAuthStep('email');
  }
});

$('#btnBackToSignupFromConfirm')?.addEventListener('click', () => {
  showAuthStep('signup');
});

// ---------- LOGIN COM CONTA GOOGLE (SUPABASE OAUTH COM SELEÇÃO DE CONTA) ----------
async function handleGoogleLogin() {
  if (!supabaseClient) {
    setAuthError('email', '⚠️ O login com Google precisa da conexão oficial do Supabase. Clique no botão ⚙️ no rodapé para salvar a URL e Anon Key do seu projeto.');
    setAuthError('saved', '⚠️ O login com Google precisa da conexão oficial do Supabase. Clique no botão ⚙️ no rodapé para salvar a URL e Anon Key.');
    toast('Supabase não conectado. Clique na engrenagem ⚙️ abaixo.');
    return;
  }

  showLoader('Conectando ao Google...', 'Abrindo tela oficial de seleção de contas Google...', 40, 'Redirecionando para o Google...');

  try {
    const { data, error } = await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: {
        queryParams: {
          prompt: 'select_account',
          access_type: 'offline'
        },
        redirectTo: window.location.origin
      }
    });
    if (error) throw error;
    return;
  } catch (err) {
    hideLoader();
    console.warn('Google OAuth Supabase aviso:', err);
    setAuthError('email', 'Erro ao abrir Google: verifique se o Client ID e Secret estão ativos no Supabase (Authentication > Providers > Google).');
    setAuthError('saved', 'Erro ao abrir Google: verifique se o Client ID e Secret estão ativos no Supabase.');
    toast('Erro no login com Google.');
  }
}

document.querySelectorAll('#authBtnGoogleLogin, .auth-google-btn-action').forEach(btn => {
  btn.addEventListener('click', handleGoogleLogin);
});

// ---------- ETAPA 2: SENHA & RECUPERAÇÃO ----------
$('#authTogglePwd')?.addEventListener('click', () => {
  const inp = $('#authPassword');
  inp.type = inp.type === 'password' ? 'text' : 'password';
});

$('#authToggleNewPwd')?.addEventListener('click', () => {
  const inp = $('#authNewPassword');
  inp.type = inp.type === 'password' ? 'text' : 'password';
});

$('#authBackToEmail')?.addEventListener('click', () => showAuthStep('email'));

// Botão "Esqueci minha senha / Redefinir"
$('#authForgotPwd')?.addEventListener('click', () => {
  const user = authUser || 'licitadigitaltech@gmail.com';
  $('#authRecoveryInput').value = user;
  $('#authNewPassword').value = '';
  $('#authConfirmNewPassword').value = '';
  $('#authRecoverySuccess').hidden = true;
  setAuthError('recovery', '');
  showAuthStep('recovery');
});

$('#authForgotAccBtn')?.addEventListener('click', () => {
  const current = $('#authEmail')?.value?.trim() || authUser || 'licitadigitaltech@gmail.com';
  authUser = current;
  $('#authRecoveryInput').value = current;
  $('#authNewPassword').value = '';
  $('#authConfirmNewPassword').value = '';
  $('#authRecoverySuccess').hidden = true;
  setAuthError('recovery', '');
  showAuthStep('recovery');
});

$('#authBackFromRecovery')?.addEventListener('click', () => {
  if (authUser) showAuthStep('password');
  else showAuthStep('email');
});

// Formulário de Redefinição Imediata de Senha
$('#authRecoveryForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const newPwd = $('#authNewPassword').value;
  const confirmPwd = $('#authConfirmNewPassword').value;

  const pwdCheck = validarSenhaForte(newPwd);
  if (!pwdCheck.valido) {
    return setAuthError('recovery', 'A nova senha precisa ter no mínimo 8 caracteres, contendo letra maiúscula, minúscula, número e caractere especial (!@#$).');
  }
  if (newPwd !== confirmPwd) {
    return setAuthError('recovery', 'As senhas digitadas não coincidem.');
  }

  setAuthError('recovery', '');
  showLoader('Salvando nova senha...', 'Atualizando suas credenciais com segurança...', 50, 'Gravando senha...');

  const userKey = authUser || 'licitadigitaltech@gmail.com';
  localStorage.setItem(`${CUSTOM_PWD_KEY}_${userKey}`, newPwd);
  localStorage.setItem(CUSTOM_PWD_KEY, newPwd);

  if (typeof window.registrarAuditoria === 'function') {
    window.registrarAuditoria('Redefinição de senha', 'Segurança', `Usuário ${userKey} redefiniu sua senha de acesso`);
  }

  if (supabaseClient && userKey.includes('@')) {
    try {
      await supabaseClient.auth.updateUser({ password: newPwd });
    } catch {}
  }

  await new Promise(r => setTimeout(r, 600));
  hideLoader();

  $('#authRecoverySuccess').hidden = false;
  toast('Sua nova senha foi gravada com sucesso!');

  setTimeout(() => {
    carregarQrCodeNoVisual();
    showAuthStep('enroll');
  }, 1200);
});

// Identificador unificado para validação 2FA diária isolada por usuário específico
function getMfaUserKey(u) {
  const raw = String(u || authEmailResolved || authUser || 'licitadigitaltech@gmail.com').trim().toLowerCase();
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 11) {
    const cadastrados = typeof window.getUsuariosCadastrados === 'function' ? window.getUsuariosCadastrados() : [];
    const match = cadastrados.find(x => String(x.cpf || '').replace(/\D/g, '') === digits);
    if (match && match.email) return match.email.trim().toLowerCase();
    return `cpf_${digits}`;
  }
  return raw;
}

// Validação de Senha (Etapa 2 -> Etapa 3)
$('#authPasswordForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const password = $('#authPassword').value;
  if (!password) return setAuthError('password', 'Informe sua senha de acesso.');

  setAuthError('password', '');
  showLoader('Validando acesso...', 'Conferindo usuário e senha...', 35, 'Verificando credenciais...');

  const userKey = authUser || 'licitadigitaltech@gmail.com';
  
  // Proteção contra Força Bruta (Rate Limiting de Tentativas de Senha)
  const failKey = `prado_login_fails_${userKey}`;
  const lockKey = `prado_login_locked_${userKey}`;
  const lockedUntil = parseInt(localStorage.getItem(lockKey) || '0', 10);
  const agora = Date.now();

  if (lockedUntil > agora) {
    hideLoader();
    const minutosRestantes = Math.ceil((lockedUntil - agora) / 60000);
    return setAuthError('password', `⚠️ Conta temporariamente bloqueada por excesso de tentativas incorretas. Aguarde ${minutosRestantes} minuto(s) antes de tentar novamente.`);
  }

  const customPwd = localStorage.getItem(`${CUSTOM_PWD_KEY}_${userKey}`);
  
  // Apenas a conta administrativa master pode usar fallback padrão temporário caso ainda não tenha definido senha customizada
  const isAdmin = (userKey.toLowerCase() === 'licitadigitaltech@gmail.com');
  let senhaValida = (customPwd && password === customPwd) || (isAdmin && !customPwd && password === DEFAULT_PASSWORD);

  if (supabaseClient) {
    try {
      const emailToUse = authEmailResolved || (authUser.includes('@') ? authUser : `cpf_${authUser.replace(/\D/g, '')}@prado.com.br`);
      const { error } = await supabaseClient.auth.signInWithPassword({ email: emailToUse, password });
      if (!error) senhaValida = true;
    } catch {}
  }

  if (!senhaValida) {
    hideLoader();
    let fails = parseInt(localStorage.getItem(failKey) || '0', 10) + 1;
    localStorage.setItem(failKey, String(fails));

    if (fails >= 5) {
      // Bloqueia por 5 minutos (300.000 ms)
      localStorage.setItem(lockKey, String(agora + 300000));
      localStorage.removeItem(failKey);
      if (typeof window.registrarAuditoria === 'function') {
        window.registrarAuditoria('Bloqueio de segurança (Brute Force)', 'Segurança', `Conta ${userKey} foi temporariamente bloqueada após 5 tentativas consecutivas de senha incorreta`);
      }
      return setAuthError('password', '⚠️ Sua conta foi bloqueada por 5 minutos devido a 5 tentativas incorretas consecutivas.');
    }

    if (typeof window.registrarAuditoria === 'function') {
      window.registrarAuditoria('Falha de login (Senha incorreta)', 'Segurança', `Tentativa de acesso com senha inválida para ${userKey} (Tentativa ${fails}/5)`);
    }
    return setAuthError('password', `Senha incorreta (${fails}/5 tentativas). Verifique os dados digitados ou utilize "Esqueci minha senha".`);
  }

  // Sucesso na senha: limpa contador de falhas
  localStorage.removeItem(failKey);
  localStorage.removeItem(lockKey);

  // Verificação diária do Token (solicitado apenas 1x ao dia por usuário específico)
  const cleanUserKey = getMfaUserKey(userKey);
  const hoje = new Date().toISOString().slice(0, 10);
  const mfaValidoHoje = (localStorage.getItem(`prado_mfa_valid_${cleanUserKey}`) === hoje);

  if (mfaValidoHoje) {
    // Este usuário específico já digitou o token hoje: libera acesso direto!
    hideLoader();
    $('#authPassword').value = '';
    localStorage.setItem(LAST_USER_KEY, authUser || 'licitadigitaltech@gmail.com');
    toast('✓ Acesso seguro: Token do dia já verificado para sua conta. Entrando...');
    await finishLogin();
    return;
  }

  setTimeout(() => {
    hideLoader();
    $('#authPassword').value = '';
    localStorage.setItem(LAST_USER_KEY, authUser || 'licitadigitaltech@gmail.com');
    carregarQrCodeNoVisual();
    showAuthStep('token');
  }, 400);
});

// ---------- ETAPA 3: GOOGLE AUTHENTICATOR (COM QR CODE REAL) ----------
function carregarQrCodeNoVisual() {
  const user = authUser || 'licitadigitaltech@gmail.com';
  const secret = TOTP_SECRET_BASE;
  const otpauth = `otpauth://totp/PradoGestao:${encodeURIComponent(user)}?secret=${secret}&issuer=Prado%20Gestao%20Comercial`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(otpauth)}`;

  const imgEl = $('#authQrImg');
  if (imgEl) imgEl.src = qrUrl;

  const secretEl = $('#authSecret');
  if (secretEl) secretEl.textContent = secret.replace(/(.{4})/g, '$1 ').trim();
}

$('#authBtnShowQr')?.addEventListener('click', () => {
  carregarQrCodeNoVisual();
  showAuthStep('enroll');
});

$('#authBackToToken')?.addEventListener('click', () => {
  showAuthStep('token');
});

// ---------- ALGORITMO CRIPTOGRÁFICO OFICIAL TOTP (RFC 6238 / GOOGLE AUTHENTICATOR) ----------
function base32ToBytes(base32) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = String(base32 || '').toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
  let bits = 0;
  let value = 0;
  const bytes = [];
  for (let i = 0; i < clean.length; i++) {
    const idx = alphabet.indexOf(clean[i]);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return new Uint8Array(bytes);
}

async function calcularTotpEsperado(secretBase32, timeOffsetSeconds = 0) {
  try {
    const keyBytes = base32ToBytes(secretBase32);
    const epoch = Math.floor(Date.now() / 1000) + timeOffsetSeconds;
    const counter = Math.floor(epoch / 30);

    const buffer = new ArrayBuffer(8);
    const view = new DataView(buffer);
    view.setUint32(0, Math.floor(counter / 0x100000000), false);
    view.setUint32(4, counter >>> 0, false);

    const cryptoKey = await window.crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'HMAC', hash: { name: 'SHA-1' } },
      false,
      ['sign']
    );

    const signature = await window.crypto.subtle.sign('HMAC', cryptoKey, buffer);
    const hmacBytes = new Uint8Array(signature);
    const offset = hmacBytes[hmacBytes.length - 1] & 0x0f;

    const binary =
      ((hmacBytes[offset] & 0x7f) << 24) |
      ((hmacBytes[offset + 1] & 0xff) << 16) |
      ((hmacBytes[offset + 2] & 0xff) << 8) |
      (hmacBytes[offset + 3] & 0xff);

    const otp = binary % 1000000;
    return String(otp).padStart(6, '0');
  } catch (err) {
    console.error('Erro ao calcular TOTP:', err);
    return null;
  }
}

// Validação com tolerância de relógio (janela atual, -30s e +30s)
async function validarCodigoTotpReal(codigoDigitado, secretBase32 = TOTP_SECRET_BASE) {
  const limpo = String(codigoDigitado || '').trim();
  if (limpo.length !== 6 || !/^\d{6}$/.test(limpo)) return false;

  const [tAtual, tPassado, tFuturo] = await Promise.all([
    calcularTotpEsperado(secretBase32, 0),
    calcularTotpEsperado(secretBase32, -30),
    calcularTotpEsperado(secretBase32, 30)
  ]);

  return (limpo === tAtual || limpo === tPassado || limpo === tFuturo);
}

async function verifyTotp(code, step, otp) {
  if (code.length !== 6) return;
  setAuthError(step, '');
  showLoader('Confirmando token...', 'Sincronizando com o Google Authenticator...', 75, 'Validando chave de 6 dígitos...');

  try {
    const validoReal = await validarCodigoTotpReal(code, TOTP_SECRET_BASE);

    if (!validoReal) {
      hideLoader();
      if (otp && typeof otp.clear === 'function') otp.clear();
      
      const boxContainer = document.querySelector(`.auth-step[data-step="${step}"] .otp`);
      if (boxContainer) {
        boxContainer.classList.add('otp-shake');
        setTimeout(() => boxContainer.classList.remove('otp-shake'), 600);
      }

      if (typeof window.registrarAuditoria === 'function') {
        window.registrarAuditoria('Falha de 2FA (Token inválido)', 'Segurança', `Tentativa de login com token do Google Authenticator incorreto (${code})`);
      }
      return setAuthError(step, '❌ Código incorreto! O número digitado não confere com o Google Authenticator do seu celular. Abra o app Prado Gestão e digite o código atual.');
    }

    if (supabaseClient && mfaFactorId) {
      try {
        await supabaseClient.auth.mfa.challengeAndVerify({ factorId: mfaFactorId, code });
      } catch {}
    }

    // Grava validação do token do dia exclusivamente para este usuário específico
    const cleanUserKey = getMfaUserKey(authUser);
    const hoje = new Date().toISOString().slice(0, 10);
    localStorage.setItem(`prado_mfa_valid_${cleanUserKey}`, hoje);

    toast('Google Authenticator verificado com sucesso!');
    await finishLogin();
  } catch (err) {
    hideLoader();
    setAuthError(step, 'Erro ao verificar código de segurança. Tente novamente.');
  }
}

const otpToken = $('#otpToken') && setupOtp($('#otpToken'), code => verifyTotp(code, 'token', otpToken));
const otpEnroll = $('#otpEnroll') && setupOtp($('#otpEnroll'), code => verifyTotp(code, 'enroll', otpEnroll));

$('#authTokenConfirm')?.addEventListener('click', () => {
  if (otpToken && otpToken.value().length === 6) verifyTotp(otpToken.value(), 'token', otpToken);
});

$('#authEnrollConfirm')?.addEventListener('click', () => {
  if (otpEnroll && otpEnroll.value().length === 6) verifyTotp(otpEnroll.value(), 'enroll', otpEnroll);
});

$('#authCopySecret')?.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(TOTP_SECRET_BASE);
    toast('Chave secreta copiada para a área de transferência!');
  } catch {}
});

document.querySelectorAll('.auth-cancel-mfa').forEach(b => b.addEventListener('click', async () => {
  try { await supabaseClient?.auth.signOut(); } catch {}
  openLoginOverlay();
}));

// ---------- CONFIGURAÇÃO SUPABASE MANUAL ----------
$('#authOpenConfigBtn')?.addEventListener('click', () => {
  const cfg = JSON.parse(localStorage.getItem('pradoSupabaseConfig') || '{}');
  if (cfg.url) $('#inputSupabaseUrl').value = cfg.url;
  if (cfg.key) $('#inputSupabaseKey').value = cfg.key;
  showAuthStep('config');
});

$('#authConfigBack')?.addEventListener('click', () => openLoginOverlay());

$('#btnSalvarSupabase')?.addEventListener('click', () => {
  const url = $('#inputSupabaseUrl').value.trim();
  const key = $('#inputSupabaseKey').value.trim();
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(url) || key.length < 30) {
    return setAuthError('config', 'Informe uma URL válida (https://xxxx.supabase.co) e a Anon Key correspondente.');
  }
  localStorage.setItem('pradoSupabaseConfig', JSON.stringify({ url: url.replace(/\/$/, ''), key }));
  initSupabase();
  toast('Conexão do Supabase atualizada!');
  openLoginOverlay();
});

// ---------- LOGIN CONCLUÍDO & ENTRADA NO SISTEMA ----------
async function finishLogin() {
  showLoader('Carregando sistema...', 'Aplicando permissões de segurança e perfil...', 85, 'Acessando plataforma...');

  const finalUser = authUser || 'licitadigitaltech@gmail.com';
  const isAdmin = (finalUser.toLowerCase() === 'licitadigitaltech@gmail.com');

  // Busca dados cadastrados
  const usuarios = typeof window.getUsuariosCadastrados === 'function' ? window.getUsuariosCadastrados() : [];
  const cadastrado = usuarios.find(u => u.email.toLowerCase() === finalUser.toLowerCase() || (u.cpf && u.cpf === finalUser));

  if (isAdmin) {
    currentUser = {
      id: 'admin-michel-01',
      nome: 'Michel do Prado',
      email: 'licitadigitaltech@gmail.com',
      cargo: 'Administrador Geral',
      role: 'admin_global',
      avatar: 'MP'
    };
  } else if (cadastrado) {
    currentUser = {
      id: cadastrado.id,
      nome: cadastrado.nome,
      email: cadastrado.email,
      cargo: cadastrado.cargo,
      role: cadastrado.papel || 'operador',
      avatar: cadastrado.avatar || cadastrado.nome.slice(0, 2).toUpperCase()
    };
  } else {
    currentUser = {
      id: 'usr_' + Date.now(),
      nome: finalUser.includes('@') ? finalUser.split('@')[0] : 'Operador Prado',
      email: finalUser,
      cargo: 'Representante Comercial',
      role: 'operador',
      avatar: 'OP'
    };
  }

  window.currentUser = currentUser;
  window.sessionToken = sessionToken || 'sess_prado_authenticated';

  // Persiste a sessão no navegador para que a tecla F5 / Atualizar página NÃO deslogue o usuário
  try {
    localStorage.setItem('pradoCurrentUser', JSON.stringify(currentUser));
    localStorage.setItem('pradoSessionToken', window.sessionToken);
    document.documentElement.classList.add('usuario-ja-logado');
  } catch {}

  // Registrar auditoria de login
  if (typeof window.registrarAuditoria === 'function') {
    window.registrarAuditoria('Login no sistema', 'Autenticação', `Usuário ${currentUser.nome} (${currentUser.cargo}) efetuou login com sucesso`);
  }
  if (typeof window.atualizarPresencaOnline === 'function') {
    window.atualizarPresencaOnline();
  }

  closeLoginOverlay();
  await carregarDadosSupabase();
  hideLoader();
  toast(`Bem-vindo, ${currentUser.nome}! Acesso autenticado em 2 etapas.`);
  render();
}

// ---------- SINCRONIZAÇÃO DE DADOS ----------
async function carregarDadosSupabase() {
  if (!supabaseClient || !currentUser) {
    return;
  }
  showLoader('Sincronizando banco...', 'Carregando clientes, fornecedores e intermediações...', 90, 'Consultando tabelas...');
  try {
    const [clis, forns, ops, peds, orcs] = await Promise.all([
      supabaseClient.from('clientes').select('*'),
      supabaseClient.from('fornecedores').select('*'),
      supabaseClient.from('oportunidades').select('*'),
      supabaseClient.from('pedidos').select('*'),
      supabaseClient.from('orcamentos').select('*').catch(() => ({}))
    ]);
    if (clis.data) db.clientes = clis.data;
    if (forns.data) db.fornecedores = forns.data;
    if (ops.data) db.oportunidades = ops.data;
    if (peds.data) db.pedidos = peds.data;
    if (orcs && orcs.data && orcs.data.length > 0) db.orcamentos = orcs.data;
    showLoader('Concluído!', 'Dados sincronizados.', 100, 'Tudo pronto');
    await new Promise(r => setTimeout(r, 300));
  } catch {}
}
window.carregarDadosSupabase = carregarDadosSupabase;

// ---------- LOGOFF ----------
async function fazerLogout() {
  showLoader('Encerrando sessão...', 'Desconectando com segurança...', 80, 'Limpando dados...');
  if (typeof window.registrarAuditoria === 'function' && window.currentUser) {
    window.registrarAuditoria('Logoff do sistema', 'Autenticação', `Usuário ${window.currentUser.nome} encerrou a sessão`);
  }
  try { await supabaseClient?.auth.signOut(); } catch {}
  currentUser = null;
  sessionToken = null;
  window.currentUser = null;
  window.sessionToken = null;
  authUser = '';
  // Limpa completamente usuário salvo para permitir entrada em outra conta
  localStorage.removeItem(LAST_USER_KEY);
  localStorage.removeItem('pradoLastEmail');
  localStorage.removeItem('pradoCurrentUser');
  localStorage.removeItem('pradoSessionToken');
  localStorage.removeItem('pradoCurrentPage');
  document.documentElement.classList.remove('usuario-ja-logado');
  
  const emailInp = $('#authEmail');
  if (emailInp) emailInp.value = '';
  const pwdInp = $('#authPassword');
  if (pwdInp) pwdInp.value = '';

  hideLoader();
  toast('Sessão encerrada com sucesso.');
  
  const overlay = $('#loginOverlay');
  if (overlay) overlay.hidden = false;
  showAuthStep('email');
  render();
}
window.fazerLogout = fazerLogout;

// ---------- PROCESSAMENTO DO RETORNO GOOGLE OAUTH ----------
async function checarRetornoGoogleOAuth() {
  if (!supabaseClient) return false;
  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session && session.user) {
      const gUser = session.user;
      const gEmail = (gUser.email || '').toLowerCase();
      const gMeta = gUser.user_metadata || {};
      const isEmailProvider = (gUser.app_metadata?.provider === 'email');
      const gNome = gMeta.nome || gMeta.full_name || gMeta.name || gEmail.split('@')[0] || 'Operador Prado';
      const gCargo = gMeta.cargo || (isAdmin ? 'Administrador Geral' : 'Representante Comercial');
      const gAvatar = gMeta.avatar_url || gMeta.picture || '';

      const chaveConfirmado = `prado_email_confirmed_${gEmail}`;
      const jaConfirmou = localStorage.getItem(chaveConfirmado);

      if (isEmailProvider) {
        localStorage.setItem(chaveConfirmado, 'true');
        toast(`E-mail validado com sucesso! Bem-vindo(a), ${gNome}.`);
      } else if (!jaConfirmou && !gUser.email_confirmed_at) {
        toast(`Primeiro acesso com ${gEmail}: enviamos um e-mail de confirmação para validar sua conta.`);
      } else {
        localStorage.setItem(chaveConfirmado, 'true');
      }

      authUser = gEmail;
      localStorage.setItem(LAST_USER_KEY, authUser);

      currentUser = {
        id: gUser.id || 'usr_' + Date.now(),
        nome: gNome,
        email: gEmail,
        cargo: gCargo,
        role: isAdmin ? 'admin_global' : 'operador',
        avatar: gNome.slice(0, 2).toUpperCase(),
        fotoUrl: gAvatar
      };

      window.currentUser = currentUser;
      window.sessionToken = session.access_token || 'sess_auth_valid';

      // Persiste a sessão no navegador para que a tecla F5 / Atualizar página NÃO deslogue o usuário
      try {
        localStorage.setItem('pradoCurrentUser', JSON.stringify(currentUser));
        localStorage.setItem('pradoSessionToken', window.sessionToken);
        document.documentElement.classList.add('usuario-ja-logado');
      } catch {}

      closeLoginOverlay();

      if (typeof window.registrarAuditoria === 'function') {
        const metodoTxt = isEmailProvider ? 'Confirmação de E-mail' : 'Google OAuth';
        window.registrarAuditoria(`Login via ${metodoTxt}`, 'Autenticação', `Operador ${gNome} (${gEmail}) autenticou via ${metodoTxt}`);
      }
      if (typeof window.atualizarPresencaOnline === 'function') {
        window.atualizarPresencaOnline();
      }

      await carregarDadosSupabase();
      if (!isEmailProvider) {
        toast(`Bem-vindo, ${gNome}! Sincronizado via Google.`);
      }
      render();
      return true;
    }
  } catch (err) {
    console.warn('Erro ao verificar sessão Google OAuth:', err);
  }
  return false;
}

// ---------- CARROSSEL HERO DO LOGIN (ESTILO MONTEBRAVO) ----------
function initAuthCarousel() {
  const slides = document.querySelectorAll('.auth-slide');
  const dots = document.querySelectorAll('.auth-dot');
  if (!slides.length) return;

  let current = 0;
  let timer = null;

  function goToSlide(index) {
    current = (index + slides.length) % slides.length;
    slides.forEach((s, i) => s.classList.toggle('active', i === current));
    dots.forEach((d, i) => d.classList.toggle('active', i === current));
  }

  function nextSlide() { goToSlide(current + 1); }
  function prevSlide() { goToSlide(current - 1); }

  function startTimer() {
    stopTimer();
    timer = setInterval(nextSlide, 5500);
  }

  function stopTimer() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  $('#authCarouselNext')?.addEventListener('click', () => { nextSlide(); startTimer(); });
  $('#authCarouselPrev')?.addEventListener('click', () => { prevSlide(); startTimer(); });

  dots.forEach(dot => {
    dot.addEventListener('click', () => {
      const idx = parseInt(dot.dataset.index, 10);
      if (!isNaN(idx)) { goToSlide(idx); startTimer(); }
    });
  });

  const carouselEl = $('#authCarousel');
  if (carouselEl) {
    carouselEl.addEventListener('mouseenter', stopTimer);
    carouselEl.addEventListener('mouseleave', startTimer);
  }

  startTimer();
}

// ---------- INÍCIO ----------
async function startApp() {
  initAuthCarousel();
  await loadSupabaseConfig();

  // 1. Verifica se veio de um redirecionamento do Google OAuth
  const logadoGoogle = await checarRetornoGoogleOAuth();
  if (logadoGoogle) return;

  // 2. Verifica se já existe uma sessão ativa salva no navegador (evita deslogar no F5 / atualizar)
  try {
    const savedUserStr = localStorage.getItem('pradoCurrentUser');
    if (savedUserStr) {
      const savedUser = JSON.parse(savedUserStr);
      if (savedUser && (savedUser.id || savedUser.email)) {
        currentUser = savedUser;
        window.currentUser = savedUser;
        window.sessionToken = localStorage.getItem('pradoSessionToken') || 'sess_prado_authenticated';
        document.documentElement.classList.add('usuario-ja-logado');
        closeLoginOverlay();
        await carregarDadosSupabase();
        render();
        return;
      }
    }
  } catch (err) {
    console.warn('Erro ao restaurar sessão ativa:', err);
  }

  // 3. Se não houver usuário salvo autenticado, exibe a tela de login
  currentUser = null;
  window.currentUser = null;
  document.documentElement.classList.remove('usuario-ja-logado');
  openLoginOverlay();
  render();
}

startApp();
