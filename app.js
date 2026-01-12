// app.js - PORTAL QSSMA
import { 
  db,
  auth,
  doc,
  getDoc,
  getColaborador,
  registrarAviso,
  getAvisos,
  updateAviso,
  deleteAviso,
  monitorarAvisos,
  getEstatisticasDashboard,
  loginEmailSenha
} from './firebase.js';

// Estado global do aplicativo
let estadoApp = {
  usuario: null,
  gestor: null,
  perfil: null,
  isOnline: navigator.onLine,
  avisosAtivos: [],
  unsubscribeAvisos: null,
  estatisticas: null
};

// ========== INICIALIZAÇÃO ==========
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Portal QSSMA - Inicializando...');
  
  // Verificar sessão existente
  verificarSessao();
  
  // Inicializar funcionalidades
  initDarkMode();
  initPWA();
  initEventListeners();
  initConnectionMonitor();
  initAvisos();
  
  console.log('✅ Portal QSSMA inicializado com sucesso');
});

// ========== GERENCIAMENTO DE SESSÃO ==========
function verificarSessao() {
  const perfil = localStorage.getItem('perfil_ativo');
  const matricula = localStorage.getItem('usuario_matricula');
  const nome = localStorage.getItem('usuario_nome');
  const gestorLogado = localStorage.getItem('gestor_logado');
  
  if (perfil === 'usuario' && matricula && nome) {
    estadoApp.usuario = { 
      matricula, 
      nome,
      funcao: localStorage.getItem('usuario_funcao') || 'Não informada'
    };
    estadoApp.perfil = 'usuario';
    mostrarTela('tela-usuario');
    updateUserStatus(nome, matricula);
    iniciarMonitoramentoAvisos();
  } else if (perfil === 'gestor' && gestorLogado) {
    estadoApp.perfil = 'gestor';
    estadoApp.gestor = { 
      nome: 'Gestor',
      email: localStorage.getItem('gestor_email')
    };
    mostrarTela('tela-gestor-dashboard');
    iniciarMonitoramentoAvisos();
    carregarEstatisticasGestor();
  }
}

function updateUserStatus(nome, matricula) {
  const userStatus = document.getElementById('userStatus');
  const userName = document.getElementById('userName');
  const colaboradorNome = document.getElementById('colaboradorNome');
  const colaboradorMatricula = document.getElementById('colaboradorMatricula');
  const colaboradorFuncao = document.getElementById('colaboradorFuncao');
  
  if (userStatus) userStatus.style.display = 'flex';
  if (userName) userName.textContent = nome;
  if (colaboradorNome) colaboradorNome.textContent = nome;
  if (colaboradorMatricula) colaboradorMatricula.textContent = matricula;
  if (colaboradorFuncao) {
    colaboradorFuncao.textContent = localStorage.getItem('usuario_funcao') || 'Não informada';
  }
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
  const loginBtn = document.getElementById('loginUsuarioBtn');
  
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
    
    const snap = await getColaborador(matricula);

    if (!snap.exists()) {
      alert('❌ Matrícula não encontrada');
      input.focus();
      return;
    }

    const dados = snap.data();

    if (!dados.ativo) {
      alert('❌ Colaborador inativo. Contate a gestão.');
      return;
    }

    localStorage.setItem('usuario_matricula', matricula);
    localStorage.setItem('usuario_nome', dados.nome);
    localStorage.setItem('usuario_funcao', dados.funcao || 'Não informada');
    localStorage.setItem('usuario_email', dados.email || '');
    localStorage.setItem('perfil_ativo', 'usuario');
    
    estadoApp.usuario = { 
      matricula, 
      nome: dados.nome,
      funcao: dados.funcao || 'Não informada',
      email: dados.email || ''
    };
    
    updateUserStatus(dados.nome, matricula);
    mostrarTela('tela-usuario');
    iniciarMonitoramentoAvisos();
    
    console.log('✅ Colaborador autenticado:', dados.nome);
    mostrarNotificacao('✅ Login realizado', `Bem-vindo(a), ${dados.nome}!`);

  } catch (erro) {
    console.error('Erro Firebase:', erro);
    alert('❌ Erro ao validar matrícula. Verifique sua conexão e tente novamente.');
  } finally {
    hideLoading();
    if (loginBtn) {
      loginBtn.disabled = false;
      loginBtn.textContent = 'Entrar';
    }
  }
};

// ========== LOGIN GESTOR ==========
window.loginGestor = async function () {
  const email = document.getElementById('gestorEmail').value;
  const senha = document.getElementById('gestorSenha').value;
  
  if (!email || !senha) {
    alert('Preencha e-mail e senha');
    return;
  }
  
  showLoading('🔐 Autenticando gestor...');
  
  try {
    // Autenticação via Firebase Auth
    const user = await loginEmailSenha(email, senha);
    
    localStorage.setItem('gestor_logado', 'true');
    localStorage.setItem('gestor_email', email);
    localStorage.setItem('gestor_uid', user.uid);
    localStorage.setItem('perfil_ativo', 'gestor');
    
    estadoApp.gestor = { 
      email, 
      uid: user.uid,
      nome: 'Gestor QSSMA'
    };
    
    mostrarTela('tela-gestor-dashboard');
    iniciarMonitoramentoAvisos();
    carregarEstatisticasGestor();
    
    console.log('✅ Gestor logado com sucesso');
    mostrarNotificacao('✅ Acesso Gestor', 'Painel administrativo liberado');
    
  } catch (erro) {
    console.error('Erro no login gestor:', erro);
    alert(`❌ Erro ao fazer login:\n\n${erro.message}`);
  } finally {
    hideLoading();
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
    avisosAtivos: [],
    unsubscribeAvisos: null,
    estatisticas: null
  };
  
  localStorage.removeItem('perfil_ativo');
  localStorage.removeItem('usuario_matricula');
  localStorage.removeItem('usuario_nome');
  localStorage.removeItem('usuario_funcao');
  localStorage.removeItem('usuario_email');
  localStorage.removeItem('gestor_logado');
  localStorage.removeItem('gestor_email');
  localStorage.removeItem('gestor_uid');
  
  const userStatus = document.getElementById('userStatus');
  if (userStatus) userStatus.style.display = 'none';
  
  mostrarTela('welcome');
  
  console.log('👋 Usuário deslogado');
  mostrarNotificacao('👋 Até logo', 'Você saiu do sistema');
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
    case 'tela-gestor-dashboard':
      carregarEstatisticasGestor();
      carregarAvisosGestor();
      break;
    case 'tela-usuario':
      atualizarInfoUsuario();
      break;
  }
  
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

function atualizarInfoUsuario() {
  if (!estadoApp.usuario) return;
  
  const nomeElement = document.getElementById('colaboradorNome');
  const matriculaElement = document.getElementById('colaboradorMatricula');
  const funcaoElement = document.getElementById('colaboradorFuncao');
  
  if (nomeElement) nomeElement.textContent = estadoApp.usuario.nome;
  if (matriculaElement) matriculaElement.textContent = estadoApp.usuario.matricula;
  if (funcaoElement) funcaoElement.textContent = estadoApp.usuario.funcao;
}

// ========== AVISOS ==========
function initAvisos() {
  const avisosBtn = document.getElementById('avisosBtn');
  if (avisosBtn) {
    avisosBtn.addEventListener('click', mostrarAvisos);
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
        <small>${aviso.timestamp ? new Date(aviso.timestamp.toDate()).toLocaleDateString() : ''}</small>
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

function iniciarMonitoramentoAvisos() {
  if (estadoApp.unsubscribeAvisos) return;
  
  estadoApp.unsubscribeAvisos = monitorarAvisos((avisos) => {
    estadoApp.avisosAtivos = avisos;
    
    const avisosCount = document.getElementById('avisosCount');
    if (avisosCount) {
      avisosCount.textContent = avisos.length;
      avisosCount.style.display = avisos.length > 0 ? 'inline' : 'none';
    }
    
    const avisosAtivosCount = document.getElementById('avisosAtivosCount');
    if (avisosAtivosCount) {
      avisosAtivosCount.textContent = avisos.length;
    }
  });
}

// ========== GESTÃO DE AVISOS (GESTOR) ==========
async function carregarAvisosGestor() {
  try {
    const avisos = await getAvisos();
    estadoApp.avisosAtivos = avisos;
    
    const container = document.getElementById('avisosAdminList');
    if (!container) return;
    
    if (avisos.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-bullhorn"></i>
          <h4>Nenhum aviso cadastrado</h4>
          <p>Clique em "Novo Aviso" para criar o primeiro.</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = avisos.map(aviso => `
      <div class="aviso-admin-item" id="aviso-${aviso.id}">
        <div class="aviso-admin-header">
          <div>
            <h4>${aviso.titulo}</h4>
            <small class="aviso-destino-badge">Para: ${aviso.destino || 'Todos'}</small>
            <small class="aviso-data">${aviso.timestamp ? new Date(aviso.timestamp.toDate()).toLocaleString() : ''}</small>
          </div>
          <div class="aviso-admin-actions">
            <button class="icon-btn" onclick="editarAviso('${aviso.id}')" title="Editar">
              <i class="fas fa-edit"></i>
            </button>
            <button class="icon-btn danger" onclick="excluirAviso('${aviso.id}')" title="Excluir">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
        <div class="aviso-admin-content">
          <p>${aviso.mensagem}</p>
          <div class="aviso-status">
            <span class="status-badge ${aviso.ativo ? 'ativo' : 'inativo'}">
              ${aviso.ativo ? 'Ativo' : 'Inativo'}
            </span>
          </div>
        </div>
      </div>
    `).join('');
    
  } catch (erro) {
    console.error('Erro ao carregar avisos:', erro);
    const container = document.getElementById('avisosAdminList');
    if (container) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-exclamation-triangle"></i>
          <h4>Erro ao carregar avisos</h4>
          <p>Tente novamente mais tarde.</p>
        </div>
      `;
    }
  }
}

window.criarNovoAviso = function() {
  const modal = document.createElement('div');
  modal.className = 'modal-back';
  modal.innerHTML = `
    <div class="modal">
      <button class="close" onclick="this.parentElement.parentElement.remove()">✕</button>
      <h3><i class="fas fa-plus"></i> Criar Novo Aviso</h3>
      
      <div class="form-group">
        <label>Título *</label>
        <input type="text" id="novoAvisoTitulo" class="form-input" placeholder="Título do aviso" required>
      </div>
      
      <div class="form-group">
        <label>Mensagem *</label>
        <textarea id="novoAvisoMensagem" class="form-input" rows="4" placeholder="Mensagem do aviso" required></textarea>
      </div>
      
      <div class="form-group">
        <label>Destino</label>
        <select id="novoAvisoDestino" class="form-input">
          <option value="todos">Todos</option>
          <option value="colaboradores">Colaboradores</option>
          <option value="gestores">Gestores</option>
        </select>
      </div>
      
      <div class="form-group">
        <label>
          <input type="checkbox" id="novoAvisoAtivo" checked> Aviso ativo
        </label>
      </div>
      
      <div class="form-actions">
        <button class="btn btn-primary" onclick="salvarNovoAviso()">
          <i class="fas fa-save"></i> Salvar Aviso
        </button>
        <button class="btn btn-secondary" onclick="this.parentElement.parentElement.parentElement.remove()">
          <i class="fas fa-times"></i> Cancelar
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  modal.style.display = 'flex';
};

window.salvarNovoAviso = async function() {
  const titulo = document.getElementById('novoAvisoTitulo').value;
  const mensagem = document.getElementById('novoAvisoMensagem').value;
  const destino = document.getElementById('novoAvisoDestino').value;
  const ativo = document.getElementById('novoAvisoAtivo').checked;
  
  if (!titulo || !mensagem) {
    alert('Preencha título e mensagem');
    return;
  }
  
  try {
    showLoading('Salvando aviso...');
    
    // Verificar se o usuário está autenticado
    if (!auth.currentUser) {
      throw new Error('Usuário não autenticado. Faça login novamente.');
    }
    
    await registrarAviso({
      titulo: titulo,
      mensagem: mensagem,
      destino: destino,
      ativo: ativo,
      timestamp: new Date()
    });
    
    mostrarNotificacao('✅ Aviso Criado', 'Aviso criado com sucesso!');
    
    document.querySelector('.modal-back').remove();
    carregarAvisosGestor();
    
  } catch (erro) {
    console.error('Erro ao salvar aviso:', erro);
    alert(`❌ Erro ao salvar aviso: ${erro.message}\n\nVerifique se está logado como gestor.`);
  } finally {
    hideLoading();
  }
};

window.editarAviso = async function(avisoId) {
  try {
    showLoading('Carregando aviso...');
    
    const aviso = estadoApp.avisosAtivos.find(a => a.id === avisoId);
    if (!aviso) {
      alert('Aviso não encontrado');
      return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal-back';
    modal.innerHTML = `
      <div class="modal">
        <button class="close" onclick="this.parentElement.parentElement.remove()">✕</button>
        <h3><i class="fas fa-edit"></i> Editar Aviso</h3>
        
        <div class="form-group">
          <label>Título *</label>
          <input type="text" id="editarAvisoTitulo" class="form-input" value="${aviso.titulo || ''}" required>
        </div>
        
        <div class="form-group">
          <label>Mensagem *</label>
          <textarea id="editarAvisoMensagem" class="form-input" rows="4" required>${aviso.mensagem || ''}</textarea>
        </div>
        
        <div class="form-group">
          <label>Destino</label>
          <select id="editarAvisoDestino" class="form-input">
            <option value="todos" ${aviso.destino === 'todos' ? 'selected' : ''}>Todos</option>
            <option value="colaboradores" ${aviso.destino === 'colaboradores' ? 'selected' : ''}>Colaboradores</option>
            <option value="gestores" ${aviso.destino === 'gestores' ? 'selected' : ''}>Gestores</option>
          </select>
        </div>
        
        <div class="form-group">
          <label>
            <input type="checkbox" id="editarAvisoAtivo" ${aviso.ativo ? 'checked' : ''}> Aviso ativo
          </label>
        </div>
        
        <div class="form-actions">
          <button class="btn btn-primary" onclick="salvarEdicaoAviso('${avisoId}')">
            <i class="fas fa-save"></i> Salvar Alterações
          </button>
          <button class="btn btn-secondary" onclick="this.parentElement.parentElement.parentElement.remove()">
            <i class="fas fa-times"></i> Cancelar
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'flex';
    
  } catch (erro) {
    console.error('Erro ao carregar aviso:', erro);
    alert('❌ Erro ao carregar aviso');
  } finally {
    hideLoading();
  }
};

window.salvarEdicaoAviso = async function(avisoId) {
  const titulo = document.getElementById('editarAvisoTitulo').value;
  const mensagem = document.getElementById('editarAvisoMensagem').value;
  const destino = document.getElementById('editarAvisoDestino').value;
  const ativo = document.getElementById('editarAvisoAtivo').checked;
  
  if (!titulo || !mensagem) {
    alert('Preencha título e mensagem');
    return;
  }
  
  try {
    showLoading('Salvando alterações...');
    
    await updateAviso(avisoId, {
      titulo: titulo,
      mensagem: mensagem,
      destino: destino,
      ativo: ativo,
      timestamp: new Date()
    });
    
    mostrarNotificacao('✅ Aviso Atualizado', 'Aviso atualizado com sucesso!');
    
    document.querySelector('.modal-back').remove();
    carregarAvisosGestor();
    
  } catch (erro) {
    console.error('Erro ao atualizar aviso:', erro);
    alert('❌ Erro ao atualizar aviso');
  } finally {
    hideLoading();
  }
};

window.excluirAviso = async function(avisoId) {
  if (!confirm('Tem certeza que deseja excluir este aviso?\n\nEsta ação não pode ser desfeita.')) {
    return;
  }
  
  try {
    showLoading('Excluindo aviso...');
    
    await deleteAviso(avisoId);
    
    mostrarNotificacao('✅ Aviso Excluído', 'Aviso excluído com sucesso!');
    
    const avisoElement = document.getElementById(`aviso-${avisoId}`);
    if (avisoElement) {
      avisoElement.remove();
    }
    
    if (document.querySelectorAll('.aviso-admin-item').length === 0) {
      const container = document.getElementById('avisosAdminList');
      if (container) {
        container.innerHTML = `
          <div class="empty-state">
            <i class="fas fa-bullhorn"></i>
            <h4>Nenhum aviso cadastrado</h4>
            <p>Clique em "Novo Aviso" para criar o primeiro.</p>
          </div>
        `;
      }
    }
    
  } catch (erro) {
    console.error('Erro ao excluir aviso:', erro);
    alert('❌ Erro ao excluir aviso');
  } finally {
    hideLoading();
  }
};

// ========== ESTATÍSTICAS GESTOR ==========
async function carregarEstatisticasGestor() {
  try {
    const estatisticas = await getEstatisticasDashboard();
    estadoApp.estatisticas = estatisticas;
    
    // Atualizar cards do dashboard
    const totalColaboradores = document.getElementById('totalColaboradores');
    const avisosAtivosCount = document.getElementById('avisosAtivosCount');
    const usuariosOnline = document.getElementById('usuariosOnline');
    
    if (totalColaboradores) totalColaboradores.textContent = estatisticas.totalColaboradores;
    if (avisosAtivosCount) avisosAtivosCount.textContent = estatisticas.totalAvisosAtivos;
    if (usuariosOnline) usuariosOnline.textContent = estatisticas.usuariosOnline;
    
    // Atualizar estatísticas na aba de relatórios
    const statColaboradores = document.getElementById('statColaboradores');
    const statAvisos = document.getElementById('statAvisos');
    
    if (statColaboradores) statColaboradores.textContent = estatisticas.totalColaboradores;
    if (statAvisos) statAvisos.textContent = estatisticas.totalAvisosAtivos;
    
  } catch (erro) {
    console.error('Erro ao carregar estatísticas:', erro);
  }
}

window.atualizarRelatorios = function() {
  carregarEstatisticasGestor();
  mostrarNotificacao('🔄 Atualizando', 'Estatísticas atualizadas');
};

window.exportarRelatorios = function() {
  if (!estadoApp.estatisticas) {
    alert('Nenhum dado disponível para exportar');
    return;
  }
  
  let csvContent = "Relatório Portal QSSMA\n";
  csvContent += `Data: ${new Date().toLocaleDateString()}\n\n`;
  csvContent += "Métrica,Valor\n";
  csvContent += `Colaboradores Cadastrados,${estadoApp.estatisticas.totalColaboradores}\n`;
  csvContent += `Avisos Ativos,${estadoApp.estatisticas.totalAvisosAtivos}\n`;
  csvContent += `Usuários Online,${estadoApp.estatisticas.usuariosOnline}\n`;
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `relatorio_qssma_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  mostrarNotificacao('✅ Relatório Exportado', 'Download iniciado!');
};

// ========== WHATSAPP SUPPORT ==========
window.abrirSuporteWhatsApp = function() {
  const telefone = '559392059914';
  const mensagem = encodeURIComponent('Olá! Preciso de suporte no Portal QSSMA.');
  const url = `https://wa.me/${telefone}?text=${mensagem}`;
  
  window.open(url, '_blank', 'noopener,noreferrer');
};

// ========== NOTIFICAÇÕES ==========
function mostrarNotificacao(titulo, mensagem) {
  if (!("Notification" in window)) {
    console.log("Este navegador não suporta notificações desktop");
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
    icon: 'logo.jpg',
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

// ========== EVENT LISTENERS ==========
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

console.log('🚀 app.js carregado com sucesso!');
