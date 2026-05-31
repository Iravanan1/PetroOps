"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auth = exports.db = exports.app = void 0;
const app_1 = require("firebase/app");
const firestore_1 = require("firebase/firestore");
const auth_1 = require("firebase/auth");
const cleanEnvVar = (val) => {
    if (!val)
        return "";
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
exports.app = (0, app_1.initializeApp)(firebaseConfig);
exports.db = (0, firestore_1.getFirestore)(exports.app);
exports.auth = (0, auth_1.getAuth)(exports.app);
