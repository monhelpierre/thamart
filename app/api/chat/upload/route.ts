import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { auth } from "@/lib/firebaseAdmin";

// Any authenticated user (not just admins) can upload chat images
export async function POST(req: Request) {
    const idToken = req.headers.get("Authorization")?.split("Bearer ")[1];
    if (!idToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    try { await auth.verifyIdToken(idToken); } catch {
        return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !apiSecret) {
        return NextResponse.json({ error: "Cloudinary not configured" }, { status: 500 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "no file provided" }, { status: 400 });

    const timestamp = Math.floor(Date.now() / 1000);
    const folder = "thamart/chat";
    const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
    const signature = createHash("sha1").update(paramsToSign + apiSecret).digest("hex");

    const upload = new FormData();
    upload.append("file", file);
    upload.append("api_key", apiKey);
    upload.append("timestamp", String(timestamp));
    upload.append("folder", folder);
    upload.append("signature", signature);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: upload,
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return NextResponse.json({ error: "upload failed", detail: err }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json({ url: data.secure_url });
}
