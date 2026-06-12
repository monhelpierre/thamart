export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { DecodedIdToken } from "firebase-admin/auth";
import { adminDb, withAuth } from "@/lib/firebaseAdmin";

export const POST = withAuth(async (req: Request, decodedToken: DecodedIdToken) => {
  if (!adminDb)
    return NextResponse.json(
      { error: "admin-not-configured" },
      { status: 500 },
    );
  try {
    const body = await req.json();
    const { uid, cart } = body;
    if (!uid)
      return NextResponse.json({ error: "missing-uid" }, { status: 400 });
    const ref = adminDb.collection("carts").doc(uid);
    const existing = await ref.get();
    const payload: any = { cart, updatedAt: new Date().toISOString() };
    if (!existing.exists) payload.createdAt = new Date().toISOString();
    await ref.set(payload, { merge: true });
    return NextResponse.json({ ok: true });
  } catch (e) {
    decodedToken
    console.error("/api/carts POST error", e);
    return NextResponse.json({ error: "server-error" }, { status: 500 });
  }
})

export const GET = withAuth(async (req: Request, decodedToken: DecodedIdToken) => {
  if (!adminDb)
    return NextResponse.json(
      { error: "admin-not-configured" },
      { status: 500 },
    );
  try {
    const url = new URL(req.url);
    const uid = url.searchParams.get("uid");
    if (!uid)
      return NextResponse.json({ error: "missing-uid" }, { status: 400 });
    const doc = await adminDb.collection("carts").doc(uid).get();
    if (!doc.exists) return NextResponse.json({ cart: {} });
    return NextResponse.json({ cart: doc.data()?.cart ?? {} });
  } catch (e) {
    decodedToken
    console.error("/api/carts GET error", e);
    return NextResponse.json({ error: "server-error" }, { status: 500 });
  }
})
