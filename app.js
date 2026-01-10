// app.js - PORTAL QSSMA (VERSÃO FINAL)
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
  limit,
  serverTimestamp,
  onSnapshot,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
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
  emergenciasAtivas: [],
  dadosUsuario: null
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
  
  console.log('✅ Portal QSSMA inicializado com sucesso');
});

// ========== ADICIONAR RODAPÉ ==========
function adicionarRodape() {
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
  const gestorLogado = localStorage.getItem('gestor_logado');
  
  if (perfil === 'usuario' && localStorage.getItem('usuario_matricula')) {
    estadoApp.usuario = {
      matricula: localStorage.getItem('usuario_matricula'),
      nome: localStorage.getItem('usuario_nome'),
      setor: localStorage.getItem('usuario_setor'),
      funcao: localStorage.getItem('usuario_funcao')
    };
    estadoApp.perfil = 'usuario';
    mostrarTela('tela-usuario');
    updateUserStatus(estadoApp.usuario);
    iniciarMonitoramentoAvisos();
    
  } else if (perfil === 'gestor' && gestorLogado) {
    estadoApp.perfil = 'gestor';
    estadoApp.gestor = { 
      nome: localStorage.getItem('gestor_nome') || 'Gestor QSSMA',
      email: localStorage.getItem('gestor_email')
    };
    mostrarTela('tela-gestor-dashboard');
    iniciarMonitoramentoGestor();
  }
}

function updateUserStatus(usuario) {
  const userStatus = document.getElementById('userStatus');
  const userName = document.getElementById('userName');
  const usuarioNome = document.getElementById('usuarioNome');
  const usuarioMatricula = document.getElementById('usuarioMatricula');
  const usuarioSetor = document.getElementById('usuarioSetor');
  const usuarioFuncao = document.getElementById('usuarioFuncao');
  
  if (userStatus) userStatus.style.display = 'flex';
  if (userName) userName.textContent = usuario.nome;
  if (usuarioNome) usuarioNome.textContent = usuario.nome;
  if (usuarioMatricula) usuarioMatricula.textContent = usuario.matricula;
  if (usuarioSetor) usuarioSetor.textContent = usuario.setor || 'Setor de Segurança';
  if (usuarioFuncao) usuarioFuncao.textContent = usuario.funcao || 'Colaborador';
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

// ========== LOGIN USUÁRIO (FIREBASE) ==========
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
    const usuarioRef = doc(db, "usuarios", matricula);
    const usuarioSnap = await getDoc(usuarioRef);

    if (!usuarioSnap.exists()) {
      alert('❌ Matrícula não encontrada no sistema');
      input.focus();
      return;
    }

    const usuarioData = usuarioSnap.data();
    
    if (usuarioData.status !== 'ativo') {
      alert('❌ Usuário inativo. Entre em contato com o gestor.');
      return;
    }

    // Salvar dados no localStorage
    localStorage.setItem('usuario_matricula', matricula);
    localStorage.setItem('usuario_nome', usuarioData.nomeCompleto);
    localStorage.setItem('usuario_setor', usuarioData.setor || 'Segurança');
    localStorage.setItem('usuario_funcao', usuarioData.funcao || 'Colaborador');
    localStorage.setItem('perfil_ativo', 'usuario');
    
    estadoApp.usuario = { 
      matricula, 
      nome: usuarioData.nomeCompleto,
      setor: usuarioData.setor,
      funcao: usuarioData.funcao
    };
    
    estadoApp.dadosUsuario = usuarioData;
    
    console.log('✅ Usuário autenticado:', estadoApp.usuario.nome);
    mostrarTela('tela-usuario');
    updateUserStatus(estadoApp.usuario);
    
    mostrarNotificacao('✅ Login realizado!', `Bem-vindo, ${estadoApp.usuario.nome}!`);

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

// ========== LOGIN GESTOR (FIREBASE) ==========
window.loginGestor = async function () {
  showLoading('🔐 Verificando credenciais...');
  
  const email = document.getElementById('gestorEmail').value;
  const senha = document.getElementById('gestorSenha').value;
  
  if (!email || !senha) {
    alert('Preencha e-mail e senha');
    hideLoading();
    return;
  }
  
  try {
    // Autenticar com Firebase Auth
    const userCredential = await auth.signInWithEmailAndPassword(email, senha);
    const user = userCredential.user;
    
    // Verificar se é gestor
    const gestorRef = doc(db, "gestores", user.uid);
    const gestorSnap = await getDoc(gestorRef);
    
    if (!gestorSnap.exists()) {
      alert('❌ Acesso não autorizado. Apenas gestores podem acessar.');
      await auth.signOut();
      hideLoading();
      return;
    }
    
    const gestorData = gestorSnap.data();
    
    // Salvar dados no localStorage
    localStorage.setItem('gestor_logado', 'true');
    localStorage.setItem('gestor_email', email);
    localStorage.setItem('gestor_nome', gestorData.nome || 'Gestor QSSMA');
    localStorage.setItem('gestor_uid', user.uid);
    localStorage.setItem('perfil_ativo', 'gestor');
    
    estadoApp.gestor = { 
      email, 
      nome: gestorData.nome,
      uid: user.uid
    };
    
    mostrarTela('tela-gestor-dashboard');
    iniciarMonitoramentoGestor();
    
    console.log('✅ Gestor logado com sucesso:', gestorData.nome);
    mostrarNotificacao('✅ Login Gestor', `Bem-vindo, ${gestorData.nome}!`);
    
  } catch (erro) {
    console.error('Erro no login gestor:', erro);
    
    if (erro.code === 'auth/user-not-found' || erro.code === 'auth/wrong-password') {
      alert('❌ E-mail ou senha incorretos');
    } else if (erro.code === 'auth/too-many-requests') {
      alert('❌ Muitas tentativas. Tente novamente mais tarde.');
    } else {
      alert('❌ Erro ao fazer login. Verifique suas credenciais.');
    }
  } finally {
    hideLoading();
  }
};

// ========== LOGOUT ==========
window.logout = function () {
  if (estadoApp.unsubscribeAvisos) estadoApp.unsubscribeAvisos();
  
  // Limpar estado
  estadoApp = {
    usuario: null,
    gestor: null,
    perfil: null,
    isOnline: navigator.onLine,
    unsubscribeAvisos: null,
    avisosAtivos: [],
    incidentesAtivos: [],
    emergenciasAtivas: [],
    dadosUsuario: null
  };
  
  // Limpar localStorage
  localStorage.removeItem('perfil_ativo');
  localStorage.removeItem('usuario_matricula');
  localStorage.removeItem('usuario_nome');
  localStorage.removeItem('usuario_setor');
  localStorage.removeItem('usuario_funcao');
  localStorage.removeItem('gestor_logado');
  localStorage.removeItem('gestor_email');
  localStorage.removeItem('gestor_nome');
  localStorage.removeItem('gestor_uid');
  
  // Fazer logout do Firebase Auth
  auth.signOut().catch(error => {
    console.log('Erro ao fazer logout do Firebase:', error);
  });
  
  // Atualizar UI
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
  const setorElement = document.getElementById('usuarioSetor');
  const funcaoElement = document.getElementById('usuarioFuncao');
  
  if (nomeElement) nomeElement.textContent = estadoApp.usuario.nome;
  if (matriculaElement) matriculaElement.textContent = estadoApp.usuario.matricula;
  if (setorElement) setorElement.textContent = estadoApp.usuario.setor || 'Setor de Segurança';
  if (funcaoElement) funcaoElement.textContent = estadoApp.usuario.funcao || 'Colaborador';
}

// ========== FUNÇÕES DO USUÁRIO ==========
// 1. INFORME DE EVENTO
window.informeEvento = function() {
  const url = 'https://forms.gle/4kxcxyYX8wzdDyDt5';
  window.open(url, '_blank', 'noopener,noreferrer');
};

// 2. RADAR MÓVEL DE VELOCIDADE
window.radarMovel = function() {
  const url = 'https://forms.gle/BZahsh5ZAAVyixjx5';
  window.open(url, '_blank', 'noopener,noreferrer');
};

// 3. FLASH REPORT
window.flashReport = function() {
  const url = 'https://forms.gle/9d6f4w7hcpyDSCCs5';
  window.open(url, '_blank', 'noopener,noreferrer');
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
      timestamp: serverTimestamp(),
      perfil: perfil
    };
    
    if (perfil === 'usuario' && estadoApp.usuario) {
      dados.usuario = estadoApp.usuario.nome;
      dados.matricula = estadoApp.usuario.matricula;
      dados.setor = estadoApp.usuario.setor;
    }
    
    // Salvar no Firebase
    const feedbackRef = await addDoc(collection(db, "feedbacks"), dados);
    console.log('📤 Feedback enviado com ID:', feedbackRef.id);
    
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
  
  const emergenciaBtn = document.getElementById('emergenciaBtn');
  
  if (estadoApp.emergenciaAtiva) {
    estadoApp.emergenciaAtiva = false;
    emergenciaBtn.textContent = '🚨 EMERGÊNCIA';
    emergenciaBtn.classList.remove('emergencia-ativa');
    mostrarNotificacao('✅ Emergência Desativada', 'Situação de emergência encerrada');
    return;
  }
  
  const confirmar = confirm('🚨 ATENÇÃO!\n\nVocê está prestes a ativar uma emergência.\n\nEsta ação notificará toda a equipe de segurança.\n\nConfirma a ativação?');
  
  if (!confirmar) return;
  
  const descricao = prompt('Descreva brevemente a situação de emergência:');
  if (!descricao) return;
  
  try {
    // Registrar emergência no Firebase
    const dadosEmergencia = {
      tipo: 'emergencia',
      descricao: descricao,
      status: 'ativa',
      timestamp: serverTimestamp(),
      localizacao: 'Não informada'
    };
    
    if (estadoApp.usuario) {
      dadosEmergencia.usuario = estadoApp.usuario.nome;
      dadosEmergencia.matricula = estadoApp.usuario.matricula;
      dadosEmergencia.setor = estadoApp.usuario.setor;
    }
    
    if (estadoApp.gestor) {
      dadosEmergencia.gestor = estadoApp.gestor.nome;
      dadosEmergencia.gestorEmail = estadoApp.gestor.email;
    }
    
    const emergenciaRef = await addDoc(collection(db, "emergencias"), dadosEmergencia);
    console.log('🚨 Emergência registrada com ID:', emergenciaRef.id);
    
    estadoApp.emergenciaAtiva = true;
    emergenciaBtn.textContent = '✅ EMERGÊNCIA ATIVA';
    emergenciaBtn.classList.add('emergencia-ativa');
    
    mostrarNotificacao('🚨 EMERGÊNCIA ATIVADA', 'A equipe de segurança foi notificada!');
    
    // Vibrar dispositivo se suportado
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
  atualizarDashboardGestor();
}

async function atualizarDashboardGestor() {
  try {
    // Contar incidentes do dia
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    const incidentesQuery = query(
      collection(db, "incidentes"),
      where("timestamp", ">=", hoje)
    );
    const incidentesSnapshot = await getDocs(incidentesQuery);
    document.getElementById('incidentesCount').textContent = incidentesSnapshot.size;
    
    // Contar emergências ativas
    const emergenciasQuery = query(
      collection(db, "emergencias"),
      where("status", "==", "ativa")
    );
    const emergenciasSnapshot = await getDocs(emergenciasQuery);
    document.getElementById('emergenciasCount').textContent = emergenciasSnapshot.size;
    
    // Contar usuários ativos
    const usuariosQuery = query(
      collection(db, "usuarios"),
      where("status", "==", "ativo")
    );
    const usuariosSnapshot = await getDocs(usuariosQuery);
    document.getElementById('usuariosAtivos').textContent = usuariosSnapshot.size;
    
    // EPIs conformes (exemplo)
    document.getElementById('episConformes').textContent = '42';
    
    // Usuários online (simulado)
    document.getElementById('usuariosOnline').textContent = '24';
    
    // Carregar lista de incidentes
    carregarIncidentesGestor();
    
  } catch (erro) {
    console.error('Erro ao atualizar dashboard:', erro);
    // Usar dados simulados em caso de erro
    simularDadosDashboard();
  }
}

async function carregarIncidentesGestor() {
  try {
    const incidentesQuery = query(
      collection(db, "incidentes"),
      orderBy("timestamp", "desc"),
      limit(10)
    );
    
    const incidentesSnapshot = await getDocs(incidentesQuery);
    const incidentesList = document.getElementById('incidentesList');
    
    if (incidentesSnapshot.empty) {
      incidentesList.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-check-circle"></i>
          <p>Nenhum incidente registrado hoje</p>
        </div>
      `;
      return;
    }
    
    let incidentesHTML = '';
    incidentesSnapshot.forEach(doc => {
      const incidente = doc.data();
      incidentesHTML += criarCardIncidente(incidente, doc.id);
    });
    
    incidentesList.innerHTML = incidentesHTML;
    
  } catch (erro) {
    console.error('Erro ao carregar incidentes:', erro);
    simularDadosDashboard();
  }
}

function criarCardIncidente(incidente, id) {
  const tempo = incidente.timestamp ? calcularTempoDecorrido(incidente.timestamp.toDate()) : 'Data não informada';
  
  return `
    <div class="incidente-card">
      <div class="incidente-header">
        <div class="incidente-titulo">
          <span class="incidente-icon">⚠️</span>
          <strong>${incidente.tipo || 'Incidente'}</strong>
        </div>
        <span class="tempo-decorrido">${tempo}</span>
      </div>
      <div class="incidente-info">
        ${incidente.usuario ? `
          <div class="info-row">
            <span>👤 Colaborador:</span>
            <span>${incidente.usuario} (${incidente.matricula || 'N/A'})</span>
          </div>
        ` : ''}
        ${incidente.local ? `
          <div class="info-row">
            <span>📍 Local:</span>
            <span>${incidente.local}</span>
          </div>
        ` : ''}
        ${incidente.descricao ? `
          <div class="info-row">
            <span>📝 Descrição:</span>
            <span>${incidente.descricao.substring(0, 100)}${incidente.descricao.length > 100 ? '...' : ''}</span>
          </div>
        ` : ''}
        <div class="info-row">
          <span>🚨 Gravidade:</span>
          <span class="gravidade-${incidente.gravidade || 'media'}">${incidente.gravidade || 'Média'}</span>
        </div>
      </div>
      <div class="incidente-actions">
        <button class="btn small success" onclick="resolverIncidente('${id}')">✅ Resolver</button>
        <button class="btn small" onclick="detalhesIncidente('${id}')">📋 Detalhes</button>
      </div>
    </div>
  `;
}

function simularDadosDashboard() {
  // Dados simulados para demonstração
  document.getElementById('incidentesCount').textContent = '3';
  document.getElementById('emergenciasCount').textContent = '1';
  document.getElementById('episConformes').textContent = '42';
  document.getElementById('usuariosAtivos').textContent = '156';
  document.getElementById('usuariosOnline').textContent = '24';
  
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
}

// ========== GESTÃO DE AVISOS ==========
function iniciarMonitoramentoAvisos() {
  try {
    // Escutar avisos em tempo real
    estadoApp.unsubscribeAvisos = onSnapshot(
      query(collection(db, "avisos"), where("ativo", "==", true)),
      (snapshot) => {
        estadoApp.avisosAtivos = [];
        snapshot.forEach((doc) => {
          estadoApp.avisosAtivos.push({ id: doc.id, ...doc.data() });
        });
        
        const avisosCount = document.getElementById('avisosCount');
        if (avisosCount) {
          avisosCount.textContent = estadoApp.avisosAtivos.length;
          avisosCount.style.display = estadoApp.avisosAtivos.length > 0 ? 'inline' : 'none';
        }
      },
      (error) => {
        console.error('Erro ao monitorar avisos:', error);
        avisosSimulados();
      }
    );
  } catch (error) {
    console.error('Erro ao iniciar monitoramento de avisos:', error);
    avisosSimulados();
  }
}

function avisosSimulados() {
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
        <small>${aviso.timestamp ? calcularTempoDecorrido(aviso.timestamp.toDate?.() || aviso.timestamp) : ''}</small>
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

window.adicionarAviso = async function() {
  const titulo = document.getElementById('novoAvisoTitulo').value;
  const mensagem = document.getElementById('novoAvisoMensagem').value;
  const destino = document.getElementById('novoAvisoDestino').value;
  
  if (!titulo || !mensagem) {
    alert('Preencha título e mensagem');
    return;
  }
  
  try {
    const avisoData = {
      titulo: titulo,
      mensagem: mensagem,
      destino: destino || 'todos',
      ativo: true,
      timestamp: serverTimestamp(),
      criadoPor: estadoApp.gestor?.nome || 'Gestor',
      criadoPorEmail: estadoApp.gestor?.email
    };
    
    await addDoc(collection(db, "avisos"), avisoData);
    
    document.getElementById('novoAvisoTitulo').value = '';
    document.getElementById('novoAvisoMensagem').value = '';
    
    alert('✅ Aviso publicado com sucesso!');
    mostrarTela('tela-gestor-dashboard');
    
  } catch (erro) {
    console.error('Erro ao adicionar aviso:', erro);
    alert('❌ Erro ao publicar aviso');
  }
};

window.toggleAviso = async function(id, ativo) {
  try {
    await updateDoc(doc(db, "avisos", id), {
      ativo: !ativo,
      atualizadoEm: serverTimestamp()
    });
    
    alert(ativo ? '✅ Aviso desativado' : '✅ Aviso ativado');
  } catch (erro) {
    console.error('Erro ao alterar status do aviso:', erro);
    alert('❌ Erro ao atualizar aviso');
  }
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
  if (!timestamp) return 'Data não informada';
  
  const agora = new Date();
  const data = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const diffMs = agora - data;
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Agora mesmo';
  if (diffMins < 60) return `${diffMins} min atrás`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h atrás`;
  
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d atrás`;
  
  const diffWeeks = Math.floor(diffDays / 7);
  return `${diffWeeks} sem atrás`;
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
  const telefone = '559392059914';
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
