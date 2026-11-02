// Prado Gestão Comercial — WhatsApp Corporativo Fidedigno & Copiloto IA
// Comunicação em tempo real, gravação de áudio pressionando e segurando,
// minimização para dentro da bolinha do WhatsApp, aviãozinho de envio e tecla Enter

(function() {
  'use strict';

  const CHAT_STORAGE_KEY = 'pradoTeamChat_v6';
  const NOTIF_STORAGE_KEY = 'pradoNotificacoes_v6';
  const IA_CHAT_STORAGE_KEY = 'pradoAiChat_v6';
  const CHAT_CHANNEL_NAME = 'prado_wa_channel_v6';

  let broadcastChannel = null;
  try {
    if (typeof window.BroadcastChannel !== 'undefined') {
      broadcastChannel = new BroadcastChannel(CHAT_CHANNEL_NAME);
    }
  } catch (e) {
    console.warn('BroadcastChannel não suportado neste ambiente.');
  }

  // Estado do Chat
  let chatAbaAtiva = 'equipe'; // 'equipe' | 'ia' | 'online'
  let chatAberto = false;
  let gravandoAudio = false;
  let mediaRecorder = null;
  let mediaStreamAtual = null;
  let activeSpeechRecognition = null;
  let transcricaoGravadaTemp = '';
  let audioChunks = [];
  let gravacaoTimer = null;
  let gravacaoSegundos = 0;
  let segurandoBotaoVoz = false;
  let tempoInicioGravacao = 0;

  // Gerador de Som Audível de Mensagem Recebida (WhatsApp Tone)
  function tocarSomWhatsApp() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
      osc.frequency.setValueAtTime(880.00, ctx.currentTime + 0.08); // A5

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.24);
    } catch {}
  }

  // ==========================================================================
  // MOTOR DE VOZ HUMANA ULTRA-REALISTA (VOZ REAL DO MICHEL COMO PADRÃO)
  // Timbre humano natural, respiração nas vírgulas, cadência calma estilo ChatGPT
  // ==========================================================================
  let generoVozAtual = localStorage.getItem('pradoVozGenero') || 'masculina';
  let speechQueueTimer = null;
  let vozHumanaAtiva = false;
  let vozesCarregadas = [];

  // IndexedDB para armazenamento permanente de áudios sem limite de cota do localStorage
  const IDB_AUDIO_NAME = 'PradoAudioDB';
  const IDB_AUDIO_STORE = 'audioStore';

  function salvarAudioNoIndexedDB(key, base64) {
    return new Promise((resolve) => {
      try {
        const req = indexedDB.open(IDB_AUDIO_NAME, 1);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(IDB_AUDIO_STORE)) {
            db.createObjectStore(IDB_AUDIO_STORE);
          }
        };
        req.onsuccess = (e) => {
          const db = e.target.result;
          const tx = db.transaction(IDB_AUDIO_STORE, 'readwrite');
          tx.objectStore(IDB_AUDIO_STORE).put(base64, key);
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
        };
        req.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  }

  function carregarAudioDoIndexedDB(key) {
    return new Promise((resolve) => {
      try {
        const req = indexedDB.open(IDB_AUDIO_NAME, 1);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(IDB_AUDIO_STORE)) {
            db.createObjectStore(IDB_AUDIO_STORE);
          }
        };
        req.onsuccess = (e) => {
          const db = e.target.result;
          const tx = db.transaction(IDB_AUDIO_STORE, 'readonly');
          const getReq = tx.objectStore(IDB_AUDIO_STORE).get(key);
          getReq.onsuccess = () => resolve(getReq.result || null);
          getReq.onerror = () => resolve(null);
        };
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }

  function atualizarListaVozes() {
    if ('speechSynthesis' in window) {
      try {
        vozesCarregadas = window.speechSynthesis.getVoices() || [];
      } catch {}
    }
  }

  if ('speechSynthesis' in window) {
    atualizarListaVozes();
    window.speechSynthesis.onvoiceschanged = atualizarListaVozes;
  }

  function cancelarFalaHumana() {
    vozHumanaAtiva = false;
    if (speechQueueTimer) {
      clearTimeout(speechQueueTimer);
      speechQueueTimer = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  // Localiza a voz em português de maior fidelidade acústica para o gênero escolhido
  function obterMelhorVozPortugues(genero = generoVozAtual) {
    if (!('speechSynthesis' in window)) return null;
    atualizarListaVozes();
    let vozes = vozesCarregadas;
    if (!vozes || vozes.length === 0) {
      try { vozes = window.speechSynthesis.getVoices() || []; } catch {}
    }
    if (!vozes || vozes.length === 0) return null;

    // Filtra todas as vozes em Português
    const ptVoices = vozes.filter(v => {
      const l = (v.lang || '').toLowerCase();
      const n = (v.name || '').toLowerCase();
      return l.startsWith('pt') || n.includes('portuguese') || n.includes('brazil') || n.includes('brasil');
    });

    const pool = ptVoices.length > 0 ? ptVoices : vozes;

    if (genero === 'masculina') {
      // 1. Vozes Neurais Masculinas Online / HD do Windows / Edge / Azure
      const mascNeural = pool.find(v => {
        const n = v.name.toLowerCase();
        return (n.includes('antonio') || n.includes('daniel') || n.includes('fabio') || n.includes('donato') || n.includes('felipe') || n.includes('julio') || n.includes('ricardo')) &&
               (n.includes('natural') || n.includes('online') || n.includes('neural'));
      });
      if (mascNeural) return mascNeural;

      // 2. Qualquer voz masculina pelo nome
      const mascNome = pool.find(v => {
        const n = v.name.toLowerCase();
        return n.includes('antonio') || n.includes('daniel') || n.includes('fabio') || n.includes('donato') || n.includes('felipe') || n.includes('julio') || n.includes('ricardo') || n.includes('male') || n.includes('homem');
      });
      if (mascNome) return mascNome;

      // 3. Fallback: voz pt-BR
      return pool.find(v => (v.lang === 'pt-BR' || v.lang === 'pt_BR')) || pool[0];
    } else {
      // Feminina (Padrão)
      // 1. Vozes Neurais Femininas Online / HD (Francisca, Brenda, Thalita, Luciana)
      const femNeural = pool.find(v => {
        const n = v.name.toLowerCase();
        return (n.includes('francisca') || n.includes('maria') || n.includes('brenda') || n.includes('thalita') || n.includes('yara') || n.includes('heloisa') || n.includes('luciana') || n.includes('leticia')) &&
               (n.includes('natural') || n.includes('online') || n.includes('neural'));
      });
      if (femNeural) return femNeural;

      // 2. Google Português do Brasil (excelente síntese feminina)
      const vozGoogle = pool.find(v => {
        const n = v.name.toLowerCase();
        return n.includes('google') && !n.includes('male');
      });
      if (vozGoogle) return vozGoogle;

      // 3. Nomes femininos
      const femNome = pool.find(v => {
        const n = v.name.toLowerCase();
        return n.includes('francisca') || n.includes('maria') || n.includes('brenda') || n.includes('thalita') || n.includes('yara') || n.includes('heloisa') || n.includes('luciana') || n.includes('leticia') || n.includes('camila') || n.includes('female') || n.includes('mulher');
      });
      if (femNome) return femNome;

      return pool.find(v => (v.lang === 'pt-BR' || v.lang === 'pt_BR')) || pool[0];
    }
  }

  // Normalizador de Texto: Converte siglas, valores e remove símbolos robóticos
  function normalizarTextoParaFalaHumana(texto) {
    if (!texto) return '';

    let t = String(texto);

    // Remove emojis e ícones visuais
    t = t.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/gu, '');
    
    // Remove marcações markdown
    t = t.replace(/[*_#`~>]/g, ' ');
    t = t.replace(/•\s*/g, ' ');

    // Siglas e termos corporativos em pronúncia humana
    t = t.replace(/NF-e\s*nº\s*0*(\d+)/gi, 'Nota Fiscal Eletrônica $1');
    t = t.replace(/NF\s*0*(\d+)/gi, 'Nota Fiscal $1');
    t = t.replace(/D33/gi, 'D trinta e três');
    t = t.replace(/NBR\s*(\d+)/gi, 'Norma Brasileira $1');
    t = t.replace(/SMADS/gi, 'Smads');
    t = t.replace(/Ltda\.?/gi, 'Limitada');
    t = t.replace(/SIMEI/gi, 'Si mei');
    t = t.replace(/TED\/PIX|PIX\/TED/gi, 'Pix ou transferência');
    t = t.replace(/PIX/gi, 'Pix');

    // Converte valores monetários para leitura natural (Ex: R$ 21.500,00 -> 21500 reais)
    t = t.replace(/R\$\s*([\d\.]+),(\d{2})/g, (match, inteiro, centavos) => {
      const numLimpo = inteiro.replace(/\./g, '');
      const cent = parseInt(centavos, 10);
      if (cent === 0) return `${numLimpo} reais`;
      return `${numLimpo} reais e ${cent} centavos`;
    });

    // Percentuais
    t = t.replace(/([\d,]+)%/g, '$1 por cento');

    // Dimensões e volumes
    t = t.replace(/(\d+)\s*L\b/gi, '$1 litros');
    t = t.replace(/(\d+)\s*x\s*(\d+)/gi, '$1 por $2');
    t = t.replace(/(\d+),(\d+)\s*m\b/gi, '$1 vírgula $2 metros');

    return t.replace(/\s+/g, ' ').trim();
  }

  // Divide o texto em fragmentos baseados na pontuação para aplicar o respiro e cadência humana
  function dividirTextoEmRespiros(texto) {
    const limpo = normalizarTextoParaFalaHumana(texto);
    if (!limpo) return [];

    // Captura cada trecho até uma vírgula, ponto, exclamação ou interrogação
    const regex = /([^,.;:!?\n]+)([,.;:!?\n]+|$)/g;
    const fragmentos = [];
    let match;

    while ((match = regex.exec(limpo)) !== null) {
      const parte = match[1].trim();
      const pontuacao = match[2];
      if (parte.length > 0) {
        let pausaMs = 210; // Respiro sutil de vírgula
        if (pontuacao.includes('.') || pontuacao.includes('!') || pontuacao.includes('?')) {
          pausaMs = 440; // Pausa completa e relaxada de final de oração
        } else if (pontuacao.includes(':') || pontuacao.includes(';') || pontuacao.includes('\n')) {
          pausaMs = 300;
        } else if (pontuacao.includes(',')) {
          pausaMs = 230; // Vírgula: respiração audível
        }
        fragmentos.push({ texto: parte, pausa: pausaMs });
      }
    }

    return fragmentos.length > 0 ? fragmentos : [{ texto: limpo, pausa: 300 }];
  }

  function falarTextoPortugues(texto, onEnd, generoParam) {
    if (!('speechSynthesis' in window)) {
      if (onEnd) onEnd();
      return;
    }

    cancelarFalaHumana();
    vozHumanaAtiva = true;

    const genero = generoParam || generoVozAtual;
    const fragmentos = dividirTextoEmRespiros(texto);
    if (fragmentos.length === 0) {
      if (onEnd) onEnd();
      return;
    }

    let indice = 0;
    const voz = obterMelhorVozPortugues(genero);

    function falarProximo() {
      if (!vozHumanaAtiva) return;

      if (indice >= fragmentos.length) {
        vozHumanaAtiva = false;
        if (onEnd) onEnd();
        return;
      }

      const item = fragmentos[indice];
      indice++;

      const utterance = new SpeechSynthesisUtterance(item.texto);
      utterance.lang = 'pt-BR';

      if (voz) utterance.voice = voz;

      // Calibração Acústica Natural e Não Robótica
      if (genero === 'masculina') {
        // Voz Masculina: tom barítono encorpado, 0.88 pitch (quente), 0.94 rate (calmo)
        utterance.pitch = 0.88;
        utterance.rate = 0.94;
      } else {
        // Voz Feminina: tom aveludado e natural, 1.02 pitch (empático), 0.96 rate
        utterance.pitch = 1.02;
        utterance.rate = 0.96;
      }

      utterance.onend = () => {
        if (!vozHumanaAtiva) return;
        // Respiro humano antes da próxima frase!
        speechQueueTimer = setTimeout(() => {
          falarProximo();
        }, item.pausa);
      };

      utterance.onerror = () => {
        if (!vozHumanaAtiva) return;
        speechQueueTimer = setTimeout(() => {
          falarProximo();
        }, 150);
      };

      window.speechSynthesis.speak(utterance);
    }

    falarProximo();
  }
  window.falarTextoPortugues = falarTextoPortugues;
  window.cancelarFalaHumana = cancelarFalaHumana;

  // Funções de Seleção de Voz Masculina e Feminina (Bonecos Menina e Menino)
  window.definirGeneroVoz = function(novoGenero, testarFala = true) {
    generoVozAtual = (novoGenero === 'masculina') ? 'masculina' : 'feminina';
    try {
      localStorage.setItem('pradoVozGenero', generoVozAtual);
    } catch {}

    const btnMenina = document.querySelector('#btnVozMenina');
    const btnMenino = document.querySelector('#btnVozMenino');
    if (btnMenina) btnMenina.classList.toggle('active', generoVozAtual === 'feminina');
    if (btnMenino) btnMenino.classList.toggle('active', generoVozAtual === 'masculina');

    document.querySelectorAll('.btn-voice-opt').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-gender') === generoVozAtual);
    });

    if (testarFala) {
      if (generoVozAtual === 'masculina') {
        const audioSrc = studioAudioBase64 || localStorage.getItem('pradoVozMichelCustom') || 'voz-michel-padrao.mp3';
        cancelarFalaHumana();
        const a = new Audio(audioSrc);
        a.play().catch(() => {
          falarTextoPortugues('Olá! Voz masculina do Michel ativada.', null, 'masculina');
        });
      } else {
        falarTextoPortugues('Olá! Voz feminina ativada. Pode me ouvir agora com timbre natural.', null, 'feminina');
      }
    }
  };

  window.alternarGeneroVoz = function() {
    const proximo = (generoVozAtual === 'feminina') ? 'masculina' : 'feminina';
    window.definirGeneroVoz(proximo, true);
  };

  // Notificações Iniciais
  function carregarNotificacoesIniciais() {
    try {
      const raw = localStorage.getItem(NOTIF_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [
      {
        id: 'notif-001',
        tipo: 'chat',
        icone: '💬',
        titulo: 'Michel do Prado',
        mensagem: 'Olá! Como posso ajudar com os orçamentos e intermediações hoje? 😊',
        horario: '09:41',
        lida: false,
        acao: 'abrirChatEquipe'
      },
      {
        id: 'notif-002',
        tipo: 'financeiro',
        icone: '💰',
        titulo: 'Faturamento Liquidado (NF 002)',
        mensagem: 'R$ 21.500,00 conciliado do fornecimento de sacos de lixo.',
        horario: 'Hoje às 08:30',
        lida: false,
        acao: 'irFinanceiro'
      }
    ];
  }

  // Mensagens Iniciais fiéis ao print enviado pelo usuário
  function carregarMensagensEquipeIniciais() {
    try {
      const raw = localStorage.getItem(CHAT_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [
      {
        id: 'msg-wa-1',
        autorNome: 'Michel do Prado',
        autorCargo: 'Administrador Geral',
        autorAvatar: 'MP',
        isMine: false,
        tipo: 'texto',
        conteudo: 'Olá! Como posso ajudar? 😊',
        hora: '09:41',
        status: 'read'
      },
      {
        id: 'msg-wa-2',
        autorNome: 'Você',
        autorCargo: 'Operador',
        autorAvatar: 'EU',
        isMine: true,
        tipo: 'texto',
        conteudo: 'Vamos conversar! 🚀',
        hora: '09:41',
        status: 'read'
      }
    ];
  }

  // Mensagens do Copiloto IA
  function carregarMensagensIaIniciais() {
    try {
      const raw = localStorage.getItem(IA_CHAT_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [
      {
        id: 'ia-msg-1',
        remetente: 'ia',
        autorNome: 'Assistente Prado IA',
        autorAvatar: '🤖',
        conteudo: 'Olá! Sou o seu Copiloto Comercial da Prado Comércio & Soluções. Tire dúvidas sobre margens recomendadas (20% a 28%), fornecedores, cotações e processos licitatórios.',
        hora: '09:40'
      }
    ];
  }

  let notificacoes = carregarNotificacoesIniciais();
  let mensagensEquipe = carregarMensagensEquipeIniciais();
  let mensagensIa = carregarMensagensIaIniciais();

  // Grupos por Setor da Prado Comércio & Soluções
  const GRUPOS_STORAGE_KEY = 'pradoGrupos_v6';
  let grupoAtivoId = null;

  function carregarGruposIniciais() {
    try {
      const raw = localStorage.getItem(GRUPOS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [
      {
        id: 'comercial',
        nome: 'Comercial & Vendas',
        icone: '💼',
        cor: '#008069',
        descricao: 'Cotações de clientes, propostas timbradas e margem',
        membros: ['Michel do Prado', 'Mariana Licitações', 'Carlos Vendedor', 'Você'],
        mensagens: [
          {
            id: 'grp-c-1',
            autorNome: 'Mariana Licitações',
            autorCargo: 'Licitações',
            autorAvatar: 'ML',
            corAvatar: '#8b5cf6',
            tipo: 'texto',
            conteudo: 'Pessoal, o edital do Cliente Institucional pede entrega dos 150 colchões em até 15 dias após empenho. A fábrica confirmou o prazo?',
            hora: '08:45',
            isMine: false
          },
          {
            id: 'grp-c-2',
            autorNome: 'Michel do Prado',
            autorCargo: 'Administrador Geral',
            autorAvatar: 'MP',
            corAvatar: '#059669',
            tipo: 'audio',
            conteudo: 'Confirmado sim, Mariana. A fábrica garante entrega em 10 dias corridos, com nota fiscal direta.',
            duracao: '0:04',
            hora: '08:52',
            isMine: false
          }
        ]
      },
      {
        id: 'financeiro',
        nome: 'Financeiro & Fiscal',
        icone: '💰',
        cor: '#0284c7',
        descricao: 'Conciliações bancárias, NF-e 002 e pagamentos PIX',
        membros: ['Michel do Prado', 'Roberto Controladoria', 'Você'],
        mensagens: [
          {
            id: 'grp-f-1',
            autorNome: 'Roberto Controladoria',
            autorCargo: 'Financeiro',
            autorAvatar: 'RC',
            corAvatar: '#0284c7',
            tipo: 'texto',
            conteudo: 'Bom dia! NF-e 002 de R$ 21.500,00 liquidada no Banco do Brasil. Margem líquida de 22,1% devidamente lançada.',
            hora: '08:30',
            isMine: false
          }
        ]
      },
      {
        id: 'logistica',
        nome: 'Logística & Entregas',
        icone: '📦',
        cor: '#d97706',
        descricao: 'Rastreio de fretes, romaneios e comprovantes de entrega',
        membros: ['Michel do Prado', 'Tiago Frotas', 'Você'],
        mensagens: [
          {
            id: 'grp-l-1',
            autorNome: 'Tiago Frotas',
            autorCargo: 'Logística',
            autorAvatar: 'TF',
            corAvatar: '#d97706',
            tipo: 'texto',
            conteudo: 'Carga de sacos plásticos da 3W descarregada no almoxarifado do Cliente Institucional com canhoto assinado! 🚚✅',
            hora: '09:10',
            isMine: false
          }
        ]
      },
      {
        id: 'compras',
        nome: 'Compras & Fábricas',
        icone: '🏭',
        cor: '#dc2626',
        descricao: 'Alinhamento de preços de fábrica e estoque de fornecedores',
        membros: ['Michel do Prado', 'Fernanda Compras', 'Você'],
        mensagens: [
          {
            id: 'grp-cp-1',
            autorNome: 'Fernanda Compras',
            autorCargo: 'Suprimentos',
            autorAvatar: 'FC',
            corAvatar: '#dc2626',
            tipo: 'texto',
            conteudo: 'Conseguimos segurar a tabela de preços dos sacos de lixo de 100 e 200 litros por mais 60 dias junto à fábrica.',
            hora: '07:55',
            isMine: false
          }
        ]
      },
      {
        id: 'geral',
        nome: 'Geral & Diretoria',
        icone: '📢',
        cor: '#008069',
        descricao: 'Canal aberto de comunicação entre todos os setores da Prado',
        membros: ['Michel do Prado', 'Mariana Licitações', 'Carlos Vendedor', 'Roberto Controladoria', 'Tiago Frotas', 'Fernanda Compras', 'Você'],
        mensagens: [
          {
            id: 'grp-g-1',
            autorNome: 'Michel do Prado',
            autorCargo: 'Administrador Geral',
            autorAvatar: 'MP',
            corAvatar: '#059669',
            tipo: 'texto',
            conteudo: 'Bom dia, equipe! Excelente trabalho no fechamento das últimas cotações. Vamos manter o foco e a agilidade nas propostas hoje! 🚀',
            hora: '07:30',
            isMine: false
          }
        ]
      }
    ];
  }

  let gruposSetores = carregarGruposIniciais();

  function salvarGrupos() {
    try {
      localStorage.setItem(GRUPOS_STORAGE_KEY, JSON.stringify(gruposSetores));
    } catch {}
  }

  function encontrarMensagemEmGrupos(msgId) {
    for (const g of gruposSetores) {
      const achada = g.mensagens.find(m => m.id === msgId);
      if (achada) return achada;
    }
    return null;
  }

  // Central de Notificações
  function atualizarBadgeNotificacoes() {
    const naoLidas = notificacoes.filter(n => !n.lida).length;
    const badge = document.querySelector('#notifBadge');
    if (badge) {
      if (naoLidas > 0) {
        badge.textContent = naoLidas > 9 ? '9+' : naoLidas;
        badge.style.display = 'inline-flex';
      } else {
        badge.style.display = 'none';
      }
    }

    const floatBadge = document.querySelector('#floatUnreadBadge');
    if (floatBadge) {
      if (naoLidas > 0) {
        floatBadge.textContent = naoLidas;
        floatBadge.style.display = 'flex';
      } else {
        floatBadge.style.display = 'none';
      }
    }
  }

  function renderizarListaNotificacoes() {
    const listaEl = document.querySelector('#notifListaConteudo');
    if (!listaEl) return;

    if (!notificacoes.length) {
      listaEl.innerHTML = `
        <div style="text-align:center;padding:26px 14px;color:#94a3b8">
          <div style="font-size:32px;margin-bottom:6px">🔔</div>
          <p style="margin:0;font-size:13px">Nenhuma notificação no momento.</p>
        </div>
      `;
      return;
    }

    listaEl.innerHTML = notificacoes.map(n => `
      <div class="prado-notif-item ${n.lida ? 'lida' : 'unread'}" onclick="window.executarAcaoNotificacao('${n.id}')">
        <div class="prado-notif-icon">${n.icone}</div>
        <div class="prado-notif-body">
          <div class="prado-notif-title">
            <span>${window.escapeHtml(n.titulo)}</span>
            <span class="prado-notif-time">${window.escapeHtml(n.horario)}</span>
          </div>
          <div class="prado-notif-desc">${window.escapeHtml(n.mensagem)}</div>
        </div>
      </div>
    `).join('');
  }

  function togglePainelNotificacoes(forcarFechamento) {
    const painel = document.querySelector('#pradoPainelNotificacoes');
    if (!painel) return;

    if (forcarFechamento || !painel.hidden) {
      painel.hidden = true;
    } else {
      renderizarListaNotificacoes();
      painel.hidden = false;
    }
  }
  window.togglePainelNotificacoes = togglePainelNotificacoes;

  function marcarTodasNotificacoesComoLidas() {
    notificacoes.forEach(n => n.lida = true);
    localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(notificacoes));
    atualizarBadgeNotificacoes();
    renderizarListaNotificacoes();
    if (typeof window.toast === 'function') {
      window.toast('Todas as notificações foram marcadas como lidas.');
    }
  }
  window.marcarTodasNotificacoesComoLidas = marcarTodasNotificacoesComoLidas;

  function executarAcaoNotificacao(id) {
    const notif = notificacoes.find(n => n.id === id);
    if (!notif) return;
    notif.lida = true;
    localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(notificacoes));
    atualizarBadgeNotificacoes();
    togglePainelNotificacoes(true);

    if (notif.acao === 'abrirChatEquipe') {
      abrirChatFlutuante('equipe');
    } else if (notif.acao === 'abrirChatIa') {
      abrirChatFlutuante('ia');
    } else if (notif.acao === 'irFinanceiro') {
      if (typeof window.page !== 'undefined') {
        window.page = 'financeiro';
        localStorage.setItem('pradoCurrentPage', 'financeiro');
        if (typeof window.render === 'function') window.render();
      }
    }
  }
  window.executarAcaoNotificacao = executarAcaoNotificacao;

  // Exibir balão toast pop-up quando o chat estiver minimizado/fechado
  function dispararBalaoToast(msg) {
    if (chatAberto) return;
    const toastBalao = document.querySelector('#pradoChatToastNotification');
    if (!toastBalao) return;

    if (toastBalao._timer) {
      clearTimeout(toastBalao._timer);
      toastBalao._timer = null;
    }

    const autorEl = document.querySelector('#pradoBalaoAutor');
    const txtEl = document.querySelector('#pradoBalaoTexto');
    const avatarEl = document.querySelector('#pradoBalaoAvatar');

    if (autorEl) autorEl.textContent = msg.autorNome || 'Michel do Prado';
    if (avatarEl) avatarEl.textContent = msg.autorAvatar || 'MP';
    if (txtEl) {
      txtEl.textContent = msg.tipo === 'audio' 
        ? '🎤 Mensagem de voz (' + (msg.duracao || '0:03') + ')' 
        : (msg.conteudo || 'Olá! Como posso ajudar? 😊');
    }

    toastBalao.classList.remove('dismissing');
    toastBalao.style.display = 'flex';
    toastBalao.classList.add('show');

    const floatBadge = document.querySelector('#floatUnreadBadge');
    if (floatBadge) {
      floatBadge.textContent = '2';
      floatBadge.style.display = 'flex';
    }

    // Auto-dismiss suave após 12 segundos se não houver interação
    toastBalao._timer = setTimeout(() => {
      fecharBalaoToast();
    }, 12000);
  }
  window.dispararBalaoToast = dispararBalaoToast;

  // Fechar o balão toast pop-up e garantir que saia da tela
  function fecharBalaoToast() {
    try {
      localStorage.setItem('pradoToastInicialDispensado', 'true');
    } catch {}
    const toastBalao = document.querySelector('#pradoChatToastNotification');
    if (!toastBalao) return;

    if (toastBalao._timer) {
      clearTimeout(toastBalao._timer);
      toastBalao._timer = null;
    }

    toastBalao.classList.remove('show');
    toastBalao.classList.add('dismissing');

    setTimeout(() => {
      toastBalao.style.display = 'none';
      toastBalao.classList.remove('dismissing');
    }, 200);
  }
  window.fecharBalaoToast = fecharBalaoToast;

  // ---------- GESTÃO DO CHAT FLUTUANTE (ABRIR & SE ESCONDER NA BOLINHA DO WHATSAPP) ----------
  function abrirChatFlutuante(aba = 'equipe') {
    chatAberto = true;
    chatAbaAtiva = aba;

    // Fecha o balão toast pop-up imediatamente ao abrir
    fecharBalaoToast();

    const pop = document.querySelector('#pradoEmojiPopover');
    if (pop) pop.hidden = true;

    const win = document.querySelector('#pradoChatWindow');
    if (win) {
      win.classList.remove('closing');
      win.style.display = 'flex';
      win.hidden = false;
      win.classList.add('open');
    }

    alternarAbaChat(aba);

    // Foca no input se for equipe ou ia
    setTimeout(() => {
      const inp = document.querySelector('#chatMsgInput');
      if (inp && aba !== 'online') inp.focus();
    }, 100);
  }
  window.abrirChatFlutuante = abrirChatFlutuante;

  // Minimizar = Se esconder completamente dentro da bolinha do WhatsApp
  function fecharChatFlutuante() {
    chatAberto = false;
    const win = document.querySelector('#pradoChatWindow');
    if (!win) return;

    // Fecha popover de emojis se estiver aberto
    const pop = document.querySelector('#pradoEmojiPopover');
    if (pop) pop.hidden = true;

    // Cancela gravação se estiver ativa
    if (gravandoAudio) {
      cancelarGravacaoVoz();
    }

    win.classList.remove('open');
    win.classList.add('closing');

    setTimeout(() => {
      if (!chatAberto) {
        win.style.display = 'none';
        win.hidden = true;
        win.classList.remove('closing');
      }
    }, 180);
  }
  window.fecharChatFlutuante = fecharChatFlutuante;
  window.toggleMinimizarChat = fecharChatFlutuante;



  function scrollChatBodyAoFim() {
    const bodyEl = document.querySelector('.prado-wa-body');
    if (bodyEl) {
      setTimeout(() => {
        bodyEl.scrollTop = bodyEl.scrollHeight;
      }, 40);
    }
  }

  function alternarAbaChat(aba) {
    chatAbaAtiva = aba;
    document.querySelectorAll('.prado-wa-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === aba);
    });

    const paneEquipe = document.querySelector('#chatPaneEquipe');
    const paneGrupos = document.querySelector('#chatPaneGrupos');
    const paneIa = document.querySelector('#chatPaneIa');
    const paneOnline = document.querySelector('#chatPaneOnline');
    const footerInput = document.querySelector('#pradoChatFooterBar');

    const headerTitle = document.querySelector('#pradoWaHeaderTitle');
    const headerStatus = document.querySelector('#pradoWaHeaderStatus');
    const headerAvatar = document.querySelector('#pradoWaHeaderAvatar');

    if (headerTitle && headerStatus && headerAvatar) {
      if (aba === 'equipe') {
        headerTitle.textContent = 'Michel do Prado';
        headerStatus.textContent = 'online';
        headerAvatar.textContent = 'MP';
      } else if (aba === 'grupos') {
        if (!grupoAtivoId) {
          headerTitle.textContent = 'Grupos por Setor';
          headerStatus.textContent = '5 setores ativos';
          headerAvatar.textContent = '🏢';
        } else {
          const g = gruposSetores.find(item => item.id === grupoAtivoId);
          headerTitle.textContent = g ? g.nome : 'Grupo do Setor';
          headerStatus.textContent = g ? `${g.membros.length} participantes online` : 'online';
          headerAvatar.textContent = g ? g.icone : '🏢';
        }
      } else if (aba === 'ia') {
        headerTitle.textContent = 'Copiloto Comercial IA';
        headerStatus.textContent = 'Sempre ativo';
        headerAvatar.textContent = '🤖';
      } else if (aba === 'online') {
        headerTitle.textContent = 'Integrantes Online';
        headerStatus.textContent = 'Tempo real (2)';
        headerAvatar.textContent = '👥';
      }
    }

    if (paneEquipe) {
      const active = (aba === 'equipe');
      paneEquipe.hidden = !active;
      paneEquipe.style.setProperty('display', active ? 'flex' : 'none', 'important');
    }
    if (paneGrupos) {
      const active = (aba === 'grupos');
      paneGrupos.hidden = !active;
      paneGrupos.style.setProperty('display', active ? 'flex' : 'none', 'important');
    }
    if (paneIa) {
      const active = (aba === 'ia');
      paneIa.hidden = !active;
      paneIa.style.setProperty('display', active ? 'flex' : 'none', 'important');
    }
    if (paneOnline) {
      const active = (aba === 'online');
      paneOnline.hidden = !active;
      paneOnline.style.setProperty('display', active ? 'flex' : 'none', 'important');
    }

    if (footerInput) {
      const showFooter = (aba === 'equipe' || aba === 'ia' || (aba === 'grupos' && grupoAtivoId));
      footerInput.hidden = !showFooter;
      footerInput.style.setProperty('display', showFooter ? 'flex' : 'none', 'important');
      const inputEl = document.querySelector('#chatMsgInput');
      if (inputEl) {
        if (aba === 'ia') {
          inputEl.placeholder = 'Pergunte qualquer dúvida para a IA...';
        } else if (aba === 'grupos' && grupoAtivoId) {
          const g = gruposSetores.find(item => item.id === grupoAtivoId);
          inputEl.placeholder = `Mensagem em #${g ? g.nome : 'Setor'}...`;
        } else {
          inputEl.placeholder = 'Mensagem...';
        }
      }
    }

    if (aba === 'equipe') {
      renderizarMensagensEquipe();
    } else if (aba === 'grupos') {
      renderizarPainelGrupos();
    } else if (aba === 'ia') {
      renderizarMensagensIa();
    } else if (aba === 'online') {
      renderizarPainelOnline();
    }
    scrollChatBodyAoFim();
  }
  window.alternarAbaChat = alternarAbaChat;

  // ---------- RENDERIZAÇÃO DAS MENSAGENS (DESIGN EXATO DO WHATSAPP) ----------
  function renderizarMensagensEquipe() {
    const box = document.querySelector('#chatMessagesEquipe');
    if (!box) return;

    let html = '';

    html += mensagensEquipe.map(m => {
      if (m.isMine) {
        const checkIcon = (m.status === 'sent') 
          ? '<span class="prado-wa-check single">✓</span>' 
          : '<span class="prado-wa-check">✔✔</span>';

        return `
          <div class="prado-wa-msg-row mine">
            <div class="prado-wa-bubble mine">
              <div class="prado-wa-text">
                ${m.tipo === 'audio' ? renderizarPlayerAudio(m) : window.escapeHtml(m.conteudo)}
              </div>
              <div class="prado-wa-meta">
                <span class="prado-wa-time">${m.hora || '09:41'}</span>
                ${checkIcon}
              </div>
            </div>
          </div>
        `;
      } else {
        return `
          <div class="prado-wa-msg-row theirs">
            <div class="prado-wa-bubble theirs">
              <div class="prado-wa-text">
                ${m.tipo === 'audio' ? renderizarPlayerAudio(m) : window.escapeHtml(m.conteudo)}
              </div>
              <div class="prado-wa-meta">
                <span class="prado-wa-time">${m.hora || '09:41'}</span>
              </div>
            </div>
          </div>
        `;
      }
    }).join('');

    box.innerHTML = html;
    scrollChatBodyAoFim();
  }

  function renderizarPlayerAudio(m) {
    const audioId = 'audio_' + m.id;
    const temAudioReal = !!(m.audioData && m.audioData.startsWith('data:audio'));
    return `
      <div class="prado-wa-audio-player" id="playerWrap_${audioId}">
        <button type="button" class="prado-wa-audio-play" onclick="window.tocarAudioMensagem('${audioId}', this, '${m.id}')" title="Ouvir áudio em português">
          ▶
        </button>
        <div class="prado-wa-audio-track">
          <div class="prado-wa-audio-bar">
            <span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span>
          </div>
          <span class="prado-wa-audio-dur">${m.duracao || '0:03'}</span>
        </div>
        ${temAudioReal ? `<audio id="${audioId}" src="${m.audioData}" preload="auto" onended="window.resetarAudioBtn('${audioId}')"></audio>` : ''}
      </div>
      ${m.conteudo ? `<div class="prado-wa-audio-transcription">🎙️ <em>${window.escapeHtml(m.conteudo)}</em></div>` : ''}
    `;
  }

  window.tocarAudioMensagem = function(audioId, btn, msgId) {
    const playerWrap = btn?.closest('.prado-wa-audio-player');
    const todosPlayers = document.querySelectorAll('.prado-wa-audio-player');
    const todosBtns = document.querySelectorAll('.prado-wa-audio-play');

    // 1. Se estiver tocando este mesmo áudio, pausa
    if (btn.textContent.trim() === '⏸') {
      btn.textContent = '▶';
      if (playerWrap) playerWrap.classList.remove('playing');
      const audioEl = document.getElementById(audioId);
      if (audioEl) audioEl.pause();
      cancelarFalaHumana();
      return;
    }

    // 2. Reseta todos os outros players
    document.querySelectorAll('audio').forEach(a => { a.pause(); a.currentTime = 0; });
    cancelarFalaHumana();
    todosBtns.forEach(b => b.textContent = '▶');
    todosPlayers.forEach(p => p.classList.remove('playing'));

    const finalizarPlayer = () => {
      btn.textContent = '▶';
      if (playerWrap) playerWrap.classList.remove('playing');
    };

    // 3. Localiza a mensagem correspondente
    let msg = mensagensEquipe.find(m => m.id === msgId) || mensagensIa.find(m => m.id === msgId) || encontrarMensagemEmGrupos(msgId);
    const audioEl = document.getElementById(audioId);

    // Caso A: É áudio gravado do próprio microfone do usuário com áudio real gravado
    if (msg && msg.isMine && audioEl && audioEl.src && audioEl.src.startsWith('data:audio')) {
      btn.textContent = '⏸';
      if (playerWrap) playerWrap.classList.add('playing');
      audioEl.play().catch(err => {
        console.warn('Fallback voz falada pt-BR:', err);
        falarTextoPortugues(msg.conteudo || 'Mensagem de voz em português gravada pelo usuário', finalizarPlayer);
      });
      return;
    }

    // Caso B: É resposta do Michel do Prado, Copiloto IA ou mensagem da equipe
    // O sistema LÊ O TEXTO DA MENSAGEM em voz alta e natural (TTS) em português do Brasil
    const textoParaFalar = (msg && msg.conteudo) ? msg.conteudo : 'Olá! Mensagem recebida com sucesso.';

    btn.textContent = '⏸';
    if (playerWrap) playerWrap.classList.add('playing');

    // Determina o timbre da voz (masculina para Michel/admin ou feminina conforme seleção)
    const genero = (msg?.autorNome === 'Michel do Prado' || generoVozAtual === 'masculina') ? 'masculina' : 'feminina';
    falarTextoPortugues(textoParaFalar, finalizarPlayer, genero);
  };

  window.resetarAudioBtn = function(audioId) {
    const audioEl = document.getElementById(audioId);
    const parent = audioEl?.closest('.prado-wa-audio-player');
    const btn = parent?.querySelector('.prado-wa-audio-play');
    if (btn) btn.textContent = '▶';
    if (parent) parent.classList.remove('playing');
  };

  // ---------- RENDERIZAÇÃO DO COPILOTO IA ----------
  function renderizarMensagensIa() {
    const box = document.querySelector('#chatMessagesIa');
    if (!box) return;

    let html = `
      <div class="prado-wa-date-pill">
        <span>CONSULTOR COMERCIAL PRADO IA</span>
      </div>
    `;

    html += mensagensIa.map(m => {
      const isIa = (m.remetente === 'ia');
      if (isIa) {
        return `
          <div class="prado-wa-msg-row theirs">
            <div class="prado-wa-bubble theirs">
              <div class="prado-wa-author" style="color:#008069">🤖 Assistente Prado IA</div>
              <div class="prado-wa-text" style="white-space:pre-wrap;line-height:1.45">${m.tipo === 'audio' ? renderizarPlayerAudio(m) : window.escapeHtml(m.conteudo)}</div>
              <div class="prado-wa-meta">
                <span class="prado-wa-time">${m.hora || '09:41'}</span>
              </div>
            </div>
          </div>
        `;
      } else {
        return `
          <div class="prado-wa-msg-row mine">
            <div class="prado-wa-bubble mine">
              <div class="prado-wa-text">${m.tipo === 'audio' ? renderizarPlayerAudio(m) : window.escapeHtml(m.conteudo)}</div>
              <div class="prado-wa-meta">
                <span class="prado-wa-time">${m.hora || '09:41'}</span>
                <span class="prado-wa-check">✔✔</span>
              </div>
            </div>
          </div>
        `;
      }
    }).join('');

    box.innerHTML = html;
    scrollChatBodyAoFim();
  }

  // ---------- RENDERIZAÇÃO DA ABA ONLINE ----------
  function renderizarPainelOnline() {
    const container = document.querySelector('#chatOnlineListWrap');
    if (!container) return;

    const operadores = (typeof window.getOperadoresOnline === 'function') 
      ? window.getOperadoresOnline() 
      : [];

    const nomesPaginas = {
      dashboard: 'Visão Geral / Home',
      cotacao_ia: 'Cotações IA & Fábricas',
      clientes: 'Clientes',
      fornecedores: 'Fornecedores',
      oportunidades: 'Intermediações',
      orcamentos: 'Orçamentos',
      pedidos: 'Pedidos & Entregas',
      fiscal: 'NF-e e SEBRAE',
      financeiro: 'Financeiro',
      auditoria: 'Auditoria & Equipe'
    };

    container.innerHTML = `
      <div style="padding:10px 14px;background:#e7fce9;border:1px solid #bbf7d0;border-radius:10px;margin:12px;display:flex;align-items:center;gap:10px">
        <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#00a884;box-shadow:0 0 6px #00a884"></span>
        <span style="font-size:12.5px;color:#065f46;font-weight:700">${Math.max(1, operadores.length)} usuário(s) conectado(s) e operando</span>
      </div>

      <div class="prado-wa-online-list">
        ${window.currentUser ? `
        <div class="prado-wa-online-card">
          <div class="prado-wa-online-avatar" style="overflow:hidden;padding:0">
            ${(typeof window.getFotoUsuario === 'function' && window.getFotoUsuario(window.currentUser)) 
              ? `<img src="${window.getFotoUsuario(window.currentUser)}" alt="${window.escapeHtml(window.currentUser.nome)}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;display:block">` 
              : window.escapeHtml(window.currentUser.avatar || 'MP')}
            <span class="prado-wa-online-dot"></span>
          </div>
          <div class="prado-wa-online-info">
            <b>${window.escapeHtml(window.currentUser.nome)}</b>
            <small>${window.escapeHtml(window.currentUser.cargo || 'Diretoria')}</small>
            <span class="prado-wa-online-loc">📍 Conectado na Sessão Segura</span>
          </div>
          <button class="prado-wa-call-btn" onclick="window.alternarAbaChat('equipe')">
            Conversar
          </button>
        </div>
        ` : ''}

        ${operadores.filter(op => !window.currentUser || op.email !== window.currentUser.email).map(op => {
          const opFoto = (typeof window.getFotoUsuario === 'function') ? window.getFotoUsuario(op) : (op.photo || op.avatar);
          const temImg = opFoto && (opFoto.startsWith('data:image') || opFoto.startsWith('http'));
          return `
          <div class="prado-wa-online-card">
            <div class="prado-wa-online-avatar" style="overflow:hidden;padding:0">
              ${temImg ? `<img src="${opFoto}" alt="${window.escapeHtml(op.nome)}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;display:block">` : window.escapeHtml(op.avatar || 'OP')}
              <span class="prado-wa-online-dot"></span>
            </div>
            <div class="prado-wa-online-info">
              <b>${window.escapeHtml(op.nome)}</b>
              <small>${window.escapeHtml(op.cargo)} · ${window.escapeHtml(op.email)}</small>
              <span class="prado-wa-online-loc">
                📍 Em: ${window.escapeHtml(nomesPaginas[op.paginaAtual] || op.paginaAtual || 'Visão Geral')}
              </span>
            </div>
            <button class="prado-wa-call-btn" onclick="window.iniciarMencaoChat('${window.escapeHtml(op.nome)}')">
              Mensagem
            </button>
          </div>
        `}).join('')}
      </div>
    `;
  }

  // ---------- RENDERIZAÇÃO DA ABA GRUPOS DE SETORES ----------
  function renderizarPainelGrupos() {
    const container = document.querySelector('#chatGruposContainer');
    if (!container) return;

    // Se nenhum grupo estiver aberto: exibe a lista dos 5 grupos de setores
    if (!grupoAtivoId) {
      const footerInput = document.querySelector('#pradoChatFooterBar');
      if (footerInput) {
        footerInput.hidden = true;
        footerInput.style.setProperty('display', 'none', 'important');
      }

      const headerTitle = document.querySelector('#pradoWaHeaderTitle');
      const headerStatus = document.querySelector('#pradoWaHeaderStatus');
      const headerAvatar = document.querySelector('#pradoWaHeaderAvatar');
      if (headerTitle && headerStatus && headerAvatar) {
        headerTitle.textContent = 'Grupos por Setor';
        headerStatus.textContent = '5 setores ativos';
        headerAvatar.textContent = '🏢';
      }

      container.innerHTML = `
        <div style="padding:10px 14px;background:#e8f5e9;border:1px solid #c8e6c9;border-radius:10px;margin-bottom:10px;display:flex;align-items:center;gap:10px">
          <span style="font-size:18px">🏢</span>
          <span style="font-size:12px;color:#065f46;font-weight:700">Selecione um setor da Prado para trocar ideias e alinhar demandas:</span>
        </div>
        <div class="prado-wa-groups-list">
          ${gruposSetores.map(g => {
            const ultimaMsg = g.mensagens[g.mensagens.length - 1];
            const textoUltima = ultimaMsg 
              ? (ultimaMsg.tipo === 'audio' ? '🎙️ Mensagem de áudio' : ultimaMsg.conteudo) 
              : 'Nenhuma mensagem ainda';
            return `
              <div class="prado-wa-group-card" onclick="window.abrirGrupoSetor('${g.id}')">
                <div class="prado-wa-group-icon" style="background:${g.cor}18;border-color:${g.cor}40">
                  ${g.icone}
                </div>
                <div class="prado-wa-group-info">
                  <div class="prado-wa-group-info-top">
                    <b>${window.escapeHtml(g.nome)}</b>
                    <span class="prado-wa-group-time">${ultimaMsg ? ultimaMsg.hora : ''}</span>
                  </div>
                  <div class="prado-wa-group-desc">${window.escapeHtml(textoUltima)}</div>
                  <div class="prado-wa-group-membros">
                    <span>👥 ${g.membros.length} integrantes</span>
                    <span>· Toque para abrir</span>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
      scrollChatBodyAoFim();
      return;
    }

    // Se um grupo estiver aberto: exibe o chat daquele setor
    const grupo = gruposSetores.find(g => g.id === grupoAtivoId);
    if (!grupo) {
      grupoAtivoId = null;
      renderizarPainelGrupos();
      return;
    }

    const footerInput = document.querySelector('#pradoChatFooterBar');
    if (footerInput) {
      footerInput.hidden = false;
      footerInput.style.setProperty('display', 'flex', 'important');
      const inputEl = document.querySelector('#chatMsgInput');
      if (inputEl) inputEl.placeholder = `Mensagem em #${grupo.nome}...`;
    }

    const headerTitle = document.querySelector('#pradoWaHeaderTitle');
    const headerStatus = document.querySelector('#pradoWaHeaderStatus');
    const headerAvatar = document.querySelector('#pradoWaHeaderAvatar');
    if (headerTitle && headerStatus && headerAvatar) {
      headerTitle.textContent = grupo.nome;
      headerStatus.textContent = `${grupo.membros.length} participantes online`;
      headerAvatar.textContent = grupo.icone;
    }

    let html = `
      <div class="prado-wa-group-header-nav">
        <button type="button" class="prado-wa-group-back-btn" onclick="window.voltarListaGrupos()">
          ← Voltar aos Grupos
        </button>
        <span class="prado-wa-group-header-title">
          ${grupo.icone} ${window.escapeHtml(grupo.nome)}
        </span>
      </div>
      <div class="prado-wa-date-pill">
        <span>GRUPO DO SETOR · ${grupo.nome.toUpperCase()}</span>
      </div>
    `;

    html += grupo.mensagens.map(m => {
      if (m.isMine) {
        return `
          <div class="prado-wa-msg-row mine">
            <div class="prado-wa-bubble mine">
              <div class="prado-wa-text">
                ${m.tipo === 'audio' ? renderizarPlayerAudio(m) : window.escapeHtml(m.conteudo)}
              </div>
              <div class="prado-wa-meta">
                <span class="prado-wa-time">${m.hora || '09:41'}</span>
                <span class="prado-wa-check">✔✔</span>
              </div>
            </div>
          </div>
        `;
      } else {
        const corAutor = m.corAvatar || '#008069';
        return `
          <div class="prado-wa-msg-row theirs">
            <div class="prado-wa-bubble theirs">
              <div class="prado-wa-sender-badge" style="color:${corAutor}">
                ${window.escapeHtml(m.autorNome)} <small style="font-size:10px;color:#64748b;font-weight:400">(${m.autorCargo || 'Equipe'})</small>
              </div>
              <div class="prado-wa-text">
                ${m.tipo === 'audio' ? renderizarPlayerAudio(m) : window.escapeHtml(m.conteudo)}
              </div>
              <div class="prado-wa-meta">
                <span class="prado-wa-time">${m.hora || '09:41'}</span>
              </div>
            </div>
          </div>
        `;
      }
    }).join('');

    container.innerHTML = html;
    scrollChatBodyAoFim();
  }
  window.renderizarPainelGrupos = renderizarPainelGrupos;

  window.abrirGrupoSetor = function(grupoId) {
    grupoAtivoId = grupoId;
    renderizarPainelGrupos();
  };

  window.voltarListaGrupos = function() {
    grupoAtivoId = null;
    renderizarPainelGrupos();
  };

  // ---------- MOTOR DE INTELIGÊNCIA ARTIFICIAL COGNITIVA PRADO (MULTI-INTENÇÃO) ----------
  function gerarRespostaInteligentePrado(pergunta, contexto = 'michel', tipoEnviado = 'texto') {
    const raw = (pergunta || '').trim();
    // Normalização sem acentos e minúsculas para correspondência perfeita
    const q = raw.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // 1. Intenção: Reclamação de IA burra / robótica / respostas fracas
    if (
      q.includes('burr') || q.includes('robo') || q.includes('burrice') || 
      q.includes('ia burra') || q.includes('resposta burra') || q.includes('fraca') || 
      q.includes('repetitiva') || q.includes('meia burra') || q.includes('nao acha')
    ) {
      if (contexto === 'michel') {
        return 'Tens toda a razão, meu amigo! Peço mil desculpas! Eu estava preso numa resposta padrão de teste e já dei um belo puxão de orelha no sistema! 😅 Agora o meu cérebro operacional está 100% calibrado com todo o banco de dados da Prado em tempo real.\n\nPode me mandar bala: quer saber o que devemos fazer agora, checar as margens dos 150 colchões do Cliente Institucional, a conciliação da NF 002 ou simular um cálculo comercial? O que manda agora? 🧠🚀';
      } else {
        return '🧠 **Atualização Cognitiva Concluída:**\n\nPeço desculpas pela resposta anterior limitada. O módulo do Copiloto Comercial Prado foi completamente reotimizado!\n\nAgora posso responder detalhadamente sobre:\n• **Roteiro e Prioridades:** O que fazer agora na operação comercial;\n• **Cálculos e Margens:** Formação de preço de venda e retenção líquida (20% a 28%);\n• **Contratos e Orçamentos:** Colchões D33 (R$ 72.750,00) e Sacos 3W (NF 002 — R$ 21.500,00);\n• **Tributação e Fiscal:** MEI/SIMEI e isenção de IRPF pela LC 123/2006.\n\nComo posso ser útil na sua decisão agora?';
      }
    }

    // 2. Intenção: "O que devo fazer agora?" / "Próximos passos" / "Prioridades"
    if (
      q.includes('o que devo fazer') || q.includes('o que fazer') || q.includes('o que faco') || 
      q.includes('o que temos pra fazer') || q.includes('quais os proximos passos') || 
      q.includes('proximo passo') || q.includes('por onde comecar') || q.includes('prioridade') || 
      q.includes('o que preciso fazer') || q.includes('qual o plano')
    ) {
      if (contexto === 'michel') {
        return 'Aqui está o nosso plano de ação imediato para hoje na Prado:\n\n' +
          '1. 🛏️ **Orçamento 027 (150 Colchões D33):** O Cliente Institucional está aguardando a minuta timbrada de R$ 72.750,00. A fábrica já confirmou entrega em 10 dias. Vale abrir a aba **Orçamentos** e gerar a proposta oficial em PDF com sigilo industrial!\n\n' +
          '2. 📦 **Fábrica 3W Embalagens:** Mantivemos a tabela de preços de sacos de lixo de 100L e 200L congelada. O estoque está disponível para pronta entrega.\n\n' +
          '3. 💰 **Financeiro & Conciliação:** A NF-e 002 (R$ 21.500,00) está liquidada no Banco do Brasil com R$ 4.750,00 de margem limpa (22,1%). Vale dar uma olhada na aba **Financeiro** para conferir o fluxo.\n\n' +
          '4. 🤝 **Novas Prospecções:** Se tiver novos clientes ou licitações, use a aba **Cotações IA** para simular o markup ideal entre 20% e 28%!\n\n' +
          'Bora acelerar nessas frentes? Se precisar que eu faça alguma coisa, só me avisar! 🚀';
      } else {
        return '📋 **Plano Tático Operacional — Prado Comércio & Soluções:**\n\n' +
          '• **Ação 1 (Comercial):** Revisar o Orçamento 027 (150 Colchões Hospitalares D33) de R$ 72.750,00 para o Cliente Institucional e emitir a proposta timbrada oficial.\n' +
          '• **Ação 2 (Suprimentos):** Manter alinhamento com a 3W Embalagens para garantir pedidos com preço travado de fábrica por 60 dias.\n' +
          '• **Ação 3 (Financeiro):** Auditar os lançamentos da NF-e 002 de R$ 21.500,00 e certificar o saldo líquido retido de 22,1%.\n' +
          '• **Ação 4 (Expansão):** Cadastrar novos clientes e órgãos públicos usando o botão "＋ Novo cadastro" no topo da tela.';
      }
    }

    // 3. Intenção: Colchões / Orçamento 027 / Cliente Institucional
    if (
      q.includes('colch') || q.includes('027') || q.includes('72750') || 
      q.includes('72.750') || q.includes('hospitalar') || q.includes('velhinho')
    ) {
      return '🛏️ **Orçamento 027/2026 — 150 Colchões Hospitalares D33:**\n\n' +
        '• **Cliente:** Cliente Institucional (Processo SMADS).\n' +
        '• **Item:** 150 Colchões Solteiro D33 Hospitalar (1,88m x 0,88m x 0,17m) com capa higienizável e selo Pró-Espuma INER / Inmetro NBR 13579.\n' +
        '• **Valor de Venda Total:** R$ 72.750,00 (unitário de R$ 485,00).\n' +
        '• **Custo Fábrica:** R$ 54.270,00 (unitário de R$ 361,80).\n' +
        '• **Lucro Líquido Prado:** R$ 18.480,00 (**25,4% de margem líquida garantida**).\n' +
        '• **Sigilo Industrial:** Proposta emitida em papel timbrado oficial da Prado, preservando 100% o sigilo do fabricante parceiro!';
    }

    // 4. Intenção: Sacos de lixo / 3W Embalagens / NF 002 / Plásticos
    if (
      q.includes('saco') || q.includes('3w') || q.includes('embalage') || 
      q.includes('lixo') || q.includes('002') || q.includes('21500') || q.includes('21.500')
    ) {
      return '📦 **Fornecimento de Sacos de Lixo (NF-e nº 002):**\n\n' +
        '• **Cliente:** Cliente Institucional.\n' +
        '• **Fornecedor Industrial:** 3W Embalagens Ltda (Piracicaba/SP).\n' +
        '• **Itens Fornecidos:** Sacos de lixo reforçados de 20L, 40L, 60L, 100L e 200L.\n' +
        '• **Valor Faturado:** R$ 21.500,00.\n' +
        '• **Custo da Fábrica:** R$ 16.750,00.\n' +
        '• **Lucro Líquido Prado:** R$ 4.750,00 (**22,1% de margem de intermediação**).\n' +
        '• **Status Operacional:** Entregue com canhoto assinado e 100% liquidado via PIX/TED no Banco do Brasil!';
    }

    // 5. Intenção: Margem de Lucro / Comissão / Markup / Cálculo de preço
    if (
      q.includes('margem') || q.includes('lucro') || q.includes('comissao') || 
      q.includes('quanto ganho') || q.includes('calcular preco') || q.includes('markup') || q.includes('rentabilidade')
    ) {
      return '📈 **Diretrizes de Precificação e Margem da Prado:**\n\n' +
        '• **Margem Padrão de Intermediação:** Entre **20% e 28%** sobre a venda final.\n' +
        '• **Fórmula Oficial de Venda:** `Preço Venda = Custo Fábrica ÷ (1 - Margem Desejada)`.\n' +
        '• **Exemplo:** Custo de fábrica R$ 100,00 com margem de 25% → R$ 100 ÷ 0,75 = **R$ 133,33** na proposta comercial timbrada.\n' +
        '• **Proteção Comercial:** O cliente recebe e paga o valor integral à Prado, e nós liquidamos a fábrica, garantindo sigilo absoluto e retenção total da margem!';
    }

    // 6. Intenção: Nota Fiscal / NF-e / Imposto / SIMEI / MEI / Tributação / SEBRAE
    if (
      q.includes('nota') || q.includes('nfe') || q.includes('nf-e') || 
      q.includes('fiscal') || q.includes('imposto') || q.includes('simei') || 
      q.includes('tribut') || q.includes('sebrae') || q.includes('darf') || q.includes('das')
    ) {
      return '📑 **Regime Fiscal e Emissão de Notas (MEI / SIMEI):**\n\n' +
        '• **Emissor Oficial:** Portal Nacional de Emissão da NFS-e / Emissor Gratuito SEBRAE.\n' +
        '• **Teto do MEI:** R$ 81.000,00 por ano (R$ 6.750,00/mês). Com a NF 002 (R$ 21.500,00) faturada, o volume acumulado está sob controle.\n' +
        '• **Blindagem Tributária (LC 123/2006):** O lucro líquido da intermediação comercial distribuído para a conta física do titular é **100% isento de Imposto de Renda** quando mantida a escrituração contábil regular!\n' +
        '• Acesse a aba **Fiscal & NF-e** no menu para consultar o demonstrativo!';
    }

    // 7. Intenção: Cadastros (Cliente / Fornecedor / Produto)
    if (
      q.includes('cadastr') || q.includes('novo cliente') || q.includes('novo fornecedor') || 
      q.includes('adicionar cliente') || q.includes('onde cadastro')
    ) {
      return '👥 **Gestão de Cadastros no Sistema:**\n\n' +
        '1. Clique no botão azul **"＋ Novo cadastro"** no cabeçalho superior direito.\n' +
        '2. Selecione a entidade desejada: **Cliente**, **Fornecedor** ou **Produto**.\n' +
        '3. Digite o CNPJ/CPF: o sistema realiza a validação automática e preenche os dados cadastrais.\n' +
        '4. Salve para liberar a inclusão imediata nas propostas timbradas e cotações!';
    }

    // 8. Intenção: Financeiro / Saldo / Caixa / Faturamento
    if (
      q.includes('financeir') || q.includes('faturament') || q.includes('saldo') || 
      q.includes('caixa') || q.includes('extrato') || q.includes('pix') || q.includes('banco')
    ) {
      return '💰 **Painel Financeiro da Operação:**\n\n' +
        '• **Faturamento Liquidado (Ciclo Atual):** R$ 21.500,00 (NF 002).\n' +
        '• **Lucro Líquido Realizado:** R$ 4.750,00 (22,1%).\n' +
        '• **Previsão em Negociação (Pipeline):** R$ 72.750,00 (Orçamento 027 dos colchões).\n' +
        '• **Instituição Bancária:** Banco do Brasil (PIX / TED corporativo).\n' +
        '• Abra a aba **Financeiro** no menu lateral para visualizar os gráficos completos!';
    }

    // 9. Intenção: Proposta Comercial / Orçamento / Timbrado / PDF
    if (
      q.includes('proposta') || q.includes('timbrad') || q.includes('orcament') || 
      q.includes('pdf') || q.includes('emitir proposta') || q.includes('gerar proposta')
    ) {
      return '📄 **Propostas Comerciais Timbradas Prado:**\n\n' +
        '• As propostas comerciais são geradas com cabeçalho oficial, logo dourado da Prado, condições de pagamento e dados técnicos completos.\n' +
        '• **Sigilo Industrial Garantido:** Em nenhuma hipótese o nome ou dados de contato da indústria fabricante são exibidos ao cliente final.\n' +
        '• Para gerar ou imprimir uma proposta em PDF, acesse a aba **Orçamentos** e clique no ícone de visualização da proposta!';
    }

    // 10. Intenção: Logística / Entrega / Prazos / Rastreio
    if (
      q.includes('logistica') || q.includes('entrega') || q.includes('prazo') || 
      q.includes('frete') || q.includes('transporte') || q.includes('canhoto')
    ) {
      return '🚚 **Operação Logística e Entregas:**\n\n' +
        '• **Prazo Médio Fábrica:** Entrega despachada em até 10 dias úteis após confirmação do empenho/pedido.\n' +
        '• **Comprovação de Entrega:** Todas as entregas no almoxarifado do cliente exigem canhoto de nota fiscal carimbado e assinado pelo recebedor.\n' +
        '• A carga da 3W Embalagens já foi entregue com canhoto 100% arquivado no sistema.';
    }

    // 11. Intenção: Identidade / Quem é Michel / Quem é você
    if (
      q.includes('quem e voce') || q.includes('quem e michel') || 
      q.includes('quem e o michel') || q.includes('quem e vc') || q.includes('seu papel')
    ) {
      return '👋 Sou o **Michel do Prado**, Administrador Geral da Prado Comércio & Soluções!\n\n' +
        'Coordeno as operações de representação comercial, prospecção junto a órgãos públicos e clientes privados, negociação direta com fábricas e fechamento de contratos de alta rentabilidade. Estou à disposição para o que você precisar!';
    }

    // 12. Intenção: Saudações
    if (
      q.includes('bom dia') || q.includes('boa tarde') || q.includes('boa noite') || 
      q.includes('ola') || q.includes('oi') || q.includes('tudo bem') || q.includes('e ai')
    ) {
      if (contexto === 'michel') {
        const respostasOla = [
          'Fala parceiro! Tudo 100% por aqui! Como posso te ajudar hoje nas negociações ou no sistema?',
          'Opa, tudo ótimo! Pronto para acelerar as operações da Prado. Em qual proposta ou cotação vamos focar agora?',
          'Tudo em ordem por aqui! As fábricas e clientes estão alinhados. O que você precisa consultar hoje?'
        ];
        return respostasOla[Math.floor(Math.random() * respostasOla.length)];
      } else {
        return 'Olá! Sou o seu Copiloto Comercial Prado IA. Como posso auxiliar você hoje nas cotações, orçamentos ou processos fiscais?';
      }
    }

    // 13. Intenção: Emojis ou incentivo
    if (
      q.includes('top') || q.includes('show') || q.includes('valeu') || 
      q.includes('obrigad') || q.includes('maravilha') || q.includes('perfeito') || 
      q.includes('excelente') || q.includes('👍') || q.includes('🚀') || q.includes('👏')
    ) {
      return 'Show de bola! Juntos vamos cada vez mais longe, fechando negócios sólidos e lucrativos! 🚀💼';
    }

    // 14. Intenção: Ajuda / Dúvida geral
    if (
      q.includes('ajuda') || q.includes('socorro') || q.includes('como funciona') || 
      q.includes('o que voce faz') || q.includes('duvida')
    ) {
      return '💡 **Como posso te ajudar agora:**\n\n' +
        '• Pergunte **"O que devo fazer agora?"** para ver as prioridades do dia na operação;\n' +
        '• Consulte detalhes dos **Colchões D33** ou dos **Sacos de Lixo 3W**;\n' +
        '• Tire dúvidas sobre **margem de lucro**, regras do **MEI/SIMEI** e emissão de **NF-e**;\n' +
        '• Peça orientações sobre **cadastros** e emissão de **propostas timbradas em PDF**.\n' +
        'Você pode tanto falar por áudio quanto escrever!';
    }

    // 15. Fallback Inteligente Contextual: analisa o texto livre do usuário
    if (raw.length > 3) {
      if (contexto === 'michel') {
        return `Entendido sobre "${raw}"! Na nossa estratégia comercial, mantemos o alinhamento com os fornecedores e garantimos que qualquer proposta saia com margem mínima de 20% no timbrado oficial da Prado. Quer que eu detalhe o cálculo ou direcione essa demanda para a aba de orçamentos? 👍💼`;
      } else {
        return `🤖 **Análise Consultiva Prado IA:**\n\nSobre a sua mensagem: "${raw}".\n\nNa Prado Comércio & Soluções, estruturamos cada operação com foco em conformidade tributária (SIMEI/SEBRAE), sigilo industrial dos fornecedores e margem de intermediação entre 20% e 28%.\n\nVocê pode me pedir para simular margens, consultar os colchões ou detalhar o faturamento da NF 002.`;
      }
    }

    return 'Entendido perfeitamente! Como posso te ajudar nas operações de hoje? 😊';
  }
  window.gerarRespostaInteligentePrado = gerarRespostaInteligentePrado;

  function simularRespostaGrupo(grupoId, tipoEnviado, conteudoEnviado) {
    const grupo = gruposSetores.find(g => g.id === grupoId);
    if (!grupo) return;

    setTimeout(() => {
      const agora = new Date();
      const horaStr = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      let autorNome = 'Colega do Setor';
      let autorCargo = 'Operador';
      let autorAvatar = 'OP';
      let corAvatar = '#008069';
      let resposta = '';

      const respContextual = gerarRespostaInteligentePrado(conteudoEnviado, grupoId, tipoEnviado);

      if (grupoId === 'comercial') {
        autorNome = 'Mariana Licitações';
        autorCargo = 'Licitações';
        autorAvatar = 'ML';
        corAvatar = '#8b5cf6';
        resposta = (conteudoEnviado && conteudoEnviado.length > 4) 
          ? respContextual 
          : 'Recebido no Comercial! Já conferi a minuta da proposta timbrada, e os 150 colchões estão com as margens 100% blindadas!';
      } else if (grupoId === 'financeiro') {
        autorNome = 'Roberto Controladoria';
        autorCargo = 'Financeiro';
        autorAvatar = 'RC';
        corAvatar = '#0284c7';
        resposta = (conteudoEnviado && conteudoEnviado.length > 4) 
          ? respContextual 
          : 'Perfeito! Conciliação bancária da NF-e 002 de R$ 21.500,00 e fluxo de caixa conferidos no sistema.';
      } else if (grupoId === 'logistica') {
        autorNome = 'Tiago Frotas';
        autorCargo = 'Logística';
        autorAvatar = 'TF';
        corAvatar = '#d97706';
        resposta = (conteudoEnviado && conteudoEnviado.length > 4) 
          ? respContextual 
          : 'Anotado aqui na Logística! Rastreio das entregas com canhoto assinado arquivado.';
      } else if (grupoId === 'compras') {
        autorNome = 'Fernanda Compras';
        autorCargo = 'Suprimentos';
        autorAvatar = 'FC';
        corAvatar = '#dc2626';
        resposta = (conteudoEnviado && conteudoEnviado.length > 4) 
          ? respContextual 
          : 'Alinhado com a fábrica! Preços de fábrica garantidos por 60 dias junto à 3W Embalagens.';
      } else {
        autorNome = 'Michel do Prado';
        autorCargo = 'Administrador Geral';
        autorAvatar = 'MP';
        corAvatar = '#059669';
        resposta = respContextual;
      }

      const palavras = (resposta || '').split(/\s+/).filter(Boolean).length;
      const durSegundos = Math.min(20, Math.max(3, Math.round(palavras / 2.6)));
      const durMin = Math.floor(durSegundos / 60);
      const durResto = durSegundos % 60;
      const durStr = `${durMin}:${durResto < 10 ? '0' : ''}${durResto}`;

      const msgResposta = {
        id: 'grp-resp-' + Date.now(),
        autorNome: autorNome,
        autorCargo: autorCargo,
        autorAvatar: autorAvatar,
        corAvatar: corAvatar,
        isMine: false,
        tipo: tipoEnviado === 'audio' ? 'audio' : 'texto',
        conteudo: resposta,
        audioData: null,
        duracao: durStr,
        hora: horaStr,
        status: 'read'
      };

      grupo.mensagens.push(msgResposta);
      salvarGrupos();
      if (chatAbaAtiva === 'grupos' && grupoAtivoId === grupoId) {
        renderizarPainelGrupos();
      }
      tocarSomWhatsApp();

      if (broadcastChannel) {
        broadcastChannel.postMessage({ type: 'NOVA_MENSAGEM_GRUPO', grupoId: grupoId, mensagem: msgResposta });
      }
    }, 2000);
  }

  window.iniciarMencaoChat = function(nome) {
    alternarAbaChat('equipe');
    const inp = document.querySelector('#chatMsgInput');
    if (inp) {
      inp.value = `@${nome} `;
      inp.focus();
      atualizarBotaoEnvioOuMic();
    }
  };

  // Alterna o ícone de microfone ou aviãozinho de envio ➤
  function atualizarBotaoEnvioOuMic() {
    const inp = document.querySelector('#chatMsgInput');
    const btn = document.querySelector('#pradoSendMicBtn');
    const icon = document.querySelector('#pradoSendMicIcon');
    if (!btn || !icon) return;

    if (gravandoAudio) {
      icon.textContent = '➤';
      icon.style.transform = 'translateX(1px)';
      btn.title = 'Concluir e enviar áudio';
      btn.classList.add('send-mode');
      return;
    }

    if (inp && inp.value.trim().length > 0) {
      icon.textContent = '➤';
      icon.style.transform = 'translateX(1px)';
      btn.title = 'Enviar mensagem (ou pressione Enter)';
      btn.classList.add('send-mode');
    } else {
      icon.textContent = '🎙️';
      icon.style.transform = 'none';
      btn.title = 'Clique para gravar áudio';
      btn.classList.remove('send-mode');
    }
  }
  window.atualizarBotaoEnvioOuMic = atualizarBotaoEnvioOuMic;

  function acaoBotaoEnvioOuMic() {
    // 1. Se estiver gravando áudio, clicar no botão verde conclui e envia o áudio gravado!
    if (gravandoAudio) {
      pararGravacaoVoz(true);
      return;
    }

    const inp = document.querySelector('#chatMsgInput');
    // 2. Se houver texto digitado, envia a mensagem de texto
    if (inp && inp.value.trim().length > 0) {
      enviarMensagemAtual();
      return;
    }

    // 3. Se estiver vazio e não gravando: CLIQUE INICIA A GRAVAÇÃO COM TEMPO ROLANDO!
    iniciarGravacaoVoz();
  }
  window.acaoBotaoEnvioOuMic = acaoBotaoEnvioOuMic;

  // ---------- SIMULAÇÃO INTERATIVA: RESPOSTA DO MICHEL DO PRADO ----------
  function simularRespostaMichel(tipoEnviado, conteudoEnviado) {
    const headerStatus = document.querySelector('#pradoWaHeaderStatus');

    // 1. Em 700ms, as mensagens do usuário são marcadas como lidas (dois checks azuis ✔✔)
    setTimeout(() => {
      mensagensEquipe.forEach(m => {
        if (m.isMine) m.status = 'read';
      });
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(mensagensEquipe));
      if (chatAbaAtiva === 'equipe') renderizarMensagensEquipe();
    }, 700);

    // 2. Em 1.3s, Michel começa a "digitar..." ou "gravando áudio..."
    setTimeout(() => {
      if (headerStatus && chatAbaAtiva === 'equipe') {
        headerStatus.textContent = (tipoEnviado === 'audio') ? 'gravando áudio...' : 'digitando...';
        headerStatus.style.color = '#34d399';
      }
    }, 1300);

    // 3. Em 2.4s, a resposta inteligente chega no chat com som oficial!
    setTimeout(() => {
      if (headerStatus) {
        headerStatus.textContent = 'online';
        headerStatus.style.color = '#c8f5d0';
      }

      const agora = new Date();
      const horaStr = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      // Gera a resposta inteligente baseada no que o usuário disse (áudio transcrito ou texto digitado)
      const respostaTexto = gerarRespostaInteligentePrado(conteudoEnviado, 'michel', tipoEnviado);
      const isAudioResp = (tipoEnviado === 'audio');

      // Calcula duração realista do áudio baseada na contagem de palavras
      const palavras = (respostaTexto || '').split(/\s+/).filter(Boolean).length;
      const durSegundos = Math.min(25, Math.max(3, Math.round(palavras / 2.6)));
      const durMin = Math.floor(durSegundos / 60);
      const durResto = durSegundos % 60;
      const durStr = `${durMin}:${durResto < 10 ? '0' : ''}${durResto}`;

      const msgMichel = {
        id: 'msg-resp-' + Date.now(),
        autorNome: 'Michel do Prado',
        autorCargo: 'Administrador Geral',
        autorAvatar: 'MP',
        isMine: false,
        tipo: isAudioResp ? 'audio' : 'texto',
        conteudo: respostaTexto,
        audioData: null,
        duracao: durStr,
        hora: horaStr,
        status: 'read'
      };

      mensagensEquipe.push(msgMichel);
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(mensagensEquipe));
      if (chatAbaAtiva === 'equipe') renderizarMensagensEquipe();
      tocarSomWhatsApp();

      // Se o chat estiver minimizado ou fechado, abre o balão toast imediatamente no canto inferior
      if (!chatAberto) {
        dispararBalaoToast(msgMichel);
      }

      if (broadcastChannel) {
        broadcastChannel.postMessage({ type: 'NOVA_MENSAGEM', mensagem: msgMichel });
      }
    }, 2400);
  }

  // ---------- ENVIO DE MENSAGENS (TEXTO & EMOJIS VIA CLIQUE NO AVIÃOZINHO OU ENTER) ----------
  function enviarMensagemAtual() {
    const input = document.querySelector('#chatMsgInput');
    if (!input) return;
    const texto = input.value.trim();
    if (!texto) return;

    const agora = new Date();
    const horaFormatada = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    if (chatAbaAtiva === 'ia') {
      mensagensIa.push({
        id: 'ia-user-' + Date.now(),
        remetente: 'user',
        autorNome: 'Você',
        conteudo: texto,
        hora: horaFormatada
      });
      input.value = '';
      atualizarBotaoEnvioOuMic();
      renderizarMensagensIa();
      gerarRespostaIaPrado(texto);
    } else if (chatAbaAtiva === 'grupos' && grupoAtivoId) {
      const grupo = gruposSetores.find(g => g.id === grupoAtivoId);
      if (grupo) {
        const msgGrupo = {
          id: 'grp-user-' + Date.now(),
          autorNome: 'Você',
          autorCargo: 'Operador',
          autorAvatar: 'EU',
          corAvatar: '#008069',
          isMine: true,
          tipo: 'texto',
          conteudo: texto,
          hora: horaFormatada,
          status: 'sent'
        };
        grupo.mensagens.push(msgGrupo);
        salvarGrupos();
        input.value = '';
        atualizarBotaoEnvioOuMic();
        renderizarPainelGrupos();
        simularRespostaGrupo(grupoAtivoId, 'texto', texto);
      }
    } else {
      const novaMsg = {
        id: 'msg-' + Date.now(),
        autorNome: 'Você',
        autorCargo: 'Operador',
        autorAvatar: 'EU',
        isMine: true,
        tipo: 'texto',
        conteudo: texto,
        hora: horaFormatada,
        status: 'sent' // 1 check ✓ e vira ✔✔ após leitura do Michel
      };

      mensagensEquipe.push(novaMsg);
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(mensagensEquipe));
      input.value = '';
      atualizarBotaoEnvioOuMic();
      renderizarMensagensEquipe();

      if (broadcastChannel) {
        broadcastChannel.postMessage({ type: 'NOVA_MENSAGEM', mensagem: novaMsg });
      }

      simularRespostaMichel('texto', texto);
    }
  }
  window.enviarMensagemAtual = enviarMensagemAtual;

  // ---------- GRAVAÇÃO DE VOZ WHATSAPP REAL (MICROFONE REAL + TRANSCRIÇÃO EM PT-BR) ----------
  async function iniciarGravacaoVoz() {
    if (gravandoAudio) return;
    gravandoAudio = true;
    gravacaoSegundos = 0;
    audioChunks = [];
    transcricaoGravadaTemp = '';
    tempoInicioGravacao = Date.now();

    const inputPill = document.querySelector('#chatInputWrap');
    const recordBar = document.querySelector('#chatRecordingBar');

    if (inputPill) {
      inputPill.hidden = true;
      inputPill.style.setProperty('display', 'none', 'important');
    }
    if (recordBar) {
      recordBar.hidden = false;
      recordBar.style.setProperty('display', 'flex', 'important');
    }

    const timerEl = document.querySelector('#chatRecordTimer');
    if (timerEl) timerEl.textContent = '0:00';

    atualizarBotaoEnvioOuMic();

    if (gravacaoTimer) clearInterval(gravacaoTimer);
    gravacaoTimer = setInterval(() => {
      gravacaoSegundos++;
      const m = Math.floor(gravacaoSegundos / 60);
      const s = gravacaoSegundos % 60;
      if (timerEl) timerEl.textContent = `${m}:${s < 10 ? '0' : ''}${s}`;
    }, 1000);

    // 1. Inicia reconhecimento de fala nativo (Speech Recognition pt-BR)
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRec) {
      try {
        activeSpeechRecognition = new SpeechRec();
        activeSpeechRecognition.lang = 'pt-BR';
        activeSpeechRecognition.continuous = true;
        activeSpeechRecognition.interimResults = true;
        activeSpeechRecognition.onresult = (e) => {
          let str = '';
          for (let i = 0; i < e.results.length; i++) {
            str += e.results[i][0].transcript + ' ';
          }
          transcricaoGravadaTemp = str.trim();
        };
        activeSpeechRecognition.start();
      } catch (err) {
        console.warn('SpeechRecognition indisponível:', err);
      }
    }

    // 2. Inicia gravação com o microfone real do dispositivo
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
        mediaStreamAtual = stream;

        let mimeType = 'audio/webm';
        if (typeof MediaRecorder.isTypeSupported === 'function') {
          if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) mimeType = 'audio/webm;codecs=opus';
          else if (MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4';
          else if (MediaRecorder.isTypeSupported('audio/ogg')) mimeType = 'audio/ogg';
        }

        mediaRecorder = new MediaRecorder(stream, { mimeType });
        audioChunks = [];
        mediaRecorder.ondataavailable = e => {
          if (e.data && e.data.size > 0) audioChunks.push(e.data);
        };
        // Emite pedaços a cada 100ms para garantir que áudios curtos ou longos tenham dados imediatamente
        mediaRecorder.start(100);
      } catch (err) {
        console.warn('Microfone não acessível ou permissão negada:', err);
        mediaRecorder = null;
      }
    } else {
      mediaRecorder = null;
    }
  }
  window.iniciarGravacaoVoz = iniciarGravacaoVoz;

  function cancelarGravacaoVoz() {
    gravandoAudio = false;
    if (gravacaoTimer) {
      clearInterval(gravacaoTimer);
      gravacaoTimer = null;
    }

    if (activeSpeechRecognition) {
      try { activeSpeechRecognition.stop(); } catch {}
      activeSpeechRecognition = null;
    }

    if (mediaRecorder) {
      try { mediaRecorder.stop(); } catch {}
      mediaRecorder = null;
    }

    if (mediaStreamAtual) {
      try { mediaStreamAtual.getTracks().forEach(t => t.stop()); } catch {}
      mediaStreamAtual = null;
    }

    const inputPill = document.querySelector('#chatInputWrap');
    const recordBar = document.querySelector('#chatRecordingBar');

    if (recordBar) {
      recordBar.hidden = true;
      recordBar.style.setProperty('display', 'none', 'important');
    }
    if (inputPill) {
      inputPill.hidden = false;
      inputPill.style.removeProperty('display');
    }

    atualizarBotaoEnvioOuMic();
  }
  window.cancelarGravacaoVoz = cancelarGravacaoVoz;

  function pararGravacaoVoz(enviar = true) {
    if (!gravandoAudio) return;
    gravandoAudio = false;
    if (gravacaoTimer) {
      clearInterval(gravacaoTimer);
      gravacaoTimer = null;
    }

    if (activeSpeechRecognition) {
      try { activeSpeechRecognition.stop(); } catch {}
      activeSpeechRecognition = null;
    }

    const inputPill = document.querySelector('#chatInputWrap');
    const recordBar = document.querySelector('#chatRecordingBar');

    if (recordBar) {
      recordBar.hidden = true;
      recordBar.style.setProperty('display', 'none', 'important');
    }
    if (inputPill) {
      inputPill.hidden = false;
      inputPill.style.removeProperty('display');
    }

    atualizarBotaoEnvioOuMic();

    if (!enviar) {
      cancelarGravacaoVoz();
      return;
    }

    const agora = new Date();
    const horaFormatada = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const duracaoReal = Math.max(1, Math.round((Date.now() - tempoInicioGravacao) / 1000) || gravacaoSegundos || 2);
    const m = Math.floor(duracaoReal / 60);
    const s = duracaoReal % 60;
    const durStr = `${m}:${s < 10 ? '0' : ''}${s}`;

    // Processa os dados gravados reais do microfone
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.onstop = () => {
        if (mediaStreamAtual) {
          try { mediaStreamAtual.getTracks().forEach(t => t.stop()); } catch {}
          mediaStreamAtual = null;
        }

        const mime = mediaRecorder.mimeType || 'audio/webm';
        if (audioChunks.length > 0) {
          const audioBlob = new Blob(audioChunks, { type: mime });
          const reader = new FileReader();
          reader.onloadend = () => {
            const transcricao = transcricaoGravadaTemp || 'Mensagem de voz em português';
            salvarEEnviarAudio(reader.result, durStr, horaFormatada, transcricao);
          };
          reader.readAsDataURL(audioBlob);
        } else {
          const transcricao = transcricaoGravadaTemp || 'Mensagem de voz em português';
          salvarEEnviarAudio('', durStr, horaFormatada, transcricao);
        }
      };
      try { mediaRecorder.stop(); } catch {}
    } else {
      if (mediaStreamAtual) {
        try { mediaStreamAtual.getTracks().forEach(t => t.stop()); } catch {}
        mediaStreamAtual = null;
      }
      const transcricao = transcricaoGravadaTemp || 'Mensagem de voz em português';
      salvarEEnviarAudio('', durStr, horaFormatada, transcricao);
    }
  }
  window.pararGravacaoVoz = pararGravacaoVoz;

  function salvarEEnviarAudio(base64Audio, durStr, horaFormatada, textoTranscricao = '') {
    const textoMsg = textoTranscricao || 'Mensagem de voz gravada pelo usuário';

    if (chatAbaAtiva === 'ia') {
      const novaMsgIa = {
        id: 'ia-audio-' + Date.now(),
        remetente: 'user',
        autorNome: 'Você',
        tipo: 'audio',
        audioData: base64Audio,
        duracao: durStr,
        conteudo: textoMsg,
        hora: horaFormatada
      };
      mensagensIa.push(novaMsgIa);
      localStorage.setItem(IA_CHAT_STORAGE_KEY, JSON.stringify(mensagensIa));
      renderizarMensagensIa();
      gerarRespostaIaPrado(textoMsg);
      return;
    } else if (chatAbaAtiva === 'grupos' && grupoAtivoId) {
      const grupo = gruposSetores.find(g => g.id === grupoAtivoId);
      if (grupo) {
        const msgGrupo = {
          id: 'grp-audio-' + Date.now(),
          autorNome: 'Você',
          autorCargo: 'Operador',
          autorAvatar: 'EU',
          corAvatar: '#008069',
          isMine: true,
          tipo: 'audio',
          audioData: base64Audio,
          duracao: durStr,
          conteudo: textoMsg,
          hora: horaFormatada,
          status: 'sent'
        };
        grupo.mensagens.push(msgGrupo);
        salvarGrupos();
        renderizarPainelGrupos();
        simularRespostaGrupo(grupoAtivoId, 'audio', textoMsg);
        return;
      }
    }

    const novaMsg = {
      id: 'audio-' + Date.now(),
      autorNome: 'Você',
      autorCargo: 'Operador',
      autorAvatar: 'EU',
      isMine: true,
      tipo: 'audio',
      audioData: base64Audio,
      duracao: durStr,
      conteudo: textoMsg,
      hora: horaFormatada,
      status: 'sent'
    };

    mensagensEquipe.push(novaMsg);
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(mensagensEquipe));
    renderizarMensagensEquipe();

    if (broadcastChannel) {
      broadcastChannel.postMessage({ type: 'NOVA_MENSAGEM', mensagem: novaMsg });
    }

    simularRespostaMichel('audio', textoMsg);
  }

  // ---------- SELETOR DE EMOJIS RÁPIDOS ----------
  function toggleSeletorEmojis() {
    const pop = document.querySelector('#pradoEmojiPopover');
    if (pop) pop.hidden = !pop.hidden;
  }
  window.toggleSeletorEmojis = toggleSeletorEmojis;

  function inserirEmoji(emoji) {
    const input = document.querySelector('#chatMsgInput');
    if (input) {
      input.value += emoji;
      input.focus();
      atualizarBotaoEnvioOuMic();
    }
    const pop = document.querySelector('#pradoEmojiPopover');
    if (pop) pop.hidden = true;
  }
  window.inserirEmoji = inserirEmoji;

  // ---------- MOTOR DE RESPOSTAS DO COPILOTO IA ----------
  function gerarRespostaIaPrado(pergunta) {
    const resposta = gerarRespostaInteligentePrado(pergunta, 'ia', 'texto');

    setTimeout(() => {
      const horaResposta = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      mensagensIa.push({
        id: 'ia-resp-' + Date.now(),
        remetente: 'ia',
        autorNome: 'Assistente Prado IA',
        autorAvatar: '🤖',
        conteudo: resposta,
        hora: horaResposta
      });
      localStorage.setItem(IA_CHAT_STORAGE_KEY, JSON.stringify(mensagensIa));
      renderizarMensagensIa();
      tocarSomWhatsApp();
    }, 600);
  }

  // Escuta remota
  if (broadcastChannel) {
    broadcastChannel.onmessage = e => {
      if (e.data && e.data.type === 'NOVA_MENSAGEM') {
        const msg = e.data.mensagem;
        mensagensEquipe.push(msg);
        localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(mensagensEquipe));
        if (chatAbaAtiva === 'equipe') renderizarMensagensEquipe();
      }
    };
  }

  // ---------- INJEÇÃO DO HTML WHATSAPP FIDEDIGNO ----------
  function injetarComponentesChatNoHtml() {
    // 1. Painel de Notificações
    if (!document.querySelector('#pradoPainelNotificacoes')) {
      const painelNotif = document.createElement('div');
      painelNotif.id = 'pradoPainelNotificacoes';
      painelNotif.className = 'prado-notif-panel';
      painelNotif.hidden = true;
      painelNotif.innerHTML = `
        <div class="prado-notif-header">
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:16px">🔔</span>
            <b style="font-size:14px">Notificações</b>
          </div>
          <button type="button" class="prado-notif-mark-read" onclick="window.marcarTodasNotificacoesComoLidas()">
            Marcar lidas
          </button>
        </div>
        <div class="prado-notif-list" id="notifListaConteudo"></div>
        <div style="padding:10px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center">
          <button type="button" style="background:#008069;color:#fff;border:none;padding:6px 14px;border-radius:20px;font-size:12px;font-weight:700;cursor:pointer" onclick="window.togglePainelNotificacoes(true);window.abrirChatFlutuante('equipe')">
            💬 Abrir WhatsApp Corporativo
          </button>
        </div>
      `;
      document.body.appendChild(painelNotif);
    }

    // 2. Balão Toast (quando chat fechado com botão de fechar e dispensar bem visíveis)
    if (!document.querySelector('#pradoChatToastNotification')) {
      const toastBalao = document.createElement('div');
      toastBalao.id = 'pradoChatToastNotification';
      toastBalao.className = 'prado-wa-toast';
      toastBalao.style.display = 'none';
      toastBalao.innerHTML = `
        <div class="prado-wa-toast-avatar" id="pradoBalaoAvatar" onclick="window.abrirChatFlutuante('equipe')" title="Abrir conversa">MP</div>
        <div class="prado-wa-toast-body" onclick="window.abrirChatFlutuante('equipe')">
          <div class="prado-wa-toast-header">
            <b id="pradoBalaoAutor">Michel do Prado</b>
            <span class="prado-wa-toast-badge">WhatsApp</span>
          </div>
          <p id="pradoBalaoTexto" class="prado-wa-toast-text">Olá! Como posso ajudar? 😊</p>
          <div class="prado-wa-toast-actions">
            <button type="button" class="prado-wa-toast-btn-action" onclick="event.stopPropagation();window.abrirChatFlutuante('equipe')" title="Abrir conversa">
              💬 Abrir conversa
            </button>
            <button type="button" class="prado-wa-toast-btn-dismiss" id="btnDismissToastAviso" onclick="event.stopPropagation();window.fecharBalaoToast()" title="Fechar aviso e sair da tela">
              ✕ Fechar aviso
            </button>
          </div>
        </div>
        <button type="button" class="prado-wa-toast-close" id="btnFecharToastX" onclick="event.stopPropagation();window.fecharBalaoToast()" title="Fechar e dispensar aviso (sair da tela)">✕</button>
      `;
      document.body.appendChild(toastBalao);

      const btnCloseT = toastBalao.querySelector('#btnFecharToastX');
      if (btnCloseT) btnCloseT.addEventListener('click', (e) => { e.stopPropagation(); fecharBalaoToast(); });
      const btnDismT = toastBalao.querySelector('#btnDismissToastAviso');
      if (btnDismT) btnDismT.addEventListener('click', (e) => { e.stopPropagation(); fecharBalaoToast(); });
    }

    // 3. Botão Flutuante Verde Oficial WhatsApp
    if (!document.querySelector('#pradoChatFloatingBtn')) {
      const floatBtn = document.createElement('div');
      floatBtn.id = 'pradoChatFloatingBtn';
      floatBtn.className = 'prado-wa-float-btn';
      floatBtn.title = 'Toque para abrir conversa';
      floatBtn.onclick = (e) => {
        if (e) e.stopPropagation();
        if (chatAberto) {
          fecharChatFlutuante(); // Recolhe para a bolinha
        } else {
          abrirChatFlutuante('equipe'); // Abre saindo da bolinha
        }
      };
      floatBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
          <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 15 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67M9.53 7.33C9.34 7.33 9.04 7.4 8.79 7.67C8.54 7.94 7.85 8.58 7.85 9.89C7.85 11.2 8.81 12.46 8.94 12.63C9.07 12.8 10.8 15.45 13.44 16.59C14.07 16.86 14.56 17.02 14.94 17.14C15.58 17.34 16.16 17.31 16.62 17.24C17.14 17.16 18.21 16.59 18.44 15.96C18.66 15.33 18.66 14.78 18.6 14.67C18.53 14.56 18.35 14.5 18.07 14.36C17.79 14.22 16.44 13.56 16.19 13.47C15.94 13.38 15.76 13.33 15.57 13.61C15.39 13.88 14.86 14.5 14.7 14.69C14.54 14.88 14.38 14.9 14.1 14.76C13.82 14.62 12.93 14.33 11.87 13.39C11.04 12.65 10.49 11.74 10.33 11.46C10.17 11.18 10.31 11.04 10.45 10.9C10.58 10.77 10.73 10.57 10.88 10.41C11.02 10.25 11.07 10.13 11.16 9.95C11.25 9.77 11.21 9.61 11.14 9.47C11.07 9.33 10.51 7.96 10.28 7.41C10.05 6.87 9.83 6.94 9.66 6.94C9.51 6.94 9.34 6.94 9.53 7.33Z"/>
        </svg>
        <span class="prado-wa-float-badge" id="floatUnreadBadge">2</span>
      `;
      document.body.appendChild(floatBtn);
    }

    // 4. Janela Completa WhatsApp
    if (!document.querySelector('#pradoChatWindow')) {
      const chatWin = document.createElement('div');
      chatWin.id = 'pradoChatWindow';
      chatWin.className = 'prado-wa-window';
      chatWin.hidden = true;
      chatWin.style.display = 'none';
      chatWin.innerHTML = `
        <!-- Handles de Redimensionamento Pelas Bordas (Aumentar / Diminuir Tamanho do Chat) -->
        <div class="prado-wa-resizer resizer-t" data-direction="t" title="Arraste para ajustar a altura"></div>
        <div class="prado-wa-resizer resizer-l" data-direction="l" title="Arraste para ajustar a largura"></div>
        <div class="prado-wa-resizer resizer-tl" data-direction="tl" title="Arraste este canto para aumentar ou diminuir livremente"></div>
        <div class="prado-wa-resizer resizer-r" data-direction="r"></div>
        <div class="prado-wa-resizer resizer-b" data-direction="b"></div>

        <!-- Topo Verde WhatsApp com Voltar, MP, Michel do Prado, online, Alternar Voz, Maximizar, Minimizar e Fechar -->
        <div class="prado-wa-header">
          <div class="prado-wa-header-left">
            <button type="button" class="prado-wa-back-btn" id="btnVoltarMinimizar" onclick="event.stopPropagation();window.fecharChatFlutuante()" title="Minimizar para a bolinha">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            </button>
            <div class="prado-wa-header-avatar" id="pradoWaHeaderAvatar">
              MP
            </div>
            <div class="prado-wa-header-info">
              <span class="prado-wa-header-name" id="pradoWaHeaderTitle">Michel do Prado</span>
              <span class="prado-wa-header-sub" id="pradoWaHeaderStatus">online</span>
            </div>
          </div>
          <div class="prado-wa-header-actions">
            <!-- Bonecos Menina (Mulher) e Menino (Homem) Lado a Lado -->
            <div class="prado-wa-voice-duo" title="Escolha a voz: 👩 Menina (Mulher) ou 👨 Menino (Homem)">
              <button type="button" class="prado-wa-voice-btn fem ${generoVozAtual === 'feminina' ? 'active' : ''}" id="btnVozMenina" onclick="event.stopPropagation();window.definirGeneroVoz('feminina', true)" title="Ouvir Voz de Menina / Mulher (Feminina)">
                👩
              </button>
              <button type="button" class="prado-wa-voice-btn masc ${generoVozAtual === 'masculina' ? 'active' : ''}" id="btnVozMenino" onclick="event.stopPropagation();window.definirGeneroVoz('masculina', true)" title="Ouvir Voz de Menino / Homem (Masculina)">
                👨
              </button>
            </div>
            <!-- Botão Ícone de Estúdio para Gravar a Voz do Usuário -->
            <button type="button" class="prado-wa-head-icon" id="btnEstudioVozHeader" onclick="event.stopPropagation();window.abrirEstudioVoz()" title="🎙️ Gravar sua própria voz real para o Michel">
              🎙️
            </button>
            <button type="button" class="prado-wa-head-icon" id="btnMaximizarChat" onclick="event.stopPropagation();window.alternarMaximizarChat()" title="Expandir/Restaurar tamanho do chat">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>
            </button>
            <button type="button" class="prado-wa-head-icon" id="btnMinimizarChat" onclick="event.stopPropagation();window.fecharChatFlutuante()" title="Minimizar conversa para a bolinha">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="4" y1="12" x2="20" y2="12"></line></svg>
            </button>
            <button type="button" class="prado-wa-head-icon close-x" id="btnFecharChatX" onclick="event.stopPropagation();window.fecharChatFlutuante()" title="Fechar conversa">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        </div>

        <!-- Abas do WhatsApp -->
        <div class="prado-wa-tabs">
          <button type="button" class="prado-wa-tab active" data-tab="equipe" onclick="window.alternarAbaChat('equipe')">
            Conversa
          </button>
          <button type="button" class="prado-wa-tab" data-tab="grupos" onclick="window.alternarAbaChat('grupos')">
            Grupos
          </button>
          <button type="button" class="prado-wa-tab" data-tab="ia" onclick="window.alternarAbaChat('ia')">
            Copiloto IA
          </button>
          <button type="button" class="prado-wa-tab" data-tab="online" onclick="window.alternarAbaChat('online')">
            Online (2)
          </button>
        </div>

        <!-- Área de Conversa com Fundo Bege Doodle WhatsApp -->
        <div class="prado-wa-body">
          <div class="prado-wa-pane" id="chatPaneEquipe" style="display:flex;">
            <div class="prado-wa-messages" id="chatMessagesEquipe"></div>
          </div>

          <div class="prado-wa-pane" id="chatPaneGrupos" style="display:none !important;" hidden>
            <div id="chatGruposContainer"></div>
          </div>

          <div class="prado-wa-pane" id="chatPaneIa" style="display:none !important;" hidden>
            <div class="prado-wa-voice-selector-bar">
              <span class="label">🗣️ Timbre Humano:</span>
              <button type="button" class="btn-voice-opt ${generoVozAtual === 'feminina' ? 'active' : ''}" data-gender="feminina" onclick="window.definirGeneroVoz('feminina', true)">
                👩 Voz Feminina (Natural)
              </button>
              <button type="button" class="btn-voice-opt ${generoVozAtual === 'masculina' ? 'active' : ''}" data-gender="masculina" onclick="window.definirGeneroVoz('masculina', true)">
                👨 Voz Masculina (Natural)
              </button>
            </div>
            <div class="prado-wa-messages" id="chatMessagesIa"></div>
          </div>

          <div class="prado-wa-pane" id="chatPaneOnline" style="display:none !important;" hidden>
            <div id="chatOnlineListWrap"></div>
          </div>
        </div>

        <!-- Popover de Emojis em Grade Ampla -->
        <div class="prado-wa-emoji-popover" id="pradoEmojiPopover" hidden>
          <div class="prado-wa-emoji-grid">
            <button type="button" onclick="window.inserirEmoji('😀')">😀</button>
            <button type="button" onclick="window.inserirEmoji('😊')">😊</button>
            <button type="button" onclick="window.inserirEmoji('😎')">😎</button>
            <button type="button" onclick="window.inserirEmoji('👍')">👍</button>
            <button type="button" onclick="window.inserirEmoji('🤝')">🤝</button>
            <button type="button" onclick="window.inserirEmoji('🚀')">🚀</button>
            <button type="button" onclick="window.inserirEmoji('🙌')">🙌</button>
            <button type="button" onclick="window.inserirEmoji('🔥')">🔥</button>
            <button type="button" onclick="window.inserirEmoji('✨')">✨</button>
            <button type="button" onclick="window.inserirEmoji('🎯')">🎯</button>
            <button type="button" onclick="window.inserirEmoji('🏆')">🏆</button>
            <button type="button" onclick="window.inserirEmoji('💼')">💼</button>
            <button type="button" onclick="window.inserirEmoji('💰')">💰</button>
            <button type="button" onclick="window.inserirEmoji('📦')">📦</button>
            <button type="button" onclick="window.inserirEmoji('📄')">📄</button>
            <button type="button" onclick="window.inserirEmoji('💪')">💪</button>
            <button type="button" onclick="window.inserirEmoji('☀️')">☀️</button>
            <button type="button" onclick="window.inserirEmoji('🙏')">🙏</button>
          </div>
        </div>

        <!-- Rodapé de Digitação WhatsApp Fidedigno -->
        <div class="prado-wa-footer" id="pradoChatFooterBar">
          <!-- 1. Pílula Branca de Digitação (SOMENTE o campo e emoji, sem botão duplicado) -->
          <div class="prado-wa-input-pill" id="chatInputWrap">
            <button type="button" class="prado-wa-btn-emoji" onclick="window.toggleSeletorEmojis()" title="Inserir Emoji">
              😀
            </button>
            <input type="text" id="chatMsgInput" class="prado-wa-input" placeholder="Mensagem..." autocomplete="off" oninput="window.atualizarBotaoEnvioOuMic()" onkeydown="if(event.key==='Enter')window.enviarMensagemAtual()">
          </div>

          <!-- 2. Barra de Gravação de Áudio WhatsApp (Oculta por padrão com display:none !important) -->
          <div class="prado-wa-recording-pill" id="chatRecordingBar" style="display:none !important" hidden>
            <div class="prado-wa-rec-indicator">
              <span class="prado-wa-rec-dot"></span>
              <span class="prado-wa-rec-label">Gravando:</span>
              <strong class="prado-wa-rec-timer" id="chatRecordTimer">0:00</strong>
              <div class="prado-wa-rec-waves">
                <span></span><span></span><span></span><span></span><span></span><span></span><span></span>
              </div>
            </div>
            <div class="prado-wa-rec-controls">
              <button type="button" class="prado-wa-rec-btn-cancel" onclick="event.stopPropagation();window.cancelarGravacaoVoz()" title="Cancelar gravação">
                ✕
              </button>
              <button type="button" class="prado-wa-rec-btn-send" onclick="event.stopPropagation();window.pararGravacaoVoz(true)" title="Enviar áudio gravado">
                ➤
              </button>
            </div>
          </div>

          <!-- 3. Botão Circular Verde Separado (SOMENTE O MICROFONE igual do WhatsApp) -->
          <button type="button" class="prado-wa-action-circle" id="pradoSendMicBtn" onclick="window.acaoBotaoEnvioOuMic()" title="Gravar mensagem de voz">
            <span id="pradoSendMicIcon">🎙️</span>
          </button>
        </div>
      `;
      document.body.appendChild(chatWin);

      // Event listeners diretos para garantir minimização instantânea
      const btnMin = chatWin.querySelector('#btnMinimizarChat');
      if (btnMin) btnMin.addEventListener('click', (e) => {
        e.stopPropagation();
        fecharChatFlutuante();
      });

      const btnCloseX = chatWin.querySelector('#btnFecharChatX');
      if (btnCloseX) btnCloseX.addEventListener('click', (e) => {
        e.stopPropagation();
        fecharChatFlutuante();
      });

      const btnVoltar = chatWin.querySelector('#btnVoltarMinimizar');
      if (btnVoltar) btnVoltar.addEventListener('click', (e) => {
        e.stopPropagation();
        fecharChatFlutuante();
      });
    }

    // 5. Modal do Estúdio de Gravação de Voz do Michel
    if (!document.querySelector('#pradoEstudioVozModal')) {
      const modalEstudio = document.createElement('div');
      modalEstudio.id = 'pradoEstudioVozModal';
      modalEstudio.className = 'prado-voice-modal-backdrop';
      modalEstudio.style.display = 'none';
      modalEstudio.hidden = true;
      modalEstudio.innerHTML = `
        <div class="prado-voice-modal-card">
          <div class="prado-voice-modal-header">
            <h3>🎙️ Estúdio de Voz Real do Michel</h3>
            <button type="button" class="prado-voice-modal-close" onclick="window.fecharEstudioVoz()" title="Fechar estúdio">✕</button>
          </div>
          <div class="prado-voice-modal-body">
            <div class="prado-voice-card-frase">
              <small>Fale esta frase no microfone com seu tom natural e grave:</small>
              <p id="pradoFraseParaLer">"Recebi seu áudio perfeitamente! Já estou alinhando tudo aqui com o Cliente Institucional e a fábrica. Tudo 100%!"</p>
            </div>

            <div class="prado-voice-record-box" id="pradoVoiceBox">
              <div id="pradoVoiceStatusText" style="font-size:12px;color:#64748b;font-weight:600">
                Toque no botão vermelho abaixo para começar a gravar:
              </div>
              <div class="prado-voice-timer-big" id="pradoStudioTimer">00:00</div>
              
              <div class="prado-voice-actions-row">
                <button type="button" class="prado-voice-btn-rec" id="btnStudioRec" onclick="window.iniciarGravacaoEstudio()">
                  🔴 Gravar Minha Voz
                </button>
                <button type="button" class="prado-voice-btn-stop" id="btnStudioStop" onclick="window.pararGravacaoEstudio()" style="display:none">
                  ⏹️ Parar Gravação
                </button>
                <button type="button" class="prado-voice-btn-play" id="btnStudioPlay" onclick="window.ouvirGravacaoEstudio()" style="display:none">
                  ▶️ Ouvir Como Ficou
                </button>
              </div>
            </div>

            <button type="button" class="prado-voice-btn-save" id="btnStudioSave" onclick="window.salvarVozEstudio()" style="display:none">
              ✅ Salvar e Usar Minha Voz Real no Chat
            </button>

            <div id="pradoVozSalvaStatus" style="font-size:11.5px;text-align:center;color:#047857;font-weight:700"></div>
          </div>
        </div>
      `;
      document.body.appendChild(modalEstudio);
    }

    // Configura evento de segurar microfone (Hold to Record opcional sem conflitar com o Clique)
    configurarEventoSegurarMicrofone();

    // Inicializa handles de redimensionamento pelas bordas
    inicializarRedimensionamentoJanela();
  }

  // ---------- SISTEMA DE REDIMENSIONAMENTO PELAS BORDAS E CANTOS (AUMENTAR / DIMINUIR) ----------
  let isResizingChat = false;
  let lastResizeEnded = 0;

  function inicializarRedimensionamentoJanela() {
    const win = document.querySelector('#pradoChatWindow');
    if (!win) return;

    // 1. Restaura dimensões customizadas se previamente ajustadas pelo usuário
    try {
      const salvo = localStorage.getItem('pradoChatTamanhoCustom');
      if (salvo) {
        const dim = JSON.parse(salvo);
        if (dim && dim.w && dim.h) {
          const w = Math.max(310, Math.min(dim.w, window.innerWidth - 20));
          const h = Math.max(380, Math.min(dim.h, window.innerHeight - 90));
          win.style.width = `${w}px`;
          win.style.height = `${h}px`;
        }
      }
    } catch {}

    // 2. Associa eventos a cada handle de borda (top, left, topleft, right, bottom)
    const resizers = win.querySelectorAll('.prado-wa-resizer');
    resizers.forEach(resizer => {
      const dir = resizer.getAttribute('data-direction');

      function onPointerDown(e) {
        e.preventDefault();
        e.stopPropagation();

        isResizingChat = true;

        const startX = (e.touches && e.touches[0]) ? e.touches[0].clientX : e.clientX;
        const startY = (e.touches && e.touches[0]) ? e.touches[0].clientY : e.clientY;
        const startW = win.offsetWidth;
        const startH = win.offsetHeight;

        document.body.classList.add('prado-resizing');
        win.classList.add('resizing');

        function onPointerMove(ev) {
          const curX = (ev.touches && ev.touches[0]) ? ev.touches[0].clientX : ev.clientX;
          const curY = (ev.touches && ev.touches[0]) ? ev.touches[0].clientY : ev.clientY;
          if (curX === undefined || curY === undefined) return;

          const deltaX = curX - startX;
          const deltaY = curY - startY;

          let newW = startW;
          let newH = startH;

          const minW = 310;
          const maxW = Math.min(window.innerWidth - 24, 960);
          const minH = 380;
          const maxH = Math.min(window.innerHeight - 95, 920);

          if (dir.includes('l')) {
            // Arrastar para a esquerda aumenta a largura (ancorado na direita)
            newW = Math.max(minW, Math.min(maxW, startW - deltaX));
          } else if (dir.includes('r')) {
            newW = Math.max(minW, Math.min(maxW, startW + deltaX));
          }

          if (dir.includes('t')) {
            // Arrastar para cima aumenta a altura (ancorado embaixo)
            newH = Math.max(minH, Math.min(maxH, startH - deltaY));
          } else if (dir.includes('b')) {
            newH = Math.max(minH, Math.min(maxH, startH + deltaY));
          }

          win.style.width = `${newW}px`;
          win.style.height = `${newH}px`;
        }

        function onPointerUp(ev) {
          if (ev) {
            ev.preventDefault();
            ev.stopPropagation();
          }

          isResizingChat = false;
          lastResizeEnded = Date.now();

          document.body.classList.remove('prado-resizing');
          win.classList.remove('resizing');
          document.removeEventListener('mousemove', onPointerMove);
          document.removeEventListener('mouseup', onPointerUp);
          document.removeEventListener('touchmove', onPointerMove);
          document.removeEventListener('touchend', onPointerUp);

          // Salva as dimensões customizadas
          try {
            localStorage.setItem('pradoChatTamanhoCustom', JSON.stringify({
              w: win.offsetWidth,
              h: win.offsetHeight
            }));
          } catch {}

          // Captura e destrói imediatamente qualquer clique residual disparado pelo término do arrasto
          const interceptarClickResidual = (clickEv) => {
            clickEv.preventDefault();
            clickEv.stopPropagation();
            clickEv.stopImmediatePropagation();
            window.removeEventListener('click', interceptarClickResidual, true);
          };
          window.addEventListener('click', interceptarClickResidual, true);
          setTimeout(() => {
            window.removeEventListener('click', interceptarClickResidual, true);
          }, 450);
        }

        document.addEventListener('mousemove', onPointerMove, { passive: false });
        document.addEventListener('mouseup', onPointerUp);
        document.addEventListener('touchmove', onPointerMove, { passive: false });
        document.addEventListener('touchend', onPointerUp);
      }

      resizer.addEventListener('mousedown', onPointerDown);
      resizer.addEventListener('touchstart', onPointerDown, { passive: false });
    });
  }

  window.alternarMaximizarChat = function() {
    const win = document.querySelector('#pradoChatWindow');
    if (!win) return;

    if (win.classList.contains('maximized')) {
      win.classList.remove('maximized');
      win.style.width = '360px';
      win.style.height = '520px';
      try {
        localStorage.setItem('pradoChatTamanhoCustom', JSON.stringify({ w: 360, h: 520 }));
      } catch {}
    } else {
      win.classList.add('maximized');
      const maxW = Math.min(680, window.innerWidth - 32);
      const maxH = Math.min(740, window.innerHeight - 105);
      win.style.width = `${maxW}px`;
      win.style.height = `${maxH}px`;
      try {
        localStorage.setItem('pradoChatTamanhoCustom', JSON.stringify({ w: maxW, h: maxH }));
      } catch {}
    }
  };

  // ==========================================================================
  // ESTÚDIO DE GRAVAÇÃO DE VOZ DO MICHEL (VOZ REAL HUMANA COM TOM GRAVE)
  // ==========================================================================
  let studioRecorder = null;
  let studioStream = null;
  let studioChunks = [];
  let studioAudioBase64 = localStorage.getItem('pradoVozMichelCustom') || '';
  let studioTimerInterval = null;
  let studioSeconds = 0;
  let studioPlayer = null;

  window.abrirEstudioVoz = function() {
    const modal = document.querySelector('#pradoEstudioVozModal');
    if (!modal) return;
    modal.style.display = 'flex';
    modal.hidden = false;

    const statusTxt = document.querySelector('#pradoVozSalvaStatus');
    const btnPlay = document.querySelector('#btnStudioPlay');
    if (statusTxt) {
      statusTxt.textContent = '✅ Sua voz real já está configurada e ativa como padrão do Michel!';
    }
    if (btnPlay) {
      btnPlay.style.display = 'inline-flex';
      btnPlay.textContent = '▶️ Ouvir Minha Voz Padrão';
    }
  };

  window.fecharEstudioVoz = function() {
    const modal = document.querySelector('#pradoEstudioVozModal');
    if (modal) {
      modal.style.display = 'none';
      modal.hidden = true;
    }
    if (studioRecorder && studioRecorder.state !== 'inactive') {
      try { studioRecorder.stop(); } catch {}
    }
    if (studioStream) {
      try { studioStream.getTracks().forEach(t => t.stop()); } catch {}
      studioStream = null;
    }
    if (studioTimerInterval) {
      clearInterval(studioTimerInterval);
      studioTimerInterval = null;
    }
    if (studioPlayer) {
      studioPlayer.pause();
      studioPlayer = null;
    }
  };

  window.iniciarGravacaoEstudio = async function() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('Seu navegador não suporta gravação de microfone.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      studioStream = stream;

      let mimeType = 'audio/webm';
      if (typeof MediaRecorder.isTypeSupported === 'function') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) mimeType = 'audio/webm;codecs=opus';
        else if (MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4';
      }

      studioRecorder = new MediaRecorder(stream, { mimeType });
      studioChunks = [];

      studioRecorder.ondataavailable = e => {
        if (e.data && e.data.size > 0) studioChunks.push(e.data);
      };

      const box = document.querySelector('#pradoVoiceBox');
      const timerEl = document.querySelector('#pradoStudioTimer');
      const btnRec = document.querySelector('#btnStudioRec');
      const btnStop = document.querySelector('#btnStudioStop');
      const btnPlay = document.querySelector('#btnStudioPlay');
      const btnSave = document.querySelector('#btnStudioSave');
      const statusTxt = document.querySelector('#pradoVoiceStatusText');

      if (box) box.classList.add('recording');
      if (statusTxt) statusTxt.textContent = '🎙️ Gravando agora! Fale a frase em voz alta com seu tom natural e grave...';
      if (btnRec) btnRec.style.display = 'none';
      if (btnStop) btnStop.style.display = 'inline-flex';
      if (btnPlay) btnPlay.style.display = 'none';
      if (btnSave) btnSave.style.display = 'none';

      studioSeconds = 0;
      if (timerEl) timerEl.textContent = '00:00';
      if (studioTimerInterval) clearInterval(studioTimerInterval);
      studioTimerInterval = setInterval(() => {
        studioSeconds++;
        const m = Math.floor(studioSeconds / 60);
        const s = studioSeconds % 60;
        if (timerEl) timerEl.textContent = `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
      }, 1000);

      studioRecorder.start(100);
    } catch (err) {
      console.error(err);
      alert('Permissão de microfone negada ou erro ao iniciar gravação.');
    }
  };

  window.pararGravacaoEstudio = function() {
    if (!studioRecorder || studioRecorder.state === 'inactive') return;

    if (studioTimerInterval) {
      clearInterval(studioTimerInterval);
      studioTimerInterval = null;
    }

    const box = document.querySelector('#pradoVoiceBox');
    const btnRec = document.querySelector('#btnStudioRec');
    const btnStop = document.querySelector('#btnStudioStop');
    const btnPlay = document.querySelector('#btnStudioPlay');
    const btnSave = document.querySelector('#btnStudioSave');
    const statusTxt = document.querySelector('#pradoVoiceStatusText');

    if (box) box.classList.remove('recording');
    if (statusTxt) statusTxt.textContent = '✅ Gravação concluída! Clique em "Ouvir Como Ficou" para escutar seu áudio:';
    if (btnStop) btnStop.style.display = 'none';
    if (btnRec) {
      btnRec.style.display = 'inline-flex';
      btnRec.textContent = '🔄 Gravar Novamente';
    }

    studioRecorder.onstop = () => {
      if (studioStream) {
        try { studioStream.getTracks().forEach(t => t.stop()); } catch {}
        studioStream = null;
      }

      const mime = studioRecorder.mimeType || 'audio/webm';
      const blob = new Blob(studioChunks, { type: mime });
      const reader = new FileReader();
      reader.onloadend = () => {
        studioAudioBase64 = reader.result;
        if (btnPlay) {
          btnPlay.style.display = 'inline-flex';
          btnPlay.textContent = '▶️ Ouvir Como Ficou';
        }
        if (btnSave) btnSave.style.display = 'block';
      };
      reader.readAsDataURL(blob);
    };

    try { studioRecorder.stop(); } catch {}
  };

  window.ouvirGravacaoEstudio = function() {
    const audioSrc = studioAudioBase64 || localStorage.getItem('pradoVozMichelCustom') || 'voz-michel-padrao.mp3';
    if (studioPlayer) {
      studioPlayer.pause();
      studioPlayer = null;
    }
    studioPlayer = new Audio(audioSrc);
    const btnPlay = document.querySelector('#btnStudioPlay');
    if (btnPlay) btnPlay.textContent = '⏸️ Tocando seu áudio...';
    studioPlayer.onended = () => {
      if (btnPlay) btnPlay.textContent = '▶️ Ouvir Minha Voz Padrão';
    };
    studioPlayer.onerror = () => {
      if (btnPlay) btnPlay.textContent = '▶️ Ouvir Minha Voz Padrão';
    };
    studioPlayer.play();
  };

  window.salvarVozEstudio = async function() {
    if (!studioAudioBase64) return;
    try {
      localStorage.setItem('pradoVozMichelCustom', studioAudioBase64);
    } catch (e) {
      console.warn('LocalStorage com limite excedido, persistindo no IndexedDB:', e);
    }
    await salvarAudioNoIndexedDB('pradoVozMichelCustom', studioAudioBase64);
    definirGeneroVoz('masculina', false);

    const statusTxt = document.querySelector('#pradoVozSalvaStatus');
    if (statusTxt) {
      statusTxt.textContent = '🎉 Perfeito! Sua voz real foi salva permanentemente como a voz padrão do Michel e do sistema!';
    }

    if (typeof window.toast === 'function') {
      window.toast('Voz real do Michel salva com sucesso!');
    }

    setTimeout(() => {
      fecharEstudioVoz();
    }, 2000);
  };

  function configurarEventoSegurarMicrofone() {
    const btn = document.querySelector('#pradoSendMicBtn');
    if (!btn) return;

    let holdTimer = null;
    let holdAtivo = false;

    function handleStart(e) {
      const inp = document.querySelector('#chatMsgInput');
      // Se houver texto digitado, o clique é para envio de texto
      if (inp && inp.value.trim().length > 0) return;
      if (gravandoAudio) return;

      holdAtivo = false;
      holdTimer = setTimeout(() => {
        holdAtivo = true;
        iniciarGravacaoVoz();
      }, 400); // Se segurar mais de 400ms, entra no modo hold
    }

    function handleEnd(e) {
      if (holdTimer) {
        clearTimeout(holdTimer);
        holdTimer = null;
      }

      // Se estava segurando por mais de 400ms e soltou, envia na hora
      if (holdAtivo && gravandoAudio) {
        holdAtivo = false;
        pararGravacaoVoz(true);
      }
    }

    btn.addEventListener('mousedown', handleStart);
    btn.addEventListener('mouseup', handleEnd);
    btn.addEventListener('mouseleave', () => {
      if (holdTimer) {
        clearTimeout(holdTimer);
        holdTimer = null;
      }
      if (holdAtivo && gravandoAudio) {
        holdAtivo = false;
        pararGravacaoVoz(true);
      }
    });

    btn.addEventListener('touchstart', handleStart, { passive: true });
    btn.addEventListener('touchend', handleEnd, { passive: true });
  }

  // Fechamentos ao clicar fora e controle de eventos de tela
  document.addEventListener('click', e => {
    // 1. Se estiver redimensionando ou acabou de soltar o mouse, ignora qualquer ação
    if (isResizingChat || (Date.now() - lastResizeEnded < 450)) {
      return;
    }

    // Nota: O chat flutuante do WhatsApp NÃO fecha automaticamente ao clicar na página/tabelas,
    // pois o usuário do CRM Prado precisa consultar tabelas e dados simultaneamente ao chat.
    // O fechamento/minimização é feito de forma segura e explícita pelos botões dedicados:
    // "-", "✕", "←" ou clicando na bolinha verde flutuante.

    // 2. Fecha painel de notificações ao clicar fora
    const painel = document.querySelector('#pradoPainelNotificacoes');
    const btnSino = document.querySelector('#btnNotificacoes') || document.querySelector('.head-actions .icon');
    if (painel && !painel.hidden && !painel.contains(e.target) && !btnSino?.contains(e.target)) {
      togglePainelNotificacoes(true);
    }

    // 3. Fecha popover de emojis ao clicar fora
    const pop = document.querySelector('#pradoEmojiPopover');
    const btnEmoji = document.querySelector('.prado-wa-btn-emoji');
    if (pop && !pop.hidden && !pop.contains(e.target) && !btnEmoji?.contains(e.target)) {
      pop.hidden = true;
    }
  });

  // Fecha chat flutuante ou modais ao pressionar a tecla ESC
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      const modalEstudio = document.querySelector('#pradoEstudioVozModal');
      if (modalEstudio && modalEstudio.style.display !== 'none' && !modalEstudio.hidden) {
        fecharEstudioVoz();
        return;
      }
      const pop = document.querySelector('#pradoEmojiPopover');
      if (pop && !pop.hidden) {
        pop.hidden = true;
        return;
      }
      if (chatAberto) {
        fecharChatFlutuante();
      }
    }
  });

  // Inicialização
  function init() {
    injetarComponentesChatNoHtml();
    alternarAbaChat('equipe');
    atualizarBadgeNotificacoes();

    // Carrega a voz real salva no IndexedDB caso exista
    carregarAudioDoIndexedDB('pradoVozMichelCustom').then(audio => {
      if (audio) {
        studioAudioBase64 = audio;
      }
    });

    const btnSino = document.querySelector('.head-actions .icon');
    if (btnSino) {
      btnSino.id = 'btnNotificacoes';
      btnSino.onclick = () => togglePainelNotificacoes();
      const dot = btnSino.querySelector('i');
      if (dot) dot.id = 'notifBadge';
      atualizarBadgeNotificacoes();
    }

    // Dispara o balão toast inicial se não foi previamente dispensado
    setTimeout(() => {
      try {
        if (!chatAberto && !localStorage.getItem('pradoToastInicialDispensado')) {
          dispararBalaoToast({
            autorNome: 'Michel do Prado',
            autorAvatar: 'MP',
            conteudo: 'Olá! Como posso ajudar hoje com as propostas e cotações? 😊'
          });
        }
      } catch {}
    }, 1200);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
