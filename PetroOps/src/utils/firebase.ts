import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const cleanEnvVar = (val: string | undefined): string => {
  if (!val) return "";
  return val.replace(/["',]/g, "").trim();
};

// Client-side Firebase configuration connected directly to the real Firestore project
const firebaseConfig = {
  apiKey: cleanEnvVar(process.env.VITE_FIREBASE_API_KEY) || "mock-api-key",
  authDomain: cleanEnvVar(process.env.VITE_FIREBASE_AUTH_DOMAIN) || "mock-auth-domain",
  projectId: cleanEnvVar(process.env.VITE_FIREBASE_PROJECT_ID) || "pumpai-f2f93",
  storageBucket: cleanEnvVar(process.env.VITE_FIREBASE_STORAGE_BUCKET) || "mock-storage-bucket",
  messagingSenderId: cleanEnvVar(process.env.VITE_FIREBASE_MESSAGING_SENDER_ID) || "mock-sender-id",
  appId: cleanEnvVar(process.env.VITE_FIREBASE_APP_ID) || "mock-app-id"
};

console.log("[Firebase Client] Initializing app with projectId:", firebaseConfig.projectId);

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
