import { NextResponse } from "next/server";
import { adminDb, withAuth, isAdminToken } from "@/lib/firebaseAdmin";

export const GET = withAuth(async (_req, decodedToken) => {
    if (!isAdminToken(decodedToken)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    if (!adminDb) return NextResponse.json({ error: "admin-not-configured" }, { status: 500 });

    const snapshot = await adminDb.collection("users").get();
    const users = snapshot.docs.map((doc) => {
        const d = doc.data();
        return {
            uid: doc.id,
            email: d.email ?? "",
            name: d.displayName ?? d.name ?? "",
            blocked: d.blocked ?? false,
            createdAt: d.createdAt?.toDate?.()?.toISOString() ?? d.createdAt ?? "",
        };
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json(users);
});

export const PATCH = withAuth(async (req, decodedToken) => {
    if (!isAdminToken(decodedToken)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    if (!adminDb) return NextResponse.json({ error: "admin-not-configured" }, { status: 500 });

    const { uid, blocked } = await req.json();
    if (!uid || typeof uid !== "string") {
        return NextResponse.json({ error: "missing-uid" }, { status: 400 });
    }
    if (typeof blocked !== "boolean") {
        return NextResponse.json({ error: "blocked must be boolean" }, { status: 400 });
    }

    await adminDb.collection("users").doc(uid).update({ blocked });
    return NextResponse.json({ ok: true });
});
