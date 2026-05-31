"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminDb = exports.adminAuth = void 0;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const firestore_1 = require("firebase-admin/firestore");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const cleanEnvVar = (val) => {
    if (!val)
        return "";
    return val.replace(/["',]/g, "").trim();
};
const projectId = cleanEnvVar(process.env.VITE_FIREBASE_PROJECT_ID) || "pumpai-f2f93";
if (!firebase_admin_1.default.apps.length) {
    console.log("[Firebase Admin] Initializing Admin SDK for projectId:", projectId);
    firebase_admin_1.default.initializeApp({ projectId });
}
exports.adminAuth = firebase_admin_1.default.auth();
exports.adminDb = (0, firestore_1.getFirestore)(firebase_admin_1.default.app());
