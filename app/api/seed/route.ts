import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { PRODUCTS as defaultProducts } from "@/data/products";

export async function POST() {
    try {
        const productsRef = adminDb.collection("products");
        const snapshot = await productsRef.get();
        if (!snapshot.empty) {
            return NextResponse.json({ message: "Products already exist, skipping seed." });
        }
        for (const product of defaultProducts) {
            // let Firestore generate document IDs for seeded products
            await productsRef.add(product);
        }
        return NextResponse.json({ message: `Seeded ${defaultProducts.length} products.` });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Seeding failed" }, { status: 500 });
    }
}