import { NextResponse } from "next/server";
import { adminDb, withAuth } from "@/lib/firebaseAdmin";

export const POST = withAuth(async (req) => {
    if (!adminDb) return NextResponse.json({ error: "not-configured" }, { status: 500 });
    const { slug, label, emoji, order } = await req.json();
    if (!slug?.trim() || !label?.trim())
        return NextResponse.json({ error: "slug and label required" }, { status: 400 });
    const ref = await adminDb.collection("categories").add({
        slug: slug.trim(),
        label: label.trim(),
        emoji: emoji?.trim() ?? "",
        order: Number(order) || 0,
    });
    return NextResponse.json({ id: ref.id, slug, label, emoji: emoji ?? "", order: Number(order) || 0 });
});

export const PATCH = withAuth(async (req) => {
    if (!adminDb) return NextResponse.json({ error: "not-configured" }, { status: 500 });
    const { id, slug, label, emoji, order } = await req.json();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const updates: Record<string, unknown> = {};
    if (slug !== undefined) updates.slug = slug.trim();
    if (label !== undefined) updates.label = label.trim();
    if (emoji !== undefined) updates.emoji = emoji.trim();
    if (order !== undefined) updates.order = Number(order);
    await adminDb.collection("categories").doc(id).update(updates);
    return NextResponse.json({ ok: true });
});

export const DELETE = withAuth(async (req) => {
    if (!adminDb) return NextResponse.json({ error: "not-configured" }, { status: 500 });
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    await adminDb.collection("categories").doc(id).delete();
    return NextResponse.json({ ok: true });
});
