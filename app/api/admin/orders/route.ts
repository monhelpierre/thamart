import { NextResponse } from "next/server";
import { FieldPath } from "firebase-admin/firestore";
import { adminDb, withAuth } from "@/lib/firebaseAdmin";

function serializeOrder(
  doc:
    | FirebaseFirestore.QueryDocumentSnapshot
    | FirebaseFirestore.DocumentSnapshot,
) {
  const d = doc.data()!;
  return {
    ...d,
    id: doc.id,
    userId: d.userId,
    createdAt: d.createdAt?.toDate?.()?.toISOString() ?? d.createdAt ?? "",
    updatedAt: d.updatedAt?.toDate?.()?.toISOString() ?? d.updatedAt ?? "",
  };
}

export const GET = withAuth(async (_req, decodedToken) => {
  if (!adminDb)
    return NextResponse.json(
      { error: "admin-not-configured" },
      { status: 500 },
    );

  decodedToken;
  const snapshot = await adminDb.collection("orders").get();

  const userIds = [
    ...new Set(
      snapshot.docs.map((d) => d.data().userId as string).filter(Boolean),
    ),
  ];
  const userMap: Record<string, { email: string; name: string }> = {};
  for (let i = 0; i < userIds.length; i += 10) {
    const chunk = userIds.slice(i, i + 10);
    const snaps = await adminDb
      .collection("users")
      .where(FieldPath.documentId(), "in", chunk)
      .get();
    snaps.forEach((doc) => {
      const d = doc.data();
      userMap[doc.id] = {
        email: d.email ?? "",
        name: d.displayName ?? d.name ?? "",
      };
    });
  }

  const orders = snapshot.docs
    .map((doc) => {
      const serialized = serializeOrder(doc);
      const uid = serialized.userId as string;
      return {
        ...serialized,
        userEmail: userMap[uid]?.email ?? "",
        userName: userMap[uid]?.name ?? "",
      };
    })
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

  return NextResponse.json(orders);
});

export const PATCH = withAuth(async (req, decodedToken) => {
  if (!adminDb)
    return NextResponse.json(
      { error: "admin-not-configured" },
      { status: 500 },
    );

  const { orderId, status, trackingCode } = await req.json();
  if (!orderId || typeof orderId !== "string") {
    return NextResponse.json({ error: "missing-orderId" }, { status: 400 });
  }

  const valid = [
    "pending_payment",
    "paid",
    "in_production",
    "shipped",
    "delivered",
  ];
  if (status && !valid.includes(status)) {
    return NextResponse.json({ error: "invalid-status" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };
  if (status) updates.status = status;
  if (trackingCode !== undefined) updates.trackingCode = String(trackingCode);

  await adminDb.collection("orders").doc(orderId).update(updates);
  return NextResponse.json({ ok: true });
});
