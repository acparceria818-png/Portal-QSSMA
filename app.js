// app.js - PORTAL QSSMA (VERSÃO COMPLETA)
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
  // Verificar se já existe
  if (document.querySelector('.footer-dev')) return;
  
  const footer = document.createElement('footer');
  footer.className = 'footer-dev';
  footer.innerHTML = `
    <div class="footer-content">
      <span>Desenvolvido por Juan Sales</span>
      <div class="footer-contacts">
        <span><i class="fas fa-phone"></i> Contato: (94) 99223-3753</span>
        <span><i class="fas fa-envelope"></i> Email: Juansalesadm@gmail.com</span>
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
  const funcao = localStorage.getItem('usuario_funcao');
  const gestorLogado = localStorage.getItem('gestor_logado');
  
  if (perfil === 'usuario' && matricula && nome) {
    estadoApp.usuario = { matricula, nome, funcao };
    estadoApp.perfil = 'usuario';
    mostrarTela('tela-usuario');
    updateUserStatus(nome, matricula, funcao);
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

function updateUserStatus(nome, matricula, funcao) {
  const userStatus = document.getElementById('userStatus');
  const userName = document.getElementById('userName');
  const usuarioNome = document.getElementById('usuarioNome');
  const usuarioMatricula = document.getElementById('usuarioMatricula');
  const usuarioFuncao = document.getElementById('usuarioFuncao');
  
  if (userStatus) userStatus.style.display = 'flex';
  if (userName) userName.textContent = nome;
  if (usuarioNome) usuarioNome.textContent = nome;
  if (usuarioMatricula) usuarioMatricula.textContent = matricula;
  if (usuarioFuncao) usuarioFuncao.textContent = funcao || 'Colaborador';
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

// ========== LOGIN USUÁRIO (COM FIREBASE) ==========
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
    
    // Buscar usuário no Firebase
    const usuarioValido = await buscarUsuarioFirebase(matricula);

    if (!usuarioValido) {
      alert('❌ Matrícula não encontrada ou usuário inativo');
      input.focus();
      return;
    }

    localStorage.setItem('usuario_matricula', matricula);
    localStorage.setItem('usuario_nome', usuarioValido.nome);
    localStorage.setItem('usuario_funcao', usuarioValido.funcao);
    localStorage.setItem('perfil_ativo', 'usuario');
    
    estadoApp.usuario = { 
      matricula, 
      nome: usuarioValido.nome,
      funcao: usuarioValido.funcao
    };
    
    console.log('✅ Usuário autenticado:', estadoApp.usuario.nome);
    mostrarTela('tela-usuario');
    updateUserStatus(estadoApp.usuario.nome, matricula, usuarioValido.funcao);
    
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

async function buscarUsuarioFirebase(matricula) {
  try {
    // Buscar na coleção 'usuarios' onde matricula == matricula
    const usuariosRef = collection(db, 'usuarios');
    const q = query(usuariosRef, where('matricula', '==', matricula));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.log('❌ Usuário não encontrado:', matricula);
      return null;
    }
    
    const usuarioDoc = querySnapshot.docs[0];
    const usuarioData = usuarioDoc.data();
    
    console.log('✅ Usuário encontrado:', usuarioData);
    
    return {
      nome: usuarioData.nome || 'Colaborador',
      funcao: usuarioData.funcao || 'Colaborador',
      setor: usuarioData.setor || 'Segurança',
      ativo: usuarioData.ativo !== false
    };
    
  } catch (erro) {
    console.error('Erro ao buscar usuário:', erro);
    // Para demonstração, retorna usuário simulado
    return {
      nome: `Colaborador ${matricula}`,
      funcao: 'Operador',
      setor: 'Segurança',
      ativo: true
    };
  }
}

// ========== LOGIN GESTOR (COM FIREBASE) ==========
window.loginGestor = async function () {
  const email = document.getElementById('gestorEmail').value;
  const senha = document.getElementById('gestorSenha').value;
  
  if (!email || !senha) {
    alert('Preencha e-mail e senha');
    return;
  }
  
  showLoading('🔐 Validando credenciais...');
  
  try {
    // Autenticação com Firebase Authentication
    const userCredential = await auth.signInWithEmailAndPassword(email, senha);
    const user = userCredential.user;
    
    // Verificar se é gestor
    const gestorRef = doc(db, 'gestores', user.uid);
    const gestorDoc = await getDoc(gestorRef);
    
    if (!gestorDoc.exists()) {
      alert('❌ Acesso não autorizado. Este usuário não é gestor.');
      await auth.signOut();
      hideLoading();
      return;
    }
    
    const gestorData = gestorDoc.data();
    
    localStorage.setItem('gestor_logado', 'true');
    localStorage.setItem('gestor_email', email);
    localStorage.setItem('gestor_nome', gestorData.nome || 'Gestor QSSMA');
    localStorage.setItem('perfil_ativo', 'gestor');
    
    estadoApp.gestor = { 
      email, 
      nome: gestorData.nome || 'Gestor QSSMA',
      uid: user.uid
    };
    
    mostrarTela('tela-gestor-dashboard');
    iniciarMonitoramentoGestor();
    iniciarMonitoramentoAvisos();
    
    console.log('✅ Gestor logado com sucesso:', estadoApp.gestor.nome);
    
    // Atualizar nome do gestor no dashboard
    const gestorNomeElement = document.getElementById('gestorNomeDashboard');
    if (gestorNomeElement) {
      gestorNomeElement.textContent = estadoApp.gestor.nome;
    }
    
    // Simular dados para demonstração
    simularDadosDashboard();
    
  } catch (erro) {
    console.error('Erro no login do gestor:', erro);
    
    let mensagemErro = '❌ Erro na autenticação';
    
    if (erro.code === 'auth/user-not-found') {
      mensagemErro = '❌ E-mail não encontrado';
    } else if (erro.code === 'auth/wrong-password') {
      mensagemErro = '❌ Senha incorreta';
    } else if (erro.code === 'auth/invalid-email') {
      mensagemErro = '❌ E-mail inválido';
    }
    
    alert(mensagemErro);
  } finally {
    hideLoading();
  }
};

// ========== LOGOUT ==========
window.logout = function () {
  if (estadoApp.unsubscribeAvisos) estadoApp.unsubscribeAvisos();
  
  // Deslogar do Firebase se estiver autenticado
  if (estadoApp.perfil === 'gestor') {
    auth.signOut().catch(erro => console.error('Erro ao sair:', erro));
  }
  
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
  localStorage.removeItem('usuario_funcao');
  localStorage.removeItem('gestor_logado');
  localStorage.removeItem('gestor_email');
  localStorage.removeItem('gestor_nome');
  
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
  const funcaoElement = document.getElementById('usuarioFuncao');
  const setorElement = document.getElementById('usuarioSetor');
  
  if (nomeElement) nomeElement.textContent = estadoApp.usuario.nome;
  if (matriculaElement) matriculaElement.textContent = estadoApp.usuario.matricula;
  if (funcaoElement) funcaoElement.textContent = estadoApp.usuario.funcao || 'Colaborador';
  if (setorElement) setorElement.textContent = 'Setor de Segurança';
  
  // Remover elementos de nível e EPI se existirem
  const nivelElement = document.querySelector('.user-tag:has(i.fa-shield-alt)');
  const epiElement = document.querySelector('.user-tag:has(i.fa-calendar-check)');
  
  if (nivelElement) nivelElement.style.display = 'none';
  if (epiElement) epiElement.style.display = 'none';
}

// ========== FUNÇÕES DO USUÁRIO ==========
// Botões para inspeções
window.abrirInformeEvento = function() {
  window.open('https://forms.gle/4kxcxyYX8wzdDyDt5', '_blank');
};

window.abrirRadarMovel = function() {
  window.open('https://forms.gle/BZahsh5ZAAVyixjx5', '_blank');
};

window.abrirFlashReport = function() {
  window.open('https://forms.gle/9d6f4w7hcpyDSCCs5', '_blank');
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
    
    // Salvar no Firebase
    const feedbackRef = collection(db, 'feedbacks');
    await addDoc(feedbackRef, dados);
    
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
    const dadosEmergencia = {
      tipo: 'emergencia',
      descricao: descricao,
      status: 'ativa',
      timestamp: new Date(),
      usuario: estadoApp.usuario ? estadoApp.usuario.nome : 'Gestor',
      matricula: estadoApp.usuario ? estadoApp.usuario.matricula : 'GESTOR'
    };
    
    // Salvar no Firebase
    const emergenciasRef = collection(db, 'emergencias');
    await addDoc(emergenciasRef, dadosEmergencia);
    
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
  // Carregar dados iniciais
  carregarDadosDashboard();
  
  // Escutar mudanças em tempo real
  escutarMudancasEmTempoReal();
}

async function carregarDadosDashboard() {
  try {
    // Carregar incidentes
    const incidentesRef = collection(db, 'incidentes');
    const incidentesSnapshot = await getDocs(query(incidentesRef, orderBy('timestamp', 'desc'), limit(10)));
    estadoApp.incidentesAtivos = incidentesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Carregar emergências ativas
    const emergenciasRef = collection(db, 'emergencias');
    const emergenciasSnapshot = await getDocs(query(emergenciasRef, where('status', '==', 'ativa')));
    estadoApp.emergenciasAtivas = emergenciasSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Carregar feedbacks
    const feedbacksRef = collection(db, 'feedbacks');
    const feedbacksSnapshot = await getDocs(query(feedbacksRef, orderBy('timestamp', 'desc'), limit(10)));
    
    // Atualizar contadores
    document.getElementById('incidentesCount').textContent = estadoApp.incidentesAtivos.length;
    document.getElementById('emergenciasCount').textContent = estadoApp.emergenciasAtivas.length;
    
    // Atualizar listas
    atualizarListaIncidentes();
    atualizarListaEmergencias();
    atualizarListaFeedbacks(feedbacksSnapshot);
    
  } catch (erro) {
    console.error('Erro ao carregar dados:', erro);
    simularDadosDashboard();
  }
}

function escutarMudancasEmTempoReal() {
  // Escutar incidentes
  const incidentesRef = collection(db, 'incidentes');
  const qIncidentes = query(incidentesRef, orderBy('timestamp', 'desc'), limit(10));
  
  const unsubscribeIncidentes = onSnapshot(qIncidentes, (snapshot) => {
    estadoApp.incidentesAtivos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    document.getElementById('incidentesCount').textContent = estadoApp.incidentesAtivos.length;
    atualizarListaIncidentes();
  });
  
  // Escutar emergências
  const emergenciasRef = collection(db, 'emergencias');
  const qEmergencias = query(emergenciasRef, where('status', '==', 'ativa'));
  
  const unsubscribeEmergencias = onSnapshot(qEmergencias, (snapshot) => {
    estadoApp.emergenciasAtivas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    document.getElementById('emergenciasCount').textContent = estadoApp.emergenciasAtivas.length;
    atualizarListaEmergencias();
  });
  
  // Guardar unsubscribe functions
  estadoApp.unsubscribeListeners = {
    incidentes: unsubscribeIncidentes,
    emergencias: unsubscribeEmergencias
  };
}

function atualizarListaIncidentes() {
  const incidentesList = document.getElementById('incidentesList');
  if (!incidentesList) return;
  
  if (estadoApp.incidentesAtivos.length === 0) {
    incidentesList.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-check-circle"></i>
        <p>Nenhum incidente registrado hoje</p>
      </div>
    `;
    return;
  }
  
  incidentesList.innerHTML = estadoApp.incidentesAtivos.map(incidente => `
    <div class="incidente-card">
      <div class="incidente-header">
        <div class="incidente-titulo">
          <span class="incidente-icon">⚠️</span>
          <strong>${incidente.tipo || 'Incidente'}</strong>
        </div>
        <span class="tempo-decorrido">${calcularTempoDecorrido(incidente.timestamp)}</span>
      </div>
      <div class="incidente-info">
        <div class="info-row">
          <span>👤 Colaborador:</span>
          <span>${incidente.usuario || 'Não informado'} (${incidente.matricula || 'N/A'})</span>
        </div>
        ${incidente.local ? `
        <div class="info-row">
          <span>📍 Local:</span>
          <span>${incidente.local}</span>
        </div>
        ` : ''}
        <div class="info-row">
          <span>📝 Descrição:</span>
          <span>${incidente.descricao || 'Sem descrição'}</span>
        </div>
        ${incidente.gravidade ? `
        <div class="info-row">
          <span>🚨 Gravidade:</span>
          <span class="gravidade-${incidente.gravidade.toLowerCase()}">${incidente.gravidade}</span>
        </div>
        ` : ''}
      </div>
      <div class="incidente-actions">
        <button class="btn small success" onclick="resolverIncidente('${incidente.id}')">✅ Resolver</button>
        <button class="btn small warning" onclick="verDetalhesIncidente('${incidente.id}')">📋 Detalhes</button>
      </div>
    </div>
  `).join('');
}

function atualizarListaEmergencias() {
  const emergenciasList = document.getElementById('emergenciasList');
  if (!emergenciasList) return;
  
  if (estadoApp.emergenciasAtivas.length === 0) {
    emergenciasList.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-check-circle"></i>
        <p>Nenhuma emergência ativa</p>
      </div>
    `;
    return;
  }
  
  emergenciasList.innerHTML = estadoApp.emergenciasAtivas.map(emergencia => `
    <div class="emergencia-card">
      <div class="emergencia-header">
        <div class="emergencia-titulo">
          <span class="emergencia-icon">🚨</span>
          <strong>EMERGÊNCIA ATIVA</strong>
        </div>
        <span class="tempo-decorrido">${calcularTempoDecorrido(emergencia.timestamp)}</span>
      </div>
      <div class="emergencia-info">
        <div class="info-row">
          <span>👤 Registrado por:</span>
          <span>${emergencia.usuario || 'Não informado'}</span>
        </div>
        <div class="info-row">
          <span>📝 Descrição:</span>
          <span>${emergencia.descricao || 'Sem descrição'}</span>
        </div>
        <div class="info-row">
          <span>⏰ Ativa há:</span>
          <span class="tempo-ativo">${calcularTempoAtivo(emergencia.timestamp)}</span>
        </div>
      </div>
      <div class="emergencia-actions">
        <button class="btn small danger" onclick="encerrarEmergencia('${emergencia.id}')">🛑 Encerrar</button>
        <button class="btn small" onclick="contatarEmergencia('${emergencia.usuario}')">📞 Contatar</button>
      </div>
    </div>
  `).join('');
}

function atualizarListaFeedbacks(feedbacksSnapshot) {
  const feedbacksList = document.getElementById('feedbacksList');
  if (!feedbacksList) return;
  
  const feedbacks = feedbacksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  if (feedbacks.length === 0) {
    feedbacksList.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-comments"></i>
        <p>Nenhum feedback recebido</p>
      </div>
    `;
    return;
  }
  
  feedbacksList.innerHTML = feedbacks.map(feedback => `
    <div class="feedback-card">
      <div class="feedback-header">
        <div class="feedback-tipo ${feedback.tipo}">
          <i class="fas ${getFeedbackIcon(feedback.tipo)}"></i>
          <span>${feedback.tipo}</span>
        </div>
        <span class="tempo-decorrido">${calcularTempoDecorrido(feedback.timestamp)}</span>
      </div>
      <div class="feedback-mensagem">
        <p>${feedback.mensagem}</p>
      </div>
      <div class="feedback-info">
        <span><i class="fas fa-user"></i> ${feedback.usuario || 'Anônimo'}</span>
        <span><i class="fas fa-id-card"></i> ${feedback.matricula || 'N/A'}</span>
        <span class="status-${feedback.status}">${feedback.status}</span>
      </div>
      <div class="feedback-actions">
        <button class="btn small" onclick="responderFeedback('${feedback.id}')">💬 Responder</button>
        <button class="btn small success" onclick="marcarFeedbackResolvido('${feedback.id}')">✅ Resolver</button>
      </div>
    </div>
  `).join('');
}

function getFeedbackIcon(tipo) {
  const icons = {
    sugestao: 'fa-lightbulb',
    melhoria: 'fa-tools',
    relato: 'fa-exclamation-triangle',
    elogio: 'fa-star',
    problema: 'fa-bug'
  };
  return icons[tipo] || 'fa-comment';
}

function simularDadosDashboard() {
  // Dados simulados para demonstração
  setTimeout(() => {
    document.getElementById('incidentesCount').textContent = '3';
    document.getElementById('emergenciasCount').textContent = '1';
    document.getElementById('episConformes').textContent = '42';
    document.getElementById('usuariosAtivos').textContent = '156';
    document.getElementById('usuariosOnline').textContent = '24';
    
    // Atualizar lista de incidentes simulados
    if (estadoApp.incidentesAtivos.length === 0) {
      atualizarListaIncidentes();
    }
  }, 500);
}

// ========== GESTÃO DE AVISOS ==========
function iniciarMonitoramentoAvisos() {
  // Buscar avisos ativos do Firebase
  buscarAvisosAtivos();
  
  // Escutar avisos em tempo real
  escutarAvisosTempoReal();
}

async function buscarAvisosAtivos() {
  try {
    const avisosRef = collection(db, 'avisos');
    const q = query(avisosRef, where('ativo', '==', true), orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);
    
    estadoApp.avisosAtivos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    atualizarContadorAvisos();
    
  } catch (erro) {
    console.error('Erro ao buscar avisos:', erro);
    // Avisos simulados
    estadoApp.avisosAtivos = [
      {
        id: '1',
        titulo: 'Treinamento de EPIs obrigatório',
        mensagem: 'Todos os colaboradores devem participar do treinamento de EPIs na próxima quarta-feira às 14h.',
        destino: 'todos',
        ativo: true,
        timestamp: new Date()
      }
    ];
    atualizarContadorAvisos();
  }
}

function escutarAvisosTempoReal() {
  const avisosRef = collection(db, 'avisos');
  const q = query(avisosRef, where('ativo', '==', true));
  
  if (estadoApp.unsubscribeAvisos) {
    estadoApp.unsubscribeAvisos();
  }
  
  estadoApp.unsubscribeAvisos = onSnapshot(q, (snapshot) => {
    estadoApp.avisosAtivos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    atualizarContadorAvisos();
    
    // Mostrar notificação para novos avisos
    if (snapshot.docChanges().some(change => change.type === 'added')) {
      const novosAvisos = snapshot.docChanges()
        .filter(change => change.type === 'added')
        .map(change => change.doc.data());
      
      if (novosAvisos.length > 0) {
        mostrarNotificacao('📢 Novo Aviso', novosAvisos[0].titulo);
      }
    }
  });
}

function atualizarContadorAvisos() {
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
        <small>${aviso.timestamp ? calcularTempoDecorrido(aviso.timestamp) : ''}</small>
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
  mostrarTela('tela-gerenciar-avisos');
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

// ========== GESTÃO DE AVISOS (TELA ESPECÍFICA) ==========
window.mostrarGerenciarAvisos = function() {
  carregarTodosAvisos();
  mostrarTela('tela-gerenciar-avisos');
};

async function carregarTodosAvisos() {
  try {
    const avisosRef = collection(db, 'avisos');
    const q = query(avisosRef, orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);
    
    const todosAvisos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    atualizarListaGerenciamentoAvisos(todosAvisos);
    
  } catch (erro) {
    console.error('Erro ao carregar avisos:', erro);
    document.getElementById('listaAvisosGestor').innerHTML = `
      <div class="empty-state">
        <i class="fas fa-exclamation-triangle"></i>
        <p>Erro ao carregar avisos</p>
      </div>
    `;
  }
}

function atualizarListaGerenciamentoAvisos(avisos) {
  const lista = document.getElementById('listaAvisosGestor');
  if (!lista) return;
  
  if (avisos.length === 0) {
    lista.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-bullhorn"></i>
        <p>Nenhum aviso cadastrado</p>
      </div>
    `;
    return;
  }
  
  lista.innerHTML = avisos.map(aviso => `
    <div class="aviso-gestor-item ${aviso.ativo ? 'ativo' : 'inativo'}">
      <div class="aviso-gestor-header">
        <div class="aviso-gestor-info">
          <h4>${aviso.titulo}</h4>
          <div class="aviso-tags">
            <span class="aviso-tag destino">${aviso.destino || 'Todos'}</span>
            <span class="aviso-tag status ${aviso.ativo ? 'ativo' : 'inativo'}">
              ${aviso.ativo ? 'Ativo' : 'Inativo'}
            </span>
            <span class="aviso-tag data">${aviso.timestamp ? calcularTempoDecorrido(aviso.timestamp) : ''}</span>
          </div>
        </div>
        <div class="aviso-gestor-actions">
          <button class="btn small ${aviso.ativo ? 'warning' : 'success'}" 
                  onclick="alternarStatusAviso('${aviso.id}', ${aviso.ativo})">
            ${aviso.ativo ? 'Desativar' : 'Ativar'}
          </button>
          <button class="btn small" onclick="editarAviso('${aviso.id}')">Editar</button>
          <button class="btn small danger" onclick="excluirAviso('${aviso.id}')">Excluir</button>
        </div>
      </div>
      <div class="aviso-gestor-mensagem">
        <p>${aviso.mensagem}</p>
      </div>
    </div>
  `).join('');
}

window.criarNovoAviso = function() {
  const modal = document.createElement('div');
  modal.className = 'modal-back';
  modal.innerHTML = `
    <div class="modal">
      <button class="close" onclick="this.parentElement.parentElement.remove()">✕</button>
      <h3>📝 Criar Novo Aviso</h3>
      
      <div class="form-group">
        <label>Título do Aviso</label>
        <input type="text" id="novoTituloAviso" class="form-input" placeholder="Digite o título" />
      </div>
      
      <div class="form-group">
        <label>Mensagem</label>
        <textarea id="novaMensagemAviso" class="form-input" rows="4" placeholder="Digite a mensagem do aviso"></textarea>
      </div>
      
      <div class="form-group">
        <label>Destinatário</label>
        <select id="novoDestinoAviso" class="form-input">
          <option value="todos">Todos os colaboradores</option>
          <option value="producao">Setor de Produção</option>
          <option value="manutencao">Setor de Manutenção</option>
          <option value="administrativo">Setor Administrativo</option>
          <option value="gestores">Apenas Gestores</option>
        </select>
      </div>
      
      <div class="modal-footer">
        <button class="btn btn-primary" onclick="salvarNovoAviso()">Salvar Aviso</button>
        <button class="btn btn-secondary" onclick="this.parentElement.parentElement.parentElement.remove()">Cancelar</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  modal.style.display = 'flex';
};

async function salvarNovoAviso() {
  const titulo = document.getElementById('novoTituloAviso').value;
  const mensagem = document.getElementById('novaMensagemAviso').value;
  const destino = document.getElementById('novoDestinoAviso').value;
  
  if (!titulo || !mensagem) {
    alert('Preencha título e mensagem');
    return;
  }
  
  try {
    const aviso = {
      titulo: titulo,
      mensagem: mensagem,
      destino: destino,
      ativo: true,
      timestamp: new Date(),
      criadoPor: estadoApp.gestor?.nome || 'Gestor',
      criadoPorEmail: estadoApp.gestor?.email
    };
    
    const avisosRef = collection(db, 'avisos');
    await addDoc(avisosRef, aviso);
    
    // Fechar modal
    document.querySelector('.modal-back').remove();
    
    // Recarregar lista
    carregarTodosAvisos();
    
    mostrarNotificacao('✅ Aviso Criado', 'O aviso foi publicado com sucesso!');
    
  } catch (erro) {
    console.error('Erro ao salvar aviso:', erro);
    alert('❌ Erro ao salvar aviso');
  }
}

async function alternarStatusAviso(avisoId, atualStatus) {
  try {
    const avisoRef = doc(db, 'avisos', avisoId);
    await updateDoc(avisoRef, {
      ativo: !atualStatus,
      atualizadoEm: new Date()
    });
    
    mostrarNotificacao('✅ Status Alterado', `Aviso ${!atualStatus ? 'ativado' : 'desativado'} com sucesso`);
    
  } catch (erro) {
    console.error('Erro ao alterar status:', erro);
    alert('❌ Erro ao alterar status do aviso');
  }
}

async function excluirAviso(avisoId) {
  if (!confirm('Tem certeza que deseja excluir este aviso?')) return;
  
  try {
    const avisoRef = doc(db, 'avisos', avisoId);
    await deleteDoc(avisoRef);
    
    mostrarNotificacao('🗑️ Aviso Excluído', 'O aviso foi excluído com sucesso');
    
  } catch (erro) {
    console.error('Erro ao excluir aviso:', erro);
    alert('❌ Erro ao excluir aviso');
  }
}

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

function calcularTempoAtivo(timestamp) {
  if (!timestamp) return '0 min';
  
  const agora = new Date();
  const data = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const diffMs = agora - data;
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 60) return `${diffMins} min`;
  
  const diffHours = Math.floor(diffMins / 60);
  return `${diffHours}h ${diffMins % 60}min`;
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
    tag: 'portal-qssma',
    requireInteraction: true
  });
  
  notification.onclick = function() {
    window.focus();
    this.close();
  };
}

function criarNotificacaoTela(titulo, mensagem) {
  // Remover notificações antigas
  document.querySelectorAll('.notificacao-tela').forEach(n => n.remove());
  
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
  const telefone = '559392059914'; // +55 93 9205-9914
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
    statusElement.innerHTML = estadoApp.isOnline ? '<i class="fas fa-wifi"></i>' : '<i class="fas fa-wifi-slash"></i>';
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
    
    // Enter para login
    if (e.key === 'Enter') {
      const activeTela = document.querySelector('.tela.ativa');
      if (activeTela && activeTela.id === 'tela-usuario-login') {
        const input = document.getElementById('matriculaUsuario');
        if (document.activeElement === input) {
          confirmarMatriculaUsuario();
        }
      }
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
        
        // Verificar atualizações
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          console.log('🔄 Nova versão do Service Worker encontrada');
          
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                // Nova atualização disponível
                mostrarNotificacao('🔄 Atualização Disponível', 'Uma nova versão do Portal QSSMA está disponível. Recarregue a página.');
              }
            }
          });
        });
      })
      .catch(error => {
        console.log('❌ Falha ao registrar ServiceWorker:', error);
      });
  });
}

console.log('🛡️ app.js carregado com sucesso!');

// Exportar funções para uso global
window.estadoApp = estadoApp;
window.mostrarNotificacao = mostrarNotificacao;
