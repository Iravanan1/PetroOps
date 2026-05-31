import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from "dotenv";

dotenv.config();

const cleanEnvVar = (val: string | undefined): string => {
  if (!val) return "";
  return val.replace(/["',]/g, "").trim();
};

const projectId = cleanEnvVar(process.env.VITE_FIREBASE_PROJECT_ID) || "pumpai-f2f93";

if (!admin.apps.length) {
  console.log("[Firebase Admin] Initializing Admin SDK for projectId:", projectId);
  admin.initializeApp({ projectId });
}

export const adminAuth = admin.auth();
export const adminDb = getFirestore(admin.app());