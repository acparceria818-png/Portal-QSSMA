// firebase.js - CONFIGURAÇÃO PORTAL QSSMA
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

// ================= CONFIGURAÇÃO FIREBASE =================
const firebaseConfig = {
  apiKey: "AIzaSyA5KEaKntt9wPYcy60DutrqvIH34piXsXk",
  authDomain: "transporte-f7aea.firebaseapp.com",
  databaseURL: "https://transporte-f7aea-default-rtdb.firebaseio.com",
  projectId: "transporte-f7aea",
  storageBucket: "transporte-f7aea.firebasestorage.app",
  messagingSenderId: "551406731008",
  appId: "1:551406731008:web:90855ffcd9ac0ef1d93de5"
};

// ================= INICIALIZAÇÃO =================
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ================= FUNÇÕES DE AUTENTICAÇÃO =================
async function loginEmailSenha(email, senha) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, senha);
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
    'auth/too-many-requests': 'Muitas tentativas. Tente novamente mais tarde'
  };
  return messages[errorCode] || 'Erro ao fazer login';
}

// ================= FUNÇÕES DE COLABORADORES =================
async function getColaborador(matricula) {
  const docRef = doc(db, 'colaboradores', matricula);
  return await getDoc(docRef);
}

async function getColaboradorByEmail(email) {
  const q = query(
    collection(db, 'colaboradores'),
    where("email", "==", email)
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.empty ? null : querySnapshot.docs[0];
}

async function getColaboradoresAtivos() {
  const q = query(
    collection(db, 'colaboradores'),
    where("ativo", "==", true)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ================= FUNÇÕES DE GESTORES =================
async function getGestorByEmail(email) {
  const q = query(
    collection(db, 'gestores'),
    where("email", "==", email),
    where("ativo", "==", true)
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.empty ? null : querySnapshot.docs[0];
}

async function getGestoresAtivos() {
  const q = query(
    collection(db, 'gestores'),
    where("ativo", "==", true)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ================= FUNÇÕES DE AVISOS =================
async function getAvisos() {
  const q = query(collection(db, 'avisos'), orderBy('timestamp', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function getAvisosAtivos() {
  const q = query(
    collection(db, 'avisos'), 
    where("ativo", "==", true),
    orderBy('timestamp', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function addAviso(dados) {
  return await addDoc(collection(db, 'avisos'), {
    ...dados,
    timestamp: serverTimestamp()
  });
}

async function updateAviso(avisoId, dados) {
  const docRef = doc(db, 'avisos', avisoId);
  return await updateDoc(docRef, {
    ...dados,
    atualizadoEm: serverTimestamp()
  });
}

async function deleteAviso(avisoId) {
  const docRef = doc(db, 'avisos', avisoId);
  return await deleteDoc(docRef);
}

// ================= FUNÇÕES DE FEEDBACK =================
async function addFeedback(dados) {
  return await addDoc(collection(db, 'feedbacks'), {
    ...dados,
    timestamp: serverTimestamp()
  });
}

async function getFeedbacksPendentes() {
  const q = query(
    collection(db, 'feedbacks'),
    where("status", "==", "pendente"),
    orderBy('timestamp', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function responderFeedback(feedbackId, resposta) {
  const docRef = doc(db, 'feedbacks', feedbackId);
  return await updateDoc(docRef, {
    status: 'respondido',
    resposta: resposta,
    respondidoEm: serverTimestamp()
  });
}

// ================= FUNÇÕES DE RELATÓRIOS =================
async function getEstatisticas() {
  const [avisosSnapshot, colaboradoresSnapshot, feedbacksSnapshot] = await Promise.all([
    getDocs(collection(db, 'avisos')),
    getDocs(collection(db, 'colaboradores')),
    getDocs(query(collection(db, 'feedbacks'), where('status', '==', 'pendente')))
  ]);

  return {
    totalAvisos: avisosSnapshot.size,
    avisosAtivos: avisosSnapshot.docs.filter(doc => doc.data().ativo === true).length,
    totalColaboradores: colaboradoresSnapshot.size,
    colaboradoresAtivos: colaboradoresSnapshot.docs.filter(doc => doc.data().ativo !== false).length,
    feedbacksPendentes: feedbacksSnapshot.docs.length
  };
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
  signInWithEmailAndPassword,
  signOut,
  
  // Funções específicas
  getColaborador,
  getColaboradorByEmail,
  getColaboradoresAtivos,
  getGestorByEmail,
  getGestoresAtivos,
  getAvisos,
  getAvisosAtivos,
  addAviso,
  updateAviso,
  deleteAviso,
  addFeedback,
  getFeedbacksPendentes,
  responderFeedback,
  getEstatisticas
};
