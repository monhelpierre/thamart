import { NextResponse } from "next/server";
import { adminDb, withAuth } from "@/lib/firebaseAdmin";
import type { DecodedIdToken } from "firebase-admin/auth";

export const GET = withAuth(async (req: Request, decodedToken: DecodedIdToken) => {
    if (!adminDb) return NextResponse.json({ error: "admin-not-configured" }, { status: 500 });
    const url = new URL(req.url);
    const uid = url.searchParams.get("uid");
    if (!uid) return NextResponse.json({ error: "missing-uid" }, { status: 400 });

    const adminUids = (process.env.ADMIN_UIDS ?? "").split(",").filter(Boolean);
    if (decodedToken.uid !== uid && !adminUids.includes(decodedToken.uid)) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    try {
        const doc = await adminDb.collection("users").doc(uid).get();
        if (!doc.exists) return NextResponse.json({ error: "not-found" }, { status: 404 });
        return NextResponse.json(doc.data());
    } catch (e) {
        console.error("/api/users GET error", e);
        return NextResponse.json({ error: "server-error" }, { status: 500 });
    }
});

export const POST = withAuth(async (req: Request, decodedToken: DecodedIdToken) => {
    if (!adminDb) return NextResponse.json({ error: "admin-not-configured" }, { status: 500 });
    try {
        const body = await req.json();
        const { uid, displayName, email, photoURL, displayLang, recipient, defaultAddress } = body;
        if (!uid) return NextResponse.json({ error: "missing-uid" }, { status: 400 });
        if (decodedToken.uid !== uid) return NextResponse.json({ error: "forbidden" }, { status: 403 });

        const update: Record<string, unknown> = {
            displayName, email, photoURL, lastSeen: new Date().toISOString(),
        };
        if (displayLang) update.displayLang = displayLang;
        if (recipient) update.recipient = recipient;
        if (defaultAddress) update.defaultAddress = defaultAddress;

        await adminDb.collection("users").doc(uid).set(update, { merge: true });
        return NextResponse.json({ ok: true });
    } catch (e) {
        console.error("/api/users POST error", e);
        return NextResponse.json({ error: "server-error" }, { status: 500 });
    }
});