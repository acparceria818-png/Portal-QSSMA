// firebase.js - VERSÃO COMPLETA CORRIGIDA
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
  signOut,
  createUserWithEmailAndPassword,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBdBJz8vNjr5LU2aP7aMymP2lf5rsosbwo",
  authDomain: "portal-qssma.firebaseapp.com",
  projectId: "portal-qssma",
  storageBucket: "portal-qssma.firebasestorage.app",
  messagingSenderId: "267009799858",
  appId: "1:267009799858:web:5c2155d34acd6cb0f13bab",
  measurementId: "G-EWK5550FTQ"
};

// Inicialização
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ================= AUTENTICAÇÃO =================
async function loginEmailSenha(email, senha) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, senha);
    return userCredential.user;
  } catch (error) {
    throw new Error(getErrorMessage(error.code));
  }
}

async function criarUsuario(email, senha, nome) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
    await updateProfile(userCredential.user, {
      displayName: nome
    });
    return userCredential.user;
  } catch (error) {
    throw new Error(getErrorMessage(error.code));
  }
}

function getErrorMessage(errorCode) {
  const messages = {
    'auth/invalid-email': 'E-mail inválido',
    'auth/user-disabled': 'Usuário desativado',
    'auth/user-not-found': 'Usuário não encontrado',
    'auth/wrong-password': 'Senha incorreta',
    'auth/email-already-in-use': 'E-mail já está em uso',
    'auth/weak-password': 'Senha muito fraca',
    'auth/too-many-requests': 'Muitas tentativas. Tente novamente mais tarde',
    'auth/operation-not-allowed': 'Operação não permitida'
  };
  return messages[errorCode] || 'Erro ao fazer login';
}

// ================= COLABORADORES =================
async function getColaborador(matricula) {
  const docRef = doc(db, 'colaboradores', matricula);
  return await getDoc(docRef);
}

async function getTodosColaboradores() {
  const snapshot = await getDocs(collection(db, 'colaboradores'));
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function criarColaborador(matricula, dados) {
  const docRef = doc(db, 'colaboradores', matricula);
  return await setDoc(docRef, {
    ...dados,
    criadoEm: serverTimestamp(),
    ativo: true
  });
}

async function atualizarColaborador(matricula, dados) {
  const docRef = doc(db, 'colaboradores', matricula);
  return await updateDoc(docRef, {
    ...dados,
    atualizadoEm: serverTimestamp()
  });
}

// ================= AVISOS =================
async function registrarAviso(dados) {
  return await addDoc(collection(db, 'avisos'), {
    ...dados,
    timestamp: serverTimestamp(),
    criadoPor: auth.currentUser?.email || 'Sistema'
  });
}

async function getAvisos() {
  const q = query(collection(db, 'avisos'), orderBy('timestamp', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function updateAviso(avisoId, dados) {
  const docRef = doc(db, 'avisos', avisoId);
  return await updateDoc(docRef, {
    ...dados,
    atualizadoEm: serverTimestamp(),
    atualizadoPor: auth.currentUser?.email || 'Sistema'
  });
}

async function deleteAviso(avisoId) {
  const docRef = doc(db, 'avisos', avisoId);
  return await deleteDoc(docRef);
}

// ================= MONITORAMENTO =================
function monitorarAvisos(callback) {
  const q = query(collection(db, 'avisos'), 
    where("ativo", "==", true),
    orderBy('timestamp', 'desc')
  );
  return onSnapshot(q, snapshot => {
    const dados = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(dados);
  });
}

function monitorarColaboradores(callback) {
  const q = query(collection(db, 'colaboradores'),
    where("ativo", "==", true)
  );
  return onSnapshot(q, snapshot => {
    const dados = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(dados);
  });
}

// ================= ESTATÍSTICAS =================
async function getEstatisticasDashboard() {
  try {
    const [avisosSnapshot, colaboradoresSnapshot] = await Promise.all([
      getDocs(query(collection(db, 'avisos'), where('ativo', '==', true))),
      getDocs(query(collection(db, 'colaboradores'), where('ativo', '==', true)))
    ]);

    return {
      totalAvisosAtivos: avisosSnapshot.docs.length,
      totalColaboradores: colaboradoresSnapshot.docs.length,
      usuariosOnline: 0 // Será implementado depois
    };
  } catch (error) {
    console.error('Erro ao carregar estatísticas:', error);
    return {
      totalAvisosAtivos: 0,
      totalColaboradores: 0,
      usuariosOnline: 0
    };
  }
}

// ================= EXPORTAÇÕES =================
export {
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
  
  // Autenticação
  loginEmailSenha,
  criarUsuario,
  signOut,
  
  // Colaboradores
  getColaborador,
  getTodosColaboradores,
  criarColaborador,
  atualizarColaborador,
  
  // Avisos
  registrarAviso,
  getAvisos,
  updateAviso,
  deleteAviso,
  
  // Monitoramento
  monitorarAvisos,
  monitorarColaboradores,
  
  // Dashboard
  getEstatisticasDashboard
};
