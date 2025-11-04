import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { LogEntry, Zona, Acao, Atleta, ModalType, MatchState } from './types';
import Modal from './components/Modal';
import AnalysisDashboard from './components/AnalysisDashboard';

// Helper to copy text to clipboard
const copyTextToClipboard = (text: string) => {
  navigator.clipboard.writeText(text).catch(err => {
    console.error('Failed to copy text: ', err);
  });
};

const App: React.FC = () => {
  const [appId, setAppId] = useState('...');
  const [userId, setUserId] = useState('...');
  const [placarA, setPlacarA] = useState(0);
  const [placarB, setPlacarB] = useState(0);
  const [atletaANome, setAtletaANome] = useState('Atleta A');
  const [atletaBNome, setAtletaBNome] = useState('Atleta B');
  const [zonaAtiva, setZonaAtiva] = useState<Zona>('Casa');
  const [log, setLog] = useState<LogEntry[]>([]);
  const [modalType, setModalType] = useState<ModalType>('loading');
  const [reportText, setReportText] = useState('');

  // Timer state
  const [timerSeconds, setTimerSeconds] = useState(60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  // FIX: Replaced NodeJS.Timeout with `number` as it is the correct type for timer IDs in a browser environment.
  const timerInstance = useRef<number | null>(null);

  // Firebase state
  const matchDocRef = useRef<any>(null);
  const db = useRef<any>(null);
  const isAuthReady = useRef(false);

  // Debounce saving to Firestore
  // FIX: Replaced NodeJS.Timeout with `number` as it is the correct type for timer IDs in a browser environment.
  const saveTimeout = useRef<number | null>(null);

  const saveMatchState = useCallback(() => {
    if (!isAuthReady.current || !db.current || !matchDocRef.current) return;
    if (saveTimeout.current) clearTimeout(saveTimeout.current);

    saveTimeout.current = setTimeout(() => {
      const matchData: MatchState = {
        placarA,
        placarB,
        atletaA_nome: atletaANome,
        atletaB_nome: atletaBNome,
        zonaAtiva,
        log,
        updatedAt: new Date().toISOString()
      };
      const { setDoc } = (window as any).firebase;
      setDoc(matchDocRef.current, matchData).catch((e: any) => {
        console.error("Error saving match state:", e);
      });
    }, 1000); // Debounce for 1 second
  }, [placarA, placarB, atletaANome, atletaBNome, zonaAtiva, log]);
  
  useEffect(() => {
      saveMatchState();
  }, [saveMatchState]);


  useEffect(() => {
    const initialize = async () => {
      const {
        initializeApp, getAuth, signInAnonymously, onAuthStateChanged,
        getFirestore, doc, signInWithCustomToken, getDocs, query, collection, limit
      } = (window as any).firebase;

      const firebaseConfig = JSON.parse((window as any).__firebase_config);
      const currentAppId = (window as any).__app_id;
      const initialAuthToken = (window as any).__initial_auth_token;

      setAppId(currentAppId);

      try {
        const app = initializeApp(firebaseConfig);
        db.current = getFirestore(app);
        const auth = getAuth(app);

        if (initialAuthToken) {
            await signInWithCustomToken(auth, initialAuthToken);
        } else {
            await signInAnonymously(auth);
        }

        onAuthStateChanged(auth, async (user: any) => {
          const currentUserId = user ? user.uid : 'anonymous_user';
          setUserId(currentUserId);
          isAuthReady.current = true;
          
          const path = `/artifacts/${currentAppId}/users/${currentUserId}/fencing_scout_matches`;
          
          // Load existing match state
          try {
              const q = query(collection(db.current, path), limit(1));
              const docSnap = await getDocs(q);
              
              if (!docSnap.empty) {
                  const data = docSnap.docs[0].data() as MatchState;
                  matchDocRef.current = docSnap.docs[0].ref;
                  setPlacarA(data.placarA || 0);
                  setPlacarB(data.placarB || 0);
                  setAtletaANome(data.atletaA_nome || 'Atleta A');
                  setAtletaBNome(data.atletaB_nome || 'Atleta B');
                  setZonaAtiva(data.zonaAtiva || 'Casa');
                  setLog(data.log || []);
              } else {
                  matchDocRef.current = doc(db.current, path, 'current_match');
              }
          } catch(e) {
              console.error("Error loading match state:", e);
              matchDocRef.current = doc(db.current, path, 'current_match');
          } finally {
              setModalType(null);
          }
        });
      } catch (error) {
        console.error("Firebase initialization error:", error);
        setModalType(null);
      }
    };
    initialize();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ajustarPlacar = (atleta: Atleta, delta: number) => {
    if (atleta === 'A') {
      setPlacarA(p => Math.max(0, p + delta));
    } else {
      setPlacarB(p => Math.max(0, p + delta));
    }
  };

  const registrarAcao = (acao: Acao | string) => {
    const newEntry: LogEntry = {
      id: log.length + 1,
      acao,
      zona: zonaAtiva,
      placarA,
      placarB,
    };
    setLog(prevLog => [...prevLog, newEntry]);
  };

  const registrarPonto = (atleta: Atleta) => {
    if (isTimerRunning) {
      toggleTimer();
    }
    registrarAcao(`Ponto do ${atleta}`);
    ajustarPlacar(atleta, 1);
  };
  
  const handleFinalizarJogo = () => {
    const reportLines = log.map(entry => {
        const placar = `${entry.placarA}:${entry.placarB}`;
        if (entry.acao.startsWith('Ponto do A')) return `Ponto do ${atletaANome}`;
        if (entry.acao.startsWith('Ponto do B')) return `Ponto do ${atletaBNome}`;
        return `${placar} - ${entry.zona} - ${entry.acao}`;
    });
    const header = `--- Relatório de Scouting de Partida (${atletaANome} vs ${atletaBNome}) ---\n`;
    const footer = `\n--- Fim do Relatório ---`;
    const text = header + reportLines.join('\n') + footer;
    setReportText(text);
    setModalType('report');
  };

  const executarReset = () => {
    setPlacarA(0);
    setPlacarB(0);
    setAtletaANome('Atleta A');
    setAtletaBNome('Atleta B');
    setLog([]);
    setZonaAtiva('Casa');
    resetTimer();
    setModalType(null);
  };
  
  // Timer Logic
  const toggleTimer = () => {
    setIsTimerRunning(prev => !prev);
  };

  const resetTimer = () => {
    if(isTimerRunning) setIsTimerRunning(false);
    setTimerSeconds(60);
  };
  
  useEffect(() => {
    if (isTimerRunning) {
      timerInstance.current = setInterval(() => {
        setTimerSeconds(s => {
          if (s > 0) return s - 1;
          setIsTimerRunning(false);
          return 0;
        });
      }, 1000);
    } else {
      if (timerInstance.current) clearInterval(timerInstance.current);
    }
    return () => {
      if (timerInstance.current) clearInterval(timerInstance.current);
    };
  }, [isTimerRunning]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const renderModalContent = () => {
    switch (modalType) {
      case 'loading':
        return <p className="text-center text-lg font-semibold">Carregando...</p>;
      case 'report':
        return (
          <>
            <h3 className="text-xl font-bold mb-4 text-center">Relatório de Partida Gerado</h3>
            <p className="mb-3 text-sm text-gray-600 text-center">Copie o texto abaixo para compartilhamento ou análise:</p>
            <textarea readOnly className="w-full h-40 p-3 mb-4 text-sm font-mono bg-gray-100 border rounded-lg resize-none" value={reportText}></textarea>
            <div className="flex space-x-3">
              <button onClick={() => copyTextToClipboard(reportText)} className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition">Copiar Texto</button>
              <button onClick={() => setModalType(null)} className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded-lg transition">Fechar</button>
            </div>
          </>
        );
      case 'confirmReset':
        return (
          <div className="text-center">
            <h3 className="text-xl font-bold mb-4">Confirmar Ação</h3>
            <p className="mb-6">Tem certeza de que deseja limpar todos os dados e iniciar um novo jogo? Esta ação não pode ser desfeita.</p>
            <div className="flex space-x-3">
              <button onClick={executarReset} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition">Confirmar Reset</button>
              <button onClick={() => setModalType(null)} className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded-lg transition">Cancelar</button>
            </div>
          </div>
        );
      default: return null;
    }
  };

  const actionButtonClasses = "py-4 rounded-xl text-lg font-bold transition-all duration-150 ease-in-out shadow-md active:translate-y-px active:shadow-sm";
  const zoneButtonClasses = "py-3 rounded-xl font-medium transition-all duration-150 ease-in-out shadow-md active:translate-y-px active:shadow-sm";

  return (
    <>
      <Modal isOpen={modalType !== null} onClose={() => setModalType(null)}>
        {renderModalContent()}
      </Modal>

      <main className="max-w-xl mx-auto bg-white p-4 sm:p-6 rounded-xl shadow-2xl">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">Esgrima Scout - Arena</h1>

        <div className="mb-4 text-sm text-gray-600 border-b pb-2">
          <p><strong>App ID:</strong> <span className="font-mono text-xs text-gray-500">{appId}</span></p>
          <p><strong>User ID:</strong> <span className="font-mono text-xs text-gray-500">{userId}</span></p>
        </div>

        <section className="mb-6 p-4 bg-gray-800 text-white rounded-lg shadow-inner">
          <h2 className="text-lg font-semibold mb-2 text-center text-gray-300">Cronômetro</h2>
          <div className="text-6xl font-mono text-center mb-4">{formatTime(timerSeconds)}</div>
          <div className="flex justify-center space-x-4">
              <button onClick={toggleTimer} className={`font-bold py-2 px-6 rounded-lg transition ${isTimerRunning ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-green-500 hover:bg-green-600'}`}>
                  {isTimerRunning ? 'Pausar' : 'Iniciar'}
              </button>
              <button onClick={resetTimer} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-lg transition">Resetar</button>
          </div>
        </section>

        <section className="mb-6 grid grid-cols-2 gap-4">
          <div className="flex flex-col items-center bg-gray-50 p-3 rounded-lg shadow-inner">
            <input type="text" value={atletaANome} onChange={e => setAtletaANome(e.target.value)} className="text-center text-lg font-semibold w-full bg-transparent border-b border-gray-300 focus:border-blue-500 focus:outline-none mb-2"/>
            <div className="text-6xl font-extrabold text-blue-700">{placarA}</div>
            <div className="flex space-x-2 mt-3">
              <button onClick={() => ajustarPlacar('A', 1)} className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-full w-10 h-10 text-xl font-bold transition">+</button>
              <button onClick={() => ajustarPlacar('A', -1)} className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-full w-10 h-10 text-xl font-bold transition">-</button>
            </div>
          </div>
          <div className="flex flex-col items-center bg-gray-50 p-3 rounded-lg shadow-inner">
            <input type="text" value={atletaBNome} onChange={e => setAtletaBNome(e.target.value)} className="text-center text-lg font-semibold w-full bg-transparent border-b border-gray-300 focus:border-red-500 focus:outline-none mb-2"/>
            <div className="text-6xl font-extrabold text-red-700">{placarB}</div>
            <div className="flex space-x-2 mt-3">
              <button onClick={() => ajustarPlacar('B', 1)} className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-full w-10 h-10 text-xl font-bold transition">+</button>
              <button onClick={() => ajustarPlacar('B', -1)} className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-full w-10 h-10 text-xl font-bold transition">-</button>
            </div>
          </div>
        </section>

        <section className="mb-6">
            <h2 className="text-xl font-semibold mb-2 text-gray-700">Zona da Pista Ativa:</h2>
            <div className="grid grid-cols-3 gap-3">
                {(['Casa', 'Quadrado', 'House'] as Zona[]).map(zona => (
                    <button key={zona} onClick={() => setZonaAtiva(zona)} className={`${zoneButtonClasses} ${zonaAtiva === zona ? 'bg-yellow-400 text-gray-800 border-2 border-yellow-500 font-bold' : 'bg-gray-200 text-gray-800'}`}>{zona}</button>
                ))}
            </div>
        </section>

        <section className="mb-6">
            <h2 className="text-xl font-semibold mb-3 text-gray-700">Registro de Ações:</h2>
            <div className="grid grid-cols-2 gap-3 mb-4">
                <button onClick={() => registrarAcao('Ofensiva')} className={`${actionButtonClasses} bg-red-500 text-white`}>Ofensiva</button>
                <button onClick={() => registrarAcao('Ataque')} className={`${actionButtonClasses} bg-red-500 text-white`}>Ataque</button>
                <button onClick={() => registrarAcao('Defesa')} className={`${actionButtonClasses} bg-blue-500 text-white`}>Defesa</button>
                <button onClick={() => registrarAcao('Recuo')} className={`${actionButtonClasses} bg-blue-500 text-white`}>Recuo</button>
            </div>
            <div className="flex justify-center">
                <button onClick={() => registrarAcao('Contra-Ataque')} className={`${actionButtonClasses} bg-purple-500 text-white w-full sm:w-1/2`}>Contra-Ataque</button>
            </div>
        </section>
        
        <section className="mb-8 p-4 bg-green-50 rounded-lg shadow-md border border-green-200">
          <h2 className="text-xl font-semibold mb-3 text-green-700">Registrar Ponto:</h2>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => registrarPonto('A')} className={`${actionButtonClasses} bg-emerald-500 hover:bg-emerald-600 text-white`}>Ponto A (+1)</button>
            <button onClick={() => registrarPonto('B')} className={`${actionButtonClasses} bg-emerald-500 hover:bg-emerald-600 text-white`}>Ponto B (+1)</button>
          </div>
        </section>

        <section className="space-y-3">
            <button onClick={handleFinalizarJogo} className="w-full bg-gray-800 hover:bg-gray-900 text-white py-3 rounded-xl text-lg font-bold transition">Salvar e Gerar Relatório</button>
            <button onClick={() => setModalType('confirmReset')} className="w-full bg-red-100 hover:bg-red-200 text-red-700 py-3 rounded-xl text-lg font-bold transition">Novo Jogo (Limpar Tudo)</button>
        </section>

        <AnalysisDashboard log={log} />

      </main>
    </>
  );
};

export default App;
