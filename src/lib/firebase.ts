// Firebase configuration + Google Auth
// ------------------------------------------------------------------
// To connect your real Firebase project, replace the placeholder
// values below with the config from:
// Firebase Console > Project Settings > General > Your apps (Web app)
// and enable the Google provider under Authentication > Sign-in method.
// ------------------------------------------------------------------
import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as fbSignOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};

export interface AppUser {
  displayName: string;
  email: string;
  photoURL: string | null;
}

const isConfigured = !firebaseConfig.apiKey.startsWith("YOUR_");

let app: FirebaseApp | null = null;
if (isConfigured) {
  app = initializeApp(firebaseConfig);
}

const DEMO_USER_KEY = "thamart_demo_user";

function toAppUser(u: FirebaseUser): AppUser {
  return {
    displayName: u.displayName ?? "Google User",
    email: u.email ?? "",
    photoURL: u.photoURL,
  };
}

/** Sign in with Google. Falls back to a simulated account when Firebase isn't configured (demo mode). */
export async function signInWithGoogle(): Promise<AppUser> {
  if (isConfigured && app) {
    const auth = getAuth(app);
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    return toAppUser(result.user);
  }
  // ---- Demo mode (no Firebase credentials configured) ----
  await new Promise((r) => setTimeout(r, 900));
  const demoUser: AppUser = {
    displayName: "Marie J. Pierre",
    email: "marie.pierre@gmail.com",
    photoURL: null,
  };
  localStorage.setItem(DEMO_USER_KEY, JSON.stringify(demoUser));
  return demoUser;
}

export async function signOut(): Promise<void> {
  if (isConfigured && app) {
    await fbSignOut(getAuth(app));
  }
  localStorage.removeItem(DEMO_USER_KEY);
}

/** Subscribe to auth state. Works in both real and demo mode. */
export function subscribeAuth(cb: (user: AppUser | null) => void): () => void {
  if (isConfigured && app) {
    return onAuthStateChanged(getAuth(app), (u) => cb(u ? toAppUser(u) : null));
  }
  const raw = localStorage.getItem(DEMO_USER_KEY);
  cb(raw ? (JSON.parse(raw) as AppUser) : null);
  return () => {};
}

export const firebaseDemoMode = !isConfigured;
