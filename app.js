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
  serverTimestamp,
  signInWithEmailAndPassword,
  signOut
} from './firebase.js';

// Estado global do aplicativo
let estadoApp = {
  usuario: null,
  gestor: null,
  perfil: null,
  isOnline: navigator.onLine,
  avisosAtivos: [],
  unsubscribeAvisos: null,
  estatisticas: null,
  usuariosAtivos: []
};

// URLs dos formulários (fixos conforme solicitado)
const FORM_URLS = {
  'informe-evento': 'https://forms.gle/4kxcxyYX8wzdDyDt5',
  'radar-velocidade': 'https://forms.gle/BZahsh5ZAAVyixjx5',
  'flash-report': 'https://forms.gle/9d6f4w7hcpyDSCCs5'
};

// Contato de suporte
const SUPORTE_WHATSAPP = '+559392059914';

// ========== INICIALIZAÇÃO ==========
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Portal QSSMA - Inicializando...');
  
  // Adicionar rodapé em todas as páginas
  adicionarRodape();
  
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

// ========== ADICIONAR RODAPÉ ==========
function adicionarRodape() {
  if (document.querySelector('.footer-dev')) return;
  
  const footer = document.createElement('footer');
  footer.className = 'footer-dev';
  footer.innerHTML = `
    <div class="footer-content">
      <span>Desenvolvido por Juan Sales</span>
      <div class="footer-contacts">
        <a href="tel:+5594992233753"><i class="fas fa-phone"></i> (94) 99223-3753</a>
        <a href="mailto:Juansalesadm@gmail.com"><i class="fas fa-envelope"></i> Juansalesadm@gmail.com</a>
      </div>
    </div>
  `;
  document.body.appendChild(footer);
}

// ========== GERENCIAMENTO DE SESSÃO ==========
function verificarSessao() {
  const perfil = localStorage.getItem('perfil_ativo');
  const usuarioMatricula = localStorage.getItem('usuario_matricula');
  const usuarioNome = localStorage.getItem('usuario_nome');
  const gestorLogado = localStorage.getItem('gestor_logado');
  
  if (perfil === 'usuario' && usuarioMatricula && usuarioNome) {
    estadoApp.usuario = { 
      matricula: usuarioMatricula,
      nome: usuarioNome,
      setor: localStorage.getItem('usuario_setor') || 'Segurança',
      funcao: localStorage.getItem('usuario_funcao') || 'Colaborador'
    };
    estadoApp.perfil = 'usuario';
    mostrarTela('tela-usuario');
    updateUserStatus(usuarioNome, usuarioMatricula);
    iniciarMonitoramentoAvisos();
    
  } else if (perfil === 'gestor' && gestorLogado) {
    estadoApp.perfil = 'gestor';
    estadoApp.gestor = { 
      nome: localStorage.getItem('gestor_nome') || 'Gestor QSSMA',
      email: localStorage.getItem('gestor_email')
    };
    mostrarTela('tela-gestor-dashboard');
    iniciarMonitoramentoAvisos();
    carregarEstatisticas();
  }
}

function updateUserStatus(nome, matricula) {
  const userStatus = document.getElementById('userStatus');
  const userName = document.getElementById('userName');
  
  if (userStatus) userStatus.style.display = 'flex';
  if (userName) userName.textContent = nome;
  
  if (estadoApp.usuario) {
    const usuarioNome = document.getElementById('usuarioNome');
    const usuarioMatricula = document.getElementById('usuarioMatricula');
    const usuarioSetor = document.getElementById('usuarioSetor');
    const usuarioFuncao = document.getElementById('usuarioFuncao');
    
    if (usuarioNome) usuarioNome.textContent = estadoApp.usuario.nome;
    if (usuarioMatricula) usuarioMatricula.textContent = estadoApp.usuario.matricula;
    if (usuarioSetor) usuarioSetor.textContent = estadoApp.usuario.setor;
    if (usuarioFuncao) usuarioFuncao.textContent = estadoApp.usuario.funcao;
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
window.loginUsuario = async function () {
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
    
    // Buscar colaborador no Firebase
    const docRef = doc(db, 'colaboradores', matricula);
    const snap = await getDoc(docRef);

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

    // Salvar dados na sessão
    localStorage.setItem('usuario_matricula', matricula);
    localStorage.setItem('usuario_nome', dados.nome);
    localStorage.setItem('usuario_setor', dados.setor || 'Segurança');
    localStorage.setItem('usuario_funcao', dados.funcao || 'Colaborador');
    localStorage.setItem('perfil_ativo', 'usuario');
    
    estadoApp.usuario = { 
      matricula, 
      nome: dados.nome,
      setor: dados.setor || 'Segurança',
      funcao: dados.funcao || 'Colaborador'
    };
    
    console.log('✅ Colaborador autenticado:', dados.nome);
    
    mostrarTela('tela-usuario');
    updateUserStatus(dados.nome, matricula);
    iniciarMonitoramentoAvisos();

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
    // Usar Firebase Authentication
    const userCredential = await signInWithEmailAndPassword(auth, email, senha);
    const user = userCredential.user;
    
    // Buscar dados adicionais do gestor
    const q = query(collection(db, 'gestores'), where("email", "==", email));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      alert('❌ Gestor não encontrado no sistema');
      await signOut(auth);
      hideLoading();
      return;
    }
    
    const gestorData = snapshot.docs[0].data();
    
    // Salvar sessão
    localStorage.setItem('gestor_logado', 'true');
    localStorage.setItem('gestor_email', email);
    localStorage.setItem('gestor_nome', gestorData.nome || 'Gestor QSSMA');
    localStorage.setItem('gestor_id', snapshot.docs[0].id);
    localStorage.setItem('perfil_ativo', 'gestor');
    
    estadoApp.gestor = { 
      email, 
      nome: gestorData.nome || 'Gestor QSSMA',
      id: snapshot.docs[0].id
    };
    
    mostrarTela('tela-gestor-dashboard');
    iniciarMonitoramentoAvisos();
    carregarEstatisticas();
    
    console.log('✅ Gestor autenticado com sucesso:', gestorData.nome);
    
  } catch (erro) {
    console.error('Erro login gestor:', erro);
    
    // Mensagens de erro amigáveis
    let mensagemErro = 'Erro ao fazer login';
    if (erro.code === 'auth/invalid-email') {
      mensagemErro = 'E-mail inválido';
    } else if (erro.code === 'auth/user-disabled') {
      mensagemErro = 'Usuário desativado';
    } else if (erro.code === 'auth/user-not-found') {
      mensagemErro = 'Gestor não encontrado';
    } else if (erro.code === 'auth/wrong-password') {
      mensagemErro = 'Senha incorreta';
    } else if (erro.code === 'auth/too-many-requests') {
      mensagemErro = 'Muitas tentativas. Tente novamente mais tarde';
    }
    
    alert(`❌ ${mensagemErro}`);
  } finally {
    hideLoading();
  }
};

// ========== LOGOUT ==========
window.logout = async function () {
  try {
    // Se for gestor, fazer logout do Firebase Auth
    if (estadoApp.perfil === 'gestor' && auth.currentUser) {
      await signOut(auth);
    }
  } catch (erro) {
    console.error('Erro ao fazer logout:', erro);
  }
  
  // Limpar unsubscribe
  if (estadoApp.unsubscribeAvisos) estadoApp.unsubscribeAvisos();
  
  // Limpar estado
  estadoApp = {
    usuario: null,
    gestor: null,
    perfil: null,
    isOnline: navigator.onLine,
    avisosAtivos: [],
    unsubscribeAvisos: null,
    estatisticas: null,
    usuariosAtivos: []
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
  localStorage.removeItem('gestor_id');
  
  // Limpar UI
  const userStatus = document.getElementById('userStatus');
  if (userStatus) userStatus.style.display = 'none';
  
  mostrarTela('welcome');
  
  console.log('👋 Usuário deslogado');
};

// ========== FUNÇÕES DOS FORMULÁRIOS ==========
window.abrirFormulario = function(tipo) {
  const url = FORM_URLS[tipo];
  if (url) {
    window.open(url, '_blank', 'noopener,noreferrer');
    mostrarNotificacao('📋 Formulário Aberto', `Abrindo ${getNomeFormulario(tipo)}`);
  } else {
    alert('Formulário não disponível');
  }
};

function getNomeFormulario(tipo) {
  const nomes = {
    'informe-evento': 'Informe de Evento',
    'radar-velocidade': 'Radar Móvel de Velocidade',
    'flash-report': 'Flash Report'
  };
  return nomes[tipo] || 'Formulário';
}

// ========== SUPORTE WHATSAPP ==========
window.abrirSuporteWhatsApp = function() {
  const mensagem = encodeURIComponent('Olá! Preciso de suporte no Portal QSSMA.');
  const url = `https://wa.me/${SUPORTE_WHATSAPP.replace(/\D/g, '')}?text=${mensagem}`;
  
  window.open(url, '_blank', 'noopener,noreferrer');
  mostrarNotificacao('📞 Suporte', 'Abrindo WhatsApp de suporte');
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
  
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// ========== MONITORAMENTO DE AVISOS ==========
function iniciarMonitoramentoAvisos() {
  if (estadoApp.unsubscribeAvisos) {
    estadoApp.unsubscribeAvisos();
  }
  
  const q = query(
    collection(db, 'avisos'),
    where("ativo", "==", true),
    orderBy("timestamp", "desc")
  );
  
  estadoApp.unsubscribeAvisos = onSnapshot(q, (snapshot) => {
    const avisos = [];
    snapshot.forEach(docSnap => {
      avisos.push({ id: docSnap.id, ...docSnap.data() });
    });
    
    estadoApp.avisosAtivos = avisos;
    atualizarContadorAvisos();
    
    // Atualizar lista de avisos se estiver visível
    if (document.getElementById('tela-gestor-dashboard')?.classList.contains('ativa')) {
      atualizarListaAvisosGestor(avisos);
    }
  }, (erro) => {
    console.error('Erro ao monitorar avisos:', erro);
  });
}

function atualizarContadorAvisos() {
  const avisosCount = document.getElementById('avisosCount');
  const avisosCountUsuario = document.getElementById('avisosCountUsuario');
  const count = estadoApp.avisosAtivos.length;
  
  if (avisosCount) {
    avisosCount.textContent = count;
    avisosCount.style.display = count > 0 ? 'inline' : 'none';
  }
  
  if (avisosCountUsuario) {
    avisosCountUsuario.textContent = count;
    avisosCountUsuario.style.display = count > 0 ? 'inline' : 'none';
  }
}

// ========== MOSTRAR AVISOS ==========
window.mostrarAvisos = function() {
  const avisos = estadoApp.avisosAtivos || [];
  
  if (avisos.length === 0) {
    alert('📭 Nenhum aviso no momento');
    return;
  }
  
  const avisosHTML = avisos.map(aviso => `
    <div class="aviso-item" data-tipo="${aviso.tipo || 'informativo'}">
      <div class="aviso-header">
        <div class="aviso-titulo">${aviso.titulo}</div>
        <div class="aviso-metadata">
          <span class="aviso-tipo ${aviso.tipo || 'informativo'}">
            ${aviso.tipo || 'Informativo'}
          </span>
          <span class="aviso-destino">Para: ${aviso.destino || 'Todos'}</span>
          <span class="aviso-data">
            <i class="fas fa-calendar"></i> 
            ${aviso.timestamp ? new Date(aviso.timestamp.toDate()).toLocaleDateString('pt-BR') : ''}
          </span>
        </div>
      </div>
      <div class="aviso-mensagem">${aviso.mensagem}</div>
    </div>
  `).join('');
  
  const modal = document.getElementById('avisosModal');
  const avisosDinamicos = document.getElementById('avisosDinamicos');
  
  if (modal && avisosDinamicos) {
    avisosDinamicos.innerHTML = avisosHTML;
    modal.style.display = 'flex';
  }
};

// ========== FUNÇÕES DO GESTOR ==========
async function carregarEstatisticas() {
  try {
    // Carregar estatísticas básicas
    const [avisosSnapshot, usuariosSnapshot] = await Promise.all([
      getDocs(collection(db, 'avisos')),
      getDocs(collection(db, 'colaboradores'))
    ]);
    
    const estatisticas = {
      totalAvisos: avisosSnapshot.size,
      avisosAtivos: avisosSnapshot.docs.filter(doc => doc.data().ativo === true).length,
      totalUsuarios: usuariosSnapshot.size,
      usuariosAtivos: usuariosSnapshot.docs.filter(doc => doc.data().ativo !== false).length
    };
    
    estadoApp.estatisticas = estatisticas;
    
    // Atualizar contadores na tela
    document.getElementById('usuariosAtivosCount').textContent = estatisticas.usuariosAtivos;
    document.getElementById('eventosCount').textContent = '0'; // Placeholder
    document.getElementById('radaresCount').textContent = '0'; // Placeholder
    document.getElementById('reportsCount').textContent = '0'; // Placeholder
    
  } catch (erro) {
    console.error('Erro ao carregar estatísticas:', erro);
  }
}

function atualizarListaAvisosGestor(avisos) {
  const container = document.getElementById('avisosList');
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
    <div class="aviso-item" data-tipo="${aviso.tipo || 'informativo'}">
      <div class="aviso-header">
        <div class="aviso-titulo">${aviso.titulo}</div>
        <div class="aviso-metadata">
          <span class="aviso-tipo ${aviso.tipo || 'informativo'}">
            ${aviso.tipo || 'Informativo'}
          </span>
          <span class="aviso-destino">Para: ${aviso.destino || 'Todos'}</span>
          <span class="aviso-data">
            <i class="fas fa-calendar"></i> 
            ${aviso.timestamp ? new Date(aviso.timestamp.toDate()).toLocaleDateString('pt-BR') : ''}
          </span>
          <span class="aviso-status ${aviso.ativo ? 'ativo' : 'inativo'}">
            ${aviso.ativo ? 'Ativo' : 'Inativo'}
          </span>
        </div>
      </div>
      <div class="aviso-mensagem">${aviso.mensagem}</div>
      <div class="aviso-actions">
        <button class="btn btn-small" onclick="editarAviso('${aviso.id}')">
          <i class="fas fa-edit"></i> Editar
        </button>
        <button class="btn btn-small ${aviso.ativo ? 'btn-warning' : 'btn-success'}" 
                onclick="toggleAviso('${aviso.id}', ${aviso.ativo})">
          <i class="fas ${aviso.ativo ? 'fa-eye-slash' : 'fa-eye'}"></i> 
          ${aviso.ativo ? 'Desativar' : 'Ativar'}
        </button>
        <button class="btn btn-small btn-danger" onclick="excluirAviso('${aviso.id}')">
          <i class="fas fa-trash"></i> Excluir
        </button>
      </div>
    </div>
  `).join('');
}

// ========== CRUD DE AVISOS (GESTOR) ==========
window.criarNovoAviso = function() {
  openModal('novoAvisoModal');
};

window.salvarNovoAviso = async function() {
  const titulo = document.getElementById('novoAvisoTitulo').value;
  const mensagem = document.getElementById('novoAvisoMensagem').value;
  const tipo = document.getElementById('novoAvisoTipo').value;
  const destino = document.getElementById('novoAvisoDestino').value;
  const ativo = document.getElementById('novoAvisoAtivo').checked;
  
  if (!titulo || !mensagem) {
    alert('Preencha título e mensagem');
    return;
  }
  
  try {
    showLoading('Salvando aviso...');
    
    await addDoc(collection(db, 'avisos'), {
      titulo,
      mensagem,
      tipo,
      destino,
      ativo,
      criadoPor: estadoApp.gestor?.nome || 'Gestor',
      timestamp: serverTimestamp()
    });
    
    mostrarNotificacao('✅ Aviso Criado', 'Aviso criado com sucesso!');
    closeModal('novoAvisoModal');
    
    // Limpar formulário
    document.getElementById('novoAvisoTitulo').value = '';
    document.getElementById('novoAvisoMensagem').value = '';
    
  } catch (erro) {
    console.error('Erro ao salvar aviso:', erro);
    alert('❌ Erro ao salvar aviso');
  } finally {
    hideLoading();
  }
};

window.editarAviso = async function(avisoId) {
  const aviso = estadoApp.avisosAtivos.find(a => a.id === avisoId);
  if (!aviso) {
    alert('Aviso não encontrado');
    return;
  }
  
  // Criar modal de edição
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
        <label>Tipo</label>
        <select id="editarAvisoTipo" class="form-input">
          <option value="informativo" ${aviso.tipo === 'informativo' ? 'selected' : ''}>Informativo</option>
          <option value="importante" ${aviso.tipo === 'importante' ? 'selected' : ''}>Importante</option>
          <option value="urgente" ${aviso.tipo === 'urgente' ? 'selected' : ''}>Urgente</option>
          <option value="emergencia" ${aviso.tipo === 'emergencia' ? 'selected' : ''}>Emergência</option>
        </select>
      </div>
      
      <div class="form-group">
        <label>Destino</label>
        <select id="editarAvisoDestino" class="form-input">
          <option value="todos" ${aviso.destino === 'todos' ? 'selected' : ''}>Todos os usuários</option>
          <option value="gestores" ${aviso.destino === 'gestores' ? 'selected' : ''}>Apenas gestores</option>
          <option value="colaboradores" ${aviso.destino === 'colaboradores' ? 'selected' : ''}>Apenas colaboradores</option>
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
        <button class="btn btn-secondary" onclick="this.parentElement.parentElement.remove()">
          <i class="fas fa-times"></i> Cancelar
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  modal.style.display = 'flex';
};

window.salvarEdicaoAviso = async function(avisoId) {
  const titulo = document.getElementById('editarAvisoTitulo').value;
  const mensagem = document.getElementById('editarAvisoMensagem').value;
  const tipo = document.getElementById('editarAvisoTipo').value;
  const destino = document.getElementById('editarAvisoDestino').value;
  const ativo = document.getElementById('editarAvisoAtivo').checked;
  
  if (!titulo || !mensagem) {
    alert('Preencha título e mensagem');
    return;
  }
  
  try {
    showLoading('Salvando alterações...');
    
    const avisoRef = doc(db, 'avisos', avisoId);
    await updateDoc(avisoRef, {
      titulo,
      mensagem,
      tipo,
      destino,
      ativo,
      atualizadoEm: serverTimestamp()
    });
    
    mostrarNotificacao('✅ Aviso Atualizado', 'Aviso atualizado com sucesso!');
    document.querySelector('.modal-back').remove();
    
  } catch (erro) {
    console.error('Erro ao atualizar aviso:', erro);
    alert('❌ Erro ao atualizar aviso');
  } finally {
    hideLoading();
  }
};

window.toggleAviso = async function(avisoId, ativoAtual) {
  try {
    showLoading(ativoAtual ? 'Desativando aviso...' : 'Ativando aviso...');
    
    const avisoRef = doc(db, 'avisos', avisoId);
    await updateDoc(avisoRef, {
      ativo: !ativoAtual,
      atualizadoEm: serverTimestamp()
    });
    
    mostrarNotificacao('✅ Aviso Atualizado', `Aviso ${ativoAtual ? 'desativado' : 'ativado'} com sucesso!`);
    
  } catch (erro) {
    console.error('Erro ao alterar status do aviso:', erro);
    alert('❌ Erro ao alterar status do aviso');
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
    
    const avisoRef = doc(db, 'avisos', avisoId);
    await deleteDoc(avisoRef);
    
    mostrarNotificacao('✅ Aviso Excluído', 'Aviso excluído com sucesso!');
    
  } catch (erro) {
    console.error('Erro ao excluir aviso:', erro);
    alert('❌ Erro ao excluir aviso');
  } finally {
    hideLoading();
  }
};

// ========== FEEDBACK ==========
window.abrirFeedback = function() {
  mostrarTela('tela-feedback');
};

window.enviarFeedback = async function() {
  const tipo = document.getElementById('feedbackTipo').value;
  const mensagem = document.getElementById('feedbackMensagem').value;
  
  if (!tipo || !mensagem) {
    alert('Preencha todos os campos');
    return;
  }
  
  if (mensagem.length < 10) {
    alert('A mensagem deve ter pelo menos 10 caracteres');
    return;
  }
  
  try {
    showLoading('Enviando feedback...');
    
    const dadosFeedback = {
      tipo,
      mensagem,
      status: 'pendente',
      timestamp: serverTimestamp()
    };
    
    if (estadoApp.usuario) {
      dadosFeedback.remetente = estadoApp.usuario.nome;
      dadosFeedback.matricula = estadoApp.usuario.matricula;
      dadosFeedback.perfil = 'usuario';
    } else if (estadoApp.gestor) {
      dadosFeedback.remetente = estadoApp.gestor.nome;
      dadosFeedback.perfil = 'gestor';
    }
    
    await addDoc(collection(db, 'feedbacks'), dadosFeedback);
    
    document.getElementById('feedbackMensagem').value = '';
    
    if (estadoApp.usuario) {
      mostrarTela('tela-usuario');
    } else if (estadoApp.gestor) {
      mostrarTela('tela-gestor-dashboard');
    }
    
    mostrarNotificacao('✅ Feedback Enviado', 'Obrigado pelo seu feedback!');
    
  } catch (erro) {
    console.error('Erro ao enviar feedback:', erro);
    alert('❌ Erro ao enviar feedback. Tente novamente.');
  } finally {
    hideLoading();
  }
};

// ========== NOTIFICAÇÕES ==========
function mostrarNotificacao(titulo, mensagem) {
  // Criar notificação na tela
  criarNotificacaoTela(titulo, mensagem);
  
  // Notificação do navegador (se permitido)
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(titulo, {
      body: mensagem,
      icon: 'logo.jpg'
    });
  }
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
  
  // Remover automaticamente após 5 segundos
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

function initEventListeners() {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAllModals();
    }
  });
  
  // Fechar modal ao clicar fora
  document.querySelectorAll('.modal-back').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
      }
    });
  });
}

function closeAllModals() {
  document.querySelectorAll('.modal-back').forEach(modal => {
    modal.style.display = 'none';
  });
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
    offlineBanner.style.display = estadoApp.isOnline ? 'none' : 'flex';
  }
  
  if (!estadoApp.isOnline) {
    console.warn('📶 Aplicativo offline');
    mostrarNotificacao('📶 Modo Offline', 'Algumas funcionalidades podem não estar disponíveis');
  }
}

// ========== AVISOS ==========
function initAvisos() {
  const avisosBtn = document.getElementById('avisosBtn');
  if (avisosBtn) {
    avisosBtn.addEventListener('click', mostrarAvisos);
  }
}

// ========== FUNÇÕES DE TEMAS ==========
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
}

function updateDarkModeIcon(isDark) {
  const darkToggle = document.getElementById('darkToggle');
  if (!darkToggle) return;
  
  darkToggle.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
  darkToggle.setAttribute('title', isDark ? 'Alternar para modo claro' : 'Alternar para modo escuro');
}

// ========== PWA ==========
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

console.log('🚀 Portal QSSMA carregado com sucesso!');
