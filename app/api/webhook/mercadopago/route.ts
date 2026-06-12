import { createHmac } from 'crypto';
import { NextResponse, NextRequest } from 'next/server';
import { Payment, MercadoPagoConfig } from 'mercadopago';
import { adminDb as db, timestamp, admin, messaging } from '@/lib/firebaseAdmin';
import { transferPlatformFee } from '@/lib/platformFee';

// Ensure environment variable exists
if (!process.env.MERCADO_ACCESS_TOKEN) {
    throw new Error('Missing MERCADO_ACCESS_TOKEN environment variable');
}
const client = new MercadoPagoConfig({ accessToken: process.env.MERCADO_ACCESS_TOKEN });
const dbRef = db!;

// Helper types and functions for type safety
type SupportedLang = 'en' | 'fr' | 'pt' | 'ht' | 'es';

function getLocalizedContent(
    content: Record<SupportedLang, string>,
    lang?: string
): string {
    const safeLang = (lang as SupportedLang) ?? 'en';
    return content[safeLang] ?? content.en;
}

export async function POST(req: NextRequest) {
    try {
        const rawBody = await req.text();
        const payload = JSON.parse(rawBody);

        const dataID = payload?.data?.id;
        const xSignature = req.headers.get('x-signature');
        const xRequestID = req.headers.get('x-request-id');

        console.info(`Mercadopago notification for ${payload?.type}`);
        console.info(`Body: ${rawBody}`);
        console.info(`xSignature: ${xSignature}`);
        console.info(`xRequestID: ${xRequestID}`);

        if (!xSignature || !xRequestID || !dataID || !payload.type) {
            console.warn('Notification not relevant');
            return NextResponse.json(
                { message: 'Notification not relevant' },
                { status: 200 }
            );
        }

        const parts = xSignature.split(',').map(part => part.trim());
        let ts, hash;

        for (const part of parts) {
            const [key, value] = part.split('=').map(s => s.trim());
            if (key === 'ts') {
                ts = value;
            } else if (key === 'v1') {
                hash = value;
            }
        }

        if (!ts || !hash) {
            console.error('Invalid x-signature header format', xSignature);
            return NextResponse.json(
                { message: 'Invalid x-signature header format' },
                { status: 400 }
            );
        }

        const manifest = `id:${dataID};request-id:${xRequestID};ts:${ts};`;
        const secret = process.env.MERCADO_SECRET_KEY;
        if (!secret) {
            console.error('Missing MERCADO_SECRET_KEY env var');
            return NextResponse.json({ message: 'Missing MERCADO_SECRET_KEY' }, { status: 500 });
        }
        const hmac = createHmac('sha256', secret);
        hmac.update(manifest);
        const sha = hmac.digest('hex');

        if (sha !== hash) {
            console.error('Not authorized');
            return NextResponse.json({ message: 'Not authorized' }, { status: 400 });
        }

        if (payload.type === 'payment') {
            const payment = new Payment(client);

            // Use any type to avoid incomplete SDK type issues
            const rep: any = await payment.search({
                options: { id: payload.data.id },
            });

            const result = rep.results?.[0];
            if (rep.status >= 400 || !result) {
                console.warn(`Payment not found for ID: ${payload.data.id}`);
                return NextResponse.json({
                    message: `Payment not found for ID: ${payload.data.id}`,
                }, { status: 200 });
            }

            const results = result;
            const status = results.status;

            const items = results.additional_info?.items;
            const process_id = items ? items[0].id : results.external_reference?.split('_')[1];
            const uid = items ? results.external_reference : results.external_reference?.split('_')[0];

            const userDoc = await dbRef.collection("users").doc(uid).get();
            const user = userDoc.exists ? (userDoc.data() as any) : null;
            if (!user) {
                console.warn(`User not found for UID: ${uid}`);
                return NextResponse.json({ message: 'User not found' }, { status: 200 });
            }

            const lang = user.displayLang ?? 'en';

            if (payload.action === 'payment.updated') {
                /** Updating payment status */
                const paymentRef = dbRef.collection("payment").doc(uid);
                const paymentDoc = await paymentRef.get();

                if (!paymentDoc.exists) {
                    console.warn('Payment document not found');
                    return NextResponse.json(
                        { message: 'Payment document not found' },
                        { status: 200 }
                    );
                }

                const paymentDocData = paymentDoc.data();
                if (!paymentDocData || !Array.isArray(paymentDocData.data)) {
                    console.warn('Payment document has no data array');
                    return NextResponse.json(
                        { message: 'Payment document has no data' },
                        { status: 200 }
                    );
                }

                const paymentsList = paymentDocData.data as any[];
                const paymentIndex = paymentsList.findIndex(
                    (payment: any) => parseInt(payment.id) === parseInt(payload.data.id)
                );

                if (paymentIndex === -1) {
                    console.warn('Payment not found');
                    return NextResponse.json(
                        { message: 'Payment not found' },
                        { status: 200 }
                    );
                }

                const firebaseStatus = (
                    status === 'approved' || status === 'authorized'
                ) ? 'paid' : status === 'pending' ? status : 'failed';

                paymentsList[paymentIndex].status = firebaseStatus;
                paymentsList[paymentIndex].updatedAt = admin.firestore.Timestamp.fromDate(new Date(results['date_last_updated']));

                await paymentRef.update({ data: paymentsList });

                /** Updating assistance payment_status field or creating a new assistance */
                const assistanceRef = dbRef.collection("assistance").doc(uid);
                const assistDoc = await assistanceRef.get();

                const notificationsRef = dbRef.collection("notification").doc(uid);
                const notificationsDoc = await notificationsRef.get();

                if (status === 'cancelled') {
                    if (assistDoc.exists) {
                        const assistanceList = assistDoc.data()?.data ?? [];
                        const assistanceIndex = assistanceList.findIndex(
                            (assistance: any) => parseInt(assistance.payment_id) === parseInt(payload.data.id)
                        );
                        if (assistanceIndex !== -1) {
                            assistanceList[assistanceIndex].payment_status = firebaseStatus;
                            assistanceList[assistanceIndex].updatedAt = timestamp;
                            await assistanceRef.update({ data: assistanceList });
                        }
                    }

                    const notification = {
                        id: Date.now().toString(),
                        isRead: false,
                        type: "paymentErrorType",
                        content: {
                            en: "Payment has been cancelled because it was not paid.",
                            fr: "Le paiement a été annulé car il n'a pas été effectué.",
                            pt: "O pagamento foi cancelado porque não foi realizado.",
                            ht: "Pèman an anile paske li pa te peye.",
                            es: "El pago ha sido cancelado porque no se realizó."
                        },
                        createdAt: timestamp,
                        updatedAt: timestamp
                    };

                    const notificationsList = notificationsDoc.exists
                        ? (notificationsDoc.data()?.data ?? [])
                        : [];
                    notificationsList.push(notification);
                    if (notificationsDoc.exists) {
                        await notificationsRef.update({ data: notificationsList });
                    } else {
                        await notificationsRef.set({ data: notificationsList });
                    }

                    const translationDoc = await dbRef.collection('translation').doc(lang).get();
                    const title = (translationDoc.data() as any)?.[notification.type] ?? null;

                    try {
                        const bodyText = getLocalizedContent(notification.content, lang);
                        await messaging.send({
                            token: user.recipient,
                            notification: {
                                title: title,
                                body: bodyText,
                            },
                            data: {
                                id: payload.data.id,
                                locale: lang,
                            },
                        });
                    } catch (err) {
                        console.log(err);
                    }

                } else if (status === 'authorized' || status === 'approved') {
                    const taskId = Date.now().toString();

                    /** Getting document list from process */
                    const processRef = dbRef.collection("process").doc(process_id);
                    const processDoc = await processRef.get();

                    if (processDoc.exists) {
                        const documents: string[] = processDoc.data()?.documents ?? [];
                        const assistantDocument = documents.reduce((acc: Record<string, null>, doc) => {
                            acc[doc] = null;
                            return acc;
                        }, {});

                        const newAssistance = {
                            id: taskId,
                            process_id,
                            document: assistantDocument,
                            status: "incomplete",
                            payment_status: 'paid',
                            payment_id: payload.data.id,
                            createdAt: timestamp,
                            updatedAt: timestamp,
                        };

                        const assistanceList = assistDoc.exists
                            ? (assistDoc.data()?.data ?? [])
                            : [];

                        const assistanceIndex = assistanceList.findIndex(
                            (assistance: any) => parseInt(assistance.payment_id) === parseInt(payload.data.id)
                        );

                        if (assistanceIndex !== -1) {
                            assistanceList[assistanceIndex].payment_status = firebaseStatus;
                            assistanceList[assistanceIndex].updatedAt = timestamp;
                        } else {
                            assistanceList.push(newAssistance);
                        }

                        if (assistDoc.exists) {
                            await assistanceRef.update({ data: assistanceList });
                        } else {
                            await assistanceRef.set({ data: [newAssistance] });
                        }
                    }

                    // Update order status to paid + trigger platform fee transfer
                    try {
                        const ordersQuery = await dbRef
                            .collection("orders")
                            .where("paymentId", "==", String(payload.data.id))
                            .limit(1)
                            .get();
                        if (!ordersQuery.empty) {
                            const orderDoc = ordersQuery.docs[0];
                            await orderDoc.ref.update({
                                status: "paid",
                                updatedAt: admin.firestore.Timestamp.now(),
                            });
                            const fee = orderDoc.data()?.platformFee ?? 0;
                            if (fee > 0) {
                                transferPlatformFee(fee).catch((e) =>
                                    console.error("Platform fee transfer error:", e)
                                );
                            }
                        }
                    } catch (orderErr) {
                        console.error("Failed to update order status:", orderErr);
                    }

                    const notification = {
                        isRead: false,
                        id: Date.now().toString(),
                        type: "paymentSuccessType",
                        content: {
                            en: "Payment has been received successfully, we thank you!",
                            fr: "Le paiement a été reçu avec succès, nous vous remercions !",
                            pt: "O pagamento foi recebido com sucesso, agradecemos!",
                            ht: "Peman an resevwa avèk siksè, nou remèsye w!",
                            es: "El pago ha sido recibido con éxito, ¡te lo agradecemos!"
                        },
                        createdAt: timestamp,
                        updatedAt: timestamp
                    };

                    const notificationsList = notificationsDoc.exists
                        ? (notificationsDoc.data()?.data ?? [])
                        : [];
                    notificationsList.push(notification);
                    if (notificationsDoc.exists) {
                        await notificationsRef.update({ data: notificationsList });
                    } else {
                        await notificationsRef.set({ data: [notification] });
                    }

                    const translationDoc = await dbRef.collection('translation').doc(lang).get();
                    const title = (translationDoc.data() as any)?.[notification.type] ?? null;

                    await messaging.send({
                        token: user.recipient,
                        notification: {
                            title: title,
                            body: getLocalizedContent(notification.content, lang),
                        },
                        data: {
                            id: payload.data.id,
                            locale: lang,
                        },
                    });

                } else {
                    if (assistDoc.exists) {
                        const assistanceList = assistDoc.data()?.data ?? [];
                        const assistanceIndex = assistanceList.findIndex(
                            (assistance: any) => parseInt(assistance.payment_id) === parseInt(payload.data.id)
                        );
                        if (assistanceIndex !== -1) {
                            assistanceList[assistanceIndex].payment_status = firebaseStatus;
                            assistanceList[assistanceIndex].updatedAt = timestamp;
                            await assistanceRef.update({ data: assistanceList });
                        }
                    }
                }

                console.info(`Payment with ID ${payload.data.id} has been updated successfully`);
                return NextResponse.json({
                    message: `Payment with ID ${payload.data.id} has been updated successfully`,
                }, { status: 200 });
            }

            if (payload.action === 'payment.created') {
                const notification = {
                    isRead: false,
                    id: Date.now().toString(),
                    type: "paymentCreationType",
                    content: {
                        en: "A new payment has been created, waiting for payment to start the process.",
                        fr: "Un nouveau paiement a été créé, en attente du paiement pour commencer le processus.",
                        pt: "Um novo pagamento foi criado, aguardando o pagamento para iniciar o processo.",
                        ht: "Yon nouvo pèman kreye, ap tann peman an pou kòmanse pwosesis la.",
                        es: "Se ha creado un nuevo pago, esperando el pago para iniciar el proceso."
                    },
                    createdAt: timestamp,
                    updatedAt: timestamp
                };

                const notificationsRef = dbRef.collection("notification").doc(uid);
                const notificationsDoc = await notificationsRef.get();

                const notificationsList = notificationsDoc.exists
                    ? (notificationsDoc.data()?.data ?? [])
                    : [];
                notificationsList.push(notification);
                if (notificationsDoc.exists) {
                    await notificationsRef.update({ data: notificationsList });
                } else {
                    await notificationsRef.set({ data: [notification] });
                }

                const translationDoc = await dbRef.collection('translation').doc(lang).get();
                const title = (translationDoc.data() as any)?.[notification.type] ?? null;

                await messaging.send({
                    token: user.recipient,
                    notification: {
                        title: title,
                        body: getLocalizedContent(notification.content, lang),
                    },
                    data: {
                        id: payload.data.id,
                        locale: lang,
                    },
                });

                console.info(`Payment with ID ${payload.data.id} has been created successfully`);
                return NextResponse.json({
                    message: `Payment with ID ${payload.data.id} has been created successfully`,
                }, { status: 200 });
            }

        } else {
            console.info('Notification received successfully');
            return NextResponse.json({
                message: 'Notification received successfully',
            }, { status: 200 });
        }
    } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error(`Error while processing notification: ${err.message}`);
        return NextResponse.json(
            { message: err.message },
            { status: 500 }
        );
    }
}