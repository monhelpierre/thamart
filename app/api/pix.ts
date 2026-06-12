import { v4 as uuidv4 } from 'uuid';
import { db, admin } from "@/lib/firebaseAdmin";
import { Payment, MercadoPagoConfig, PaymentRefund } from 'mercadopago';

const MERCADO_PIX_PERCENT = 0.05;
const collection = "payment";

if (!process.env.MERCADO_ACCESS_TOKEN) {
    throw new Error('Missing MERCADO_ACCESS_TOKEN environment variable');
}
const mercadopagoAccessToken: string = process.env.MERCADO_ACCESS_TOKEN;
const client = new MercadoPagoConfig({ accessToken: mercadopagoAccessToken });
const payment = new Payment(client);

export async function handlePixPayment(process: any, user: any) {
    const productPrice = parseInt(process['price']) || 0;

    /** Cancelling previous pending payments */
    await cancelPayment(user["uid"]);

    /** Preparation for new payment */
    const userDisplayName: string = user['displayName'] ?? 'User';
    const nameParts = userDisplayName.split(' ');
    const user_first_name = nameParts[0] ?? '';
    const user_last_name = nameParts[1] ?? '';
    const user_email = user['email'] ?? '';

    const mercadoPercent = productPrice * MERCADO_PIX_PERCENT;
    const price = productPrice + mercadoPercent;

    // Create payment request – SDK types are incomplete, use any
    const response: any = await payment.create({
        body: {
            additional_info: {
                items: [
                    {
                        id: process['id'],
                        title: process['title'],
                        description: process['description'],
                        category_id: process['type'],
                        quantity: 1,
                        unit_price: price,
                    }
                ],
                payer: {
                    first_name: user_first_name,
                    last_name: user_last_name,
                }
            },
            binary_mode: false,
            description: process['description'],
            external_reference: user['uid'],
            installments: 1,
            metadata: null,
            payer: {
                entity_type: 'individual',
                type: 'customer',
                first_name: user_first_name,
                last_name: user_last_name,
                email: user_email,
                identification: {
                    type: 'CPF',
                    number: ''
                }
            },
            payment_method_id: 'pix',
            transaction_amount: price
        },
        requestOptions: { idempotencyKey: uuidv4() }
    });

    // Ensure we have the expected response structure
    if (!response || !response.id || !response.point_of_interaction?.transaction_data) {
        throw new Error('Invalid payment response from Mercado Pago');
    }

    const pixPayment = response.point_of_interaction.transaction_data;

    await savePayment(
        user['uid'],
        response.id,
        response.payer?.id ?? '',
        process['id'],
        response.status,
        process['price'],
        response.date_created,
        response.date_of_expiration,
    );

    const finalStatus = (response.status === "approved" || response.status === "authorized") ? "paid" : "failed";

    return {
        payment_id: response.id,
        qr_code: pixPayment.qr_code,
        mercado_percent: mercadoPercent,
        qr_code_base64: pixPayment.qr_code_base64,
        status: finalStatus,
    };
}

async function savePayment(
    user_id: string,
    payment_id: number | string,
    payer_id: string,
    process_id: string,
    status: string,
    amount: number,
    date_created: string,
    date_of_expiration: string
) {
    const createdAt = admin.firestore.Timestamp.fromDate(new Date(date_created));
    const expiredAt = admin.firestore.Timestamp.fromDate(new Date(date_of_expiration));

    const newPayment = {
        amount,
        status,
        user_id,
        payer_id,
        process_id,
        id: payment_id,
        paymentMethod: 'pix',
        createdAt: createdAt,
        updatedAt: createdAt,
        expiredAt: expiredAt
    };

    const paymentsRef = db.collection(collection).doc(user_id);
    const docSnapshot = await paymentsRef.get();

    if (!docSnapshot.exists) {
        await paymentsRef.set({ data: [newPayment] });
    } else {
        const paymentsList = docSnapshot.data()?.data ?? [];
        paymentsList.push(newPayment);
        await paymentsRef.update({ data: paymentsList });
    }
    return true;
}

async function cancelPayment(uid: string) {
    try {
        const searchRes: any = await payment.search({
            options: { status: 'pending', sort: 'date_created', criteria: 'desc' }
        });
        const results = searchRes?.results ?? [];
        results.forEach((data: any) => {
            if (data.external_reference && data.external_reference.includes(uid)) {
                console.warn(`Cancelling payment ${data.id} (status ${data.status})`);
                payment.cancel({ id: data.id }).catch(e =>
                    console.error(`Failed to cancel payment ${data.id}:`, e)
                );
            }
        });
    } catch (error) {
        console.error('Error cancelling previous payments:', error);
    }
}

async function refundPayment(uid: string) {
    try {
        const searchRes: any = await payment.search({
            options: { status: 'approved', sort: 'date_created', criteria: 'desc' }
        });
        const results = searchRes?.results ?? [];
        const refundClient = new PaymentRefund(client);
        for (const data of results) {
            if (data.external_reference && data.external_reference.includes(uid)) {
                try {
                    await refundClient.create({
                        payment_id: data.id,
                        body: { amount: 8 } // example amount; adjust as needed
                    });
                    console.warn(`Payment ${data.id} (status ${data.status}) refunded`);
                } catch (refundErr) {
                    console.error(`Failed to refund payment ${data.id}:`, refundErr);
                }
            }
        }
    } catch (error) {
        console.error('Error refunding previous payments:', error);
    }
}