// app.js - PORTAL QSSMA (VERSÃO BASE LIMPA)
import { 
  db,
  auth,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp
} from './firebase.js';

// Estado global
let estadoApp = {
  usuario: null,
  gestor: null,
  perfil: null,
  isOnline: navigator.onLine,
  unsubscribeAvisos: null,
  avisosAtivos: [],
  incidentesAtivos: [],
  emergenciasAtivas: []
};

// ========== INICIALIZAÇÃO ==========
document.addEventListener('DOMContentLoaded', () => {
  console.log('🛡️ Portal QSSMA - Inicializando...');
  
  // Adicionar rodapé em todas as páginas
  adicionarRodape();
  
  // Verificar sessão existente
  verificarSessao();
  
  // Inicializar funcionalidades
  initDarkMode();
  initPWA();
  initEventListeners();
  initConnectionMonitor();
  iniciarMonitoramentoAvisos();
  
  console.log('✅ Portal QSSMA inicializado com sucesso');
});

// ========== ADICIONAR RODAPÉ ==========
function adicionarRodape() {
  const footer = document.createElement('footer');
  footer.className = 'footer-dev';
  footer.innerHTML = `
    <div class="footer-content">
      <span>Portal QSSMA - Segurança do Trabalho</span>
      <div class="footer-contacts">
        <span><i class="fas fa-phone"></i> Suporte: (XX) XXXX-XXXX</span>
        <span><i class="fas fa-envelope"></i> qssma@empresa.com</span>
      </div>
    </div>
  `;
  document.body.appendChild(footer);
}

// ========== GERENCIAMENTO DE SESSÃO ==========
function verificarSessao() {
  const perfil = localStorage.getItem('perfil_ativo');
  const matricula = localStorage.getItem('usuario_matricula');
  const nome = localStorage.getItem('usuario_nome');
  const gestorLogado = localStorage.getItem('gestor_logado');
  
  if (perfil === 'usuario' && matricula && nome) {
    estadoApp.usuario = { matricula, nome };
    estadoApp.perfil = 'usuario';
    mostrarTela('tela-usuario');
    updateUserStatus(nome, matricula);
    iniciarMonitoramentoAvisos();
    
  } else if (perfil === 'gestor' && gestorLogado) {
    estadoApp.perfil = 'gestor';
    estadoApp.gestor = { 
      nome: 'Gestor QSSMA',
      email: localStorage.getItem('gestor_email')
    };
    mostrarTela('tela-gestor-dashboard');
    iniciarMonitoramentoGestor();
  }
}

function updateUserStatus(nome, matricula) {
  const userStatus = document.getElementById('userStatus');
  const userName = document.getElementById('userName');
  const usuarioNome = document.getElementById('usuarioNome');
  const usuarioMatricula = document.getElementById('usuarioMatricula');
  
  if (userStatus) userStatus.style.display = 'flex';
  if (userName) userName.textContent = nome;
  if (usuarioNome) usuarioNome.textContent = nome;
  if (usuarioMatricula) usuarioMatricula.textContent = matricula;
}

// ========== SELEÇÃO DE PERFIL ==========
window.entrarNoPortal = function () {
  mostrarTela('telaEscolhaPerfil');
};

window.selecionarPerfil = function (perfil) {
  console.log('👤 Perfil selecionado:', perfil);
  estadoApp.perfil = perfil;
  localStorage.setItem('perfil_ativo', perfil);

  if (perfil === 'usuario') {
    mostrarTela('tela-usuario-login');
  } else if (perfil === 'gestor') {
    mostrarTela('tela-gestor-login');
  }
};

// ========== LOGIN USUÁRIO ==========
window.confirmarMatriculaUsuario = async function () {
  showLoading('🔍 Validando matrícula...');
  
  const input = document.getElementById('matriculaUsuario');
  const loginBtn = document.getElementById('loginBtn');
  
  if (!input) {
    alert('Campo de matrícula não encontrado');
    hideLoading();
    return;
  }

  const matricula = input.value.trim().toUpperCase();

  if (!matricula) {
    alert('Informe sua matrícula');
    input.focus();
    hideLoading();
    return;
  }

  try {
    loginBtn.disabled = true;
    loginBtn.textContent = 'Validando...';
    
    // Simulação de validação - Substituir por validação real
    const usuarioValido = await validarUsuarioSimulado(matricula);

    if (!usuarioValido) {
      alert('❌ Matrícula não encontrada ou usuário inativo');
      input.focus();
      return;
    }

    localStorage.setItem('usuario_matricula', matricula);
    localStorage.setItem('usuario_nome', 'Colaborador ' + matricula);
    localStorage.setItem('perfil_ativo', 'usuario');
    
    estadoApp.usuario = { 
      matricula, 
      nome: 'Colaborador ' + matricula
    };
    
    console.log('✅ Usuário autenticado:', estadoApp.usuario.nome);
    mostrarTela('tela-usuario');
    updateUserStatus(estadoApp.usuario.nome, matricula);
    
    alert(`✅ Login realizado!\n\n👋 ${estadoApp.usuario.nome}`);

  } catch (erro) {
    console.error('Erro na autenticação:', erro);
    alert('❌ Erro ao validar matrícula. Verifique sua conexão e tente novamente.');
  } finally {
    hideLoading();
    if (loginBtn) {
      loginBtn.disabled = false;
      loginBtn.textContent = 'Entrar';
    }
  }
};

async function validarUsuarioSimulado(matricula) {
  // Simulação de validação - Substituir por consulta real ao Firebase
  return new Promise(resolve => {
    setTimeout(() => {
      // Aceita qualquer matrícula que comece com "QSS" para demonstração
      resolve(matricula.startsWith('QSS'));
    }, 1000);
  });
}

// ========== LOGIN GESTOR ==========
window.loginGestor = async function () {
  const email = document.getElementById('gestorEmail').value;
  const senha = document.getElementById('gestorSenha').value;
  
  if (!email || !senha) {
    alert('Preencha e-mail e senha');
    return;
  }
  
  // Credenciais de demonstração
  const GESTOR_CREDENTIALS = {
    email: 'gestor@qssma.com',
    senha: 'qssma2024'
  };
  
  if (email === GESTOR_CREDENTIALS.email && senha === GESTOR_CREDENTIALS.senha) {
    localStorage.setItem('gestor_logado', 'true');
    localStorage.setItem('gestor_email', email);
    localStorage.setItem('perfil_ativo', 'gestor');
    
    estadoApp.gestor = { email, nome: 'Gestor QSSMA' };
    
    mostrarTela('tela-gestor-dashboard');
    iniciarMonitoramentoGestor();
    iniciarMonitoramentoAvisos();
    
    console.log('✅ Gestor logado com sucesso');
    
    // Simular dados para demonstração
    simularDadosDashboard();
    
  } else {
    alert('❌ Credenciais inválidas');
  }
};

// ========== LOGOUT ==========
window.logout = function () {
  if (estadoApp.unsubscribeAvisos) estadoApp.unsubscribeAvisos();
  
  estadoApp = {
    usuario: null,
    gestor: null,
    perfil: null,
    isOnline: navigator.onLine,
    unsubscribeAvisos: null,
    avisosAtivos: [],
    incidentesAtivos: [],
    emergenciasAtivas: []
  };
  
  localStorage.removeItem('perfil_ativo');
  localStorage.removeItem('usuario_matricula');
  localStorage.removeItem('usuario_nome');
  localStorage.removeItem('gestor_logado');
  localStorage.removeItem('gestor_email');
  
  const userStatus = document.getElementById('userStatus');
  if (userStatus) userStatus.style.display = 'none';
  
  mostrarTela('welcome');
  
  console.log('👋 Usuário deslogado');
};

// ========== NAVEGAÇÃO ENTRE TELAS ==========
window.mostrarTela = function(id) {
  console.log('🔄 Mostrando tela:', id);
  
  document.querySelectorAll('.tela').forEach(tela => {
    tela.classList.add('hidden');
    tela.classList.remove('ativa');
  });
  
  const alvo = document.getElementById(id);
  if (!alvo) {
    console.error('Tela não encontrada:', id);
    return;
  }
  
  alvo.classList.remove('hidden');
  alvo.classList.add('ativa');
  
  switch(id) {
    case 'tela-usuario':
      atualizarInfoUsuario();
      break;
    case 'tela-gestor-dashboard':
      atualizarDashboardGestor();
      break;
  }
  
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

function atualizarInfoUsuario() {
  if (!estadoApp.usuario) return;
  
  const nomeElement = document.getElementById('usuarioNome');
  const matriculaElement = document.getElementById('usuarioMatricula');
  
  if (nomeElement) nomeElement.textContent = estadoApp.usuario.nome;
  if (matriculaElement) matriculaElement.textContent = estadoApp.usuario.matricula;
}

// ========== FUNÇÕES DO USUÁRIO ==========
window.registrarIncidente = function() {
  alert('Funcionalidade: Registrar Incidente\n\nEm desenvolvimento...');
};

window.verificarEPIs = function() {
  alert('Funcionalidade: Checklist de EPIs\n\nEm desenvolvimento...');
};

window.consultarProcedimentos = function() {
  alert('Funcionalidade: Consultar Procedimentos\n\nEm desenvolvimento...');
};

window.abrirFeedback = function(perfil) {
  mostrarTela(`tela-feedback-${perfil}`);
};

window.enviarFeedback = async function(perfil) {
  const tipo = document.getElementById(`feedbackTipo${perfil}`)?.value;
  const mensagem = document.getElementById(`feedbackMensagem${perfil}`)?.value;
  
  if (!tipo || !mensagem) {
    alert('Preencha todos os campos');
    return;
  }
  
  if (mensagem.length < 10) {
    alert('A mensagem deve ter pelo menos 10 caracteres');
    return;
  }
  
  try {
    const dados = {
      tipo: tipo,
      mensagem: mensagem,
      status: 'pendente',
      timestamp: new Date(),
      perfil: perfil
    };
    
    if (perfil === 'usuario' && estadoApp.usuario) {
      dados.usuario = estadoApp.usuario.nome;
      dados.matricula = estadoApp.usuario.matricula;
    }
    
    // Simular envio
    console.log('📤 Feedback enviado:', dados);
    
    document.getElementById(`feedbackMensagem${perfil}`).value = '';
    
    if (perfil === 'usuario') {
      mostrarTela('tela-usuario');
    }
    
    mostrarNotificacao('✅ Feedback Enviado', 'Obrigado pelo seu feedback!');
    
  } catch (erro) {
    console.error('Erro ao enviar feedback:', erro);
    alert('❌ Erro ao enviar feedback. Tente novamente.');
  }
};

// ========== BOTÃO DE EMERGÊNCIA ==========
window.ativarEmergencia = async function() {
  if (!estadoApp.usuario && !estadoApp.gestor) {
    alert('❌ Faça login para usar esta função');
    return;
  }
  
  if (estadoApp.emergenciaAtiva) {
    estadoApp.emergenciaAtiva = false;
    document.getElementById('emergenciaBtn').textContent = '🚨 EMERGÊNCIA';
    document.getElementById('emergenciaBtn').classList.remove('emergencia-ativa');
    mostrarNotificacao('✅ Emergência Desativada', 'Situação de emergência encerrada');
    return;
  }
  
  const confirmar = confirm('🚨 ATENÇÃO!\n\nVocê está prestes a ativar uma emergência.\n\nEsta ação notificará toda a equipe de segurança.\n\nConfirma a ativação?');
  
  if (!confirmar) return;
  
  const descricao = prompt('Descreva brevemente a situação de emergência:');
  if (!descricao) return;
  
  try {
    // Simular registro da emergência
    const dadosEmergencia = {
      tipo: 'emergencia',
      descricao: descricao,
      status: 'ativa',
      timestamp: new Date()
    };
    
    if (estadoApp.usuario) {
      dadosEmergencia.usuario = estadoApp.usuario.nome;
      dadosEmergencia.matricula = estadoApp.usuario.matricula;
    }
    
    console.log('🚨 Emergência registrada:', dadosEmergencia);
    
    estadoApp.emergenciaAtiva = true;
    document.getElementById('emergenciaBtn').textContent = '✅ EMERGÊNCIA ATIVA';
    document.getElementById('emergenciaBtn').classList.add('emergencia-ativa');
    
    mostrarNotificacao('🚨 EMERGÊNCIA ATIVADA', 'A equipe de segurança foi notificada!');
    
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    }
    
  } catch (erro) {
    console.error('Erro ao registrar emergência:', erro);
    alert('❌ Erro ao ativar emergência. Tente novamente.');
  }
};

// ========== MONITORAMENTO PARA GESTOR ==========
function iniciarMonitoramentoGestor() {
  // Inicializar monitoramento
  simularDadosDashboard();
}

function simularDadosDashboard() {
  // Simular dados para demonstração
  setTimeout(() => {
    document.getElementById('incidentesCount').textContent = '3';
    document.getElementById('emergenciasCount').textContent = '1';
    document.getElementById('episConformes').textContent = '42';
    document.getElementById('usuariosAtivos').textContent = '156';
    document.getElementById('usuariosOnline').textContent = '24';
    
    // Simular lista de incidentes
    const incidentesList = document.getElementById('incidentesList');
    if (incidentesList) {
      incidentesList.innerHTML = `
        <div class="incidente-card">
          <div class="incidente-header">
            <div class="incidente-titulo">
              <span class="incidente-icon">⚠️</span>
              <strong>Queda de material</strong>
            </div>
            <span class="tempo-decorrido">2 horas atrás</span>
          </div>
          <div class="incidente-info">
            <div class="info-row">
              <span>👤 Colaborador:</span>
              <span>João Silva (QSS1234)</span>
            </div>
            <div class="info-row">
              <span>📍 Local:</span>
              <span>Área de produção - Setor B</span>
            </div>
            <div class="info-row">
              <span>📝 Descrição:</span>
              <span>Queda de caixas da prateleira superior</span>
            </div>
            <div class="info-row">
              <span>🚨 Gravidade:</span>
              <span class="gravidade-media">Média</span>
            </div>
          </div>
          <div class="incidente-actions">
            <button class="btn small success">✅ Resolver</button>
            <button class="btn small">📞 Contatar</button>
            <button class="btn small warning">📋 Ver detalhes</button>
          </div>
        </div>
      `;
    }
  }, 500);
}

// ========== GESTÃO DE AVISOS ==========
function iniciarMonitoramentoAvisos() {
  // Simular avisos
  estadoApp.avisosAtivos = [
    {
      id: '1',
      titulo: 'Treinamento de EPIs obrigatório',
      mensagem: 'Todos os colaboradores devem participar do treinamento de EPIs na próxima quarta-feira às 14h.',
      destino: 'todos',
      ativo: true,
      timestamp: new Date()
    },
    {
      id: '2',
      titulo: 'Manutenção preventiva',
      mensagem: 'A área de máquinas estará em manutenção preventiva nesta sexta-feira.',
      destino: 'todos',
      ativo: true,
      timestamp: new Date()
    }
  ];
  
  const avisosCount = document.getElementById('avisosCount');
  if (avisosCount) {
    avisosCount.textContent = estadoApp.avisosAtivos.length;
    avisosCount.style.display = estadoApp.avisosAtivos.length > 0 ? 'inline' : 'none';
  }
}

window.mostrarAvisos = function() {
  const avisos = estadoApp.avisosAtivos || [];
  
  if (avisos.length === 0) {
    alert('📭 Nenhum aviso no momento');
    return;
  }
  
  const avisosHTML = avisos.filter(aviso => aviso.ativo).map(aviso => `
    <div class="aviso-item">
      <div class="aviso-header">
        <strong>${aviso.titulo}</strong>
        <small>${aviso.timestamp ? aviso.timestamp.toLocaleDateString() : ''}</small>
      </div>
      <p>${aviso.mensagem}</p>
      <small class="aviso-destino">Para: ${aviso.destino || 'Todos'}</small>
    </div>
  `).join('');
  
  const modal = document.createElement('div');
  modal.className = 'modal-back';
  modal.innerHTML = `
    <div class="modal">
      <button class="close" onclick="this.parentElement.parentElement.remove()">✕</button>
      <h3>📢 Avisos e Comunicados</h3>
      <div class="avisos-list">
        ${avisosHTML}
      </div>
      <div style="margin-top:12px">
        <button class="btn" onclick="this.parentElement.parentElement.remove()">Fechar</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  modal.style.display = 'flex';
};

// ========== FUNÇÕES DE GESTÃO ==========
window.gerenciarAvisos = function() {
  alert('Funcionalidade: Gerenciar Avisos\n\nEm desenvolvimento...');
};

window.gerenciarProcedimentos = function() {
  alert('Funcionalidade: Gerenciar Procedimentos\n\nEm desenvolvimento...');
};

window.gerenciarEPIs = function() {
  alert('Funcionalidade: Gerenciar EPIs\n\nEm desenvolvimento...');
};

window.gerenciarTreinamentos = function() {
  alert('Funcionalidade: Gerenciar Treinamentos\n\nEm desenvolvimento...');
};

window.gerenciarUsuarios = function() {
  alert('Funcionalidade: Gerenciar Colaboradores\n\nEm desenvolvimento...');
};

// ========== FUNÇÕES AUXILIARES ==========
function calcularTempoDecorrido(timestamp) {
  if (!timestamp) return 'Agora mesmo';
  
  const agora = new Date();
  const data = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const diffMs = agora - data;
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Agora mesmo';
  if (diffMins < 60) return `${diffMins} min atrás`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h atrás`;
  
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d atrás`;
}

// ========== NOTIFICAÇÕES ==========
function mostrarNotificacao(titulo, mensagem) {
  if (!("Notification" in window)) {
    console.log("Este navegador não suporta notificações desktop");
    criarNotificacaoTela(titulo, mensagem);
    return;
  }
  
  if (Notification.permission === "granted") {
    criarNotificacao(titulo, mensagem);
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission().then(permission => {
      if (permission === "granted") {
        criarNotificacao(titulo, mensagem);
      }
    });
  }
  
  criarNotificacaoTela(titulo, mensagem);
}

function criarNotificacao(titulo, mensagem) {
  const notification = new Notification(titulo, {
    body: mensagem,
    icon: 'assets/logo.jpg',
    tag: 'portal-qssma'
  });
  
  notification.onclick = function() {
    window.focus();
    this.close();
  };
}

function criarNotificacaoTela(titulo, mensagem) {
  const notificacao = document.createElement('div');
  notificacao.className = 'notificacao-tela';
  notificacao.innerHTML = `
    <div class="notificacao-conteudo">
      <strong>${titulo}</strong>
      <p>${mensagem}</p>
    </div>
    <button onclick="this.parentElement.remove()">✕</button>
  `;
  
  document.body.appendChild(notificacao);
  
  setTimeout(() => {
    if (notificacao.parentElement) {
      notificacao.remove();
    }
  }, 5000);
}

// ========== SUPPORT - WHATSAPP ==========
window.abrirSuporteWhatsApp = function() {
  const telefone = '5511999999999';
  const mensagem = encodeURIComponent('Olá! Preciso de suporte no Portal QSSMA.');
  const url = `https://wa.me/${telefone}?text=${mensagem}`;
  
  window.open(url, '_blank', 'noopener,noreferrer');
};

// ========== FUNÇÕES DE TEMAS E PWA ==========
function initDarkMode() {
  const darkToggle = document.getElementById('darkToggle');
  if (!darkToggle) return;
  
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
  const savedPreference = localStorage.getItem('qssma_dark');
  
  if (savedPreference === '1' || (!savedPreference && prefersDark.matches)) {
    document.body.classList.add('dark');
    updateDarkModeIcon(true);
  }
  
  darkToggle.addEventListener('click', toggleDarkMode);
  
  prefersDark.addEventListener('change', (e) => {
    if (!localStorage.getItem('qssma_dark')) {
      if (e.matches) {
        document.body.classList.add('dark');
        updateDarkModeIcon(true);
      } else {
        document.body.classList.remove('dark');
        updateDarkModeIcon(false);
      }
    }
  });
}

function toggleDarkMode() {
  const isDark = document.body.classList.toggle('dark');
  localStorage.setItem('qssma_dark', isDark ? '1' : '0');
  updateDarkModeIcon(isDark);
  
  const darkToggle = document.getElementById('darkToggle');
  if (darkToggle) {
    darkToggle.style.transform = 'scale(0.95)';
    setTimeout(() => {
      darkToggle.style.transform = '';
    }, 150);
  }
}

function updateDarkModeIcon(isDark) {
  const darkToggle = document.getElementById('darkToggle');
  if (!darkToggle) return;
  
  darkToggle.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
  darkToggle.setAttribute('title', isDark ? 'Alternar para modo claro' : 'Alternar para modo escuro');
}

function initPWA() {
  const installBtn = document.getElementById('installBtn');
  if (!installBtn) return;
  
  let deferredPrompt;
  
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.style.display = 'flex';
    console.log('📱 PWA pode ser instalado');
  });
  
  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) {
      alert('Este aplicativo já está instalado ou não pode ser instalado.');
      return;
    }
    
    deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;
    
    if (choiceResult.outcome === 'accepted') {
      console.log('✅ Usuário aceitou a instalação');
      installBtn.style.display = 'none';
    } else {
      console.log('❌ Usuário recusou a instalação');
    }
    
    deferredPrompt = null;
  });
  
  window.addEventListener('appinstalled', () => {
    console.log('🎉 PWA instalado com sucesso');
    installBtn.style.display = 'none';
  });
  
  if (window.matchMedia('(display-mode: standalone)').matches) {
    installBtn.style.display = 'none';
  }
}

// ========== FUNÇÕES DE CONEXÃO ==========
function initConnectionMonitor() {
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  
  updateOnlineStatus();
}

function updateOnlineStatus() {
  estadoApp.isOnline = navigator.onLine;
  const statusElement = document.getElementById('connectionStatus');
  const offlineBanner = document.getElementById('offlineBanner');
  
  if (statusElement) {
    statusElement.innerHTML = estadoApp.isOnline ? '<i class="fas fa-circle"></i>' : '<i class="fas fa-circle"></i>';
    statusElement.style.color = estadoApp.isOnline ? '#4CAF50' : '#FF5722';
    statusElement.title = estadoApp.isOnline ? 'Online' : 'Offline';
  }
  
  if (offlineBanner) {
    offlineBanner.style.display = estadoApp.isOnline ? 'none' : 'block';
  }
  
  if (!estadoApp.isOnline) {
    console.warn('📶 Aplicativo offline');
    mostrarNotificacao('📶 Modo Offline', 'Algumas funcionalidades podem não estar disponíveis');
  }
}

// ========== FUNÇÕES DE UTILIDADE ==========
function showLoading(message = 'Carregando...') {
  const overlay = document.getElementById('loadingOverlay');
  const text = document.getElementById('loadingText');
  
  if (overlay) overlay.style.display = 'flex';
  if (text) text.textContent = message;
}

function hideLoading() {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) overlay.style.display = 'none';
}

function initEventListeners() {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAllModals();
    }
  });
  
  document.querySelectorAll('.modal-back').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  });
}

function closeAllModals() {
  document.querySelectorAll('.modal-back').forEach(modal => {
    modal.remove();
  });
}

// ========== SERVICE WORKER ==========
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js')
      .then(registration => {
        console.log('✅ ServiceWorker registrado:', registration.scope);
      })
      .catch(error => {
        console.log('❌ Falha ao registrar ServiceWorker:', error);
      });
  });
}

console.log('🛡️ app.js carregado com sucesso!');
