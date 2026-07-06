import React, { useState, useEffect, useRef } from 'react';
import { User, Driver, Vehicle, Product, ActiveAsset, AuditSession, ReturnForecast, FiscalAlert, ImportedRoute, Vale, FirebaseConfig } from './types';
import { AppStore } from './store';
import { DEFAULT_PRODUCTS } from './data';
import Header from './components/Header';
import ConferenteView from './components/ConferenteView';
import FiscalView from './components/FiscalView';
import GestorDashboard from './components/GestorDashboard';
import LoginView from './components/LoginView';
import MonitoramentoView from './components/MonitoramentoView';
import PlatformManual from './components/PlatformManual';
import AIAgentChat from './components/AIAgentChat';
import FirebaseConfigView from './components/FirebaseConfigView';
import AuditLogsView from './components/AuditLogsView';
import { ClipboardCheck, ShieldCheck, BarChart3, AlertCircle, Bell, CheckCircle2 } from 'lucide-react';
import { getClientFirestore, logSystemAction } from "./firebaseClient";
import { doc, onSnapshot, setDoc } from "firebase/firestore";

const DEFAULT_FIREBASE_CONFIG = {
  projectId: "armazemfacil-b2292",
  appId: "1:688234941301:web:153e2ad3f634379fe3213c",
  apiKey: "AIzaSyA_ykhJGRkIDbPuDNYooMIVvB2DeVzp2VE",
  authDomain: "armazemfacil-b2292.firebaseapp.com",
  firestoreDatabaseId: "(default)",
  storageBucket: "armazemfacil-b2292.appspot.com",
  messagingSenderId: "688234941301",
  measurementId: "G-6HFDEKWVDB"
};

const DB_KEYS = [
  "users", "drivers", "vehicles", "products", "activeAssets", 
  "audits", "vales", "returnForecasts", "fiscalAlerts", 
  "importedRoutes", "audit_logs"
];

export default function App() {
  const lastWriteTime = useRef<number>(0);
  const pendingUpdatesRef = useRef<any>({});
  const pushTimeoutRef = useRef<any>(null);
  // Database states loaded from AppStore
  const [users, setUsers] = useState<User[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeAssets, setActiveAssets] = useState<ActiveAsset[]>([]);
  const [audits, setAudits] = useState<AuditSession[]>([]);
  const [vales, setVales] = useState<Vale[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Forecasts and Notifications
  const [returnForecasts, setReturnForecasts] = useState<ReturnForecast[]>([]);
  const [fiscalAlerts, setFiscalAlerts] = useState<FiscalAlert[]>([]);
  const [importedRoutes, setImportedRoutes] = useState<ImportedRoute[]>([]);
  const [firebaseConfig, setFirebaseConfig] = useState<FirebaseConfig | null>(null);

  // Session & UI Navigation states
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('logiroute_is_authenticated') === 'true';
  });
  const [activeTab, setActiveTab] = useState<string>('conferencias');

  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('logiroute_theme');
    return (saved === 'dark' || saved === 'light') ? saved : 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('logiroute_theme', theme);
  }, [theme]);

  // Warning & Reset States
  const [hasShownDeadlinePopup, setHasShownDeadlinePopup] = useState<boolean>(false);
  const [acknowledgedSent, setAcknowledgedSent] = useState<string[]>(() => {
    const saved = localStorage.getItem('logiroute_acknowledged_sent_audits');
    return saved ? JSON.parse(saved) : [];
  });

  const handleResetPlatformData = async () => {
    // Clear major functional arrays
    setImportedRoutes([]);
    setAudits([]);
    setReturnForecasts([]);
    setFiscalAlerts([]);
    setVales([]);

    AppStore.setImportedRoutes([]);
    AppStore.setAudits([]);
    AppStore.setReturnForecasts([]);
    AppStore.setFiscalAlerts([]);
    AppStore.setVales([]);

    // Push cleared state to backend
    await pushDatabaseToServer({
      importedRoutes: [],
      audits: [],
      returnForecasts: [],
      fiscalAlerts: [],
      vales: [],
    });
  };

  // Push changes to server database with batching/throttling to prevent concurrency race conditions
  const pushDatabaseToServer = (updates: {
    users?: User[];
    drivers?: Driver[];
    vehicles?: Vehicle[];
    products?: Product[];
    activeAssets?: ActiveAsset[];
    audits?: AuditSession[];
    returnForecasts?: ReturnForecast[];
    fiscalAlerts?: FiscalAlert[];
    importedRoutes?: ImportedRoute[];
    vales?: Vale[];
    firebaseConfig?: FirebaseConfig | null;
  }) => {
    lastWriteTime.current = Date.now();
    
    // Accumulate the updates atomically
    pendingUpdatesRef.current = {
      ...pendingUpdatesRef.current,
      ...updates
    };

    // Clear previous timeout to debounce the server call
    if (pushTimeoutRef.current) {
      clearTimeout(pushTimeoutRef.current);
    }

    // Schedule single POST request for the end of the current microtask batch (e.g., 50ms)
    pushTimeoutRef.current = setTimeout(async () => {
      const payload = { ...pendingUpdatesRef.current };
      pendingUpdatesRef.current = {}; // Clear accumulator
      pushTimeoutRef.current = null;

      // Extract only keys that have non-empty or updated content
      const payloadKeys = Object.keys(payload);
      if (payloadKeys.length > 0) {
        let sseOrServerSuccess = false;
        try {
          const res = await fetch('/api/db', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              db: payload,
              user: currentUser ? { id: currentUser.id, name: currentUser.name, role: currentUser.role } : null
            }),
          });
          if (res.ok) {
            sseOrServerSuccess = true;
          }
        } catch (err) {
          console.error('Failed to push batched database updates to server:', err);
        }

        // If the server update failed (e.g., on GitHub Pages), write directly to Firestore!
        if (!sseOrServerSuccess) {
          console.log("[Firestore Client Link] Servidor indisponível ou em produção (GitHub Pages). Gravando diretamente no Firestore...");
          const db = getClientFirestore();
          if (db) {
            for (const key of payloadKeys) {
              if (payload[key] !== undefined && DB_KEYS.includes(key)) {
                const docRef = doc(db, "app_state", key);
                console.log(`[Firestore Client Link] [Criação/Atualização] Iniciando gravação direta no Firestore. Coleção: app_state, Documento/Chave: ${key}`);
                console.log(`[Firestore Client Link] [Dados enviados para chave ${key}]:`, payload[key]);
                try {
                  // Clean any 'undefined' fields inside the object/array recursively by converting to/from JSON.
                  // Firestore client SDK throws 'unsupported field value: undefined' on raw javascript objects with undefined properties.
                  const cleanData = JSON.parse(JSON.stringify(payload[key]));
                  console.log(`[Firestore Client Link] [Dados limpos (sem undefined) para chave ${key}]:`, cleanData);
                  await setDoc(docRef, { data: cleanData });
                  console.log(`[Firestore Client Link] Gravado com SUCESSO diretamente no Firestore para a chave: ${key}`);
                } catch (setErr: any) {
                  console.error(`[Firestore Client Link] ERRO CRÍTICO ao gravar chave '${key}' diretamente no Firestore:`, setErr);
                  if (setErr && typeof setErr === 'object') {
                    console.error("Detalhes do erro do Firestore:", {
                      message: setErr.message,
                      code: setErr.code,
                      stack: setErr.stack,
                      name: setErr.name
                    });
                  }
                }
              }
            }
          } else {
            console.warn("[Firestore Client Link] Firestore não inicializado no cliente. Não foi possível persistir diretamente na nuvem.");
          }
        }
      }
    }, 50);
  };

  // Flush any pending batched database updates to server immediately and wait for completion
  const flushPendingUpdates = async () => {
    if (pushTimeoutRef.current) {
      clearTimeout(pushTimeoutRef.current);
      pushTimeoutRef.current = null;
    }

    const payload = { ...pendingUpdatesRef.current };
    const payloadKeys = Object.keys(payload);
    if (payloadKeys.length > 0) {
      pendingUpdatesRef.current = {}; // Clear accumulator
      let sseOrServerSuccess = false;
      try {
        const res = await fetch('/api/db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            db: payload,
            user: currentUser ? { id: currentUser.id, name: currentUser.name, role: currentUser.role } : null
          }),
        });
        if (res.ok) {
          sseOrServerSuccess = true;
        }
      } catch (err) {
        console.error('Failed to flush database updates:', err);
      }

      // If the server update failed (e.g., on GitHub Pages), write directly to Firestore!
      if (!sseOrServerSuccess) {
        console.log("[Firestore Client Link] Servidor indisponível ou em produção (GitHub Pages). Gravando diretamente no Firestore...");
        const db = getClientFirestore();
        if (db) {
          for (const key of payloadKeys) {
            if (payload[key] !== undefined && DB_KEYS.includes(key)) {
              const docRef = doc(db, "app_state", key);
              console.log(`[Firestore Client Link] [Criação/Atualização - Flush] Iniciando gravação direta no Firestore. Coleção: app_state, Documento/Chave: ${key}`);
              console.log(`[Firestore Client Link] [Flush - Dados enviados para chave ${key}]:`, payload[key]);
              try {
                // Clean any 'undefined' fields inside the object/array recursively by converting to/from JSON.
                // Firestore client SDK throws 'unsupported field value: undefined' on raw javascript objects with undefined properties.
                const cleanData = JSON.parse(JSON.stringify(payload[key]));
                console.log(`[Firestore Client Link] [Flush - Dados limpos (sem undefined) para chave ${key}]:`, cleanData);
                await setDoc(docRef, { data: cleanData });
                console.log(`[Firestore Client Link] Gravado com SUCESSO diretamente no Firestore para a chave: ${key}`);
              } catch (setErr: any) {
                console.error(`[Firestore Client Link] ERRO CRÍTICO ao gravar chave '${key}' diretamente no Firestore (Flush):`, setErr);
                if (setErr && typeof setErr === 'object') {
                  console.error("Detalhes do erro do Firestore (Flush):", {
                    message: setErr.message,
                    code: setErr.code,
                    stack: setErr.stack,
                    name: setErr.name
                  });
                }
              }
            }
          }
        } else {
          console.warn("[Firestore Client Link] Firestore não inicializado no cliente. Não foi possível persistir diretamente na nuvem.");
        }
      }
    }
  };

  // Helper to repair missing or broken product descriptions
  const repairProductsList = (list: Product[]) => {
    if (!list) return [];
    return list.map(p => {
      if (p.description === p.code || !p.description || p.description.trim() === '') {
        const original = DEFAULT_PRODUCTS.find(dp => dp.code === p.code);
        if (original) {
          return { ...p, description: original.description };
        }
      }
      return p;
    });
  };

  // 2. Fetch latest online database from server
  const fetchLatestServerData = async () => {
    await flushPendingUpdates();
    try {
      const res = await fetch('/api/db');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.db) {
          const db = data.db;
          const freshUserId = localStorage.getItem('logiroute_authenticated_user_id');
          if (db.users && db.users.length > 0) {
            setUsers(db.users);
            AppStore.setUsers(db.users);
            if (freshUserId) {
              const matchedUser = db.users.find((u: User) => u.id === freshUserId);
              if (matchedUser) setCurrentUser(matchedUser);
            }
          }
          if (db.drivers) { setDrivers(db.drivers); AppStore.setDrivers(db.drivers); }
          if (db.vehicles) { setVehicles(db.vehicles); AppStore.setVehicles(db.vehicles); }
          if (db.products) {
            const repaired = repairProductsList(db.products);
            setProducts(repaired);
            AppStore.setProducts(repaired);
          }
          if (db.activeAssets) { setActiveAssets(db.activeAssets); AppStore.setActiveAssets(db.activeAssets); }
          if (db.audits) { setAudits(db.audits); AppStore.setAudits(db.audits); }
          if (db.vales) { setVales(db.vales); AppStore.setVales(db.vales); }
          if (db.returnForecasts) { setReturnForecasts(db.returnForecasts); AppStore.setReturnForecasts(db.returnForecasts); }
          if (db.fiscalAlerts) { setFiscalAlerts(db.fiscalAlerts); AppStore.setFiscalAlerts(db.fiscalAlerts); }
          if (db.importedRoutes) { setImportedRoutes(db.importedRoutes); AppStore.setImportedRoutes(db.importedRoutes); }
          if (db.audit_logs) { setAuditLogs(db.audit_logs); AppStore.setAuditLogs(db.audit_logs); }
          if (db.firebaseConfig !== undefined) { setFirebaseConfig(db.firebaseConfig); AppStore.setFirebaseConfig(db.firebaseConfig); }
        } else {
          console.log("Banco de dados do servidor está em branco ou indisponível. Ignorando auto-sobreposição para segurança.");
        }
      }
    } catch (err) {
      console.error('Error fetching server database:', err);
    }
  };

  // Load all databases from store on mount and establish server sync
  useEffect(() => {
    // 1. Initial quick load from LocalStorage
    const loadedUsers = AppStore.getUsers();
    setUsers(loadedUsers);
    setDrivers(AppStore.getDrivers());
    setVehicles(AppStore.getVehicles());
    setProducts(repairProductsList(AppStore.getProducts()));
    setActiveAssets(AppStore.getActiveAssets());
    setAudits(AppStore.getAudits());
    setVales(AppStore.getVales());
    setReturnForecasts(AppStore.getReturnForecasts());
    setFiscalAlerts(AppStore.getFiscalAlerts());
    setImportedRoutes(AppStore.getImportedRoutes());
    setAuditLogs(AppStore.getAuditLogs());
    setFirebaseConfig(AppStore.getFirebaseConfig());

    // Check persistent user ID if authenticated
    const savedUserId = localStorage.getItem('logiroute_authenticated_user_id');
    const defaultUser = loadedUsers.find(u => u.id === savedUserId) || loadedUsers.find(u => u.id === 'usr_1') || loadedUsers[0];
    setCurrentUser(defaultUser || null);

    // 2. Fetch latest online database from server
    fetchLatestServerData();

    // 3. Setup periodic backup polling every 30 seconds as fallback
    const interval = setInterval(async () => {
      try {
        // Skip polling if there was a recent write on this client to avoid race conditions
        if (Date.now() - lastWriteTime.current < 4000) {
          return;
        }
        const res = await fetch('/api/db');
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.db) {
            const db = data.db;
            if (db.users && db.users.length > 0) {
              setUsers(db.users);
              AppStore.setUsers(db.users);
              const freshUserId = localStorage.getItem('logiroute_authenticated_user_id');
              if (freshUserId) {
                const freshUser = db.users.find((u: User) => u.id === freshUserId);
                if (freshUser) {
                  setCurrentUser(freshUser);
                }
              }
            }
            if (db.drivers) { setDrivers(db.drivers); AppStore.setDrivers(db.drivers); }
            if (db.vehicles) { setVehicles(db.vehicles); AppStore.setVehicles(db.vehicles); }
            if (db.products) {
              const repaired = repairProductsList(db.products);
              setProducts(repaired);
              AppStore.setProducts(repaired);
            }
            if (db.activeAssets) { setActiveAssets(db.activeAssets); AppStore.setActiveAssets(db.activeAssets); }
            if (db.audits) { setAudits(db.audits); AppStore.setAudits(db.audits); }
            if (db.vales) { setVales(db.vales); AppStore.setVales(db.vales); }
            if (db.returnForecasts) { setReturnForecasts(db.returnForecasts); AppStore.setReturnForecasts(db.returnForecasts); }
            if (db.fiscalAlerts) { setFiscalAlerts(db.fiscalAlerts); AppStore.setFiscalAlerts(db.fiscalAlerts); }
            if (db.importedRoutes) { setImportedRoutes(db.importedRoutes); AppStore.setImportedRoutes(db.importedRoutes); }
            if (db.audit_logs) { setAuditLogs(db.audit_logs); AppStore.setAuditLogs(db.audit_logs); }
            if (db.firebaseConfig !== undefined) { setFirebaseConfig(db.firebaseConfig); AppStore.setFirebaseConfig(db.firebaseConfig); }
          }
        }
      } catch (err) {
        console.error('Polling database sync error:', err);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // 4. Real-time synchronization via direct Firestore onSnapshot listeners
  useEffect(() => {
    let unsubscribes: (() => void)[] = [];

    const initClientFirebase = async () => {
      try {
        const db = getClientFirestore();
        if (!db) {
          console.warn("[Firestore Client Link] Firestore could not be initialized");
          return;
        }

        console.log("[Firestore Client Link] Conectando aos listeners em tempo real...");

        unsubscribes = DB_KEYS.map((key) => {
          const docRef = doc(db, "app_state", key);
          return onSnapshot(docRef, (docSnap) => {
            if (!docSnap.exists()) return;

            const docData = docSnap.data();
            const dataList = docData.data || [];

            // Skip applying updates if there was a recent local write on this client to avoid race conditions
            if (Date.now() - lastWriteTime.current < 4000) {
              return;
            }

            console.log(`[Firestore Client Link] Sincronização em tempo real recebida para a chave: ${key}`);

            switch (key) {
              case "users":
                if (dataList.length > 0) {
                  setUsers(dataList);
                  AppStore.setUsers(dataList);
                  const freshUserId = localStorage.getItem('logiroute_authenticated_user_id');
                  if (freshUserId) {
                    const matchedUser = dataList.find((u: User) => u.id === freshUserId);
                    if (matchedUser) setCurrentUser(matchedUser);
                  }
                }
                break;
              case "drivers":
                setDrivers(dataList);
                AppStore.setDrivers(dataList);
                break;
              case "vehicles":
                setVehicles(dataList);
                AppStore.setVehicles(dataList);
                break;
              case "products": {
                const repaired = repairProductsList(dataList);
                setProducts(repaired);
                AppStore.setProducts(repaired);
                break;
              }
              case "activeAssets":
                setActiveAssets(dataList);
                AppStore.setActiveAssets(dataList);
                break;
              case "audits":
                setAudits(dataList);
                AppStore.setAudits(dataList);
                break;
              case "vales":
                setVales(dataList);
                AppStore.setVales(dataList);
                break;
              case "returnForecasts":
                setReturnForecasts(dataList);
                AppStore.setReturnForecasts(dataList);
                break;
              case "fiscalAlerts":
                setFiscalAlerts(dataList);
                AppStore.setFiscalAlerts(dataList);
                break;
              case "importedRoutes":
                setImportedRoutes(dataList);
                AppStore.setImportedRoutes(dataList);
                break;
              case "audit_logs":
                setAuditLogs(dataList);
                AppStore.setAuditLogs(dataList);
                break;
              default:
                break;
            }
          }, (error) => {
            console.error(`Erro no listener do Firestore para a chave '${key}':`, error);
          });
        });
      } catch (err) {
        console.error("Falha ao inicializar o Firestore no cliente:", err);
      }
    };

    initClientFirebase();

    return () => {
      unsubscribes.forEach(unsub => {
        try {
          unsub();
        } catch (e) {
          // ignore
        }
      });
    };
  }, [firebaseConfig]);

  // Real-time synchronization across tabs of the SAME browser
  useEffect(() => {
    const channel = typeof window !== 'undefined' && 'BroadcastChannel' in window
      ? new BroadcastChannel('logiroute_realtime_sync')
      : null;

    const reloadStoreState = () => {
      setUsers(AppStore.getUsers());
      setDrivers(AppStore.getDrivers());
      setVehicles(AppStore.getVehicles());
      setProducts(AppStore.getProducts());
      setActiveAssets(AppStore.getActiveAssets());
      setAudits(AppStore.getAudits());
      setVales(AppStore.getVales());
      setReturnForecasts(AppStore.getReturnForecasts());
      setFiscalAlerts(AppStore.getFiscalAlerts());
      setImportedRoutes(AppStore.getImportedRoutes());
    };

    if (channel) {
      channel.onmessage = (event) => {
        if (event.data && event.data.type === 'SYNC_KEY') {
          reloadStoreState();
        }
      };
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key && e.key.startsWith('logiroute_')) {
        reloadStoreState();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      if (channel) channel.close();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Sync state changes back to AppStore (localStorage) and Server
  const handleSaveUsers = (newUsers: User[]) => {
    const oldUsers = users;
    if (oldUsers.length < newUsers.length) {
      const added = newUsers.filter(n => !oldUsers.some(o => o.id === n.id))[0];
      if (added) {
        logSystemAction({
          module: "CADASTROS",
          actionType: "CRIOU",
          affectedCollection: "users",
          affectedId: added.id,
          summary: `Cadastrou o usuário ${added.name} com o perfil ${added.role}.`,
          currentUser
        });
      }
    } else if (oldUsers.length > newUsers.length) {
      const removed = oldUsers.filter(o => !newUsers.some(n => n.id === o.id))[0];
      if (removed) {
        logSystemAction({
          module: "CADASTROS",
          actionType: "EXCLUIU",
          affectedCollection: "users",
          affectedId: removed.id,
          summary: `Excluiu o usuário ${removed.name} (Perfil: ${removed.role}).`,
          currentUser
        });
      }
    } else {
      const edited = newUsers.find(n => {
        const old = oldUsers.find(o => o.id === n.id);
        return old && JSON.stringify(old) !== JSON.stringify(n);
      });
      if (edited) {
        const old = oldUsers.find(o => o.id === edited.id);
        let summary = `Atualizou dados do usuário ${edited.name}.`;
        if (old && old.role !== edited.role) {
          summary = `Alterou as permissões do usuário ${edited.name} de ${old.role} para ${edited.role}.`;
        }
        logSystemAction({
          module: "CADASTROS",
          actionType: "EDITOU",
          affectedCollection: "users",
          affectedId: edited.id,
          summary,
          currentUser
        });
      }
    }

    setUsers(newUsers);
    AppStore.setUsers(newUsers);
    pushDatabaseToServer({ users: newUsers });
  };

  const handleSaveDrivers = (newDrivers: Driver[]) => {
    const old = drivers;
    if (old.length < newDrivers.length) {
      const item = newDrivers.filter(n => !old.some(o => o.id === n.id))[0];
      if (item) {
        logSystemAction({
          module: "CADASTROS",
          actionType: "CRIOU",
          affectedCollection: "drivers",
          affectedId: item.id,
          summary: `Cadastrou o motorista/ajudante ${item.name} (${item.role}).`,
          currentUser
        });
      }
    } else if (old.length > newDrivers.length) {
      const item = old.filter(o => !newDrivers.some(n => n.id === o.id))[0];
      if (item) {
        logSystemAction({
          module: "CADASTROS",
          actionType: "EXCLUIU",
          affectedCollection: "drivers",
          affectedId: item.id,
          summary: `Excluiu o motorista/ajudante ${item.name} (${item.role}).`,
          currentUser
        });
      }
    } else {
      const item = newDrivers.find(n => {
        const prev = old.find(o => o.id === n.id);
        return prev && JSON.stringify(prev) !== JSON.stringify(n);
      });
      if (item) {
        logSystemAction({
          module: "CADASTROS",
          actionType: "EDITOU",
          affectedCollection: "drivers",
          affectedId: item.id,
          summary: `Atualizou dados do motorista/ajudante ${item.name} (${item.role}).`,
          currentUser
        });
      }
    }

    setDrivers(newDrivers);
    AppStore.setDrivers(newDrivers);
    pushDatabaseToServer({ drivers: newDrivers });
  };

  const handleSaveVehicles = (newVehicles: Vehicle[]) => {
    const old = vehicles;
    if (old.length < newVehicles.length) {
      const item = newVehicles.filter(n => !old.some(o => o.plate === n.plate))[0];
      if (item) {
        logSystemAction({
          module: "CADASTROS",
          actionType: "CRIOU",
          affectedCollection: "vehicles",
          affectedId: item.plate,
          summary: `Cadastrou o veículo placa ${item.plate} (Capacidade: ${item.capacityPallets} paletes).`,
          currentUser
        });
      }
    } else if (old.length > newVehicles.length) {
      const item = old.filter(o => !newVehicles.some(n => n.plate === o.plate))[0];
      if (item) {
        logSystemAction({
          module: "CADASTROS",
          actionType: "EXCLUIU",
          affectedCollection: "vehicles",
          affectedId: item.plate,
          summary: `Excluiu o veículo placa ${item.plate}.`,
          currentUser
        });
      }
    } else {
      const item = newVehicles.find(n => {
        const prev = old.find(o => o.plate === n.plate);
        return prev && JSON.stringify(prev) !== JSON.stringify(n);
      });
      if (item) {
        logSystemAction({
          module: "CADASTROS",
          actionType: "EDITOU",
          affectedCollection: "vehicles",
          affectedId: item.plate,
          summary: `Atualizou dados do veículo placa ${item.plate}.`,
          currentUser
        });
      }
    }

    setVehicles(newVehicles);
    AppStore.setVehicles(newVehicles);
    pushDatabaseToServer({ vehicles: newVehicles });
  };

  const handleSaveProducts = (newProducts: Product[]) => {
    const old = products;
    if (old.length < newProducts.length) {
      const item = newProducts.filter(n => !old.some(o => o.code === n.code))[0];
      if (item) {
        logSystemAction({
          module: "CADASTROS",
          actionType: "CRIOU",
          affectedCollection: "products",
          affectedId: item.code,
          summary: `Cadastrou o produto ${item.description} (Código: ${item.code}).`,
          currentUser
        });
      }
    } else if (old.length > newProducts.length) {
      const item = old.filter(o => !newProducts.some(n => n.code === o.code))[0];
      if (item) {
        logSystemAction({
          module: "CADASTROS",
          actionType: "EXCLUIU",
          affectedCollection: "products",
          affectedId: item.code,
          summary: `Excluiu o produto ${item.description} (Código: ${item.code}).`,
          currentUser
        });
      }
    } else {
      const item = newProducts.find(n => {
        const prev = old.find(o => o.code === n.code);
        return prev && JSON.stringify(prev) !== JSON.stringify(n);
      });
      if (item) {
        logSystemAction({
          module: "CADASTROS",
          actionType: "EDITOU",
          affectedCollection: "products",
          affectedId: item.code,
          summary: `Atualizou os dados do produto ${item.description}.`,
          currentUser
        });
      }
    }

    setProducts(newProducts);
    AppStore.setProducts(newProducts);
    pushDatabaseToServer({ products: newProducts });
  };

  const handleSaveAudits = (newAudits: AuditSession[]) => {
    const old = audits;
    if (old.length < newAudits.length) {
      const item = newAudits.filter(n => !old.some(o => o.id === n.id))[0];
      if (item) {
        logSystemAction({
          module: "CONFERENCIA",
          actionType: "CRIOU",
          affectedCollection: "audits",
          affectedId: item.id,
          summary: `Iniciou nova conferência física para o mapa ${item.routeMap} (Placa: ${item.plate}).`,
          currentUser
        });
      }
    } else if (old.length > newAudits.length) {
      const item = old.filter(o => !newAudits.some(n => n.id === o.id))[0];
      if (item) {
        logSystemAction({
          module: "CONFERENCIA",
          actionType: "EXCLUIU",
          affectedCollection: "audits",
          affectedId: item.id,
          summary: `Excluiu a conferência do mapa ${item.routeMap} (Placa: ${item.plate}).`,
          currentUser
        });
      }
    } else {
      const item = newAudits.find(n => {
        const prev = old.find(o => o.id === n.id);
        return prev && JSON.stringify(prev) !== JSON.stringify(n);
      });
      if (item) {
        const prev = old.find(o => o.id === item.id);
        let summary = `Atualizou dados do mapa de auditoria ${item.routeMap}.`;
        let actType = "EDITOU";
        if (prev && prev.status !== item.status) {
          actType = "STATUS";
          summary = `Alterou o status do mapa de auditoria ${item.routeMap} de "${prev.status}" para "${item.status}".`;
        } else if (prev && prev.isSuspended !== item.isSuspended) {
          summary = item.isSuspended 
            ? `Suspendeu temporariamente a contagem física do mapa ${item.routeMap} (Motivo: ${item.suspensionNotes || 'N/A'}).`
            : `Retomou a contagem física suspensa do mapa ${item.routeMap}.`;
        }
        logSystemAction({
          module: "CONFERENCIA",
          actionType: actType,
          affectedCollection: "audits",
          affectedId: item.id,
          summary,
          currentUser
        });
      }
    }

    setAudits(newAudits);
    AppStore.setAudits(newAudits);
    pushDatabaseToServer({ audits: newAudits });
  };

  const handleSaveForecasts = (newForecasts: ReturnForecast[]) => {
    setReturnForecasts(newForecasts);
    AppStore.setReturnForecasts(newForecasts);
    pushDatabaseToServer({ returnForecasts: newForecasts });
  };

  const handleSaveAlerts = (newAlerts: FiscalAlert[]) => {
    setFiscalAlerts(newAlerts);
    AppStore.setFiscalAlerts(newAlerts);
    pushDatabaseToServer({ fiscalAlerts: newAlerts });
  };

  const handleSaveImportedRoutes = (newRoutes: ImportedRoute[]) => {
    const old = importedRoutes;
    if (old.length < newRoutes.length) {
      const item = newRoutes.filter(n => !old.some(o => o.id === n.id))[0];
      if (item) {
        logSystemAction({
          module: "SINCRONIZADOR",
          actionType: "CRIOU",
          affectedCollection: "importedRoutes",
          affectedId: item.id,
          summary: `Importou nova planilha de rota para o mapa ${item.routeMap} (Placa: ${item.plate}).`,
          currentUser
        });
      }
    } else if (old.length > newRoutes.length) {
      const item = old.filter(o => !newRoutes.some(n => n.id === o.id))[0];
      if (item) {
        logSystemAction({
          module: "SINCRONIZADOR",
          actionType: "EXCLUIU",
          affectedCollection: "importedRoutes",
          affectedId: item.id,
          summary: `Excluiu a rota importada do mapa ${item.routeMap}.`,
          currentUser
        });
      }
    } else {
      const item = newRoutes.find(n => {
        const prev = old.find(o => o.id === n.id);
        return prev && JSON.stringify(prev) !== JSON.stringify(n);
      });
      if (item) {
        const prev = old.find(o => o.id === item.id);
        let summary = `Atualizou dados da rota importada do mapa ${item.routeMap}.`;
        let actType = "EDITOU";
        if (prev && prev.status !== item.status) {
          actType = "STATUS";
          summary = `Alterou o status do mapa importado ${item.routeMap} de "${prev.status}" para "${item.status}".`;
        }
        logSystemAction({
          module: "SINCRONIZADOR",
          actionType: actType,
          affectedCollection: "importedRoutes",
          affectedId: item.id,
          summary,
          currentUser
        });
      }
    }

    setImportedRoutes(newRoutes);
    AppStore.setImportedRoutes(newRoutes);
    pushDatabaseToServer({ importedRoutes: newRoutes });
  };

  const handleSaveVales = (newVales: Vale[]) => {
    const old = vales;
    if (old.length < newVales.length) {
      const item = newVales.filter(n => !old.some(o => o.id === n.id))[0];
      if (item) {
        logSystemAction({
          module: "VALES",
          actionType: "CRIOU",
          affectedCollection: "vales",
          affectedId: item.id,
          summary: `Gerou desconto/vale de R$ ${item.valor.toFixed(2)} para ${item.colaboradorName} (${item.colaboradorRole}) no mapa ${item.routeMap || 'N/A'}.`,
          currentUser
        });
      }
    } else if (old.length > newVales.length) {
      const item = old.filter(o => !newVales.some(n => n.id === o.id))[0];
      if (item) {
        logSystemAction({
          module: "VALES",
          actionType: "EXCLUIU",
          affectedCollection: "vales",
          affectedId: item.id,
          summary: `Removeu o vale ID ${item.id} de ${item.colaboradorName}.`,
          currentUser
        });
      }
    } else {
      const item = newVales.find(n => {
        const prev = old.find(o => o.id === n.id);
        return prev && JSON.stringify(prev) !== JSON.stringify(n);
      });
      if (item) {
        const prev = old.find(o => o.id === item.id);
        let summary = `Atualizou dados do vale ID ${item.id}.`;
        let actType = "EDITOU";
        if (prev && prev.status !== item.status) {
          actType = "STATUS";
          summary = `Alterou o status do vale ID ${item.id} de ${item.colaboradorName} de "${prev.status}" para "${item.status}".`;
        }
        logSystemAction({
          module: "VALES",
          actionType: actType,
          affectedCollection: "vales",
          affectedId: item.id,
          summary,
          currentUser
        });
      }
    }

    setVales(newVales);
    AppStore.setVales(newVales);
    pushDatabaseToServer({ vales: newVales });
  };

  const handleSaveFirebaseConfig = (config: FirebaseConfig | null) => {
    logSystemAction({
      module: "SISTEMA",
      actionType: "ATUALIZOU",
      affectedCollection: "firebaseConfig",
      affectedId: config?.projectId || "N/A",
      summary: `Atualizou os parâmetros de configuração do Firebase do projeto para: ${config?.projectId || 'Padrão'}.`,
      currentUser
    });

    setFirebaseConfig(config);
    AppStore.setFirebaseConfig(config);
    pushDatabaseToServer({ firebaseConfig: config });
  };

  // Switch tabs when current user role changes
  const handleUserChange = async (user: User) => {
    await flushPendingUpdates();
    setCurrentUser(user);
    localStorage.setItem('logiroute_authenticated_user_id', user.id);
    if (user.role === 'conferente') {
      setActiveTab('conferencias');
    } else if (user.role === 'auxiliar_logistica') {
      setActiveTab('reconciliacao');
    } else if (user.role === 'gestor') {
      setActiveTab('dashboard');
    } else if (user.role === 'monitoramento') {
      setActiveTab('monitoramento_view');
    }
    fetchLatestServerData();
  };

  const handleLoginSuccess = async (user: User) => {
    await flushPendingUpdates();
    setCurrentUser(user);
    setIsAuthenticated(true);
    localStorage.setItem('logiroute_is_authenticated', 'true');
    localStorage.setItem('logiroute_authenticated_user_id', user.id);

    // Route active tabs based on permission roles
    if (user.role === 'conferente') {
      setActiveTab('conferencias');
    } else if (user.role === 'auxiliar_logistica') {
      setActiveTab('reconciliacao');
    } else if (user.role === 'gestor') {
      setActiveTab('dashboard');
    } else if (user.role === 'monitoramento') {
      setActiveTab('monitoramento_view');
    }
    fetchLatestServerData();

    // Log login action
    const formatRole = (r: string) => {
      if (r === 'gestor') return 'Gestor Master';
      if (r === 'auxiliar_logistica') return 'Auxiliar de Logística (Fiscal)';
      if (r === 'conferente') return 'Conferente de Pátio';
      if (r === 'monitoramento') return 'Monitoramento';
      return r;
    };
    logSystemAction({
      module: "SISTEMA",
      actionType: "LOGIN",
      affectedCollection: "users",
      affectedId: user.id,
      summary: `Usuário ${user.name} (${formatRole(user.role)}) realizou login com sucesso no sistema.`,
      currentUser: user
    });
  };

  const handleLogout = async () => {
    // Log logout action before state cleared
    if (currentUser) {
      const formatRole = (r: string) => {
        if (r === 'gestor') return 'Gestor Master';
        if (r === 'auxiliar_logistica') return 'Auxiliar de Logística (Fiscal)';
        if (r === 'conferente') return 'Conferente de Pátio';
        if (r === 'monitoramento') return 'Monitoramento';
        return r;
      };
      logSystemAction({
        module: "SISTEMA",
        actionType: "LOGOUT",
        affectedCollection: "users",
        affectedId: currentUser.id,
        summary: `Usuário ${currentUser.name} (${formatRole(currentUser.role)}) realizou logout do sistema.`,
        currentUser: currentUser
      });
    }

    await flushPendingUpdates();
    setIsAuthenticated(false);
    localStorage.removeItem('logiroute_is_authenticated');
    localStorage.removeItem('logiroute_authenticated_user_id');
  };

  // Render branded Login View if not authenticated
  if (!isAuthenticated) {
    return <LoginView users={users} onLoginSuccess={handleLoginSuccess} />;
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-white text-center">
          <p className="font-semibold text-lg">Carregando plataforma de retornos...</p>
        </div>
      </div>
    );
  }

  // Tomorrow's date string
  const tomorrowStr = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  })();

  // Filter audits for deadlines
  const pendingDeadlines = audits.filter(audit => {
    if (audit.surplusFlowStatus === 'ENVIADO') return false;
    if (!audit.deliveryDate || audit.deliveryDate !== tomorrowStr) return false;
    
    const hasSurplus = audit.items.some(i => {
      const phys = i.rePhysicalQty !== undefined ? i.rePhysicalQty : i.physicalQty;
      return phys > (i.fiscalQty ?? 0);
    }) || audit.assets.some(a => {
      const phys = a.rePhysicalQty !== undefined ? a.rePhysicalQty : a.physicalQty;
      return phys > (a.fiscalQty ?? 0);
    });
    
    return hasSurplus;
  });

  const showDeadlineModal = currentUser && (currentUser.role === 'gestor' || currentUser.role === 'auxiliar_logistica') && pendingDeadlines.length > 0 && !hasShownDeadlinePopup;

  // Sent audits to notify monitoramento
  const sentAuditsToNotify = currentUser && currentUser.role === 'monitoramento'
    ? audits.filter(audit => {
        if (audit.surplusFlowStatus !== 'ENVIADO') return false;
        
        const hasSurplus = audit.items.some(i => {
          const phys = i.rePhysicalQty !== undefined ? i.rePhysicalQty : i.physicalQty;
          return phys > (i.fiscalQty ?? 0);
        }) || audit.assets.some(a => {
          const phys = a.rePhysicalQty !== undefined ? a.rePhysicalQty : a.physicalQty;
          return phys > (a.fiscalQty ?? 0);
        });
        
        return hasSurplus && !acknowledgedSent.includes(audit.id);
      })
    : [];

  const downloadSobrasCSV = (auditsToDownload: AuditSession[]) => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Mapa;Placa;Motorista;Codigo NB;Data de Entrega;Produto/Ativo;Quantidade Sobra\n";
    
    auditsToDownload.forEach(audit => {
      const driver = drivers.find(d => d.id === audit.driverId)?.name || 'Desconhecido';
      
      const surpluses = [
        ...audit.items.filter(i => (i.rePhysicalQty !== undefined ? i.rePhysicalQty : i.physicalQty) > (i.fiscalQty ?? 0)).map(i => ({
          description: i.productDescription,
          qty: (i.rePhysicalQty !== undefined ? i.rePhysicalQty : i.physicalQty) - (i.fiscalQty ?? 0)
        })),
        ...audit.assets.filter(a => (a.rePhysicalQty !== undefined ? a.rePhysicalQty : a.physicalQty) > (a.fiscalQty ?? 0)).map(a => ({
          description: a.assetName,
          qty: (a.rePhysicalQty !== undefined ? a.rePhysicalQty : a.physicalQty) - (a.fiscalQty ?? 0)
        }))
      ];
      
      surpluses.forEach(s => {
        csvContent += `"${audit.routeMap}";"${audit.plate}";"${driver}";"${audit.clientCodeNB || ''}";"${audit.deliveryDate || ''}";"${s.description}";"${s.qty}"\n`;
      });
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sobras_prazo_amanha_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800" id="main_app_wrapper">
      
      {/* Shared Navigation Header with Profile Switcher */}
      <Header
        currentUser={currentUser}
        users={users}
        onUserChange={handleUserChange}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
        fiscalAlerts={fiscalAlerts}
        onSaveAlerts={handleSaveAlerts}
        theme={theme}
        onToggleTheme={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
      />

      {/* Main Content Workspace Routing based on Profile & Tab */}
      <main className="flex-grow">
        
        {/* VIEW 1: CONFERENTE (PHYSICAL AUDITOR) */}
        {(currentUser.role === 'conferente' || currentUser.role === 'gestor') && activeTab === 'conferencias' && (
          <ConferenteView
            currentUser={currentUser}
            drivers={drivers}
            vehicles={vehicles}
            products={products}
            activeAssets={activeAssets}
            audits={audits}
            onSaveAudits={handleSaveAudits}
            onSaveDrivers={handleSaveDrivers}
            onSaveVehicles={handleSaveVehicles}
            returnForecasts={returnForecasts}
            onSaveForecasts={handleSaveForecasts}
            fiscalAlerts={fiscalAlerts}
            onSaveAlerts={handleSaveAlerts}
            importedRoutes={importedRoutes}
            onSaveImportedRoutes={handleSaveImportedRoutes}
          />
        )}

        {/* VIEW 2: AUXILIAR DE LOGÍSTICA (FISCAL WORKSPACE & HISTORY) */}
        {(currentUser.role === 'auxiliar_logistica' || currentUser.role === 'gestor') && (activeTab === 'reconciliacao' || activeTab === 'historico' || activeTab === 'divergencias' || activeTab === 'mapas_importados' || activeTab === 'sincronizador' || activeTab === 'vales_view') && (
          <FiscalView
            currentUser={currentUser}
            drivers={drivers}
            onSaveDrivers={handleSaveDrivers}
            vehicles={vehicles}
            products={products}
            onSaveProducts={handleSaveProducts}
            activeAssets={activeAssets}
            audits={audits}
            onSaveAudits={handleSaveAudits}
            fiscalAlerts={fiscalAlerts}
            onSaveAlerts={handleSaveAlerts}
            importedRoutes={importedRoutes}
            onSaveImportedRoutes={handleSaveImportedRoutes}
            vales={vales}
            onSaveVales={handleSaveVales}
            activeTab={activeTab}
            onResetPlatformData={handleResetPlatformData}
            returnForecasts={returnForecasts}
            onSaveForecasts={handleSaveForecasts}
          />
        )}

        {/* VIEW 4: MONITORAMENTO SPECIFIC ROUTING */}
        {(currentUser.role === 'monitoramento' || currentUser.role === 'gestor') && activeTab === 'monitoramento_view' && (
          <MonitoramentoView
            currentUser={currentUser}
            importedRoutes={importedRoutes}
            onSaveImportedRoutes={handleSaveImportedRoutes}
            returnForecasts={returnForecasts}
            onSaveForecasts={handleSaveForecasts}
            drivers={drivers}
            onSaveDrivers={handleSaveDrivers}
            vehicles={vehicles}
            audits={audits}
            onSaveAudits={handleSaveAudits}
          />
        )}
        {currentUser.role === 'monitoramento' && (activeTab === 'historico' || activeTab === 'divergencias') && (
          <FiscalView
            currentUser={currentUser}
            drivers={drivers}
            onSaveDrivers={handleSaveDrivers}
            vehicles={vehicles}
            products={products}
            onSaveProducts={handleSaveProducts}
            activeAssets={activeAssets}
            audits={audits}
            onSaveAudits={handleSaveAudits}
            fiscalAlerts={fiscalAlerts}
            onSaveAlerts={handleSaveAlerts}
            importedRoutes={importedRoutes}
            onSaveImportedRoutes={handleSaveImportedRoutes}
            vales={vales}
            onSaveVales={handleSaveVales}
            activeTab={activeTab}
            onResetPlatformData={handleResetPlatformData}
            returnForecasts={returnForecasts}
            onSaveForecasts={handleSaveForecasts}
          />
        )}

        {/* VIEW 3: GESTOR (INDICATORS DASHBOARD, HISTÓRICO, & CADASTROS) */}
        {currentUser.role === 'gestor' && (
          <>
            {activeTab === 'dashboard' && (
              <GestorDashboard
                currentUser={currentUser}
                drivers={drivers}
                vehicles={vehicles}
                products={products}
                activeAssets={activeAssets}
                audits={audits}
                users={users}
                onSaveUsers={handleSaveUsers}
                onSaveDrivers={handleSaveDrivers}
                onSaveVehicles={handleSaveVehicles}
                onSaveProducts={handleSaveProducts}
                onSaveAudits={handleSaveAudits}
                importedRoutes={importedRoutes}
                onSaveImportedRoutes={handleSaveImportedRoutes}
                vales={vales}
                onSaveVales={handleSaveVales}
                forceTab="dashboard"
                auditLogs={auditLogs}
              />
            )}

            {activeTab === 'cadastros' && (
              <GestorDashboard
                currentUser={currentUser}
                drivers={drivers}
                vehicles={vehicles}
                products={products}
                activeAssets={activeAssets}
                audits={audits}
                users={users}
                onSaveUsers={handleSaveUsers}
                onSaveDrivers={handleSaveDrivers}
                onSaveVehicles={handleSaveVehicles}
                onSaveProducts={handleSaveProducts}
                onSaveAudits={handleSaveAudits}
                importedRoutes={importedRoutes}
                onSaveImportedRoutes={handleSaveImportedRoutes}
                vales={vales}
                onSaveVales={handleSaveVales}
                forceTab="cadastros"
                auditLogs={auditLogs}
              />
            )}

            {activeTab === 'firebase_config' && (
              <FirebaseConfigView
                initialConfig={firebaseConfig}
                onSaveConfig={handleSaveFirebaseConfig}
              />
            )}

            {activeTab === 'registros_auditoria' && (
              <AuditLogsView currentUser={currentUser} />
            )}
          </>
        )}
      </main>

      {/* Manual de uso da plataforma com exportação para PDF */}
      {isAuthenticated && currentUser && <PlatformManual />}

      {/* Sticky footer indicating production-ready definitive system */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xxs text-slate-400 font-medium font-sans">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-2">
          <span>RETORNO DE ROTA PAU BRASIL GUARABIRA © 2026 • Sistema de Monitoramento e Máxima Eficiência de Retornos de Rota</span>
          <div className="flex items-center space-x-2">
            <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full border border-emerald-200 uppercase font-extrabold font-mono flex items-center gap-1">
              <span className="h-1.5 w-1.5 bg-emerald-600 rounded-full animate-ping"></span>
              Modelo Definitivo Ativo
            </span>
            <span className="text-slate-500 font-medium">Ambiente Operacional Homologado Pau Brasil Distribuidora</span>
          </div>
        </div>
      </footer>

      {/* Agente de I.A flutuante para tirar dúvidas dos usuários */}
      {isAuthenticated && currentUser && <AIAgentChat />}

      {/* MODAL 1: Sobra Deadline Warning for Gestor / Auxiliar Logística */}
      {showDeadlineModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200 space-y-4">
            <div className="flex items-center space-x-3 text-amber-500">
              <div className="bg-amber-100 p-2.5 rounded-full">
                <AlertCircle className="h-6 w-6 text-amber-600 animate-pulse" />
              </div>
              <div>
                <h3 className="font-sans font-black text-slate-900 uppercase text-sm">Prazo de Entrega Amanhã!</h3>
                <span className="text-[10px] text-slate-400 font-semibold font-mono">Alerta de Sobra de Rota</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Identificamos <strong>{pendingDeadlines.length}</strong> mapa(s) de sobras cujas datas de entrega se encerram amanhã (<strong>{new Date(tomorrowStr + 'T00:00:00').toLocaleDateString('pt-BR')}</strong>). Por favor, realize a baixa no sistema para evitar desvios fora do prazo.
            </p>

            <div className="bg-slate-50 rounded-lg p-3 space-y-1.5 border border-slate-100 max-h-36 overflow-y-auto">
              {pendingDeadlines.map(d => (
                <div key={d.id} className="flex justify-between items-center text-xxs font-mono text-slate-500 border-b border-slate-100 pb-1 last:border-none last:pb-0">
                  <span>Mapa: <strong>{d.routeMap}</strong> ({d.plate})</span>
                  <span>NB: {d.clientCodeNB || 'Não informado'}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  downloadSobrasCSV(pendingDeadlines);
                  setHasShownDeadlinePopup(true);
                }}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xxs py-2.5 px-3 rounded-lg transition uppercase text-center cursor-pointer shadow-sm flex items-center justify-center space-x-1"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Baixar do Sistema</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('divergencias');
                  setHasShownDeadlinePopup(true);
                }}
                className="flex-1 bg-slate-900 hover:bg-slate-850 text-white font-bold text-xxs py-2.5 px-3 rounded-lg transition uppercase text-center cursor-pointer shadow-sm"
              >
                Ver no Painel
              </button>
              <button
                type="button"
                onClick={() => setHasShownDeadlinePopup(true)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xxs py-2.5 px-3 rounded-lg transition uppercase text-center cursor-pointer"
              >
                Ignorar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Sobra Sent Notice for Monitoramento */}
      {sentAuditsToNotify.length > 0 && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200 space-y-4">
            <div className="flex items-center space-x-3 text-emerald-500">
              <div className="bg-emerald-100 p-2.5 rounded-full">
                <Bell className="h-6 w-6 text-emerald-600 animate-bounce" />
              </div>
              <div>
                <h3 className="font-sans font-black text-slate-900 uppercase text-sm">Item de Sobra Enviado!</h3>
                <span className="text-[10px] text-slate-400 font-semibold font-mono">Notificação de Monitoramento</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              O item de sobra referente ao mapa <strong>{sentAuditsToNotify[0].routeMap}</strong> (Placa: <strong>{sentAuditsToNotify[0].plate}</strong>) foi enviado com sucesso para o cliente! O status do fluxo de sobras agora é oficialmente <strong>ENVIADO (Baixado)</strong>.
            </p>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  const currentId = sentAuditsToNotify[0].id;
                  const updated = [...acknowledgedSent, currentId];
                  setAcknowledgedSent(updated);
                  localStorage.setItem('logiroute_acknowledged_sent_audits', JSON.stringify(updated));
                }}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xxs py-2.5 px-6 rounded-lg transition uppercase cursor-pointer shadow-sm"
              >
                Confirmar Ciente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
