"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = exports.storage = exports.db = void 0;
const app_1 = require("firebase/app");
const firestore_1 = require("firebase/firestore");
const storage_1 = require("firebase/storage");
const supabase_js_1 = require("@supabase/supabase-js");
const dotenv_1 = __importDefault(require("dotenv"));
// Load dotenv environment variables
dotenv_1.default.config();
const cleanEnvVar = (val) => {
    if (!val)
        return "";
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
const firebaseApp = (0, app_1.initializeApp)(firebaseConfig);
exports.db = (0, firestore_1.getFirestore)(firebaseApp);
exports.storage = (0, storage_1.getStorage)(firebaseApp);
// 2. Supabase Integration
const supabaseUrl = cleanEnvVar(process.env.VITE_SUPABASE_URL) || "https://mock-supabase-url.supabase.co";
const supabaseAnonKey = cleanEnvVar(process.env.VITE_SUPABASE_ANON_KEY) || "mock-anon-key";
exports.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: false,
        storage: null
    }
});
console.log("Database layers initialized successfully. (Real Firebase & Supabase)");
