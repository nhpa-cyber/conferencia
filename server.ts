import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { promises as fs } from "fs";

import { initializeApp, getApps, getApp, deleteApp } from "firebase/app";
import { initializeFirestore, doc, getDoc, setDoc, getDocFromServer, setLogLevel, collection, getDocs, onSnapshot } from "firebase/firestore";

dotenv.config();

// Silence verbose or harmless Firestore warnings/info logs (e.g. Disconnecting idle stream)
setLogLevel("error");

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
      tenantId: null,
      providerInfo: []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const DB_FILE_PATH = path.join(process.cwd(), "database.json");
const FIREBASE_CONFIG_PATH = path.join(process.cwd(), "firebase-applet-config.json");

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

// In-memory database cache to prevent file reading during high-frequency polling and avoid race conditions
let dbCache: any = null;
let firestoreDb: any = null;
let firestoreLoadedSuccessfully = false;

// Keep track of connected clients for Server-Sent Events (SSE) real-time synchronization
let clients: any[] = [];

let activeUnsubscribeAppState: (() => void) | null = null;
let activeUnsubscribePhotos: (() => void) | null = null;

function setupFirestoreListeners() {
  if (!firestoreDb) return;

  // Clean up any existing listeners first
  if (activeUnsubscribeAppState) {
    try {
      activeUnsubscribeAppState();
    } catch (e) {
      console.warn("Erro ao desinscrever listener antigo de app_state:", e);
    }
    activeUnsubscribeAppState = null;
  }
  if (activeUnsubscribePhotos) {
    try {
      activeUnsubscribePhotos();
    } catch (e) {
      console.warn("Erro ao desinscrever listener antigo de photos:", e);
    }
    activeUnsubscribePhotos = null;
  }

  console.log("Iniciando listeners em tempo real do Firestore no servidor...");

  try {
    const colRef = collection(firestoreDb, "app_state");
    activeUnsubscribeAppState = onSnapshot(colRef, (snapshot) => {
      let hasChanges = false;
      if (!dbCache) {
        dbCache = {};
      }

      snapshot.docChanges().forEach((change) => {
        const key = change.doc.id;
        if (DB_KEYS.includes(key)) {
          const docData = change.doc.data();
          const dataList = docData.data || [];

          if (JSON.stringify(dbCache[key]) !== JSON.stringify(dataList)) {
            console.log(`[Firestore Live Listener] Atualização de chave detectada na nuvem: '${key}'`);
            dbCache[key] = dataList;
            hasChanges = true;
          }
        }
      });

      if (hasChanges) {
        // Salva o estado consolidado no arquivo local database.json
        fs.writeFile(DB_FILE_PATH, JSON.stringify(dbCache, null, 2), "utf-8")
          .then(() => {
            console.log("[Firestore Live Listener] database.json atualizado via alterações na nuvem.");
          })
          .catch((err) => {
            console.error("[Firestore Live Listener] Erro ao salvar database.json:", err);
          });

        // Transmite em tempo real para todos os clientes conectados via SSE (celular, tablet, pc)
        if (clients && clients.length > 0) {
          const payloadStr = JSON.stringify({ type: "update", db: dbCache });
          clients.forEach(client => {
            try {
              client.res.write(`data: ${payloadStr}\n\n`);
            } catch (err) {
              // Conexão do cliente fechada
            }
          });
        }
      }
    }, (error) => {
      console.error("Erro no listener em tempo real de app_state:", error);
    });

    // Ouvir também a coleção de fotos para sincronização em tempo real
    const photosColRef = collection(firestoreDb, "photos");
    activeUnsubscribePhotos = onSnapshot(photosColRef, (snapshot) => {
      let hasChanges = false;
      if (!dbCache) dbCache = {};
      if (!dbCache.photos) dbCache.photos = [];

      snapshot.docChanges().forEach((change) => {
        const photoData = change.doc.data();
        const photoId = change.doc.id;

        if (change.type === "added" || change.type === "modified") {
          const index = dbCache.photos.findIndex((p: any) => p.id === photoId);
          if (index > -1) {
            if (JSON.stringify(dbCache.photos[index]) !== JSON.stringify(photoData)) {
              dbCache.photos[index] = photoData;
              hasChanges = true;
            }
          } else {
            dbCache.photos.push(photoData);
            hasChanges = true;
          }
        } else if (change.type === "removed") {
          const index = dbCache.photos.findIndex((p: any) => p.id === photoId);
          if (index > -1) {
            dbCache.photos.splice(index, 1);
            hasChanges = true;
          }
        }
      });

      if (hasChanges) {
        fs.writeFile(DB_FILE_PATH, JSON.stringify(dbCache, null, 2), "utf-8")
          .then(() => {
            console.log("[Firestore Live Listener] database.json de fotos atualizado via nuvem.");
          })
          .catch(() => {});

        if (clients && clients.length > 0) {
          const payloadStr = JSON.stringify({ type: "update", db: dbCache });
          clients.forEach(client => {
            try {
              client.res.write(`data: ${payloadStr}\n\n`);
            } catch (err) {}
          });
        }
      }
    }, (error) => {
      console.error("Erro no listener em tempo real de fotos:", error);
    });

  } catch (err) {
    console.error("Erro ao configurar listeners do Firestore no servidor:", err);
  }
}

// Helper to initialize Firebase App and Firestore
async function initFirebase() {
  if (firestoreDb) return;
  try {
    let config = { ...DEFAULT_FIREBASE_CONFIG };
    const configExists = await fs.access(FIREBASE_CONFIG_PATH).then(() => true).catch(() => false);
    if (configExists) {
      try {
        const configContent = await fs.readFile(FIREBASE_CONFIG_PATH, "utf-8");
        const parsed = JSON.parse(configContent);
        if (parsed && parsed.apiKey) {
          config = { ...config, ...parsed };
        }
      } catch (e) {
        console.warn("Erro ao ler firebase-applet-config.json. Usando configuração padrão.");
      }
    } else {
      console.log("Arquivo firebase-applet-config.json não localizado. Usando configuração padrão hardcoded.");
      // Forçamos a criação do arquivo com a config padrão para garantir que exista
      await fs.writeFile(FIREBASE_CONFIG_PATH, JSON.stringify(DEFAULT_FIREBASE_CONFIG, null, 2), "utf-8").catch(() => {});
    }
    
    let app;
    const apps = getApps();
    if (apps.length > 0) {
      app = getApp();
    } else {
      app = initializeApp({
        apiKey: config.apiKey,
        authDomain: config.authDomain,
        projectId: config.projectId,
        storageBucket: config.storageBucket,
        messagingSenderId: config.messagingSenderId,
        appId: config.appId
      });
    }

    // Use specified custom Firestore database ID if available
    firestoreDb = initializeFirestore(app, {
      experimentalForceLongPolling: true,
    }, config.firestoreDatabaseId || undefined);
    console.log("Firebase Firestore inicializado com sucesso.");

    // Validate connection
    try {
      await getDocFromServer(doc(firestoreDb, "test", "connection"));
      console.log("Conexão com Firestore validada com sucesso.");
    } catch (error) {
      if (error instanceof Error && error.message.includes("the client is offline")) {
        console.error("Please check your Firebase configuration.");
      } else {
        console.log("Conexão validada (retornou erro esperado ou resposta offline):", error instanceof Error ? error.message : String(error));
      }
    }
  } catch (err) {
    console.error("Erro ao inicializar Firebase. Usando fallback de arquivo local:", err);
  }
}

// Generate audit logs comparing old and new states
function generateAuditLogs(oldDb: any, newDb: any, user: any) {
  const logs: any[] = [];
  const timestamp = new Date().toISOString();
  const userName = user ? `${user.name} (${user.role === 'auxiliar_logistica' ? 'Auxiliar' : user.role === 'gestor' ? 'Gestor' : user.role === 'conferente' ? 'Conferente' : user.role})` : "Sistema/Carga Planilha";

  for (const key of DB_KEYS) {
    if (key === "audit_logs" || key === "photos") continue; // Don't diff logs or raw base64 photos
    if (newDb[key] !== undefined) {
      const oldList = oldDb ? (oldDb[key] || []) : [];
      const newList = newDb[key] || [];

      if (oldList.length < newList.length) {
        // Items created
        const added = newList.filter((item: any) => !oldList.some((old: any) => 
          (item.id && old.id && item.id === old.id) || 
          (item.code && old.code && item.code === old.code) || 
          (item.plate && old.plate && item.plate === old.plate)
        ));
        const details = added.map((item: any) => {
          if (item.routeMap) return `Mapa Rota '${item.routeMap}'`;
          if (item.name) return `'${item.name}'`;
          if (item.plate) return `Placa '${item.plate}'`;
          if (item.description) return `Produto '${item.description}'`;
          return `ID: ${item.id || item.code}`;
        }).join(", ");
        
        logs.push({
          id: `log_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
          timestamp,
          user: userName,
          operation: "CRIAÇÃO",
          details: `Adicionou registro(s) em '${key}': ${details || 'novos registros'}.`
        });
      } else if (oldList.length > newList.length) {
        // Items deleted
        const removed = oldList.filter((old: any) => !newList.some((item: any) => 
          (item.id && old.id && item.id === old.id) || 
          (item.code && old.code && item.code === old.code) || 
          (item.plate && old.plate && item.plate === old.plate)
        ));
        const details = removed.map((item: any) => {
          if (item.routeMap) return `Mapa Rota '${item.routeMap}'`;
          if (item.name) return `'${item.name}'`;
          if (item.plate) return `Placa '${item.plate}'`;
          if (item.description) return `Produto '${item.description}'`;
          return `ID: ${item.id || item.code}`;
        }).join(", ");

        logs.push({
          id: `log_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
          timestamp,
          user: userName,
          operation: "EXCLUSÃO",
          details: `Removeu registro(s) de '${key}': ${details || 'registros deletados'}.`
        });
      } else {
        // Check for modifications
        const changed = newList.filter((item: any) => {
          const oldItem = oldList.find((old: any) => 
            (item.id && old.id && item.id === old.id) || 
            (item.code && old.code && item.code === old.code) || 
            (item.plate && old.plate && item.plate === old.plate)
          );
          return oldItem && JSON.stringify(oldItem) !== JSON.stringify(item);
        });

        if (changed.length > 0) {
          let editDetails = "";
          if (key === "audits") {
            editDetails = changed.map((a: any) => {
              const oldA = oldList.find((old: any) => old.id === a.id);
              return `Mapa '${a.routeMap}' de status '${oldA?.status}' para '${a.status}'`;
            }).join(", ");
          } else if (key === "vales") {
            editDetails = changed.map((v: any) => {
              const oldV = oldList.find((old: any) => old.id === v.id);
              return `Vale de ${v.colaboradorName} de status '${oldV?.status}' para '${v.status}'`;
            }).join(", ");
          } else if (key === "returnForecasts") {
            editDetails = changed.map((f: any) => {
              const oldF = oldList.find((old: any) => old.id === f.id);
              return `Previsão do mapa '${f.routeMap}' de status '${oldF?.status}' para '${f.status}'`;
            }).join(", ");
          } else {
            editDetails = changed.map((item: any) => item.routeMap || item.name || item.plate || item.description || item.id || item.code).join(", ");
          }

          logs.push({
            id: `log_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
            timestamp,
            user: userName,
            operation: "EDIÇÃO",
            details: `Atualizou registros em '${key}'${editDetails ? `: ${editDetails}` : ''}.`
          });
        }
      }
    }
  }
  return logs;
}

// Helper to read DB from file/Firestore once on startup and establish a robust cache
async function loadDatabaseOnStartup() {
  await initFirebase();
  
  if (firestoreDb) {
    let retries = 5;
    while (retries > 0) {
      try {
        console.log(`Carregando banco de dados a partir do Firebase Firestore (Tentativas restantes: ${retries})...`);
        
        const localDb = await readLocalDatabaseFile() || {};
        dbCache = {};
        for (const key of DB_KEYS) {
          dbCache[key] = localDb[key] || [];
        }
        dbCache.photos = localDb.photos || [];

        // Realiza um fetch individual de cada documento por ID no Firestore para contornar problemas de permissão de listagem (list/getDocs)
        const updatedKeys = new Set<string>();
        const absentKeys = new Set<string>();
        const readPromises = DB_KEYS.map(async (key) => {
          const docRef = doc(firestoreDb, "app_state", key);
          try {
            const snap = await getDoc(docRef);
            if (snap.exists()) {
              dbCache[key] = snap.data().data || [];
              updatedKeys.add(key);
            } else {
              absentKeys.add(key);
            }
          } catch (readErr: any) {
            console.error(`Erro ao ler documento '${key}' no Firestore:`, readErr?.message || readErr);
            // Non-blocking fallback: keep the localDb data already populated in dbCache[key]
            console.log(`Usando dados locais de fallback para '${key}' devido à falha de leitura.`);
          }
        });
        await Promise.all(readPromises);

        // Carrega fotos de documentos individuais no Firestore para contornar limite de 1MB por documento do Firestore
        try {
          console.log("Carregando fotos individuais da coleção 'photos' no Firestore...");
          const photosCol = collection(firestoreDb, "photos");
          const photosSnap = await getDocs(photosCol);
          const photosList: any[] = [];
          photosSnap.forEach((docSnap) => {
            photosList.push(docSnap.data());
          });
          dbCache.photos = photosList;
          console.log(`Carregadas ${photosList.length} fotos do Firestore com sucesso.`);
        } catch (photoReadErr: any) {
          console.error("Erro ao carregar fotos individuais do Firestore:", photoReadErr?.message || photoReadErr);
        }

        console.log(`Dados carregados do Firestore com sucesso. Documentos encontrados: ${Array.from(updatedKeys).join(", ")}`);

        // Se houver chaves que existem no localDb mas NÃO no Firestore (ex: primeira inicialização),
        // salvamos o valor padrão no Firestore para que a base não fique incompleta.
        for (const key of DB_KEYS) {
          if (absentKeys.has(key)) {
            console.log(`Inicializando documento '${key}' ausente no Firestore com os dados padrão do database.json...`);
            const docRef = doc(firestoreDb, "app_state", key);
            try {
              await setDoc(docRef, { data: dbCache[key] });
            } catch (setErr) {
              console.error(`Erro ao gravar carga padrão inicial do '${key}' no Firestore:`, setErr);
            }
          }
        }

        // Salva o estado consolidado no arquivo local database.json para aquecer o cache físico do container
        const tempPath = `${DB_FILE_PATH}.tmp`;
        await fs.writeFile(tempPath, JSON.stringify(dbCache, null, 2), "utf-8");
        await fs.rename(tempPath, DB_FILE_PATH);
        console.log("Cache físico do container atualizado com os dados do Firestore com sucesso.");
        
        firestoreLoadedSuccessfully = true;
        setupFirestoreListeners();
        return; // Success!
      } catch (err) {
        console.error(`Falha na tentativa de carregar Firestore (Restam ${retries - 1} tentativas):`, err);
        retries--;
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // wait 2 seconds before retry
        }
      }
    }
    console.error("Todas as tentativas de conexão com o Firestore falharam. O cache não foi marcado como carregado.");
  }

  // If we don't have firestoreDb, or if all retries failed, fall back to database.json
  await loadFromLocalFallback();
}

async function loadFromLocalFallback() {
  try {
    const localDb = await readLocalDatabaseFile();
    if (localDb) {
      dbCache = localDb;
      console.log("Banco de dados local em cache com sucesso.");
    } else {
      dbCache = {};
      for (const key of DB_KEYS) {
        dbCache[key] = [];
      }
    }
  } catch (error) {
    console.error("Erro ao carregar banco de dados local na inicialização:", error);
  }
}

// Helper to read from local database.json file
async function readLocalDatabaseFile() {
  try {
    await fs.access(DB_FILE_PATH);
    const content = await fs.readFile(DB_FILE_PATH, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

// Helper to read DB safely (returns cache if available, otherwise reads local or Firestore)
async function readDatabaseFile() {
  if (firestoreDb && !firestoreLoadedSuccessfully) {
    console.log("Aviso: Tentando ler banco de dados mas o Firestore não foi carregado com sucesso ainda. Tentando recarregar...");
    await loadDatabaseOnStartup();
  }
  if (dbCache) return dbCache;
  return await readLocalDatabaseFile();
}

let writeQueuePromise: Promise<any> = Promise.resolve();

// Helper to write DB atomically to local file and SYNCHRONOUSLY sync to Firestore
async function writeDatabaseFile(data: any) {
  if (firestoreDb && !firestoreLoadedSuccessfully) {
    console.warn("ERRO CRÍTICO: Tentativa de gravação bloqueada porque o Firestore não foi carregado com sucesso. Evitando sobrescrever dados reais da nuvem.");
    // Tenta carregar primeiro antes de permitir qualquer gravação para não corromper os dados da nuvem
    await loadDatabaseOnStartup();
    if (!firestoreLoadedSuccessfully) {
      console.error("Gravação abortada para proteger a integridade dos dados na nuvem.");
      return false;
    }
    // Se carregou com sucesso agora, mesclamos os novos dados no cache recém-carregado
    dbCache = { ...dbCache, ...data };
    data = dbCache;
  }

  // Chain the write operation to the end of the queue to completely prevent race conditions
  const resultPromise = writeQueuePromise.then(async () => {
    try {
      // 1. Save to local disk (atomic write)
      const tempPath = `${DB_FILE_PATH}.tmp`;
      await fs.writeFile(tempPath, JSON.stringify(data, null, 2), "utf-8");
      await fs.rename(tempPath, DB_FILE_PATH);

      // 2. Synchronous sync to Firestore to guarantee absolute persistence across container restarts
      if (firestoreDb) {
        const keys = DB_KEYS;
        for (const key of keys) {
          if (data[key] !== undefined) {
            const docRef = doc(firestoreDb, "app_state", key);
            try {
              await setDoc(docRef, { data: data[key] });
            } catch (setErr: any) {
              console.error(`Erro ao sincronizar chave '${key}' no Firestore (não bloqueante):`, setErr?.message || setErr);
              // Loga o erro mas NÃO aborta o processo para não corromper ou reverter os dados locais
            }
          }
        }
      }

      // 3. Broadcast real-time update to all connected SSE clients to keep multi-user dashboards in perfect sync
      if (clients && clients.length > 0) {
        const payloadStr = JSON.stringify({ type: "update", db: data });
        clients.forEach(client => {
          try {
            client.res.write(`data: ${payloadStr}\n\n`);
          } catch (err) {
            // Client might have closed their connection; ignore
          }
        });
      }

      return true;
    } catch (error) {
      console.error("Error writing database file:", error);
      return false;
    }
  });

  // Keep the queue moving even if the promise fails
  writeQueuePromise = resultPromise.then(() => {}).catch(() => {});
  return resultPromise;
}

async function startServer() {
  await loadDatabaseOnStartup();
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" })); // Raise limit for large datasets with signatures/images

  // API Route for Real-time database Server-Sent Events (SSE)
  app.get("/api/db/events", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    
    // Send current DB state immediately upon connection
    if (dbCache) {
      res.write(`data: ${JSON.stringify({ type: "initial", db: dbCache })}\n\n`);
    } else {
      res.write(`data: ${JSON.stringify({ type: "initial", db: {} })}\n\n`);
    }
    
    const client = { id: Date.now(), res };
    clients.push(client);
    
    req.on("close", () => {
      clients = clients.filter(c => c.id !== client.id);
    });
  });

  // API Route to fetch database state
  app.get("/api/db", async (req, res) => {
    try {
      if (firestoreDb && !firestoreLoadedSuccessfully) {
        // Tenta recarregar
        await loadDatabaseOnStartup();
        if (!firestoreLoadedSuccessfully) {
          return res.status(503).json({ 
            success: false, 
            error: "O banco de dados Firestore ainda está inicializando ou indisponível. Por favor, aguarde alguns instantes." 
          });
        }
      }
      // Return memory cache first to completely avoid reading disk during fast poll intervals
      if (dbCache) {
        return res.json({ success: true, db: dbCache });
      }
      const db = await readDatabaseFile();
      if (db) {
        dbCache = db;
      }
      res.json({ success: true, db });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || "Erro ao ler banco de dados" });
    }
  });

  // API Route to update/save database state
  app.post("/api/db", async (req, res) => {
    try {
      if (firestoreDb && !firestoreLoadedSuccessfully) {
        await loadDatabaseOnStartup();
        if (!firestoreLoadedSuccessfully) {
          return res.status(503).json({ 
            success: false, 
            error: "Gravação bloqueada porque o Firestore ainda está inicializando ou indisponível." 
          });
        }
      }
      const { db, user } = req.body;
      if (!db) {
        return res.status(400).json({ success: false, error: "Conteúdo do banco de dados não enviado" });
      }
      
      // Merge partial updates into cache
      if (!dbCache) {
        dbCache = {};
      }

      // Generate audit logs
      const logs = generateAuditLogs(dbCache, db, user);
      if (logs.length > 0) {
        const existingLogs = dbCache.audit_logs || [];
        dbCache.audit_logs = [...logs, ...existingLogs].slice(0, 1000);
        db.audit_logs = dbCache.audit_logs;
      }

      dbCache = { ...dbCache, ...db };

      // Write database synchronously to avoid any data loss
      const success = await writeDatabaseFile(dbCache);
      if (!success) {
        throw new Error("Falha ao persistir alterações no armazenamento definitivo.");
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("Erro ao salvar banco de dados:", error);
      res.status(500).json({ success: false, error: error?.message || "Erro ao salvar banco de dados" });
    }
  });

  // API Route to fetch photos
  app.get("/api/photos", async (req, res) => {
    try {
      if (!dbCache) {
        const db = await readDatabaseFile();
        dbCache = db || {};
      }
      let photos = dbCache.photos || [];
      const { auditId } = req.query;
      if (auditId) {
        photos = photos.filter((p: any) => p.auditId === auditId);
      }
      res.json({ success: true, photos });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || "Erro ao obter fotos" });
    }
  });

  // API Route to save/update a photo
  app.post("/api/photos", async (req, res) => {
    try {
      const { photo } = req.body;
      if (!photo) {
        return res.status(400).json({ success: false, error: "Foto não enviada" });
      }
      if (!dbCache) {
        const db = await readDatabaseFile();
        dbCache = db || {};
      }
      if (!dbCache.photos) {
        dbCache.photos = [];
      }
      
      const index = dbCache.photos.findIndex((p: any) => p.id === photo.id);
      if (index > -1) {
        dbCache.photos[index] = photo;
      } else {
        dbCache.photos.push(photo);
      }

      await writeDatabaseFile(dbCache);

      // Sincroniza foto individual no Firestore
      if (firestoreDb && firestoreLoadedSuccessfully) {
        const docRef = doc(firestoreDb, "photos", photo.id);
        await setDoc(docRef, photo);
      }

      res.json({ success: true, photo });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || "Erro ao salvar foto" });
    }
  });

  // API Route to delete a photo
  app.delete("/api/photos/:id", async (req, res) => {
    try {
      const { id } = req.params;
      if (!dbCache) {
        const db = await readDatabaseFile();
        dbCache = db || {};
      }
      if (dbCache.photos) {
        dbCache.photos = dbCache.photos.filter((p: any) => p.id !== id);
        await writeDatabaseFile(dbCache);
      }

      // Deleta foto individual no Firestore
      if (firestoreDb && firestoreLoadedSuccessfully) {
        const { deleteDoc } = await import("firebase/firestore");
        const docRef = doc(firestoreDb, "photos", id);
        await deleteDoc(docRef);
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || "Erro ao deletar foto" });
    }
  });

  // API Route to clear all photos
  app.post("/api/photos/clear", async (req, res) => {
    try {
      if (!dbCache) {
        const db = await readDatabaseFile();
        dbCache = db || {};
      }
      dbCache.photos = [];
      await writeDatabaseFile(dbCache);

      // Limpa todas as fotos individuais no Firestore
      if (firestoreDb && firestoreLoadedSuccessfully) {
        const { deleteDoc } = await import("firebase/firestore");
        const photosCol = collection(firestoreDb, "photos");
        const snap = await getDocs(photosCol);
        const deletePromises = snap.docs.map(d => deleteDoc(d.ref));
        await Promise.all(deletePromises);
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || "Erro ao limpar fotos" });
    }
  });

  // API Route to prune photos
  app.post("/api/photos/prune", async (req, res) => {
    try {
      const { daysRetention } = req.body;
      const days = Number(daysRetention) || 30;
      if (!dbCache) {
        const db = await readDatabaseFile();
        dbCache = db || {};
      }
      if (dbCache.photos) {
        const cutoffMs = Date.now() - (days * 24 * 60 * 60 * 1000);
        const toKeep = dbCache.photos.filter((p: any) => new Date(p.timestamp).getTime() >= cutoffMs);
        const toPrune = dbCache.photos.filter((p: any) => new Date(p.timestamp).getTime() < cutoffMs);
        
        dbCache.photos = toKeep;
        const prunedCount = toPrune.length;
        
        await writeDatabaseFile(dbCache);

        // Deleta as fotos podadas no Firestore
        if (firestoreDb && firestoreLoadedSuccessfully && prunedCount > 0) {
          const { deleteDoc } = await import("firebase/firestore");
          const deletePromises = toPrune.map((p: any) => {
            const docRef = doc(firestoreDb, "photos", p.id);
            return deleteDoc(docRef);
          });
          await Promise.all(deletePromises);
        }

        res.json({ success: true, prunedCount });
      } else {
        res.json({ success: true, prunedCount: 0 });
      }
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || "Erro ao podar fotos" });
    }
  });

  // API Route to get current Firebase connection status and config
  app.get("/api/firebase/config", async (req, res) => {
    try {
      let config = { ...DEFAULT_FIREBASE_CONFIG };
      const configExists = await fs.access(FIREBASE_CONFIG_PATH).then(() => true).catch(() => false);
      if (configExists) {
        try {
          const configContent = await fs.readFile(FIREBASE_CONFIG_PATH, "utf-8");
          const parsed = JSON.parse(configContent);
          if (parsed && parsed.apiKey) {
            config = { ...config, ...parsed };
          }
        } catch (e) {
          // ignore
        }
      } else {
        // Criar o arquivo de configuração padrão se ele não existir
        await fs.writeFile(FIREBASE_CONFIG_PATH, JSON.stringify(DEFAULT_FIREBASE_CONFIG, null, 2), "utf-8").catch(() => {});
      }

      res.json({
        success: true,
        configured: true,
        connectionStatus: firestoreLoadedSuccessfully ? "connected" : "error",
        config: {
          apiKey: config.apiKey,
          authDomain: config.authDomain,
          projectId: config.projectId,
          storageBucket: config.storageBucket,
          messagingSenderId: config.messagingSenderId,
          appId: config.appId,
          measurementId: config.measurementId || "",
          firestoreDatabaseId: config.firestoreDatabaseId || ""
        }
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || "Erro ao carregar configuração do Firebase" });
    }
  });

  // API Route to save Firebase config and test connection
  app.post("/api/firebase/config", async (req, res) => {
    try {
      const { apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId, measurementId, firestoreDatabaseId } = req.body;
      
      if (!apiKey || !authDomain || !projectId || !appId) {
        return res.status(400).json({ success: false, error: "Campos obrigatórios ausentes (API Key, Auth Domain, Project ID, App ID)" });
      }

      const newConfig = {
        apiKey,
        authDomain,
        projectId,
        storageBucket: storageBucket || "",
        messagingSenderId: messagingSenderId || "",
        appId,
        measurementId: measurementId || "",
        firestoreDatabaseId: firestoreDatabaseId || ""
      };

      // Write config
      await fs.writeFile(FIREBASE_CONFIG_PATH, JSON.stringify(newConfig, null, 2), "utf-8");

      // Reset existing Firebase App instances so we can re-initialize
      try {
        const apps = getApps();
        for (const appInstance of apps) {
          await deleteApp(appInstance);
        }
      } catch (appErr) {
        console.warn("Erro ao deletar instâncias anteriores do app Firebase:", appErr);
      }

      firestoreDb = null;
      firestoreLoadedSuccessfully = false;

      // Force a reload attempt
      await loadDatabaseOnStartup();

      res.json({
        success: true,
        connected: firestoreLoadedSuccessfully,
        config: newConfig
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || "Erro ao salvar configuração do Firebase" });
    }
  });

  // API Route to clear Firebase config (disconnect / reset to default)
  app.post("/api/firebase/clear", async (req, res) => {
    try {
      // Em vez de excluir, restauramos as configurações de conexão padrão do Firebase do projeto
      await fs.writeFile(FIREBASE_CONFIG_PATH, JSON.stringify(DEFAULT_FIREBASE_CONFIG, null, 2), "utf-8");

      // Reset instances
      try {
        const apps = getApps();
        for (const appInstance of apps) {
          await deleteApp(appInstance);
        }
      } catch (appErr) {
        console.warn("Erro ao deletar instâncias anteriores do app Firebase ao limpar:", appErr);
      }

      firestoreDb = null;
      firestoreLoadedSuccessfully = false;

      // Force a reload back to default configuration
      await loadDatabaseOnStartup();

      res.json({
        success: true,
        connected: firestoreLoadedSuccessfully
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || "Erro ao redefinir Firebase para o padrão" });
    }
  });

  // API Route for Gemini AI Chat
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, history } = req.body;
      
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ 
          error: "Chave API não configurada. Configure a chave GEMINI_API_KEY no painel de Configurações > Secrets." 
        });
      }

      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      // Fetch active dynamic context from local database file
      let activeDatabaseContext = "Nenhum dado ativo no momento.";
      try {
        const db = await readDatabaseFile();
        if (db) {
          const routes = db.importedRoutes || [];
          const audits = db.audits || [];
          const vales = db.vales || [];
          const drivers = db.drivers || [];

          const openRoutes = routes.filter((r: any) => r.status !== 'fechado');
          const closedRoutes = routes.filter((r: any) => r.status === 'fechado');

          const valesPendentes = vales.filter((v: any) => v.status === 'PENDENTE_ASSINATURA');
          const valesAssinados = vales.filter((v: any) => v.status === 'ASSINADO');
          const valesCompensados = vales.filter((v: any) => v.status === 'COMPENSADO');

          activeDatabaseContext = `
DADOS ATIVOS EM TEMPO REAL DA UNIDADE:
- Rotas Importadas Totais: ${routes.length} (Abertas: ${openRoutes.length}, Fechadas: ${closedRoutes.length})
- Rotas em Aberto no momento: ${openRoutes.map((r: any) => `Mapa ${r.routeMap} (Placa ${r.plate}, Status ${r.status})`).join(', ') || 'Nenhuma'}
- Auditorias com Divergência Registradas: ${audits.filter((a: any) => a.status === 'finalizado_divergente').length}
- Vales de Colaboradores: Total de ${vales.length} vales.
  * Pendentes de assinatura: ${valesPendentes.length} vales (Total R$ ${valesPendentes.reduce((acc: number, curr: any) => acc + (curr.valor || 0), 0).toFixed(2)})
  * Assinados: ${valesAssinados.length} vales (Total R$ ${valesAssinados.reduce((acc: number, curr: any) => acc + (curr.valor || 0), 0).toFixed(2)})
  * Compensados/Descontados: ${valesCompensados.length} vales

Detalhes de Auditorias Ativas com Divergências de Sobras/Faltas de PA (Produto Acabado) e AG (Ativo de Giro):
${audits.map((a: any) => {
  const driverName = drivers.find((d: any) => d.id === a.driverId)?.name || 'Desconhecido';
  const surplusPA = a.items.filter((i: any) => (i.rePhysicalQty ?? i.physicalQty) > (i.fiscalQty ?? 0));
  const deficitPA = a.items.filter((i: any) => (i.rePhysicalQty ?? i.physicalQty) < (i.fiscalQty ?? 0));
  const surplusAG = a.assets.filter((as: any) => (as.rePhysicalQty ?? as.physicalQty) > (as.fiscalQty ?? 0));
  const deficitAG = a.assets.filter((as: any) => (as.rePhysicalQty ?? as.physicalQty) < (as.fiscalQty ?? 0));

  let info = `* Mapa ${a.routeMap} (Placa: ${a.plate}, Motorista: ${driverName}, Status Geral: ${a.status}):\n`;
  if (surplusPA.length > 0) {
    info += `  - Sobras de PA (Produto Acabado): ${surplusPA.map((i: any) => `${i.productDescription} (+${(i.rePhysicalQty ?? i.physicalQty) - (i.fiscalQty ?? 0)} un)`).join(', ')}\n`;
  }
  if (deficitPA.length > 0) {
    info += `  - Faltas de PA (Produto Acabado): ${deficitPA.map((i: any) => `${i.productDescription} (-${(i.fiscalQty ?? 0) - (i.rePhysicalQty ?? i.physicalQty)} un)`).join(', ')}\n`;
  }
  if (surplusAG.length > 0) {
    info += `  - Sobras de AG (Ativo de Giro): ${surplusAG.map((as: any) => `${as.assetName} (+${(as.rePhysicalQty ?? as.physicalQty) - (as.fiscalQty ?? 0)} un)`).join(', ')}\n`;
  }
  if (deficitAG.length > 0) {
    info += `  - Faltas de AG (Ativo de Giro): ${deficitAG.map((as: any) => `${as.assetName} (-${(as.fiscalQty ?? 0) - (as.rePhysicalQty ?? as.physicalQty)} un)`).join(', ')}\n`;
  }
  if (a.correctiveActionNotes) {
    info += `  - Observação/Ação Corretiva: "${a.correctiveActionNotes}"\n`;
  }
  return info;
}).join('\n') || 'Nenhuma auditoria com divergência registrada no momento.'}

Lista de Vales de Faltas Gerados na Unidade por Colaborador:
${vales.map((v: any) => `- Vale ID: ${v.id} | Colaborador: ${v.colaboradorName} (${v.colaboradorRole}) | Valor: R$ ${v.valor.toFixed(2)} | Motivo: ${v.descricao} | Status: ${v.status} | Obs: ${v.observacao || 'Sem observação'}`).join('\n') || 'Nenhum vale gerado.'}
`;
        }
      } catch (dbError) {
        console.error("Erro ao ler dados dinâmicos do banco para IA:", dbError);
      }

      const systemInstruction = `Você é o Assistente Virtual Inteligente da plataforma "Aferição de Retorno de Rota - Pau Brasil Distribuidora Ambev". 
Seu papel é tirar dúvidas dos usuários de forma prestativa, direta, simples e profissional, dando respostas EXTREMAMENTE ASSERTIVAS baseadas nos dados ativos e reais de faturamento e divergências da unidade.

Sobre a plataforma:
- A plataforma gerencia o retorno dos caminhões de rota da Pau Brasil Distribuidora Ambev.
- Existem 4 perfis/funções principais:
  1. Conferente de Pátio: Faz a contagem física (produtos e ativos como paletes/chapas/garrafeiras) dos caminhões que retornam. Pode pausar a conferência com justificativa se necessário.
  2. Auxiliar de Logística (Fiscal): Faz a conciliação/reconciliação fiscal comparando a contagem física do Conferente com o faturamento fiscal. Pode aprovar, aprovar com sobras/faltas ou solicitar recontagem (nova conferência) caso as divergências sejam injustificáveis. Também pode sincronizar planilhas.
  3. Monitoramento: Define previsões de chegada (ETA), tripStatus (se retorna no dia ou pernoita), observações de rota e monitora as viagens em tempo real.
  4. Gestor Master: Tem acesso ao Painel Gerencial (KPIs, tempos médios, produtividade) e Guias de Cadastro (gerenciar Motoristas, Veículos, Produtos e Usuários).

Regras de Negócio Importantes:
- PERNOITE: Quando um caminhão não retorna no mesmo dia e pernoita fora da distribuidora. O monitoramento atualiza isso para sinalizar ao pátio.
- RECONTAL / SOLICITAR RECONTAGEM: Quando o Fiscal identifica que a divergência está fora do aceitável, ele pode recusar e pedir que o Conferente refaça a contagem daquele item ou do mapa inteiro.
- PAUSA DE CONFERÊNCIA: O Conferente pode pausar uma conferência ativa por motivos urgentes (ex: ir ao banheiro, parada técnica, etc.), fornecendo uma observação obrigatória. Esta tela agora está totalmente visível e funcional.
- SOBRAS & FALTAS PA/AG: Divididos de forma organizada em Produtos Acabados (PA) e Ativos de Giro (AG). São as discrepâncias físicas versus fiscais geradas após a contagem.
- CONTROLE DE VALES: Quando ocorrem faltas físicas de mercadoria, pode ser gerado um Vale (desconto/compensação) com histórico de vales gerados para cada colaborador para controle do financeiro/gestão.

Aqui estão os dados operacionais ATIVOS da unidade em tempo real para responder de forma super precisa:
---------------------------
${activeDatabaseContext}
---------------------------

Instruções para Resposta:
- Seja amigável e responda em Português do Brasil de forma clara, prestativa e estruturada.
- Use as informações de dados em tempo real acima para responder com fatos exatos, valores de vales e motoristas com problemas, sempre que o usuário perguntar por "dados", "quem está pendente", "quais sobras", "quais vales", etc.
- Dê passos-a-passos objetivos.
- Evite jargões técnicos excessivos do código, foque no fluxo de negócio da distribuidora Ambev.`;

      // Format history into structure expected by generateContent
      const contents = [];
      
      if (history && Array.isArray(history)) {
        for (const turn of history) {
          contents.push({
            role: turn.role === 'user' ? 'user' : 'model',
            parts: [{ text: turn.text }]
          });
        }
      }
      
      // Add the latest message
      contents.push({
        role: 'user',
        parts: [{ text: message }]
      });

      let response;
      try {
        console.log("Tentando gerar resposta com gemini-3.5-flash...");
        response = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: contents,
          config: {
            systemInstruction: systemInstruction,
            temperature: 0.1,
          }
        });
      } catch (firstError: any) {
        console.warn("Falha no gemini-3.5-flash, tentando fallback para gemini-3.1-flash-lite...", firstError?.message || firstError);
        try {
          response = await ai.models.generateContent({
            model: 'gemini-3.1-flash-lite',
            contents: contents,
            config: {
              systemInstruction: systemInstruction,
              temperature: 0.1,
            }
          });
        } catch (secondError: any) {
          console.warn("Falha no gemini-3.1-flash-lite, tentando fallback para gemini-2.5-flash...", secondError?.message || secondError);
          response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: contents,
            config: {
              systemInstruction: systemInstruction,
              temperature: 0.1,
            }
          });
        }
      }

      const replyText = response.text || "Desculpe, não consegui processar a resposta.";
      res.json({ text: replyText });
    } catch (error: any) {
      console.error("Erro na rota de chat:", error);
      res.status(500).json({ error: error?.message || "Ocorreu um erro ao processar sua solicitação com a inteligência artificial." });
    }
  });

  // Vite middleware or Static files
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use('/conferencia', express.static(distPath));
    app.use(express.static(distPath));
    app.get('/conferencia/*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
