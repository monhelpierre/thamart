import { cache } from "react";
import { adminDb } from "@/lib/firebaseAdmin";
import { DEFAULT_CONFIG, type SiteConfig } from "@/lib/siteConfigShared";

export const getSiteConfigServer = cache(async function (): Promise<SiteConfig> {
  try {
    if (!adminDb) return DEFAULT_CONFIG;
    const doc = await adminDb.collection("settings").doc("site").get();
    if (!doc.exists) return DEFAULT_CONFIG;
    const data = doc.data() ?? {};
    // If Firestore has no real favicon URL, fall back to DEFAULT_CONFIG's value
    if (!data.faviconUrl) delete data.faviconUrl;
    return { ...DEFAULT_CONFIG, ...data } as SiteConfig;
  } catch {
    return DEFAULT_CONFIG;
  }
});
