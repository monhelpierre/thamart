import { NextResponse } from "next/server";
import { adminDb, withAuth } from "@/lib/firebaseAdmin";

const CREATOR_FIELDS = [
  "creatorName",
  "creatorLogoUrl",
  "creatorFacebook",
  "creatorWhatsapp",
  "creatorInstagram",
];

export async function GET() {
  if (!adminDb) return NextResponse.json({});
  try {
    const doc = await adminDb.collection("settings").doc("site").get();
    return NextResponse.json(doc.exists ? doc.data() : {});
  } catch {
    return NextResponse.json({});
  }
}

export const POST = withAuth(async (req, decodedToken) => {
  if (!adminDb)
    return NextResponse.json(
      { error: "admin-not-configured" },
      { status: 500 },
    );

  const data = await req.json();

  // Only the ADMIN_EMAIL user may write creator branding fields
  const isCreatorEmail =
    !!process.env.ADMIN_EMAIL && decodedToken.email === process.env.ADMIN_EMAIL;
  if (!isCreatorEmail) {
    for (const field of CREATOR_FIELDS) delete data[field];
  }

  await adminDb.collection("settings").doc("site").set(data, { merge: true });
  return NextResponse.json({ ok: true });
});
