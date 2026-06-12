import { v4 as uuidv4 } from "uuid";
import { NextResponse } from "next/server";
import { adminDb, withAuth } from "@/lib/firebaseAdmin";
import type { DecodedIdToken } from "firebase-admin/auth";

export async function GET(req: Request) {
    if (!adminDb) return NextResponse.json({ error: "admin-not-configured" }, { status: 500 });
    const url = new URL(req.url);
    const productId = url.searchParams.get("productId");
    if (!productId) return NextResponse.json({ error: "missing-productId" }, { status: 400 });

    try {
        const snapshot = await adminDb
            .collection("reviews")
            .where("productId", "==", productId)
            .get();

        const reviews = snapshot.docs
            .map((doc) => ({ id: doc.id, ...doc.data() }))
            .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return NextResponse.json(reviews);
    } catch (e) {
        console.error("/api/reviews GET error", e);
        return NextResponse.json({ error: "server-error" }, { status: 500 });
    }
}

export const POST = withAuth(async (req: Request, decodedToken: DecodedIdToken) => {
    if (!adminDb) return NextResponse.json({ error: "admin-not-configured" }, { status: 500 });
    try {
        const body = await req.json();
        const { orderId, productId, rating, comment } = body;

        if (!orderId || typeof orderId !== "string") {
            return NextResponse.json({ error: "missing-orderId" }, { status: 400 });
        }
        if (!productId || typeof productId !== "string") {
            return NextResponse.json({ error: "missing-productId" }, { status: 400 });
        }
        if (typeof rating !== "number" || rating < 1 || rating > 5) {
            return NextResponse.json({ error: "invalid-rating" }, { status: 400 });
        }
        if (comment !== undefined && (typeof comment !== "string" || comment.length > 500)) {
            return NextResponse.json({ error: "comment-too-long" }, { status: 400 });
        }

        const orderDoc = await adminDb.collection("orders").doc(orderId).get();
        if (!orderDoc.exists) return NextResponse.json({ error: "order-not-found" }, { status: 404 });
        const order = orderDoc.data() as any;

        if (order.userId !== decodedToken.uid) {
            return NextResponse.json({ error: "forbidden" }, { status: 403 });
        }
        if (order.status !== "delivered") {
            return NextResponse.json({ error: "order-not-delivered" }, { status: 400 });
        }

        const existing = await adminDb
            .collection("reviews")
            .where("orderId", "==", orderId)
            .where("productId", "==", productId)
            .limit(1)
            .get();
        if (!existing.empty) {
            return NextResponse.json({ error: "already-reviewed" }, { status: 409 });
        }

        const reviewId = uuidv4();
        await adminDb.collection("reviews").doc(reviewId).set({
            id: reviewId,
            userId: decodedToken.uid,
            userName: decodedToken.name ?? "User",
            orderId,
            productId,
            rating,
            comment: comment ?? "",
            createdAt: new Date().toISOString(),
        });

        return NextResponse.json({ ok: true, reviewId });
    } catch (e) {
        console.error("/api/reviews POST error", e);
        return NextResponse.json({ error: "server-error" }, { status: 500 });
    }
});
