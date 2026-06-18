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

// GET /api/chat?orderId=xxx
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

    // Mark admin messages as read for this user
    if (!isAdmin(token.email)) {
        await adminDb.collection("chats").doc(orderId).set(
            { unreadUser: 0 }, { merge: true }
        );
    } else {
        await adminDb.collection("chats").doc(orderId).set(
            { unreadAdmin: 0 }, { merge: true }
        );
    }

    return NextResponse.json(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
}

// POST /api/chat { orderId, text }
export async function POST(req: Request) {
    const token = await verifyToken(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!adminDb) return NextResponse.json({ error: "DB unavailable" }, { status: 500 });

    const { orderId, text } = await req.json();
    if (!orderId || !text?.trim()) {
        return NextResponse.json({ error: "orderId and text required" }, { status: 400 });
    }

    const role = isAdmin(token.email) ? "admin" : "user";

    if (role === "user") {
        const order = await adminDb.collection("orders").doc(orderId).get();
        if (!order.exists || order.data()?.userId !== token.uid) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
    }

    const msg = {
        uid: token.uid,
        userName: token.name ?? token.email ?? "Usuário",
        role,
        text: text.trim().slice(0, 1000),
        createdAt: new Date().toISOString(),
    };

    const ref = await adminDb
        .collection("chats").doc(orderId)
        .collection("messages").add(msg);

    // Increment unread counter for the other party
    const counterField = role === "user" ? "unreadAdmin" : "unreadUser";
    const chatDoc = await adminDb.collection("chats").doc(orderId).get();
    const prev = (chatDoc.data()?.[counterField] ?? 0) as number;
    await adminDb.collection("chats").doc(orderId).set(
        { [counterField]: prev + 1, orderId }, { merge: true }
    );

    return NextResponse.json({ id: ref.id, ...msg });
}
