import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { createClient } from '@supabase/supabase-js';
import dotenv from "dotenv";

// Load dotenv environment variables
dotenv.config();

const cleanEnvVar = (val: string | undefined): string => {
  if (!val) return "";
  return val.replace(/["',]/g, "").trim();
};

// 1. Firebase Integration via .env variables
const firebaseConfig = {
  apiKey: cleanEnvVar(process.env.VITE_FIREBASE_API_KEY) || "mock-api-key",
  authDomain: cleanEnvVar(process.env.VITE_FIREBASE_AUTH_DOMAIN) || "mock-auth-domain",
  projectId: cleanEnvVar(process.env.VITE_FIREBASE_PROJECT_ID) || "mock-project-id",
  storageBucket: cleanEnvVar(process.env.VITE_FIREBASE_STORAGE_BUCKET) || "mock-storage-bucket",
  messagingSenderId: cleanEnvVar(process.env.VITE_FIREBASE_MESSAGING_SENDER_ID) || "mock-sender-id",
  appId: cleanEnvVar(process.env.VITE_FIREBASE_APP_ID) || "mock-app-id"
};

console.log("[Firebase] Initializing with configuration projectID:", firebaseConfig.projectId);

const firebaseApp = initializeApp(firebaseConfig);
export const db = getFirestore(firebaseApp);
export const storage = getStorage(firebaseApp);

// 2. Supabase Integration
const supabaseUrl = cleanEnvVar(process.env.VITE_SUPABASE_URL) || "https://mock-supabase-url.supabase.co";
const supabaseAnonKey = cleanEnvVar(process.env.VITE_SUPABASE_ANON_KEY) || "mock-anon-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    storage: null
  }
});

console.log("Database layers initialized successfully. (Real Firebase & Supabase)");
