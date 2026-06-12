import { NextResponse, NextRequest } from "next/server";
import { adminDb, admin, timestamp, messaging } from "@/lib/firebaseAdmin";

export async function POST(req: NextRequest) {
    if (process.env.NODE_ENV === "production") {
        return NextResponse.json({ error: "not-available-in-production" }, { status: 403 });
    }
    if (!adminDb) return NextResponse.json({ error: "admin-not-configured" }, { status: 500 });

    try {
        const body = await req.json();
        const { paymentId, status = "approved" } = body;

        if (!paymentId) {
            return NextResponse.json({ error: "missing-paymentId" }, { status: 400 });
        }

        const isApproved = status === "approved";
        const orderStatus = isApproved ? "paid" : "pending_payment";

        // Find order by paymentId
        const ordersQuery = await adminDb
            .collection("orders")
            .where("paymentId", "==", String(paymentId))
            .limit(1)
            .get();

        if (ordersQuery.empty) {
            return NextResponse.json({ error: "order-not-found" }, { status: 404 });
        }

        const orderDoc = ordersQuery.docs[0];
        const order = orderDoc.data() as any;
        const uid = order.userId;

        // Update order status
        await orderDoc.ref.update({
            status: orderStatus,
            updatedAt: admin.firestore.Timestamp.now(),
        });

        // Log platform fee (no real transfer in dev/simulate)
        if (isApproved) {
            const fee = order.platformFee ?? 0;
            if (fee > 0) {
                console.info(`[simulate] Platform fee R$${fee.toFixed(2)} would be transferred to developer in production.`);
            }
        }

        // Update payment collection entry
        const paymentRef = adminDb.collection("payment").doc(uid);
        const paymentDoc = await paymentRef.get();
        if (paymentDoc.exists) {
            const paymentsList: any[] = paymentDoc.data()?.data ?? [];
            const idx = paymentsList.findIndex((p) => String(p.id) === String(paymentId));
            if (idx !== -1) {
                paymentsList[idx].status = isApproved ? "paid" : "failed";
                paymentsList[idx].updatedAt = admin.firestore.Timestamp.now();
                await paymentRef.update({ data: paymentsList });
            }
        }

        // Save notification
        const notification = {
            id: Date.now().toString(),
            isRead: false,
            type: isApproved ? "paymentSuccessType" : "paymentErrorType",
            content: isApproved
                ? {
                    en: "Payment confirmed! We're preparing your order.",
                    fr: "Paiement confirmé ! Nous préparons votre commande.",
                    pt: "Pagamento confirmado! Estamos preparando seu pedido.",
                    ht: "Pèman konfime! N ap prepare kòmand ou a.",
                    es: "¡Pago confirmado! Estamos preparando tu pedido.",
                }
                : {
                    en: "Payment was not completed.",
                    fr: "Le paiement n'a pas été complété.",
                    pt: "O pagamento não foi concluído.",
                    ht: "Peman an pa t fini.",
                    es: "El pago no se completó.",
                },
            createdAt: timestamp,
            updatedAt: timestamp,
        };

        const notifRef = adminDb.collection("notification").doc(uid);
        const notifDoc = await notifRef.get();
        const notifList: any[] = notifDoc.exists ? (notifDoc.data()?.data ?? []) : [];
        notifList.push(notification);
        if (notifDoc.exists) {
            await notifRef.update({ data: notifList });
        } else {
            await notifRef.set({ data: notifList });
        }

        // FCM optional
        try {
            const userDoc = await adminDb.collection("users").doc(uid).get();
            const user = userDoc.data() as any;
            if (user?.recipient) {
                await messaging.send({
                    token: user.recipient,
                    notification: {
                        title: isApproved ? "Pagamento confirmado! 🎉" : "Pagamento não concluído",
                        body: notification.content.pt,
                    },
                });
            }
        } catch {
            /* FCM is optional */
        }

        return NextResponse.json({ ok: true, orderId: orderDoc.id, newStatus: orderStatus });
    } catch (e) {
        const msg = e instanceof Error ? e.message : "server-error";
        console.error("/api/webhook/simulate error", e);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
