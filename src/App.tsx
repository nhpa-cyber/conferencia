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
import { ClipboardCheck, ShieldCheck, BarChart3, AlertCircle, Bell, CheckCircle2 } from 'lucide-react';

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
        try {
          await fetch('/api/db', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              db: payload,
              user: currentUser ? { id: currentUser.id, name: currentUser.name, role: currentUser.role } : null
            }),
          });
        } catch (err) {
          console.error('Failed to push batched database updates to server:', err);
        }
      }
    }, 50);
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
    const fetchLatestServerData = async () => {
      try {
        const res = await fetch('/api/db');
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.db) {
            const db = data.db;
            if (db.users && db.users.length > 0) {
              setUsers(db.users);
              AppStore.setUsers(db.users);
              if (savedUserId) {
                const matchedUser = db.users.find((u: User) => u.id === savedUserId);
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

    fetchLatestServerData();

    // 3. Setup periodic backup polling every 20 seconds
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
    }, 20000);

    return () => clearInterval(interval);
  }, []);

  // 4. Setup real-time database updates via Server-Sent Events (SSE)
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: any = null;

    const connectSSE = () => {
      console.log("Conectando ao canal de sincronização em tempo real (SSE)...");
      eventSource = new EventSource('/api/db/events');

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.db) {
            const db = data.db;
            
            // Skip applying updates if there was a recent local write on this client to avoid race conditions
            if (Date.now() - lastWriteTime.current < 4000) {
              return;
            }

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
        } catch (err) {
          console.error("Error parsing real-time database event:", err);
        }
      };

      eventSource.onerror = (err) => {
        console.warn("Canal de sincronização em tempo real (SSE) desconectado. Tentando reconexão em 5s...", err);
        if (eventSource) {
          eventSource.close();
        }
        reconnectTimeout = setTimeout(() => {
          connectSSE();
        }, 5000);
      };
    };

    connectSSE();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, []);

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
    setUsers(newUsers);
    AppStore.setUsers(newUsers);
    pushDatabaseToServer({ users: newUsers });
  };

  const handleSaveDrivers = (newDrivers: Driver[]) => {
    setDrivers(newDrivers);
    AppStore.setDrivers(newDrivers);
    pushDatabaseToServer({ drivers: newDrivers });
  };

  const handleSaveVehicles = (newVehicles: Vehicle[]) => {
    setVehicles(newVehicles);
    AppStore.setVehicles(newVehicles);
    pushDatabaseToServer({ vehicles: newVehicles });
  };

  const handleSaveProducts = (newProducts: Product[]) => {
    setProducts(newProducts);
    AppStore.setProducts(newProducts);
    pushDatabaseToServer({ products: newProducts });
  };

  const handleSaveAudits = (newAudits: AuditSession[]) => {
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
    setImportedRoutes(newRoutes);
    AppStore.setImportedRoutes(newRoutes);
    pushDatabaseToServer({ importedRoutes: newRoutes });
  };

  const handleSaveVales = (newVales: Vale[]) => {
    setVales(newVales);
    AppStore.setVales(newVales);
    pushDatabaseToServer({ vales: newVales });
  };

  const handleSaveFirebaseConfig = (config: FirebaseConfig | null) => {
    setFirebaseConfig(config);
    AppStore.setFirebaseConfig(config);
    pushDatabaseToServer({ firebaseConfig: config });
  };

  // Switch tabs when current user role changes
  const handleUserChange = (user: User) => {
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
  };

  const handleLoginSuccess = (user: User) => {
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
  };

  const handleLogout = () => {
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
