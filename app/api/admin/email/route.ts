import { NextResponse } from "next/server";
import { adminDb, withAuth } from "@/lib/firebaseAdmin";
import { sendBulkEmail } from "@/lib/email";

export const POST = withAuth(async (req, decodedToken) => {
  const { uids, subject, html } = await req.json();
  decodedToken;

  if (!subject || typeof subject !== "string" || subject.trim().length === 0) {
    return NextResponse.json({ error: "subject required" }, { status: 400 });
  }
  if (!html || typeof html !== "string" || html.trim().length === 0) {
    return NextResponse.json({ error: "html body required" }, { status: 400 });
  }

  let emails: string[] = [];

  if (Array.isArray(uids) && uids.length > 0) {
    if (!adminDb)
      return NextResponse.json(
        { error: "admin-not-configured" },
        { status: 500 },
      );

    const docs = await Promise.all(
      (uids as string[]).map((uid) =>
        adminDb!.collection("users").doc(uid).get(),
      ),
    );
    emails = docs
      .filter((d) => d.exists)
      .map((d) => d.data()?.email as string)
      .filter(Boolean);
  } else {
    if (!adminDb)
      return NextResponse.json(
        { error: "admin-not-configured" },
        { status: 500 },
      );

    const snap = await adminDb.collection("users").get();
    emails = snap.docs
      .map((d) => d.data()?.email as string)
      .filter(Boolean)
      .filter(
        (e) => !snap.docs.find((d) => d.data().email === e && d.data().blocked),
      );
  }

  if (emails.length === 0) {
    return NextResponse.json({ error: "no recipients found" }, { status: 400 });
  }

  const { sent, failed } = await sendBulkEmail(emails, subject, html);
  return NextResponse.json({ ok: true, sent, failed, total: emails.length });
});
