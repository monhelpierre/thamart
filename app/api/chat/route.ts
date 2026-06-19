import { NextResponse } from "next/server";
import { adminDb, auth } from "@/lib/firebaseAdmin";

async function verifyToken(req: Request) {
    const idToken = req.headers.get("Authorization")?.split("Bearer ")[1];
    if (!idToken) return null;
    try { return await auth.verifyIdToken(idToken); } catch { return null; }
}

function isAdmin(email?: string) {
    const emails = (process.env.ADMIN_EMAILS ?? process.env.ADMIN_EMAIL ?? "")
        .split(",").map((s) => s.trim()).filter(Boolean);
    return emails.includes(email ?? "");
}

// GET /api/chat?orderId=xxx  — fetches messages and marks them read for the caller
export async function GET(req: Request) {
    const token = await verifyToken(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!adminDb) return NextResponse.json([]);

    const orderId = new URL(req.url).searchParams.get("orderId");
    if (!orderId) return NextResponse.json({ error: "orderId required" }, { status: 400 });

    if (!isAdmin(token.email)) {
        const order = await adminDb.collection("orders").doc(orderId).get();
        if (!order.exists || order.data()?.userId !== token.uid) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
    }

    const snap = await adminDb
        .collection("chats").doc(orderId)
        .collection("messages").orderBy("createdAt", "asc").get();

    // Mark appropriate unread counter to 0
    const clearFields: Record<string, unknown> = isAdmin(token.email)
        ? { unreadAdmin: 0, hasUserImage: false }
        : { unreadUser: 0 };
    await adminDb.collection("chats").doc(orderId).set(clearFields, { merge: true });

    return NextResponse.json(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
}

// POST /api/chat { orderId, text?, imageUrl? }
export async function POST(req: Request) {
    const token = await verifyToken(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!adminDb) return NextResponse.json({ error: "DB unavailable" }, { status: 500 });

    const { orderId, text, imageUrl } = await req.json();
    if (!orderId || (!text?.trim() && !imageUrl)) {
        return NextResponse.json({ error: "orderId and text or imageUrl required" }, { status: 400 });
    }

    const role = isAdmin(token.email) ? "admin" : "user";

    // Verify ownership for non-admin
    let orderUserId: string | null = null;
    if (role === "user") {
        const order = await adminDb.collection("orders").doc(orderId).get();
        if (!order.exists || order.data()?.userId !== token.uid) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        orderUserId = order.data()?.userId ?? null;
    } else {
        // Admin: look up userId to store on chat doc for client-side queries
        const order = await adminDb.collection("orders").doc(orderId).get();
        orderUserId = order.data()?.userId ?? null;
    }

    const msg: Record<string, unknown> = {
        uid: token.uid,
        userName: token.name ?? token.email ?? "Usuário",
        role,
        createdAt: new Date().toISOString(),
    };
    if (text?.trim()) msg.text = text.trim().slice(0, 1000);
    if (imageUrl) msg.imageUrl = imageUrl;

    const ref = await adminDb
        .collection("chats").doc(orderId)
        .collection("messages").add(msg);

    // Update chat doc: increment unread counter for the other party, persist userId for queries
    const counterField = role === "user" ? "unreadAdmin" : "unreadUser";
    const chatRef = adminDb.collection("chats").doc(orderId);
    const chatDoc = await chatRef.get();
    const prev = (chatDoc.data()?.[counterField] ?? 0) as number;

    const chatUpdate: Record<string, unknown> = {
        [counterField]: prev + 1,
        orderId,
    };
    if (orderUserId) chatUpdate.userId = orderUserId;
    if (role === "user" && imageUrl) chatUpdate.hasUserImage = true;

    await chatRef.set(chatUpdate, { merge: true });

    return NextResponse.json({ id: ref.id, ...msg });
}
