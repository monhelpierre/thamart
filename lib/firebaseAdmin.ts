import admin from "firebase-admin";
import { NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { initializeApp, cert, getApps } from "firebase-admin/app";

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!);

if (getApps().length === 0) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const auth = admin.auth();
const db = admin.firestore();
const storage = admin.storage();
const messaging = admin.messaging();
const timestamp = admin.firestore.Timestamp.fromDate(new Date());

let adminDb: FirebaseFirestore.Firestore | null = null;

try {
  adminDb = getFirestore();
} catch (e) {
  console.error("Failed to get Firebase Admin Firestore:", e);
}

const ADMIN_EMAILS =
  process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim()) || [];
const ADMIN_PATHS = ["/api/orders", "/api/admin"]; // Add any admin‑only endpoints

function withAuth(
  handler: (
    req: Request,
    decodedToken: admin.auth.DecodedIdToken,
  ) => Promise<Response> | Response,
) {
  return async function (req: Request) {
    const url = new URL(req.url);

    // 1. Public routes – no auth required
    if (req.method === "GET" && url.pathname === "/api/products") {
      return handler(req, {} as admin.auth.DecodedIdToken);
    }

    // 2. Extract and verify ID token
    const idToken = req.headers.get("Authorization")?.split("Bearer ")[1];
    if (!idToken || idToken === "undefined" || !idToken.includes(".")) {
      console.error("Unauthorized: No token provided");
      return NextResponse.json(
        { message: "Unauthorized: No token provided" },
        { status: 401 },
      );
    }

    let decodedToken: admin.auth.DecodedIdToken;
    try {
      decodedToken = await auth.verifyIdToken(idToken);
    } catch (error) {
      console.error("Token verification failed:", error);
      return NextResponse.json(
        { message: "Unauthorized: Invalid token" },
        { status: 401 },
      );
    }

    // 3. Check if the requested path requires admin access
    const requiresAdmin = ADMIN_PATHS.some((path) =>
      url.pathname.startsWith(path),
    );

    if (requiresAdmin) {
      const isAdminByClaim = decodedToken.admin === true;
      const isAdminByEmail = ADMIN_EMAILS.includes(decodedToken.email || "");

      if (!isAdminByClaim && !isAdminByEmail) {
        console.error(`Forbidden: User ${decodedToken.email} is not an admin`);
        return NextResponse.json(
          { message: "Forbidden: Admin access required" },
          { status: 403 },
        );
      }
    }

    // 4. All checks passed – proceed to handler
    return handler(req, decodedToken);
  };
}

/** Returns true if the token belongs to a project creator/owner.
 *  Set CREATOR_UIDS (comma-separated Firebase UIDs) in env to grant access. */
export function isCreatorToken(t: admin.auth.DecodedIdToken): boolean {
  return (process.env.CREATOR_UIDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .includes(t.uid);
}

export {
  adminDb,
  admin,
  timestamp,
  db,
  auth,
  storage,
  messaging,
  withAuth,
  serviceAccount,
};
