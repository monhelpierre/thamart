import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
    if (!adminDb) return NextResponse.json([]);
    try {
        const snap = await adminDb.collection("categories").orderBy("order", "asc").get();
        return NextResponse.json(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch {
        return NextResponse.json([]);
    }
}
