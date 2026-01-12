// firebase.js - VERSÃO SIMPLIFICADA E FUNCIONAL
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
  getFirestore, 
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { 
  getAuth,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// SUA CONFIGURAÇÃO DO FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyBdBJz8vNjr5LU2aP7aMymP2lf5rsosbwo",
  authDomain: "portal-qssma.firebaseapp.com",
  projectId: "portal-qssma",
  storageBucket: "portal-qssma.firebasestorage.app",
  messagingSenderId: "267009799858",
  appId: "1:267009799858:web:5c2155d34acd6cb0f13bab"
};

// INICIALIZAR FIREBASE
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// FUNÇÕES DE BANCO DE DADOS
async function buscarColaborador(matricula) {
  try {
    // Primeiro tenta como ID do documento
    const docRef = doc(db, "colaboradores", matricula);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { success: true, data: docSnap.data(), id: docSnap.id };
    }
    
    // Se não encontrou, busca por campo matrícula
    const q = query(
      collection(db, "colaboradores"),
      where("matricula", "==", matricula)
    );
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return { success: true, data: doc.data(), id: doc.id };
    }
    
    return { success: false, message: "Matrícula não encontrada" };
    
  } catch (error) {
    console.error("Erro ao buscar colaborador:", error);
    return { success: false, message: "Erro na conexão" };
  }
}

async function buscarGestorPorEmail(email) {
  try {
    const q = query(
      collection(db, "gestores"),
      where("email", "==", email),
      where("ativo", "==", true)
    );
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return { success: true, data: doc.data(), id: doc.id };
    }
    
    return { success: false, message: "Gestor não encontrado" };
    
  } catch (error) {
    console.error("Erro ao buscar gestor:", error);
    return { success: false, message: "Erro na conexão" };
  }
}

async function buscarAvisosAtivos() {
  try {
    const q = query(
      collection(db, "avisos"),
      where("ativo", "==", true),
      orderBy("timestamp", "desc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Erro ao buscar avisos:", error);
    return [];
  }
}

function monitorarAvisos(callback) {
  const q = query(
    collection(db, "avisos"),
    where("ativo", "==", true),
    orderBy("timestamp", "desc")
  );
  
  return onSnapshot(q, (snapshot) => {
    const avisos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(avisos);
  });
}

async function criarAviso(dados) {
  try {
    const docRef = await addDoc(collection(db, "avisos"), {
      ...dados,
      timestamp: serverTimestamp()
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Erro ao criar aviso:", error);
    return { success: false, message: error.message };
  }
}

async function atualizarAviso(id, dados) {
  try {
    const docRef = doc(db, "avisos", id);
    await updateDoc(docRef, {
      ...dados,
      atualizadoEm: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error("Erro ao atualizar aviso:", error);
    return { success: false, message: error.message };
  }
}

async function excluirAviso(id) {
  try {
    const docRef = doc(db, "avisos", id);
    await deleteDoc(docRef);
    return { success: true };
  } catch (error) {
    console.error("Erro ao excluir aviso:", error);
    return { success: false, message: error.message };
  }
}

async function criarFeedback(dados) {
  try {
    const docRef = await addDoc(collection(db, "feedbacks"), {
      ...dados,
      timestamp: serverTimestamp()
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Erro ao criar feedback:", error);
    return { success: false, message: error.message };
  }
}

async function criarDadosIniciais() {
  try {
    console.log("🔧 Verificando dados iniciais...");
    
    // Verificar colaboradores
    const colaboradoresSnapshot = await getDocs(collection(db, "colaboradores"));
    
    if (colaboradoresSnapshot.empty) {
      console.log("📝 Criando colaboradores de exemplo...");
      
      const colaboradores = [
        {
          matricula: "QSSMA001",
          nome: "João da Silva",
          setor: "Segurança",
          funcao: "Técnico em Segurança",
          ativo: true
        },
        {
          matricula: "QSSMA002",
          nome: "Maria Santos",
          setor: "Qualidade",
          funcao: "Analista de Qualidade",
          ativo: true
        }
      ];
      
      for (const colaborador of colaboradores) {
        await setDoc(doc(db, "colaboradores", colaborador.matricula), {
          ...colaborador,
          criadoEm: serverTimestamp()
        });
      }
      
      console.log("✅ Colaboradores criados: QSSMA001, QSSMA002");
    }
    
    // Verificar gestores
    const gestoresSnapshot = await getDocs(collection(db, "gestores"));
    
    if (gestoresSnapshot.empty) {
      console.log("📝 Criando gestor admin...");
      
      await setDoc(doc(db, "gestores", "admin"), {
        nome: "Administrador QSSMA",
        email: "admin@qssma.com",
        nivel: "admin",
        ativo: true,
        criadoEm: serverTimestamp()
      });
      
      console.log("✅ Gestor admin criado");
    }
    
    // Verificar avisos
    const avisosSnapshot = await getDocs(collection(db, "avisos"));
    
    if (avisosSnapshot.empty) {
      console.log("📝 Criando aviso de exemplo...");
      
      await addDoc(collection(db, "avisos"), {
        titulo: "Bem-vindo ao Portal QSSMA",
        mensagem: "Este é o sistema de gestão de Qualidade, Segurança, Saúde e Meio Ambiente. Utilize os formulários para registrar eventos importantes.",
        tipo: "informativo",
        destino: "todos",
        ativo: true,
        criadoPor: "Sistema",
        timestamp: serverTimestamp()
      });
      
      console.log("✅ Aviso de exemplo criado");
    }
    
    console.log("🎉 Dados iniciais verificados/criados!");
    
  } catch (error) {
    console.error("❌ Erro ao criar dados iniciais:", error);
  }
}

// EXPORTAR TODAS AS FUNÇÕES
export {
  db,
  auth,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  signInWithEmailAndPassword,
  signOut,
  
  // Funções personalizadas
  buscarColaborador,
  buscarGestorPorEmail,
  buscarAvisosAtivos,
  monitorarAvisos,
  criarAviso,
  atualizarAviso,
  excluirAviso,
  criarFeedback,
  criarDadosIniciais
};
