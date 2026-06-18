import { NextResponse } from "next/server";
import { adminDb, auth } from "@/lib/firebaseAdmin";

export async function GET() {
    if (!adminDb) return NextResponse.json([]);
    try {
        const snap = await adminDb.collection("slides").orderBy("order", "asc").get();
        return NextResponse.json(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch {
        return NextResponse.json([]);
    }
}

async function verifyAdmin(req: Request) {
    const idToken = req.headers.get("Authorization")?.split("Bearer ")[1];
    if (!idToken) return null;
    try {
        const token = await auth.verifyIdToken(idToken);
        const emails = (process.env.ADMIN_EMAILS ?? process.env.ADMIN_EMAIL ?? "")
            .split(",").map((s) => s.trim()).filter(Boolean);
        return emails.includes(token.email ?? "") ? token : null;
    } catch {
        return null;
    }
}

export async function POST(req: Request) {
    if (!(await verifyAdmin(req))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (!adminDb) return NextResponse.json({ error: "DB unavailable" }, { status: 500 });

    const { type = "image", src, caption = "", label = "", ctaText = "", ctaLink = "", order = 0 } = await req.json();
    if (!src) return NextResponse.json({ error: "src required" }, { status: 400 });

    const ref = await adminDb.collection("slides").add({
        type, src, caption, label, ctaText, ctaLink,
        order: Number(order),
        createdAt: new Date().toISOString(),
    });
    return NextResponse.json({ id: ref.id });
}

export async function PATCH(req: Request) {
    if (!(await verifyAdmin(req))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (!adminDb) return NextResponse.json({ error: "DB unavailable" }, { status: 500 });

    const { id, ...fields } = await req.json();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    await adminDb.collection("slides").doc(id).update(fields);
    return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
    if (!(await verifyAdmin(req))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (!adminDb) return NextResponse.json({ error: "DB unavailable" }, { status: 500 });

    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    await adminDb.collection("slides").doc(id).delete();
    return NextResponse.json({ ok: true });
}
