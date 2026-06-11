import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

export async function POST(req: NextRequest) {
    if (!adminDb) return NextResponse.json({ error: "admin-not-configured" }, { status: 500 });
    try {
        const body = await req.json();
        const { uid, displayName, email, photoURL } = body;
        if (!uid) return NextResponse.json({ error: "missing-uid" }, { status: 400 });
        const ref = adminDb.collection("users").doc(uid);
        await ref.set({ displayName, email, photoURL, lastSeen: new Date().toISOString() }, { merge: true });
        return NextResponse.json({ ok: true });
    } catch (e) {
        console.error("/api/users error", e);
        return NextResponse.json({ error: "server-error" }, { status: 500 });
    }
}
