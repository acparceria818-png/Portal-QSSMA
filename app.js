// app.js - PORTAL QSSMA
import { 
  db, 
  collection, 
  getDocs, 
  query, 
  where, 
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  onSnapshot 
} from './firebase.js';

// Estado Global
let estadoApp = {
  usuario: null,
  gestor: null,
  avisos: []
};

// ========== INICIALIZAÇÃO ==========
document.addEventListener('DOMContentLoaded', () => {
  adicionarRodape();
  initDarkMode();
  verificarSessao();
  
  // Monitorar conexão
  window.addEventListener('online', () => updateStatus(true));
  window.addEventListener('offline', () => updateStatus(false));
});

// ========== RODAPÉ (Solicitado) ==========
function adicionarRodape() {
  const footer = document.createElement('footer');
  footer.className = 'footer-dev';
  footer.innerHTML = `
    <div class="footer-content">
      <p>Desenvolvido por Juan Sales</p>
      <p>Contato: 94 99223-3753 | Email: Juansalesadm@gmail.com</p>
    </div>
  `;
  document.body.appendChild(footer);
}

// ========== NAVEGAÇÃO ==========
window.mostrarTela = function(id) {
  document.querySelectorAll('.tela').forEach(t => t.classList.add('hidden'));
  document.querySelectorAll('.tela').forEach(t => t.classList.remove('ativa'));
  
  const tela = document.getElementById(id);
  if(tela) {
    tela.classList.remove('hidden');
    tela.classList.add('ativa');
    window.scrollTo(0,0);
  }
};

window.entrarNoPortal = () => window.mostrarTela('telaEscolhaPerfil');

window.selecionarPerfil = (perfil) => {
  if (perfil === 'usuario') window.mostrarTela('tela-usuario-login');
  if (perfil === 'gestor') window.mostrarTela('tela-gestor-login');
};

// ========== LOGIN USUÁRIO (FIREBASE REAL) ==========
window.confirmarMatriculaUsuario = async function() {
  const matricula = document.getElementById('matriculaUsuario').value.trim();
  const btn = document.getElementById('loginBtn');

  if (!matricula) return alert('Digite a matrícula');

  try {
    showLoading('Buscando colaborador...');
    btn.disabled = true;

    // Busca na coleção 'colaboradores'
    const q = query(collection(db, "colaboradores"), where("matricula", "==", matricula));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      alert('❌ Matrícula não encontrada no sistema.');
      btn.disabled = false;
      hideLoading();
      return;
    }

    // Pega os dados do primeiro documento encontrado
    const dados = querySnapshot.docs[0].data();
    
    estadoApp.usuario = {
      id: querySnapshot.docs[0].id,
      matricula: dados.matricula,
      nome: dados.nome,
      funcao: dados.funcao,
      setor: dados.setor || 'Segurança' // Default solicitado
    };

    // Salva sessão
    localStorage.setItem('qssma_user', JSON.stringify(estadoApp.usuario));
    localStorage.setItem('qssma_type', 'usuario');

    carregarDadosUsuarioTela();
    window.mostrarTela('tela-usuario');
    monitorarAvisos(); // Começa a escutar avisos

  } catch (error) {
    console.error("Erro login:", error);
    alert('Erro de conexão. Tente novamente.');
  } finally {
    hideLoading();
    btn.disabled = false;
  }
};

function carregarDadosUsuarioTela() {
  if (!estadoApp.usuario) return;
  document.getElementById('usuarioNome').textContent = estadoApp.usuario.nome;
  document.getElementById('usuarioFuncao').textContent = estadoApp.usuario.funcao;
  document.getElementById('usuarioMatricula').textContent = estadoApp.usuario.matricula;
  document.getElementById('usuarioSetor').textContent = estadoApp.usuario.setor;
}

// ========== LOGIN GESTOR (FIREBASE REAL) ==========
window.loginGestor = async function() {
  const email = document.getElementById('gestorEmail').value.trim();
  const senha = document.getElementById('gestorSenha').value.trim();
  const btn = document.getElementById('btnGestorLogin');

  if (!email || !senha) return alert('Preencha todos os campos');

  try {
    showLoading('Autenticando gestor...');
    btn.disabled = true;

    // Busca na coleção 'gestores'
    const q = query(collection(db, "gestores"), where("email", "==", email));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      alert('❌ E-mail de gestor não encontrado.');
      hideLoading();
      btn.disabled = false;
      return;
    }

    const dados = querySnapshot.docs[0].data();

    // Verificação simples de senha (conforme solicitado "definido no firebase")
    if (dados.senha !== senha) {
      alert('❌ Senha incorreta.');
      hideLoading();
      btn.disabled = false;
      return;
    }

    estadoApp.gestor = {
      nome: dados.nome,
      email: dados.email
    };

    localStorage.setItem('qssma_gestor', JSON.stringify(estadoApp.gestor));
    localStorage.setItem('qssma_type', 'gestor');

    document.getElementById('gestorNomeDisplay').textContent = `Olá, ${dados.nome}`;
    window.mostrarTela('tela-gestor-dashboard');

  } catch (error) {
    console.error(error);
    alert('Erro ao realizar login.');
  } finally {
    hideLoading();
    btn.disabled = false;
  }
};

// ========== LOGOUT ==========
window.logout = function() {
  localStorage.removeItem('qssma_user');
  localStorage.removeItem('qssma_gestor');
  localStorage.removeItem('qssma_type');
  estadoApp.usuario = null;
  estadoApp.gestor = null;
  
  // Limpa campos
  document.getElementById('matriculaUsuario').value = '';
  document.getElementById('gestorEmail').value = '';
  document.getElementById('gestorSenha').value = '';

  window.mostrarTela('welcome');
};

function verificarSessao() {
  const type = localStorage.getItem('qssma_type');
  
  if (type === 'usuario') {
    const savedUser = localStorage.getItem('qssma_user');
    if (savedUser) {
      estadoApp.usuario = JSON.parse(savedUser);
      carregarDadosUsuarioTela();
      monitorarAvisos();
      window.mostrarTela('tela-usuario');
    }
  } else if (type === 'gestor') {
    const savedGestor = localStorage.getItem('qssma_gestor');
    if (savedGestor) {
      estadoApp.gestor = JSON.parse(savedGestor);
      document.getElementById('gestorNomeDisplay').textContent = `Olá, ${estadoApp.gestor.nome}`;
      window.mostrarTela('tela-gestor-dashboard');
    }
  }
}

// ========== GESTÃO DE AVISOS (Novidade) ==========
window.adicionarNovoAviso = async function() {
  const titulo = prompt("Título do Aviso:");
  if(!titulo) return;
  
  const mensagem = prompt("Mensagem do Aviso:");
  if(!mensagem) return;

  try {
    showLoading('Salvando aviso...');
    await addDoc(collection(db, "avisos"), {
      titulo: titulo,
      mensagem: mensagem,
      data: serverTimestamp(),
      ativo: true
    });
    alert("✅ Aviso publicado com sucesso!");
  } catch (e) {
    alert("Erro ao publicar aviso");
  } finally {
    hideLoading();
  }
};

function monitorarAvisos() {
  // Escuta em tempo real a coleção avisos
  const q = query(collection(db, "avisos"));
  onSnapshot(q, (snapshot) => {
    estadoApp.avisos = [];
    snapshot.forEach((doc) => {
      estadoApp.avisos.push(doc.data());
    });
    
    // Atualiza contador na tela
    const count = document.getElementById('avisosCount');
    if(count) {
      count.textContent = estadoApp.avisos.length;
      count.style.display = estadoApp.avisos.length > 0 ? 'flex' : 'none';
    }
  });
}

window.mostrarAvisos = function() {
  if (estadoApp.avisos.length === 0) return alert("Nenhum aviso no momento.");
  
  let msg = "📢 AVISOS E COMUNICADOS:\n\n";
  estadoApp.avisos.forEach(aviso => {
    msg += `🔹 ${aviso.titulo}\n${aviso.mensagem}\n\n`;
  });
  alert(msg);
};

// ========== SUPORTE ==========
window.abrirSuporteWhatsApp = function() {
  // Número atualizado conforme pedido
  const phone = "559392059914"; 
  const text = encodeURIComponent("Olá, preciso de suporte no Portal QSSMA.");
  window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
};

// ========== UTILITÁRIOS ==========
function showLoading(msg) {
  document.getElementById('loadingOverlay').style.display = 'flex';
  document.getElementById('loadingText').textContent = msg;
}

function hideLoading() {
  document.getElementById('loadingOverlay').style.display = 'none';
}

function initDarkMode() {
  const btn = document.getElementById('darkToggle');
  btn.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    btn.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
  });
}

function updateStatus(online) {
  const el = document.getElementById('connectionStatus');
  el.style.color = online ? '#00ff00' : '#ff0000';
}
