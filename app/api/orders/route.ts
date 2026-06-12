import { NextResponse } from "next/server";
import { adminDb, withAuth } from "@/lib/firebaseAdmin";
import type { DecodedIdToken } from "firebase-admin/auth";

export const GET = withAuth(async (req: Request, decodedToken: DecodedIdToken) => {
    if (!adminDb) return NextResponse.json({ error: "admin-not-configured" }, { status: 500 });
    const url = new URL(req.url);
    const uid = url.searchParams.get("uid");
    if (!uid) return NextResponse.json({ error: "missing-uid" }, { status: 400 });
    if (decodedToken.uid !== uid) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    try {
        const snapshot = await adminDb
            .collection("orders")
            .where("userId", "==", uid)
            .get();

        const orders = snapshot.docs
            .map((doc) => {
                const data = doc.data();
                return {
                    ...data,
                    id: doc.id,
                    createdAt: data.createdAt?.toDate?.()?.toISOString() ?? data.createdAt ?? "",
                    updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? data.updatedAt ?? "",
                };
            })
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return NextResponse.json(orders);
    } catch (e) {
        console.error("/api/orders GET error", e);
        return NextResponse.json({ error: "server-error" }, { status: 500 });
    }
});

export const PATCH = withAuth(async (req: Request, decodedToken: DecodedIdToken) => {
    if (!adminDb) return NextResponse.json({ error: "admin-not-configured" }, { status: 500 });
    try {
        const body = await req.json();
        const { orderId, status, trackingCode } = body;

        if (!orderId || typeof orderId !== "string") {
            return NextResponse.json({ error: "missing-orderId" }, { status: 400 });
        }

        const validStatuses = ["pending_payment", "paid", "in_production", "shipped", "delivered"];
        if (status && !validStatuses.includes(status)) {
            return NextResponse.json({ error: "invalid-status" }, { status: 400 });
        }

        const orderRef = adminDb.collection("orders").doc(orderId);
        const orderDoc = await orderRef.get();
        if (!orderDoc.exists) return NextResponse.json({ error: "order-not-found" }, { status: 404 });

        const order = orderDoc.data() as any;
        const adminUids = (process.env.ADMIN_UIDS ?? "").split(",").filter(Boolean);
        const isAdmin = adminUids.includes(decodedToken.uid);

        if (!isAdmin && decodedToken.uid !== order.userId) {
            return NextResponse.json({ error: "forbidden" }, { status: 403 });
        }

        const updates: Record<string, any> = { updatedAt: new Date().toISOString() };
        if (status) updates.status = status;
        if (trackingCode !== undefined) updates.trackingCode = trackingCode;

        await orderRef.update(updates);
        return NextResponse.json({ ok: true });
    } catch (e) {
        console.error("/api/orders PATCH error", e);
        return NextResponse.json({ error: "server-error" }, { status: 500 });
    }
});
