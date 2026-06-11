import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!);

if (getApps().length === 0) {
    initializeApp({
        credential: cert(serviceAccount),
    });
}

let adminDb: FirebaseFirestore.Firestore | null = null;

if (serviceAccount) {
    try {
        if (getApps().length === 0) {
            initializeApp({ credential: cert(serviceAccount) });
        }
        adminDb = getFirestore();
    } catch (e) {
        console.error("Failed to initialize Firebase Admin:", e);
    }
}

export { adminDb };