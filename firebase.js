// firebase.js - CONFIGURAÇÃO COMPLETA PARA PORTAL QSSMA
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";

import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  onSnapshot,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { 
  getAuth, 
  signInWithEmailAndPassword,
  signOut 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import { 
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// ================= CONFIGURAÇÃO FIREBASE =================
const firebaseConfig = {
  apiKey: "AIzaSyBdBJz8vNjr5LU2aP7aMymP2lf5rsosbwo",
  authDomain: "portal-qssma.firebaseapp.com",
  projectId: "portal-qssma",
  storageBucket: "portal-qssma.firebasestorage.app",
  messagingSenderId: "267009799858",
  appId: "1:267009799858:web:5c2155d34acd6cb0f13bab",
  measurementId: "G-EWK5550FTQ"
};

// ================= INICIALIZAÇÃO =================
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// ================= FUNÇÕES DE AUTENTICAÇÃO =================
async function loginEmailSenha(email, senha) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, senha);
    return userCredential.user;
  } catch (error) {
    throw new Error(getErrorMessage(error.code));
  }
}

async function logoutUsuario() {
  try {
    await signOut(auth);
    return true;
  } catch (error) {
    console.error('Erro ao fazer logout:', error);
    throw error;
  }
}

function getErrorMessage(errorCode) {
  const messages = {
    'auth/invalid-email': 'E-mail inválido',
    'auth/user-disabled': 'Usuário desativado',
    'auth/user-not-found': 'Usuário não encontrado',
    'auth/wrong-password': 'Senha incorreta',
    'auth/too-many-requests': 'Muitas tentativas. Tente novamente mais tarde',
    'auth/network-request-failed': 'Erro de conexão. Verifique sua internet'
  };
  return messages[errorCode] || 'Erro ao fazer login';
}

// ================= FUNÇÕES DE COLABORADORES =================
async function getColaborador(matricula) {
  try {
    const docRef = doc(db, 'colaboradores', matricula);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      return null;
    }
  } catch (error) {
    console.error('Erro ao buscar colaborador:', error);
    throw error;
  }
}

async function getColaboradorByEmail(email) {
  try {
    const q = query(
      collection(db, 'colaboradores'),
      where("email", "==", email)
    );
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    const doc = querySnapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  } catch (error) {
    console.error('Erro ao buscar colaborador por email:', error);
    throw error;
  }
}

async function criarColaborador(dados) {
  try {
    const docRef = doc(db, 'colaboradores', dados.matricula);
    await setDoc(docRef, {
      ...dados,
      dataCriacao: serverTimestamp(),
      dataAtualizacao: serverTimestamp()
    });
    return { id: dados.matricula, ...dados };
  } catch (error) {
    console.error('Erro ao criar colaborador:', error);
    throw error;
  }
}

async function atualizarColaborador(matricula, dados) {
  try {
    const docRef = doc(db, 'colaboradores', matricula);
    await updateDoc(docRef, {
      ...dados,
      dataAtualizacao: serverTimestamp()
    });
    return { id: matricula, ...dados };
  } catch (error) {
    console.error('Erro ao atualizar colaborador:', error);
    throw error;
  }
}

async function listarColaboradores() {
  try {
    const q = query(collection(db, 'colaboradores'), orderBy('nome'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Erro ao listar colaboradores:', error);
    throw error;
  }
}

// ================= FUNÇÕES DE INCIDENTES =================
async function registrarIncidente(dados) {
  try {
    const docRef = await addDoc(collection(db, 'incidentes'), {
      ...dados,
      status: 'pendente',
      dataRegistro: serverTimestamp(),
      dataAtualizacao: serverTimestamp()
    });
    
    return { id: docRef.id, ...dados };
  } catch (error) {
    console.error('Erro ao registrar incidente:', error);
    throw error;
  }
}

async function getIncidente(incidenteId) {
  try {
    const docRef = doc(db, 'incidentes', incidenteId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      return null;
    }
  } catch (error) {
    console.error('Erro ao buscar incidente:', error);
    throw error;
  }
}

async function listarIncidentes(filtros = {}) {
  try {
    let q = query(collection(db, 'incidentes'), orderBy('dataRegistro', 'desc'));
    
    if (filtros.status) {
      q = query(q, where('status', '==', filtros.status));
    }
    
    if (filtros.matricula) {
      q = query(q, where('matricula', '==', filtros.matricula));
    }
    
    if (filtros.tipo) {
      q = query(q, where('tipo', '==', filtros.tipo));
    }
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Erro ao listar incidentes:', error);
    throw error;
  }
}

async function atualizarIncidente(incidenteId, dados) {
  try {
    const docRef = doc(db, 'incidentes', incidenteId);
    await updateDoc(docRef, {
      ...dados,
      dataAtualizacao: serverTimestamp()
    });
    return { id: incidenteId, ...dados };
  } catch (error) {
    console.error('Erro ao atualizar incidente:', error);
    throw error;
  }
}

async function resolverIncidente(incidenteId, resolucao) {
  try {
    const docRef = doc(db, 'incidentes', incidenteId);
    await updateDoc(docRef, {
      status: 'resolvido',
      resolucao: resolucao,
      dataResolucao: serverTimestamp(),
      dataAtualizacao: serverTimestamp()
    });
    return incidenteId;
  } catch (error) {
    console.error('Erro ao resolver incidente:', error);
    throw error;
  }
}

// ================= FUNÇÕES DE EMERGÊNCIAS =================
async function registrarEmergencia(dados) {
  try {
    const docRef = await addDoc(collection(db, 'emergencias'), {
      ...dados,
      status: 'ativa',
      dataRegistro: serverTimestamp(),
      dataAtualizacao: serverTimestamp()
    });
    
    return { id: docRef.id, ...dados };
  } catch (error) {
    console.error('Erro ao registrar emergência:', error);
    throw error;
  }
}

async function listarEmergencias(filtros = {}) {
  try {
    let q = query(collection(db, 'emergencias'), orderBy('dataRegistro', 'desc'));
    
    if (filtros.status) {
      q = query(q, where('status', '==', filtros.status));
    }
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Erro ao listar emergências:', error);
    throw error;
  }
}

async function resolverEmergencia(emergenciaId, resolucao) {
  try {
    const docRef = doc(db, 'emergencias', emergenciaId);
    await updateDoc(docRef, {
      status: 'resolvida',
      resolucao: resolucao,
      dataResolucao: serverTimestamp(),
      dataAtualizacao: serverTimestamp()
    });
    return emergenciaId;
  } catch (error) {
    console.error('Erro ao resolver emergência:', error);
    throw error;
  }
}

// ================= FUNÇÕES DE FEEDBACK =================
async function registrarFeedback(dados) {
  try {
    const docRef = await addDoc(collection(db, 'feedbacks'), {
      ...dados,
      status: 'pendente',
      dataRegistro: serverTimestamp(),
      dataAtualizacao: serverTimestamp()
    });
    
    return { id: docRef.id, ...dados };
  } catch (error) {
    console.error('Erro ao registrar feedback:', error);
    throw error;
  }
}

async function listarFeedbacks(filtros = {}) {
  try {
    let q = query(collection(db, 'feedbacks'), orderBy('dataRegistro', 'desc'));
    
    if (filtros.status) {
      q = query(q, where('status', '==', filtros.status));
    }
    
    if (filtros.tipo) {
      q = query(q, where('tipo', '==', filtros.tipo));
    }
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Erro ao listar feedbacks:', error);
    throw error;
  }
}

async function responderFeedback(feedbackId, resposta) {
  try {
    const docRef = doc(db, 'feedbacks', feedbackId);
    await updateDoc(docRef, {
      status: 'respondido',
      resposta: resposta,
      dataResposta: serverTimestamp(),
      dataAtualizacao: serverTimestamp()
    });
    return feedbackId;
  } catch (error) {
    console.error('Erro ao responder feedback:', error);
    throw error;
  }
}

// ================= FUNÇÕES DE AVISOS =================
async function registrarAviso(dados) {
  try {
    const docRef = await addDoc(collection(db, 'avisos'), {
      ...dados,
      ativo: true,
      dataPublicacao: serverTimestamp(),
      dataAtualizacao: serverTimestamp()
    });
    
    return { id: docRef.id, ...dados };
  } catch (error) {
    console.error('Erro ao registrar aviso:', error);
    throw error;
  }
}

async function getAvisos() {
  try {
    const q = query(
      collection(db, 'avisos'), 
      where('ativo', '==', true),
      orderBy('dataPublicacao', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Erro ao buscar avisos:', error);
    throw error;
  }
}

async function updateAviso(avisoId, dados) {
  try {
    const docRef = doc(db, 'avisos', avisoId);
    await updateDoc(docRef, {
      ...dados,
      dataAtualizacao: serverTimestamp()
    });
    return { id: avisoId, ...dados };
  } catch (error) {
    console.error('Erro ao atualizar aviso:', error);
    throw error;
  }
}

async function deleteAviso(avisoId) {
  try {
    const docRef = doc(db, 'avisos', avisoId);
    await deleteDoc(docRef);
    return avisoId;
  } catch (error) {
    console.error('Erro ao excluir aviso:', error);
    throw error;
  }
}

// ================= FUNÇÕES DE TREINAMENTOS =================
async function registrarTreinamento(dados) {
  try {
    const docRef = await addDoc(collection(db, 'treinamentos'), {
      ...dados,
      status: 'agendado',
      dataCriacao: serverTimestamp(),
      dataAtualizacao: serverTimestamp()
    });
    
    return { id: docRef.id, ...dados };
  } catch (error) {
    console.error('Erro ao registrar treinamento:', error);
    throw error;
  }
}

async function listarTreinamentos(filtros = {}) {
  try {
    let q = query(collection(db, 'treinamentos'), orderBy('dataTreinamento', 'desc'));
    
    if (filtros.status) {
      q = query(q, where('status', '==', filtros.status));
    }
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Erro ao listar treinamentos:', error);
    throw error;
  }
}

// ================= FUNÇÕES DE EPIS =================
async function registrarEPI(dados) {
  try {
    const docRef = await addDoc(collection(db, 'epis'), {
      ...dados,
      status: 'ativo',
      dataCadastro: serverTimestamp(),
      dataAtualizacao: serverTimestamp()
    });
    
    return { id: docRef.id, ...dados };
  } catch (error) {
    console.error('Erro ao registrar EPI:', error);
    throw error;
  }
}

async function listarEPIs(filtros = {}) {
  try {
    let q = query(collection(db, 'epis'), orderBy('nome'));
    
    if (filtros.status) {
      q = query(q, where('status', '==', filtros.status));
    }
    
    if (filtros.categoria) {
      q = query(q, where('categoria', '==', filtros.categoria));
    }
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Erro ao listar EPIs:', error);
    throw error;
  }
}

// ================= FUNÇÕES DE PROCEDIMENTOS =================
async function registrarProcedimento(dados) {
  try {
    const docRef = await addDoc(collection(db, 'procedimentos'), {
      ...dados,
      status: 'ativo',
      dataCriacao: serverTimestamp(),
      dataAtualizacao: serverTimestamp()
    });
    
    return { id: docRef.id, ...dados };
  } catch (error) {
    console.error('Erro ao registrar procedimento:', error);
    throw error;
  }
}

async function listarProcedimentos(filtros = {}) {
  try {
    let q = query(collection(db, 'procedimentos'), orderBy('titulo'));
    
    if (filtros.categoria) {
      q = query(q, where('categoria', '==', filtros.categoria));
    }
    
    if (filtros.status) {
      q = query(q, where('status', '==', filtros.status));
    }
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Erro ao listar procedimentos:', error);
    throw error;
  }
}

// ================= FUNÇÕES DE RELATÓRIOS =================
async function gerarRelatorio(tipo, periodo) {
  try {
    const hoje = new Date();
    let dataInicio;
    
    switch(periodo) {
      case 'hoje':
        dataInicio = new Date(hoje.setHours(0, 0, 0, 0));
        break;
      case 'semana':
        dataInicio = new Date(hoje.setDate(hoje.getDate() - 7));
        break;
      case 'mes':
        dataInicio = new Date(hoje.setMonth(hoje.getMonth() - 1));
        break;
      default:
        dataInicio = new Date(hoje.setMonth(hoje.getMonth() - 1));
    }
    
    const collections = await Promise.all([
      getDocs(query(
        collection(db, 'incidentes'),
        where('dataRegistro', '>=', dataInicio),
        orderBy('dataRegistro', 'desc')
      )),
      getDocs(query(
        collection(db, 'emergencias'),
        where('dataRegistro', '>=', dataInicio),
        orderBy('dataRegistro', 'desc')
      )),
      getDocs(query(
        collection(db, 'feedbacks'),
        where('dataRegistro', '>=', dataInicio),
        orderBy('dataRegistro', 'desc')
      ))
    ]);
    
    return {
      periodo: periodo,
      dataInicio: dataInicio,
      dataFim: new Date(),
      incidentes: collections[0].docs.map(doc => ({ id: doc.id, ...doc.data() })),
      emergencias: collections[1].docs.map(doc => ({ id: doc.id, ...doc.data() })),
      feedbacks: collections[2].docs.map(doc => ({ id: doc.id, ...doc.data() }))
    };
  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    throw error;
  }
}

async function getEstatisticasDashboard() {
  try {
    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    
    const [
      incidentesSnapshot,
      emergenciasSnapshot,
      feedbacksSnapshot,
      colaboradoresSnapshot,
      treinamentosSnapshot
    ] = await Promise.all([
      getDocs(query(
        collection(db, 'incidentes'),
        where('dataRegistro', '>=', inicioMes)
      )),
      getDocs(query(
        collection(db, 'emergencias'),
        where('status', '==', 'ativa')
      )),
      getDocs(query(
        collection(db, 'feedbacks'),
        where('status', '==', 'pendente')
      )),
      getDocs(collection(db, 'colaboradores')),
      getDocs(query(
        collection(db, 'treinamentos'),
        where('status', '==', 'agendado')
      ))
    ]);
    
    // Contar incidentes por tipo
    const incidentesPorTipo = {};
    incidentesSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const tipo = data.tipo || 'outros';
      incidentesPorTipo[tipo] = (incidentesPorTipo[tipo] || 0) + 1;
    });
    
    return {
      totalIncidentes: incidentesSnapshot.docs.length,
      totalEmergencias: emergenciasSnapshot.docs.length,
      totalFeedbacks: feedbacksSnapshot.docs.length,
      totalColaboradores: colaboradoresSnapshot.docs.length,
      totalTreinamentos: treinamentosSnapshot.docs.length,
      incidentesPorTipo: incidentesPorTipo
    };
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    throw error;
  }
}

// ================= FUNÇÕES DE MONITORAMENTO EM TEMPO REAL =================
function monitorarIncidentes(callback) {
  return onSnapshot(
    query(collection(db, 'incidentes'), orderBy('dataRegistro', 'desc')),
    (snapshot) => {
      const incidentes = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(incidentes);
    },
    (error) => {
      console.error('Erro no monitoramento de incidentes:', error);
    }
  );
}

function monitorarEmergencias(callback) {
  return onSnapshot(
    query(
      collection(db, 'emergencias'),
      where('status', '==', 'ativa'),
      orderBy('dataRegistro', 'desc')
    ),
    (snapshot) => {
      const emergencias = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(emergencias);
    },
    (error) => {
      console.error('Erro no monitoramento de emergências:', error);
    }
  );
}

function monitorarFeedbacks(callback) {
  return onSnapshot(
    query(
      collection(db, 'feedbacks'),
      where('status', '==', 'pendente'),
      orderBy('dataRegistro', 'desc')
    ),
    (snapshot) => {
      const feedbacks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(feedbacks);
    },
    (error) => {
      console.error('Erro no monitoramento de feedbacks:', error);
    }
  );
}

function monitorarAvisos(callback) {
  return onSnapshot(
    query(
      collection(db, 'avisos'),
      where('ativo', '==', true),
      orderBy('dataPublicacao', 'desc')
    ),
    (snapshot) => {
      const avisos = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(avisos);
    },
    (error) => {
      console.error('Erro no monitoramento de avisos:', error);
    }
  );
}

// ================= FUNÇÕES DE ARQUIVOS =================
async function uploadArquivo(file, path) {
  try {
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return {
      url: downloadURL,
      path: path,
      nome: file.name,
      tipo: file.type,
      tamanho: file.size
    };
  } catch (error) {
    console.error('Erro ao fazer upload do arquivo:', error);
    throw error;
  }
}

// ================= EXPORTAÇÕES =================
export {
  // Firebase instances
  db,
  auth,
  storage,
  
  // Funções básicas do Firestore
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
  
  // Autenticação
  loginEmailSenha,
  logoutUsuario,
  getErrorMessage,
  
  // Colaboradores
  getColaborador,
  getColaboradorByEmail,
  criarColaborador,
  atualizarColaborador,
  listarColaboradores,
  
  // Incidentes
  registrarIncidente,
  getIncidente,
  listarIncidentes,
  atualizarIncidente,
  resolverIncidente,
  
  // Emergências
  registrarEmergencia,
  listarEmergencias,
  resolverEmergencia,
  
  // Feedbacks
  registrarFeedback,
  listarFeedbacks,
  responderFeedback,
  
  // Avisos
  registrarAviso,
  getAvisos,
  updateAviso,
  deleteAviso,
  
  // Treinamentos
  registrarTreinamento,
  listarTreinamentos,
  
  // EPIs
  registrarEPI,
  listarEPIs,
  
  // Procedimentos
  registrarProcedimento,
  listarProcedimentos,
  
  // Relatórios
  gerarRelatorio,
  getEstatisticasDashboard,
  
  // Monitoramento em tempo real
  monitorarIncidentes,
  monitorarEmergencias,
  monitorarFeedbacks,
  monitorarAvisos,
  
  // Arquivos
  uploadArquivo
};

console.log('🔥 Firebase configurado com sucesso!');
