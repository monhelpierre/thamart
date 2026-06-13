import { NextResponse } from "next/server";
import { adminDb, withAuth } from "@/lib/firebaseAdmin";

export const GET = withAuth(async (_req, decodedToken) => {
  if (!adminDb)
    return NextResponse.json(
      { error: "admin-not-configured" },
      { status: 500 },
    );
  decodedToken;

  const [cartsSnap, usersSnap, productsSnap] = await Promise.all([
    adminDb.collection("carts").get(),
    adminDb.collection("users").get(),
    adminDb.collection("products").get(),
  ]);

  const userMap = new Map(
    usersSnap.docs.map((d) => [
      d.id,
      { name: d.data().displayName ?? "", email: d.data().email ?? "" },
    ]),
  );

  const priceMap = new Map(
    productsSnap.docs.map((d) => [
      d.id,
      { price: d.data().price ?? 0, name: d.data().name?.pt ?? d.id },
    ]),
  );

  const rows = cartsSnap.docs
    .map((doc) => {
      const data = doc.data();
      const cart: Record<string, number> = data.cart ?? {};
      const itemCount = Object.values(cart).reduce((a, b) => a + b, 0);

      if (itemCount === 0) return null;

      const items = Object.entries(cart).map(([productId, qty]) => {
        const prod = priceMap.get(productId);
        return {
          productId,
          name: prod?.name ?? productId,
          qty,
          price: prod?.price ?? 0,
          subtotal: (prod?.price ?? 0) * qty,
        };
      });

      const totalValue = items.reduce((s, i) => s + i.subtotal, 0);
      const user = userMap.get(doc.id);

      return {
        uid: doc.id,
        userName: user?.name ?? "",
        userEmail: user?.email ?? "",
        items,
        itemCount,
        totalValue,
        updatedAt: data.updatedAt ?? "",
      };
    })
    .filter(Boolean)
    .sort(
      (a, b) =>
        new Date(b!.updatedAt).getTime() - new Date(a!.updatedAt).getTime(),
    );

  return NextResponse.json(rows);
});
