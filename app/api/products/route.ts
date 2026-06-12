// app/api/products/route.ts
import { NextResponse } from "next/server";
import { PRODUCTS } from "@/data/products";
import { adminDb, withAuth } from "@/lib/firebaseAdmin";

const POPULATE = false;

export const GET = withAuth(async () => {
    if (!adminDb) {
        return NextResponse.json({ error: "Firebase Admin not configured" }, { status: 500 });
    }
    const db = adminDb!;
    try {
        const snapshot = await db.collection("products").get();

        const products = snapshot.docs.map(doc => {
            const { id: _discard, ...rest } = doc.data();   // destructure and discard
            return { id: doc.id, ...rest };
        });

        if (products.length === 0 && POPULATE && db) {
            const added: any[] = [];
            for (const p of PRODUCTS) {
                const { id: _discard2, ...productData } = p as any;
                const ref = await db.collection("products").add(productData);
                added.push({ id: ref.id, ...productData });
            }
            return NextResponse.json(added);
        }

        return NextResponse.json(products);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
    }
})