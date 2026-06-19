import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

// Called by a cron service (e.g. Vercel Cron, GitHub Actions) every ~15 min.
// Protect with CRON_SECRET env var; set the same secret as the x-cron-secret header.
export async function GET(req: Request) {
    const secret = process.env.CRON_SECRET;
    if (secret && req.headers.get("x-cron-secret") !== secret) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!adminDb) return NextResponse.json({ error: "DB unavailable" }, { status: 500 });

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const snap = await adminDb.collection("orders")
        .where("status", "==", "pending_payment")
        .get();

    const toCancel = snap.docs.filter((doc) => {
        const createdAt = doc.data().createdAt as string | undefined;
        return createdAt && createdAt < oneHourAgo;
    });

    if (toCancel.length === 0) return NextResponse.json({ cancelled: 0 });

    const batch = adminDb.batch();
    const now = new Date().toISOString();
    toCancel.forEach((doc) => {
        batch.update(doc.ref, { status: "cancelled", updatedAt: now });
    });
    await batch.commit();

    return NextResponse.json({ cancelled: toCancel.length });
}
