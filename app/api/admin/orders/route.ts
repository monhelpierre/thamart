import { NextResponse } from "next/server";
import { adminDb, withAuth, isAdminToken } from "@/lib/firebaseAdmin";

function serializeOrder(doc: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot) {
    const d = doc.data()!;
    return {
        ...d,
        id: doc.id,
        createdAt: d.createdAt?.toDate?.()?.toISOString() ?? d.createdAt ?? "",
        updatedAt: d.updatedAt?.toDate?.()?.toISOString() ?? d.updatedAt ?? "",
    };
}

export const GET = withAuth(async (_req, decodedToken) => {
    if (!isAdminToken(decodedToken)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    if (!adminDb) return NextResponse.json({ error: "admin-not-configured" }, { status: 500 });

    const snapshot = await adminDb.collection("orders").get();
    const orders = snapshot.docs
        .map(serializeOrder)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json(orders);
});

export const PATCH = withAuth(async (req, decodedToken) => {
    if (!isAdminToken(decodedToken)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    if (!adminDb) return NextResponse.json({ error: "admin-not-configured" }, { status: 500 });

    const { orderId, status, trackingCode } = await req.json();
    if (!orderId || typeof orderId !== "string") {
        return NextResponse.json({ error: "missing-orderId" }, { status: 400 });
    }

    const valid = ["pending_payment", "paid", "in_production", "shipped", "delivered"];
    if (status && !valid.includes(status)) {
        return NextResponse.json({ error: "invalid-status" }, { status: 400 });
    }

    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (status) updates.status = status;
    if (trackingCode !== undefined) updates.trackingCode = String(trackingCode);

    await adminDb.collection("orders").doc(orderId).update(updates);
    return NextResponse.json({ ok: true });
});
