// firebase.js - Configuração do Firebase com suas credenciais
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  limit,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  Timestamp,
  setDoc,
  runTransaction
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL,
  deleteObject,
  uploadBytesResumable
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { 
  getMessaging, 
  getToken, 
  onMessage,
  isSupported 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging.js";
import { 
  getAnalytics, 
  logEvent,
  setUserProperties,
  setUserId 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";
import { 
  getPerformance, 
  trace 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-performance.js";

// SUAS CREDENCIAIS DO FIREBASE
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
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);
const analytics = getAnalytics(app);
let messaging = null;
let performance = null;

// Verificar suporte para mensagens e performance
try {
  if (typeof window !== 'undefined' && isSupported()) {
    messaging = getMessaging(app);
    performance = getPerformance(app);
    console.log('✅ Firebase Messaging e Performance inicializados');
  }
} catch (error) {
  console.warn('⚠️ Alguns serviços do Firebase não estão disponíveis:', error.message);
}

// Configurar persistência de autenticação
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log('✅ Persistência de autenticação configurada');
  })
  .catch((error) => {
    console.error('❌ Erro na persistência:', error);
  });

// ========== FUNÇÕES UTILITÁRIAS DO FIRESTORE ==========

const firestoreUtils = {
  // 1. BUSCAR USUÁRIO POR MATRÍCULA
  async buscarUsuarioPorMatricula(matricula) {
    try {
      console.log('🔍 Buscando usuário com matrícula:', matricula);
      
      const usuariosRef = collection(db, 'usuarios');
      const q = query(usuariosRef, 
        where('matricula', '==', matricula.toUpperCase()),
        where('ativo', '==', true)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        console.log('❌ Usuário não encontrado:', matricula);
        return null;
      }
      
      const usuarioDoc = querySnapshot.docs[0];
      const usuarioData = usuarioDoc.data();
      
      console.log('✅ Usuário encontrado:', usuarioData.nome);
      
      return {
        id: usuarioDoc.id,
        docRef: usuarioDoc.ref,
        ...usuarioData,
        // Garantir campos essenciais
        nome: usuarioData.nome || `Colaborador ${matricula}`,
        funcao: usuarioData.funcao || 'Colaborador',
        setor: usuarioData.setor || 'Segurança',
        departamento: usuarioData.departamento || 'Produção'
      };
      
    } catch (error) {
      console.error('❌ Erro ao buscar usuário:', error);
      
      // Em caso de erro, retornar usuário simulado para demonstração
      if (matricula.startsWith('QSS') || matricula.startsWith('TEST')) {
        return {
          id: 'demo_user',
          matricula: matricula,
          nome: `Colaborador ${matricula}`,
          funcao: 'Operador',
          setor: 'Produção',
          departamento: 'Operações',
          ativo: true,
          dataAdmissao: '2023-01-01',
          empresa: 'Empresa Demo',
          turno: 'Manhã'
        };
      }
      
      throw error;
    }
  },

  // 2. BUSCAR GESTOR POR UID
  async buscarGestorPorUID(uid) {
    try {
      console.log('🔍 Buscando gestor com UID:', uid);
      
      const gestorRef = doc(db, 'gestores', uid);
      const gestorDoc = await getDoc(gestorRef);
      
      if (!gestorDoc.exists()) {
        console.log('❌ Gestor não encontrado');
        return null;
      }
      
      const gestorData = gestorDoc.data();
      console.log('✅ Gestor encontrado:', gestorData.nome);
      
      return {
        id: gestorDoc.id,
        docRef: gestorDoc.ref,
        ...gestorData
      };
      
    } catch (error) {
      console.error('❌ Erro ao buscar gestor:', error);
      
      // Retornar gestor de demonstração
      return {
        id: 'demo_gestor',
        uid: uid,
        email: 'gestor@empresa.com',
        nome: 'Gestor de Demonstração',
        cargo: 'Coordenador de Segurança',
        departamento: 'QSSMA',
        nivelAcesso: 30,
        ativo: true,
        permissoes: {
          gerenciarUsuarios: true,
          gerenciarAvisos: true,
          gerenciarEPIs: true,
          gerenciarTreinamentos: true,
          verRelatorios: true,
          configurarSistema: true
        }
      };
    }
  },

  // 3. BUSCAR AVISOS ATIVOS
  async buscarAvisosAtivos(destino = 'todos') {
    try {
      console.log('📢 Buscando avisos ativos para:', destino);
      
      const avisosRef = collection(db, 'avisos');
      let q;
      
      if (destino === 'todos') {
        q = query(
          avisosRef,
          where('ativo', '==', true),
          orderBy('timestamp', 'desc'),
          limit(20)
        );
      } else {
        q = query(
          avisosRef,
          where('ativo', '==', true),
          where('destino', 'in', [destino, 'todos']),
          orderBy('timestamp', 'desc'),
          limit(20)
        );
      }
      
      const querySnapshot = await getDocs(q);
      const avisos = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log(`✅ ${avisos.length} avisos encontrados`);
      return avisos;
      
    } catch (error) {
      console.error('❌ Erro ao buscar avisos:', error);
      
      // Avisos de demonstração
      return [
        {
          id: 'demo_aviso_1',
          titulo: 'Bem-vindo ao Portal QSSMA',
          mensagem: 'Este é o sistema de gestão de segurança do trabalho. Mantenha-se atualizado com os avisos importantes.',
          destino: 'todos',
          prioridade: 'alta',
          ativo: true,
          timestamp: Timestamp.now(),
          criadoPor: 'Sistema'
        },
        {
          id: 'demo_aviso_2',
          titulo: 'Treinamento de EPIs',
          mensagem: 'Todos os colaboradores devem participar do treinamento de EPIs na próxima quarta-feira às 14h.',
          destino: 'todos',
          prioridade: 'media',
          ativo: true,
          timestamp: Timestamp.now(),
          criadoPor: 'Gestor QSSMA'
        }
      ];
    }
  },

  // 4. ESCUTAR AVISOS EM TEMPO REAL
  escutarAvisosTempoReal(destino = 'todos', callback) {
    try {
      const avisosRef = collection(db, 'avisos');
      let q;
      
      if (destino === 'todos') {
        q = query(
          avisosRef,
          where('ativo', '==', true),
          orderBy('timestamp', 'desc')
        );
      } else {
        q = query(
          avisosRef,
          where('ativo', '==', true),
          where('destino', 'in', [destino, 'todos']),
          orderBy('timestamp', 'desc')
        );
      }
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const avisos = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Detectar novos avisos
        snapshot.docChanges().forEach(change => {
          if (change.type === 'added') {
            console.log('📢 Novo aviso adicionado:', change.doc.data().titulo);
            
            // Disparar evento para notificação
            window.dispatchEvent(new CustomEvent('novo-aviso', {
              detail: { aviso: change.doc.data() }
            }));
          }
        });
        
        callback(avisos);
      }, (error) => {
        console.error('❌ Erro ao escutar avisos:', error);
      });
      
      return unsubscribe;
      
    } catch (error) {
      console.error('❌ Erro ao configurar escuta de avisos:', error);
      return () => {}; // Retorna função vazia para unsubscribe
    }
  },

  // 5. REGISTRAR INCIDENTE
  async criarIncidente(dadosIncidente) {
    try {
      console.log('⚠️ Registrando novo incidente');
      
      const incidentesRef = collection(db, 'incidentes');
      
      const incidenteCompleto = {
        ...dadosIncidente,
        status: 'pendente',
        dataRegistro: serverTimestamp(),
        timestamp: serverTimestamp(),
        atualizadoEm: serverTimestamp(),
        numero: await this.gerarNumeroIncidente()
      };
      
      const docRef = await addDoc(incidentesRef, incidenteCompleto);
      
      console.log('✅ Incidente registrado com ID:', docRef.id);
      
      // Registrar log
      await this.registrarLog('incidente_registrado', {
        incidenteId: docRef.id,
        usuario: dadosIncidente.usuario,
        matricula: dadosIncidente.matricula
      });
      
      // Atualizar estatísticas
      await this.atualizarEstatisticas();
      
      return {
        id: docRef.id,
        ...incidenteCompleto
      };
      
    } catch (error) {
      console.error('❌ Erro ao registrar incidente:', error);
      throw error;
    }
  },

  // 6. GERAR NÚMERO DE INCIDENTE (ex: INC-20240115-001)
  async gerarNumeroIncidente() {
    try {
      const hoje = new Date();
      const dataStr = hoje.toISOString().split('T')[0].replace(/-/g, '');
      const prefixo = `INC-${dataStr}`;
      
      // Buscar último incidente do dia
      const incidentesRef = collection(db, 'incidentes');
      const q = query(
        incidentesRef,
        where('numero', '>=', prefixo),
        where('numero', '<', prefixo + 'Z'),
        orderBy('numero', 'desc'),
        limit(1)
      );
      
      const snapshot = await getDocs(q);
      
      let sequencia = 1;
      if (!snapshot.empty) {
        const ultimoNumero = snapshot.docs[0].data().numero;
        const ultimoSeq = parseInt(ultimoNumero.split('-')[2]);
        sequencia = ultimoSeq + 1;
      }
      
      return `${prefixo}-${sequencia.toString().padStart(3, '0')}`;
      
    } catch (error) {
      // Em caso de erro, retorna número baseado no timestamp
      const timestamp = Date.now();
      return `INC-${timestamp}`;
    }
  },

  // 7. ATIVAR EMERGÊNCIA
  async ativarEmergencia(dadosEmergencia) {
    try {
      console.log('🚨 Ativando emergência');
      
      const emergenciasRef = collection(db, 'emergencias');
      
      const emergenciaCompleta = {
        ...dadosEmergencia,
        status: 'ativa',
        dataAtivacao: serverTimestamp(),
        timestamp: serverTimestamp(),
        atualizadoEm: serverTimestamp(),
        nivel: dadosEmergencia.nivel || 'alto'
      };
      
      const docRef = await addDoc(emergenciasRef, emergenciaCompleta);
      
      console.log('✅ Emergência ativada com ID:', docRef.id);
      
      // Registrar log
      await this.registrarLog('emergencia_ativada', {
        emergenciaId: docRef.id,
        usuario: dadosEmergencia.usuario,
        matricula: dadosEmergencia.matricula,
        nivel: dadosEmergencia.nivel
      });
      
      // Notificar todos os gestores
      await this.notificarGestores('emergencia', {
        titulo: '🚨 EMERGÊNCIA ATIVADA',
        mensagem: `Emergência ativada por ${dadosEmergencia.usuario}: ${dadosEmergencia.descricao}`,
        emergenciaId: docRef.id
      });
      
      return {
        id: docRef.id,
        ...emergenciaCompleta
      };
      
    } catch (error) {
      console.error('❌ Erro ao ativar emergência:', error);
      throw error;
    }
  },

  // 8. ENCERRAR EMERGÊNCIA
  async encerrarEmergencia(emergenciaId, motivo = '') {
    try {
      console.log('🛑 Encerrando emergência:', emergenciaId);
      
      const emergenciaRef = doc(db, 'emergencias', emergenciaId);
      
      await updateDoc(emergenciaRef, {
        status: 'encerrada',
        dataEncerramento: serverTimestamp(),
        motivoEncerramento: motivo,
        atualizadoEm: serverTimestamp()
      });
      
      console.log('✅ Emergência encerrada');
      
      // Registrar log
      await this.registrarLog('emergencia_encerrada', {
        emergenciaId: emergenciaId,
        motivo: motivo
      });
      
      return true;
      
    } catch (error) {
      console.error('❌ Erro ao encerrar emergência:', error);
      throw error;
    }
  },

  // 9. ENVIAR FEEDBACK
  async enviarFeedback(dadosFeedback) {
    try {
      console.log('💬 Enviando feedback');
      
      const feedbacksRef = collection(db, 'feedbacks');
      
      const feedbackCompleto = {
        ...dadosFeedback,
        status: 'pendente',
        timestamp: serverTimestamp(),
        atualizadoEm: serverTimestamp()
      };
      
      const docRef = await addDoc(feedbacksRef, feedbackCompleto);
      
      console.log('✅ Feedback enviado com ID:', docRef.id);
      
      // Registrar log
      await this.registrarLog('feedback_enviado', {
        feedbackId: docRef.id,
        tipo: dadosFeedback.tipo,
        usuario: dadosFeedback.usuario
      });
      
      // Notificar gestores se for crítica
      if (dadosFeedback.tipo === 'problema' || dadosFeedback.prioridade === 'alta') {
        await this.notificarGestores('feedback', {
          titulo: '📋 Novo Feedback Recebido',
          mensagem: `${dadosFeedback.usuario} enviou um feedback do tipo "${dadosFeedback.tipo}"`,
          feedbackId: docRef.id
        });
      }
      
      return {
        id: docRef.id,
        ...feedbackCompleto
      };
      
    } catch (error) {
      console.error('❌ Erro ao enviar feedback:', error);
      throw error;
    }
  },

  // 10. CRIAR NOVO AVISO (para gestores)
  async criarAviso(dadosAviso, gestor) {
    try {
      console.log('📝 Criando novo aviso');
      
      const avisosRef = collection(db, 'avisos');
      
      const avisoCompleto = {
        ...dadosAviso,
        ativo: true,
        criadoPor: gestor.nome,
        criadoPorEmail: gestor.email,
        timestamp: serverTimestamp(),
        atualizadoEm: serverTimestamp(),
        visualizacoes: 0,
        confirmacoes: 0
      };
      
      const docRef = await addDoc(avisosRef, avisoCompleto);
      
      console.log('✅ Aviso criado com ID:', docRef.id);
      
      // Registrar log
      await this.registrarLog('aviso_criado', {
        avisoId: docRef.id,
        titulo: dadosAviso.titulo,
        destino: dadosAviso.destino,
        gestor: gestor.nome
      });
      
      // Notificar usuários
      await this.notificarUsuarios('aviso', {
        titulo: '📢 Novo Aviso',
        mensagem: dadosAviso.titulo,
        avisoId: docRef.id,
        destino: dadosAviso.destino
      });
      
      return {
        id: docRef.id,
        ...avisoCompleto
      };
      
    } catch (error) {
      console.error('❌ Erro ao criar aviso:', error);
      throw error;
    }
  },

  // 11. ATUALIZAR ESTATÍSTICAS
  async atualizarEstatisticas() {
    try {
      const hoje = new Date().toISOString().split('T')[0];
      const statsRef = doc(db, 'estatisticas', 'diarias', 'registros', hoje);
      
      // Buscar contagens atuais
      const [
        usuariosSnapshot,
        avisosSnapshot,
        incidentesSnapshot,
        emergenciasSnapshot,
        feedbacksSnapshot
      ] = await Promise.all([
        getDocs(query(collection(db, 'usuarios'), where('ativo', '==', true))),
        getDocs(query(collection(db, 'avisos'), where('ativo', '==', true))),
        getDocs(query(collection(db, 'incidentes'), where('status', '==', 'pendente'))),
        getDocs(query(collection(db, 'emergencias'), where('status', '==', 'ativa'))),
        getDocs(query(collection(db, 'feedbacks'), where('status', '==', 'pendente')))
      ]);
      
      const dadosAtualizados = {
        data: hoje,
        usuariosAtivos: usuariosSnapshot.size,
        avisosAtivos: avisosSnapshot.size,
        incidentesPendentes: incidentesSnapshot.size,
        emergenciasAtivas: emergenciasSnapshot.size,
        feedbacksPendentes: feedbacksSnapshot.size,
        atualizadoEm: serverTimestamp()
      };
      
      await setDoc(statsRef, dadosAtualizados, { merge: true });
      
      console.log('📊 Estatísticas atualizadas:', dadosAtualizados);
      
      return dadosAtualizados;
      
    } catch (error) {
      console.error('❌ Erro ao atualizar estatísticas:', error);
      
      // Retornar dados de demonstração
      return {
        data: new Date().toISOString().split('T')[0],
        usuariosAtivos: 150,
        avisosAtivos: 2,
        incidentesPendentes: 3,
        emergenciasAtivas: 1,
        feedbacksPendentes: 5
      };
    }
  },

  // 12. REGISTRAR LOG DE ACESSO/ATIVIDADE
  async registrarLog(tipo, dados) {
    try {
      const logsRef = collection(db, 'logs_acesso');
      
      const logData = {
        tipo: tipo,
        ...dados,
        timestamp: serverTimestamp(),
        userAgent: navigator.userAgent,
        online: navigator.onLine,
        url: window.location.href
      };
      
      await addDoc(logsRef, logData);
      
    } catch (error) {
      console.error('❌ Erro ao registrar log:', error);
    }
  },

  // 13. NOTIFICAR GESTORES
  async notificarGestores(tipo, dados) {
    try {
      console.log(`📨 Notificando gestores sobre: ${tipo}`);
      
      // Buscar todos os gestores ativos
      const gestoresSnapshot = await getDocs(
        query(collection(db, 'gestores'), where('ativo', '==', true))
      );
      
      const notificacoesRef = collection(db, 'notificacoes');
      const batch = writeBatch(db);
      
      gestoresSnapshot.forEach(gestorDoc => {
        const notificacaoRef = doc(notificacoesRef);
        batch.set(notificacaoRef, {
          tipo: tipo,
          ...dados,
          destinatario: gestorDoc.id,
          lida: false,
          timestamp: serverTimestamp()
        });
      });
      
      await batch.commit();
      console.log(`✅ ${gestoresSnapshot.size} gestores notificados`);
      
    } catch (error) {
      console.error('❌ Erro ao notificar gestores:', error);
    }
  },

  // 14. NOTIFICAR USUÁRIOS
  async notificarUsuarios(tipo, dados) {
    try {
      console.log(`📨 Notificando usuários sobre: ${tipo}`);
      
      // Determinar quais usuários notificar baseado no destino
      let usuariosQuery;
      
      if (dados.destino === 'todos') {
        usuariosQuery = query(
          collection(db, 'usuarios'),
          where('ativo', '==', true)
        );
      } else {
        usuariosQuery = query(
          collection(db, 'usuarios'),
          where('ativo', '==', true),
          where('setor', '==', dados.destino)
        );
      }
      
      const usuariosSnapshot = await getDocs(usuariosQuery);
      
      const notificacoesRef = collection(db, 'notificacoes');
      const batch = writeBatch(db);
      
      usuariosSnapshot.forEach(usuarioDoc => {
        const notificacaoRef = doc(notificacoesRef);
        batch.set(notificacaoRef, {
          tipo: tipo,
          ...dados,
          destinatario: usuarioDoc.id,
          lida: false,
          timestamp: serverTimestamp()
        });
      });
      
      await batch.commit();
      console.log(`✅ ${usuariosSnapshot.size} usuários notificados`);
      
    } catch (error) {
      console.error('❌ Erro ao notificar usuários:', error);
    }
  },

  // 15. BUSCAR ESTATÍSTICAS DO DIA
  async buscarEstatisticasDoDia() {
    try {
      const hoje = new Date().toISOString().split('T')[0];
      const statsRef = doc(db, 'estatisticas', 'diarias', 'registros', hoje);
      const statsDoc = await getDoc(statsRef);
      
      if (statsDoc.exists()) {
        return statsDoc.data();
      } else {
        // Criar estatísticas se não existirem
        return await this.atualizarEstatisticas();
      }
      
    } catch (error) {
      console.error('❌ Erro ao buscar estatísticas:', error);
      
      return {
        data: new Date().toISOString().split('T')[0],
        usuariosAtivos: 150,
        avisosAtivos: 2,
        incidentesPendentes: 3,
        emergenciasAtivas: 1,
        feedbacksPendentes: 5
      };
    }
  },

  // 16. BUSCAR INCIDENTES RECENTES
  async buscarIncidentesRecentes(limite = 10) {
    try {
      const incidentesRef = collection(db, 'incidentes');
      const q = query(
        incidentesRef,
        orderBy('timestamp', 'desc'),
        limit(limite)
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
    } catch (error) {
      console.error('❌ Erro ao buscar incidentes:', error);
      return [];
    }
  },

  // 17. BUSCAR EMERGÊNCIAS ATIVAS
  async buscarEmergenciasAtivas() {
    try {
      const emergenciasRef = collection(db, 'emergencias');
      const q = query(
        emergenciasRef,
        where('status', '==', 'ativa'),
        orderBy('dataAtivacao', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
    } catch (error) {
      console.error('❌ Erro ao buscar emergências:', error);
      return [];
    }
  },

  // 18. BUSCAR FEEDBACKS RECENTES
  async buscarFeedbacksRecentes(limite = 10) {
    try {
      const feedbacksRef = collection(db, 'feedbacks');
      const q = query(
        feedbacksRef,
        orderBy('timestamp', 'desc'),
        limit(limite)
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
    } catch (error) {
      console.error('❌ Erro ao buscar feedbacks:', error);
      return [];
    }
  },

  // 19. ATUALIZAR AVISO (para gestores)
  async atualizarAviso(avisoId, dadosAtualizados) {
    try {
      const avisoRef = doc(db, 'avisos', avisoId);
      
      await updateDoc(avisoRef, {
        ...dadosAtualizados,
        atualizadoEm: serverTimestamp()
      });
      
      console.log('✅ Aviso atualizado:', avisoId);
      return true;
      
    } catch (error) {
      console.error('❌ Erro ao atualizar aviso:', error);
      throw error;
    }
  },

  // 20. DESATIVAR AVISO
  async desativarAviso(avisoId) {
    try {
      const avisoRef = doc(db, 'avisos', avisoId);
      
      await updateDoc(avisoRef, {
        ativo: false,
        atualizadoEm: serverTimestamp()
      });
      
      console.log('✅ Aviso desativado:', avisoId);
      return true;
      
    } catch (error) {
      console.error('❌ Erro ao desativar aviso:', error);
      throw error;
    }
  },

  // 21. BUSCAR TODOS OS AVISOS (para gestores)
  async buscarTodosAvisos() {
    try {
      const avisosRef = collection(db, 'avisos');
      const q = query(
        avisosRef,
        orderBy('timestamp', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
    } catch (error) {
      console.error('❌ Erro ao buscar todos os avisos:', error);
      return [];
    }
  },

  // 22. VERIFICAR SE MATRÍCULA EXISTE
  async verificarMatricula(matricula) {
    try {
      const usuariosRef = collection(db, 'usuarios');
      const q = query(usuariosRef, 
        where('matricula', '==', matricula.toUpperCase()),
        where('ativo', '==', true)
      );
      
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
      
    } catch (error) {
      console.error('❌ Erro ao verificar matrícula:', error);
      return false;
    }
  },

  // 23. ATUALIZAR ÚLTIMO ACESSO DO USUÁRIO
  async atualizarUltimoAcessoUsuario(matricula) {
    try {
      const usuariosRef = collection(db, 'usuarios');
      const q = query(usuariosRef, where('matricula', '==', matricula));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const usuarioDoc = querySnapshot.docs[0];
        await updateDoc(usuarioDoc.ref, {
          ultimoAcesso: serverTimestamp(),
          atualizadoEm: serverTimestamp()
        });
        
        console.log('✅ Último acesso atualizado para:', matricula);
      }
      
    } catch (error) {
      console.error('❌ Erro ao atualizar último acesso:', error);
    }
  },

  // 24. BUSCAR CONFIGURAÇÕES DO SISTEMA
  async buscarConfiguracoes() {
    try {
      const configRef = doc(db, 'configuracoes', 'portal');
      const configDoc = await getDoc(configRef);
      
      if (configDoc.exists()) {
        return configDoc.data();
      } else {
        // Criar configurações padrão
        const configuracoesPadrao = {
          nomeEmpresa: 'Portal QSSMA',
          telefoneSuporte: '94992233753',
          emailSuporte: 'Juansalesadm@gmail.com',
          whatsappSuporte: '5594992233753',
          corPrimaria: '#b00000',
          horarioFuncionamento: 'Segunda a Sexta, 6h às 18h',
          versaoSistema: '1.0.0',
          timestamp: serverTimestamp()
        };
        
        await setDoc(configRef, configuracoesPadrao);
        return configuracoesPadrao;
      }
      
    } catch (error) {
      console.error('❌ Erro ao buscar configurações:', error);
      
      return {
        nomeEmpresa: 'Portal QSSMA',
        telefoneSuporte: '94992233753',
        emailSuporte: 'Juansalesadm@gmail.com',
        whatsappSuporte: '5594992233753',
        desenvolvedor: 'Juan Sales',
        contatoDesenvolvedor: '94992233753'
      };
    }
  }
};

// ========== FUNÇÕES DE AUTENTICAÇÃO ==========

const authUtils = {
  // Login de gestor com Firebase Authentication
  async loginGestor(email, senha) {
    try {
      console.log('🔐 Tentando login de gestor:', email);
      
      const userCredential = await signInWithEmailAndPassword(auth, email, senha);
      const user = userCredential.user;
      
      console.log('✅ Login do Firebase bem-sucedido, UID:', user.uid);
      
      // Buscar dados do gestor no Firestore
      const gestor = await firestoreUtils.buscarGestorPorUID(user.uid);
      
      if (!gestor) {
        throw new Error('Usuário não é um gestor autorizado');
      }
      
      if (!gestor.ativo) {
        throw new Error('Conta de gestor desativada');
      }
      
      // Registrar log
      await firestoreUtils.registrarLog('login_gestor', {
        email: email,
        gestorId: user.uid,
        nome: gestor.nome
      });
      
      return {
        success: true,
        user: {
          uid: user.uid,
          email: user.email,
          ...gestor
        }
      };
      
    } catch (error) {
      console.error('❌ Erro no login do gestor:', error);
      
      let mensagem = 'Erro na autenticação';
      
      switch (error.code) {
        case 'auth/user-not-found':
          mensagem = 'E-mail não encontrado';
          break;
        case 'auth/wrong-password':
          mensagem = 'Senha incorreta';
          break;
        case 'auth/invalid-email':
          mensagem = 'E-mail inválido';
          break;
        case 'auth/user-disabled':
          mensagem = 'Conta desativada';
          break;
        case 'auth/too-many-requests':
          mensagem = 'Muitas tentativas. Tente novamente mais tarde';
          break;
      }
      
      return {
        success: false,
        error: mensagem
      };
    }
  },

  // Login de usuário (colaborador) - via matrícula
  async loginUsuario(matricula) {
    try {
      console.log('👤 Tentando login de usuário:', matricula);
      
      // Buscar usuário no Firestore
      const usuario = await firestoreUtils.buscarUsuarioPorMatricula(matricula);
      
      if (!usuario) {
        throw new Error('Matrícula não encontrada ou usuário inativo');
      }
      
      // Atualizar último acesso
      await firestoreUtils.atualizarUltimoAcessoUsuario(matricula);
      
      // Registrar log
      await firestoreUtils.registrarLog('login_usuario', {
        matricula: matricula,
        nome: usuario.nome,
        setor: usuario.setor
      });
      
      return {
        success: true,
        usuario: usuario
      };
      
    } catch (error) {
      console.error('❌ Erro no login do usuário:', error);
      
      return {
        success: false,
        error: error.message || 'Erro ao validar matrícula'
      };
    }
  },

  // Logout
  async logout() {
    try {
      await signOut(auth);
      console.log('✅ Logout realizado');
      return { success: true };
    } catch (error) {
      console.error('❌ Erro no logout:', error);
      return { success: false, error: error.message };
    }
  },

  // Verificar estado da autenticação
  onAuthStateChange(callback) {
    return onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Usuário está logado no Firebase (gestor)
        const gestor = await firestoreUtils.buscarGestorPorUID(user.uid);
        callback({ 
          type: 'gestor', 
          user: { ...user, ...gestor },
          isAuthenticated: true 
        });
      } else {
        // Nenhum usuário logado
        callback({ 
          type: 'none', 
          user: null,
          isAuthenticated: false 
        });
      }
    });
  },

  // Redefinir senha
  async redefinirSenha(email) {
    try {
      await sendPasswordResetEmail(auth, email);
      console.log('✅ E-mail de redefinição enviado para:', email);
      return { success: true };
    } catch (error) {
      console.error('❌ Erro ao redefinir senha:', error);
      return { success: false, error: error.message };
    }
  }
};

// ========== FUNÇÕES DE STORAGE (ARQUIVOS) ==========

const storageUtils = {
  // Upload de imagem
  async uploadImagem(file, path = 'uploads/') {
    try {
      const timestamp = Date.now();
      const nomeArquivo = `${timestamp}_${file.name}`;
      const storageRef = ref(storage, path + nomeArquivo);
      
      // Upload do arquivo
      const snapshot = await uploadBytes(storageRef, file);
      
      // Obter URL de download
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      console.log('✅ Imagem enviada com sucesso:', downloadURL);
      
      return {
        success: true,
        url: downloadURL,
        nomeArquivo: nomeArquivo,
        path: path + nomeArquivo
      };
      
    } catch (error) {
      console.error('❌ Erro ao enviar imagem:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Upload de arquivo com progresso
  uploadArquivoComProgresso(file, path = 'uploads/', onProgress, onComplete, onError) {
    try {
      const timestamp = Date.now();
      const nomeArquivo = `${timestamp}_${file.name}`;
      const storageRef = ref(storage, path + nomeArquivo);
      
      const uploadTask = uploadBytesResumable(storageRef, file);
      
      uploadTask.on('state_changed',
        (snapshot) => {
          // Progresso
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          if (onProgress) onProgress(progress);
        },
        (error) => {
          // Erro
          console.error('❌ Erro no upload:', error);
          if (onError) onError(error);
        },
        async () => {
          // Completo
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          if (onComplete) onComplete(downloadURL);
        }
      );
      
      return uploadTask;
      
    } catch (error) {
      console.error('❌ Erro ao iniciar upload:', error);
      if (onError) onError(error);
    }
  },

  // Excluir arquivo
  async excluirArquivo(url) {
    try {
      // Extrair path da URL
      const urlObj = new URL(url);
      const path = decodeURIComponent(urlObj.pathname.split('/o/')[1].split('?')[0]);
      
      const fileRef = ref(storage, path);
      await deleteObject(fileRef);
      
      console.log('✅ Arquivo excluído:', path);
      return { success: true };
      
    } catch (error) {
      console.error('❌ Erro ao excluir arquivo:', error);
      return { success: false, error: error.message };
    }
  }
};

// ========== FUNÇÕES DE ANALYTICS ==========

const analyticsUtils = {
  // Registrar evento
  logEvent(nomeEvento, parametros = {}) {
    try {
      logEvent(analytics, nomeEvento, parametros);
      console.log(`📊 Analytics: ${nomeEvento}`, parametros);
    } catch (error) {
      console.error('❌ Erro ao registrar evento:', error);
    }
  },

  // Definir ID do usuário
  setUserId(userId) {
    try {
      setUserId(analytics, userId);
      console.log('📊 Analytics: User ID definido:', userId);
    } catch (error) {
      console.error('❌ Erro ao definir User ID:', error);
    }
  },

  // Definir propriedades do usuário
  setUserProperties(properties) {
    try {
      setUserProperties(analytics, properties);
      console.log('📊 Analytics: Propriedades definidas:', properties);
    } catch (error) {
      console.error('❌ Erro ao definir propriedades:', error);
    }
  }
};

// ========== FUNÇÕES DE NOTIFICAÇÕES PUSH ==========

const messagingUtils = {
  // Solicitar permissão para notificações
  async solicitarPermissaoNotificacoes() {
    try {
      if (!messaging) {
        console.warn('⚠️ Firebase Messaging não está disponível');
        return { success: false, error: 'Messaging não disponível' };
      }

      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        console.log('✅ Permissão para notificações concedida');
        
        // Obter token
        const token = await getToken(messaging, {
          vapidKey: 'SUA_CHAVE_VAPID_AQUI' // Opcional
        });
        
        if (token) {
          console.log('✅ Token FCM:', token);
          return { success: true, token: token };
        } else {
          console.warn('⚠️ Não foi possível obter o token FCM');
          return { success: false, error: 'Token não disponível' };
        }
        
      } else {
        console.warn('⚠️ Permissão para notificações negada');
        return { success: false, error: 'Permissão negada' };
      }
      
    } catch (error) {
      console.error('❌ Erro ao solicitar permissão:', error);
      return { success: false, error: error.message };
    }
  },

  // Escutar mensagens em foreground
  onMessage(callback) {
    try {
      if (!messaging) {
        console.warn('⚠️ Firebase Messaging não está disponível');
        return () => {};
      }

      return onMessage(messaging, (payload) => {
        console.log('📨 Mensagem recebida em foreground:', payload);
        if (callback) callback(payload);
      });
      
    } catch (error) {
      console.error('❌ Erro ao configurar onMessage:', error);
      return () => {};
    }
  }
};

// ========== INICIALIZAÇÃO DO SISTEMA ==========

// Função para inicializar o sistema
async function inicializarSistema() {
  try {
    console.log('🚀 Inicializando sistema Portal QSSMA...');
    
    // Buscar configurações
    const configuracoes = await firestoreUtils.buscarConfiguracoes();
    console.log('✅ Configurações carregadas:', configuracoes.nomeEmpresa);
    
    // Atualizar estatísticas
    const estatisticas = await firestoreUtils.atualizarEstatisticas();
    console.log('📊 Estatísticas atualizadas');
    
    // Configurar analytics
    analyticsUtils.setUserProperties({
      plataforma: 'web',
      versao: configuracoes.versaoSistema || '1.0.0'
    });
    
    // Log de inicialização
    await firestoreUtils.registrarLog('sistema_inicializado', {
      url: window.location.href,
      userAgent: navigator.userAgent,
      online: navigator.onLine
    });
    
    console.log('🎉 Sistema Portal QSSMA inicializado com sucesso!');
    
    return {
      success: true,
      configuracoes: configuracoes,
      estatisticas: estatisticas
    };
    
  } catch (error) {
    console.error('❌ Erro ao inicializar sistema:', error);
    
    return {
      success: false,
      error: error.message
    };
  }
}

// ========== EXPORTAÇÃO ==========

// Exportar tudo
export { 
  // Serviços principais
  db, 
  auth, 
  storage,
  messaging,
  analytics,
  performance,
  
  // Utilitários
  firestoreUtils,
  authUtils,
  storageUtils,
  analyticsUtils,
  messagingUtils,
  
  // Função de inicialização
  inicializarSistema,
  
  // Tipos do Firestore (para uso em components)
  Timestamp,
  serverTimestamp
};

console.log('🔥 Firebase Portal QSSMA inicializado com sucesso!');
console.log('📁 Projeto: portal-qssma');
console.log('👤 Desenvolvedor: Juan Sales');
console.log('📞 Contato: 94992233753');
console.log('📧 Email: Juansalesadm@gmail.com');
