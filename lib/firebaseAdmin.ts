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

function withAuth(handler: (req: Request, decodedToken: admin.auth.DecodedIdToken) => Promise<Response> | Response) {

    return async function (req: Request) {

        try {

            if (req.method == "GET" && req.url.includes("/api/products")) {
                return handler(req, {} as admin.auth.DecodedIdToken);
            }

            const idToken = req.headers.get("Authorization")?.split("Bearer ")[1];

            if (!idToken) {
                console.error('Unauthorized: No token provided');
                return NextResponse.json({ message: "Unauthorized: No token provided" }, { status: 401 });
            }

            const decodedToken = await auth.verifyIdToken(idToken);

            if (!decodedToken) {
                console.error('Unauthorized: Wrong token provided');
                return NextResponse.json({ message: "Unauthorized: Wrong token provided" }, { status: 401 });
            }

            if (decodedToken.ok == false) {
                console.error('Unauthorized: Wrong token provided');
                return NextResponse.json({ message: "Unauthorized: Wrong token provided" }, { status: 401 });
            }

            return handler(req, decodedToken);

        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error(message);
            return new Response(JSON.stringify({ message }), { status: 401 });
        }
    };
}


/**
 * Returns true if the decoded token belongs to an admin.
 * Checks ADMIN_EMAIL (single email) and ADMIN_UIDS (comma-separated UIDs) env vars.
 */
export function isAdminToken(t: admin.auth.DecodedIdToken): boolean {
    const byEmail = !!process.env.ADMIN_EMAIL && t.email === process.env.ADMIN_EMAIL;
    const byUid = (process.env.ADMIN_UIDS ?? "").split(",").map((s) => s.trim()).filter(Boolean).includes(t.uid);
    return byEmail || byUid;
}

export { adminDb, admin, timestamp, db, auth, storage, messaging, withAuth };