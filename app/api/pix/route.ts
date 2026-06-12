import admin from "firebase-admin";
import { v4 as uuidv4 } from "uuid";
import { NextResponse } from "next/server";
import { adminDb, withAuth } from "@/lib/firebaseAdmin";
import { handlePixPayment } from "@/app/api/pix";
import { shippingRate } from "@/lib/shipping";
import { calcPlatformFee } from "@/lib/platformFee";
import type { DecodedIdToken } from "firebase-admin/auth";

interface AddressInput {
    cep: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    country: string;
}

export const POST = withAuth(async (req: Request, decodedToken: DecodedIdToken) => {
    if (!adminDb) return NextResponse.json({ error: "admin-not-configured" }, { status: 500 });
    try {
        const body = await req.json();
        const { cart, notes, address } = body as {
            cart: Record<string, number>;
            notes: string;
            address: AddressInput;
        };

        if (!cart || typeof cart !== "object") {
            return NextResponse.json({ error: "missing-cart" }, { status: 400 });
        }
        if (!address?.cep || !address?.state || !address?.city) {
            return NextResponse.json({ error: "missing-address" }, { status: 400 });
        }
        if (!/^\d{8}$/.test(address.cep.replace(/\D/g, ""))) {
            return NextResponse.json({ error: "invalid-cep" }, { status: 400 });
        }

        const productIds = Object.keys(cart).filter((id) => cart[id] > 0);
        if (productIds.length === 0) {
            return NextResponse.json({ error: "empty-cart" }, { status: 400 });
        }

        // Fetch products server-side to prevent price tampering
        const productDocs = await Promise.all(
            productIds.map((id) => adminDb!.collection("products").doc(id).get())
        );

        const items = productDocs
            .map((doc, i) => {
                const id = productIds[i];
                const qty = cart[id];
                const data = doc.data() as any;
                return {
                    productId: id,
                    name: data?.name ?? { pt: "Produto", fr: "Produit", en: "Product" },
                    qty,
                    price: Number(data?.price ?? 0),
                };
            })
            .filter((item) => item.price > 0 && item.qty > 0);

        if (items.length === 0) {
            return NextResponse.json({ error: "invalid-products" }, { status: 400 });
        }

        const subtotal = items.reduce((s, item) => s + item.price * item.qty, 0);
        const deliveryFee = shippingRate(address.state, subtotal);
        const platformFee = calcPlatformFee(subtotal);
        const total = subtotal + deliveryFee + platformFee;

        // Create order document first
        const orderId = uuidv4();
        const now = admin.firestore.Timestamp.now();
        await adminDb.collection("orders").doc(orderId).set({
            id: orderId,
            userId: decodedToken.uid,
            items,
            notes: typeof notes === "string" ? notes.slice(0, 1000) : "",
            address: {
                cep: address.cep,
                street: address.street ?? "",
                number: address.number ?? "",
                complement: address.complement ?? "",
                neighborhood: address.neighborhood ?? "",
                city: address.city,
                state: address.state,
                country: address.country ?? "BR",
            },
            subtotal,
            deliveryFee,
            platformFee,
            total,
            status: "pending_payment",
            paymentId: null,
            createdAt: now,
            updatedAt: now,
        });

        // Create Mercado Pago payment
        const process = {
            id: orderId,
            title: "ThamArt Bijoux",
            description: `Pedido ${orderId.substring(0, 8).toUpperCase()}`,
            type: "jewelry",
            price: total,
        };
        const user = {
            uid: decodedToken.uid,
            displayName: decodedToken.name ?? "User",
            email: decodedToken.email ?? "",
        };

        const paymentResult = await handlePixPayment(process, user);

        await adminDb.collection("orders").doc(orderId).update({
            paymentId: String(paymentResult.payment_id),
            updatedAt: admin.firestore.Timestamp.now(),
        });

        return NextResponse.json({
            orderId,
            paymentId: paymentResult.payment_id,
            qr_code: paymentResult.qr_code,
            qr_code_base64: paymentResult.qr_code_base64,
            total: total + paymentResult.mercado_percent,
            deliveryFee,
            subtotal,
        });
    } catch (e) {
        console.error("/api/pix POST error", e);
        const msg = e instanceof Error ? e.message : "server-error";
        return NextResponse.json({ error: msg }, { status: 500 });
    }
});
