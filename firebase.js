// firebase.js - CONFIGURAÇÃO DO SEU FIREBASE
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
  createUserWithEmailAndPassword,
  signOut 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// ================= SUA CONFIGURAÇÃO FIREBASE =================
const firebaseConfig = {
  apiKey: "AIzaSyBdBJz8vNjr5LU2aP7aMymP2lf5rsosbwo",
  authDomain: "portal-qssma.firebaseapp.com",
  projectId: "portal-qssma",
  storageBucket: "portal-qssma.firebasestorage.app",
  messagingSenderId: "267009799858",
  appId: "1:267009799858:web:5c2155d34acd6cb0f13bab"
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
    console.error("Erro login:", error.code, error.message);
    throw error;
  }
}

// ================= FUNÇÕES DE COLABORADORES =================
async function getColaborador(matricula) {
  try {
    // Converter matrícula para maiúsculas e remover espaços
    const matriculaLimpa = matricula.trim().toUpperCase();
    
    console.log("🔍 Buscando colaborador com matrícula:", matriculaLimpa);
    
    // Primeiro, tentar buscar onde matrícula é o ID do documento
    const docRef = doc(db, 'colaboradores', matriculaLimpa);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      console.log("✅ Colaborador encontrado por ID:", docSnap.data());
      return { 
        exists: true, 
        data: docSnap.data(), 
        id: docSnap.id 
      };
    }
    
    // Se não encontrou, buscar na coleção onde matrícula é um campo
    const q = query(
      collection(db, 'colaboradores'),
      where("matricula", "==", matriculaLimpa)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      console.log("✅ Colaborador encontrado por campo matrícula:", querySnapshot.docs[0].data());
      return { 
        exists: true, 
        data: querySnapshot.docs[0].data(), 
        id: querySnapshot.docs[0].id 
      };
    }
    
    console.log("❌ Colaborador não encontrado");
    return { exists: false };
    
  } catch (error) {
    console.error("❌ Erro ao buscar colaborador:", error);
    return { 
      exists: false, 
      error: "Erro de conexão. Tente novamente." 
    };
  }
}

// ================= FUNÇÕES DE GESTORES =================
async function getGestorByEmail(email) {
  try {
    const emailLimpo = email.trim().toLowerCase();
    
    console.log("🔍 Buscando gestor com email:", emailLimpo);
    
    // Buscar na coleção gestores
    const q = query(
      collection(db, 'gestores'),
      where("email", "==", emailLimpo),
      where("ativo", "==", true)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      console.log("✅ Gestor encontrado:", querySnapshot.docs[0].data());
      return querySnapshot.docs[0];
    }
    
    console.log("❌ Gestor não encontrado na coleção");
    return null;
    
  } catch (error) {
    console.error("❌ Erro ao buscar gestor:", error);
    return null;
  }
}

// ================= FUNÇÕES DE AVISOS =================
async function getAvisosAtivos() {
  try {
    const q = query(
      collection(db, 'avisos'), 
      where("ativo", "==", true),
      orderBy('timestamp', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error("Erro ao buscar avisos:", error);
    return [];
  }
}

function monitorarAvisos(callback) {
  const q = query(
    collection(db, 'avisos'), 
    where("ativo", "==", true),
    orderBy('timestamp', 'desc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const avisos = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(avisos);
  }, (error) => {
    console.error("Erro monitoramento avisos:", error);
  });
}

async function addAviso(dados) {
  try {
    const docRef = await addDoc(collection(db, 'avisos'), {
      ...dados,
      timestamp: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error("Erro ao adicionar aviso:", error);
    throw error;
  }
}

async function updateAviso(avisoId, dados) {
  try {
    const docRef = doc(db, 'avisos', avisoId);
    await updateDoc(docRef, {
      ...dados,
      atualizadoEm: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error("Erro ao atualizar aviso:", error);
    throw error;
  }
}

async function deleteAviso(avisoId) {
  try {
    const docRef = doc(db, 'avisos', avisoId);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error("Erro ao excluir aviso:", error);
    throw error;
  }
}

// ================= FUNÇÕES DE FEEDBACK =================
async function addFeedback(dados) {
  try {
    const docRef = await addDoc(collection(db, 'feedbacks'), {
      ...dados,
      timestamp: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error("Erro ao adicionar feedback:", error);
    throw error;
  }
}

// ================= FUNÇÕES DE ESTATÍSTICAS =================
async function getEstatisticas() {
  try {
    const [avisosSnapshot, colaboradoresSnapshot] = await Promise.all([
      getDocs(collection(db, 'avisos')),
      getDocs(collection(db, 'colaboradores'))
    ]);

    return {
      totalAvisos: avisosSnapshot.size,
      avisosAtivos: avisosSnapshot.docs.filter(doc => doc.data().ativo === true).length,
      totalColaboradores: colaboradoresSnapshot.size,
      colaboradoresAtivos: colaboradoresSnapshot.docs.filter(doc => doc.data().ativo !== false).length,
    };
  } catch (error) {
    console.error("Erro ao buscar estatísticas:", error);
    return {
      totalAvisos: 0,
      avisosAtivos: 0,
      totalColaboradores: 0,
      colaboradoresAtivos: 0
    };
  }
}

// ================= FUNÇÃO PARA CRIAR DADOS INICIAIS =================
async function criarDadosIniciais() {
  try {
    console.log("🔧 Verificando dados iniciais...");
    
    // Verificar se já existem gestores
    const gestoresSnapshot = await getDocs(collection(db, 'gestores'));
    
    if (gestoresSnapshot.empty) {
      console.log("📝 Criando gestor administrador padrão...");
      
      // Criar gestor admin padrão
      await setDoc(doc(db, 'gestores', 'admin'), {
        nome: "Administrador QSSMA",
        email: "admin@qssma.com",
        senha: "admin123", // Senha para referência (será usada no Auth também)
        nivel: "admin",
        ativo: true,
        criadoEm: serverTimestamp()
      });
      
      console.log("✅ Gestor admin criado: admin@qssma.com / admin123");
    }
    
    // Verificar se já existem colaboradores de exemplo
    const colaboradoresSnapshot = await getDocs(collection(db, 'colaboradores'));
    
    if (colaboradoresSnapshot.empty) {
      console.log("📝 Criando colaboradores de exemplo...");
      
      // Criar alguns colaboradores de exemplo
      const colaboradoresExemplo = [
        {
          matricula: "QSSMA001",
          nome: "João da Silva",
          setor: "Segurança",
          funcao: "Técnico em Segurança",
          ativo: true,
          criadoEm: serverTimestamp()
        },
        {
          matricula: "QSSMA002",
          nome: "Maria Santos",
          setor: "Qualidade",
          funcao: "Analista de Qualidade",
          ativo: true,
          criadoEm: serverTimestamp()
        }
      ];
      
      for (const colaborador of colaboradoresExemplo) {
        await setDoc(doc(db, 'colaboradores', colaborador.matricula), colaborador);
      }
      
      console.log("✅ Colaboradores de exemplo criados");
      console.log("📋 Matrículas disponíveis: QSSMA001, QSSMA002");
    }
    
    console.log("🎉 Verificação de dados inicial concluída!");
    
  } catch (error) {
    console.error("❌ Erro ao criar dados iniciais:", error);
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
  onSnapshot,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  signInWithEmailAndPassword,
  signOut,
  
  // Funções específicas
  loginEmailSenha,
  getColaborador,
  getGestorByEmail,
  getAvisosAtivos,
  monitorarAvisos,
  addAviso,
  updateAviso,
  deleteAviso,
  addFeedback,
  getEstatisticas,
  criarDadosIniciais
};
