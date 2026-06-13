import { NextResponse } from "next/server";
import { adminDb, withAuth } from "@/lib/firebaseAdmin";

interface ProductBody {
  id?: string;
  name?: { pt: string; fr: string; en: string };
  description?: { pt: string; fr: string; en: string };
  price?: number;
  image?: string;
  popular?: boolean;
  customizable?: boolean;
}

export const POST = withAuth(async (req, decodedToken) => {
  if (!adminDb)
    return NextResponse.json(
      { error: "admin-not-configured" },
      { status: 500 },
    );

  decodedToken;

  const body: ProductBody = await req.json();
  const { name, description, price, image, popular, customizable } = body;

  if (!name?.pt || !name?.fr || !name?.en)
    return NextResponse.json(
      { error: "name required in all 3 languages" },
      { status: 400 },
    );
  if (!description?.pt || !description?.fr || !description?.en)
    return NextResponse.json(
      { error: "description required in all 3 languages" },
      { status: 400 },
    );
  if (!price || typeof price !== "number" || price <= 0)
    return NextResponse.json({ error: "invalid price" }, { status: 400 });
  if (!image || typeof image !== "string")
    return NextResponse.json({ error: "image URL required" }, { status: 400 });

  const data = {
    name,
    description,
    price,
    image,
    popular: popular ?? false,
    customizable: customizable ?? false,
    createdAt: new Date().toISOString(),
  };

  const ref = await adminDb.collection("products").add(data);
  return NextResponse.json({ ok: true, id: ref.id, ...data });
});

export const PATCH = withAuth(async (req, decodedToken) => {
  if (!adminDb)
    return NextResponse.json(
      { error: "admin-not-configured" },
      { status: 500 },
    );
  decodedToken;

  const body: ProductBody = await req.json();
  const { id, ...updates } = body;

  if (!id || typeof id !== "string")
    return NextResponse.json({ error: "missing id" }, { status: 400 });

  const allowed: Record<string, unknown> = {};
  if (updates.name) allowed.name = updates.name;
  if (updates.description) allowed.description = updates.description;
  if (updates.price !== undefined) allowed.price = updates.price;
  if (updates.image !== undefined) allowed.image = updates.image;
  if (updates.popular !== undefined) allowed.popular = updates.popular;
  if (updates.customizable !== undefined)
    allowed.customizable = updates.customizable;
  allowed.updatedAt = new Date().toISOString();

  await adminDb.collection("products").doc(id).update(allowed);
  return NextResponse.json({ ok: true });
});

export const DELETE = withAuth(async (req, decodedToken) => {
  if (!adminDb)
    return NextResponse.json(
      { error: "admin-not-configured" },
      { status: 500 },
    );

  decodedToken;
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

  await adminDb.collection("products").doc(id).delete();
  return NextResponse.json({ ok: true });
});
