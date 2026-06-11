import { getFirestore } from "firebase/firestore";
import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged, type User } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);

interface AppUser {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string | null;
}

function toAppUser(u: User): AppUser {
  return { uid: u.uid, displayName: u.displayName ?? "Google User", email: u.email ?? "", photoURL: u.photoURL };
}

async function signInWithGoogle(): Promise<AppUser> {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  return toAppUser(result.user);
}

async function logOut(): Promise<void> {
  await firebaseSignOut(auth);
}

function subscribeAuth(cb: (user: AppUser | null) => void): () => void {
  return onAuthStateChanged(auth, (u) => cb(u ? toAppUser(u) : null));
}

export { auth, db, signInWithGoogle, subscribeAuth, logOut, logOut as signOut };
export type { AppUser };