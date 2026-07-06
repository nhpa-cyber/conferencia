import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
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
    dbInstance = getFirestore(app);
    return dbInstance;
  } catch (error) {
    console.error("Error initializing client Firestore:", error);
    return null;
  }
}
