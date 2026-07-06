import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { AppStore } from "./store";

export const DEFAULT_FIREBASE_CONFIG = {
  projectId: "armazemfacil-b2292",
  appId: "1:688234941301:web:153e2ad3f634379fe3213c",
  apiKey: "AIzaSyA_ykhJGRkIDbPuDNYooMIVvB2DeVzp2VE",
  authDomain: "armazemfacil-b2292.firebaseapp.com",
  firestoreDatabaseId: "(default)",
  storageBucket: "armazemfacil-b2292.appspot.com",
  messagingSenderId: "688234941301",
  measurementId: "G-6HFDEKWVDB"
};

let dbInstance: any = null;

export function getClientFirestore() {
  if (dbInstance) return dbInstance;

  try {
    const savedConfig = AppStore.getFirebaseConfig();
    const config = savedConfig || DEFAULT_FIREBASE_CONFIG;
    const app = getApps().length === 0 ? initializeApp(config) : getApp();
    dbInstance = initializeFirestore(app, {
      ignoreUndefinedProperties: true,
    });
    return dbInstance;
  } catch (error) {
    console.error("Error initializing client Firestore:", error);
    return null;
  }
}

export async function logSystemAction(params: {
  module: string;
  actionType: string;
  affectedCollection?: string;
  affectedId?: string;
  summary: string;
  currentUser?: any;
}) {
  try {
    const db = getClientFirestore();
    if (!db) {
      console.warn("[Audit Log] Firestore not initialized, could not write log.");
      return;
    }

    let userObj = params.currentUser;
    if (!userObj) {
      const freshUserId = localStorage.getItem('logiroute_authenticated_user_id');
      if (freshUserId) {
        const users = AppStore.getUsers() || [];
        const matched = users.find((u: any) => u.id === freshUserId);
        if (matched) {
          userObj = {
            id: matched.id,
            name: matched.name,
            role: matched.role
          };
        }
      }
    }

    const deviceAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Desconhecido';

    const logPayload = {
      timestamp: serverTimestamp(),
      userId: userObj?.id || 'sistema',
      userName: userObj?.name || 'Sistema',
      userRole: userObj?.role || 'sistema',
      module: params.module,
      actionType: params.actionType,
      affectedCollection: params.affectedCollection || 'N/A',
      affectedId: params.affectedId || 'N/A',
      summary: params.summary,
      device: deviceAgent
    };

    console.log("[Audit Log] Gravando log de auditoria no Firestore:", logPayload);
    const colRef = collection(db, "system_logs");
    await addDoc(colRef, logPayload);
    console.log("[Audit Log] Log gravado com sucesso!");
  } catch (error) {
    console.error("[Audit Log] Erro ao gravar log de auditoria no Firestore:", error);
  }
}

