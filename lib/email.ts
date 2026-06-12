const RESEND_API_KEY = process.env.RESEND_API_KEY ?? "";
const EMAIL_FROM = process.env.EMAIL_FROM ?? "ThamArt Bijoux <noreply@thamart.com.br>";

export interface EmailPayload {
    to: string | string[];
    subject: string;
    html: string;
}

export async function sendEmail(payload: EmailPayload): Promise<boolean> {
    if (!RESEND_API_KEY) {
        console.warn("RESEND_API_KEY not set — email skipped");
        return false;
    }

    const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            from: EMAIL_FROM,
            to: Array.isArray(payload.to) ? payload.to : [payload.to],
            subject: payload.subject,
            html: payload.html,
        }),
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error("Resend error:", err);
    }
    return res.ok;
}

export async function sendBulkEmail(
    recipients: string[],
    subject: string,
    html: string
): Promise<{ sent: number; failed: number }> {
    if (!RESEND_API_KEY) {
        console.warn("RESEND_API_KEY not set — bulk email skipped");
        return { sent: 0, failed: recipients.length };
    }

    const BATCH_SIZE = 50;
    let sent = 0;
    let failed = 0;

    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
        const batch = recipients.slice(i, i + BATCH_SIZE);
        const res = await fetch("https://api.resend.com/emails/batch", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${RESEND_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(
                batch.map((to) => ({ from: EMAIL_FROM, to: [to], subject, html }))
            ),
        });
        if (res.ok) {
            sent += batch.length;
        } else {
            const err = await res.json().catch(() => ({}));
            console.error("Resend batch error:", err);
            failed += batch.length;
        }
    }

    return { sent, failed };
}
