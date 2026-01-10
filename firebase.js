// firebase.js - Configuração completa do Firebase
// Importações do Firebase v9+ (modular)
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { 
  getFirestore,
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
  onSnapshot
} from "firebase/firestore";

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

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar serviços
const auth = getAuth(app);
const db = getFirestore(app);

// Exportar tudo
export {
  app,
  auth,
  db,
  // Firestore functions
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
  // Auth functions (se necessário)
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "firebase/firestore";

// Funções de autenticação (import separado)
import { 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged 
} from "firebase/auth";

// Re-exportar funções de auth
export { signInWithEmailAndPassword, signOut, onAuthStateChanged };

console.log('🔥 Firebase inicializado com sucesso');
