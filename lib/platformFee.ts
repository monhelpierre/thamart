// Server-side only — never import this in client components

export const PLATFORM_FEE_PERCENT = parseFloat(process.env.PLATFORM_FEE_PERCENT ?? "0");

/** Returns the fee amount (in BRL) rounded to 2 decimal places. */
export function calcPlatformFee(subtotal: number): number {
    if (PLATFORM_FEE_PERCENT <= 0) return 0;
    return Math.round(subtotal * PLATFORM_FEE_PERCENT * 100) / 100;
}

/**
 * Transfers the platform fee to the developer's Mercado Pago account.
 * Requires PLATFORM_MP_USER_ID env var (developer's numeric MP user ID).
 * Returns true on success, false if unconfigured or failed (non-blocking).
 */
export async function transferPlatformFee(amountBRL: number): Promise<boolean> {
    const receiverId = process.env.PLATFORM_MP_USER_ID;
    const accessToken = process.env.MERCADO_ACCESS_TOKEN;

    if (!receiverId || !accessToken || amountBRL <= 0) return false;

    try {
        const res = await fetch("https://api.mercadopago.com/v1/transfers", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
                "X-Idempotency-Key": `platform-fee-${Date.now()}`,
            },
            body: JSON.stringify({
                amount: amountBRL,
                currency_id: "BRL",
                receiver: { id: receiverId },
            }),
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            console.error("Platform fee transfer failed:", JSON.stringify(err));
            return false;
        }

        const data = await res.json();
        console.info(`Platform fee transferred: R$${amountBRL} → MP user ${receiverId} (transfer_id: ${data.id})`);
        return true;
    } catch (e) {
        console.error("Platform fee transfer error:", e);
        return false;
    }
}
