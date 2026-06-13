import { withAuth, serviceAccount } from "@/lib/firebaseAdmin";
import { GoogleAuth } from "google-auth-library";

const ALLOWED_ROLES = new Set(["roles/owner", "roles/editor"]);

async function canAccessProject(email: string): Promise<boolean> {
  try {
    const { project_id: projectId, client_email, private_key } = serviceAccount;
    if (!projectId || !email) {
      console.error("[is-creator] Missing projectId or email");
      return false;
    }

    const auth = new GoogleAuth({
      credentials: { client_email, private_key },
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });

    const client = await auth.getClient();
    const { token: accessToken } = await client.getAccessToken();

    if (!accessToken) {
      console.error("[is-creator] Failed to obtain access token from service account");
      return false;
    }

    const res = await fetch(
      `https://cloudresourcemanager.googleapis.com/v1/projects/${projectId}:getIamPolicy`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      },
    );

    if (!res.ok) {
      const body = await res.text();
      console.error(`[is-creator] IAM policy request failed — ${res.status} ${res.statusText}: ${body}`);
      return false;
    }

    const payload = await res.json();
    const member = `user:${email}`;

    const found = Array.isArray(payload?.bindings)
      ? payload.bindings.some(
          (b: { role: string; members: string[] }) =>
            ALLOWED_ROLES.has(b?.role) &&
            Array.isArray(b?.members) &&
            b.members.includes(member),
        )
      : false;

    if (!found) {
      console.info(`[is-creator] ${email} not found in roles ${[...ALLOWED_ROLES].join(", ")}`);
    }
    return found;
  } catch (err) {
    console.error("[is-creator] Unexpected error:", err);
    return false;
  }
}

export const GET = withAuth(async (_req, token) => {
  // Fast path: CREATOR_UIDS env var bypasses IAM API (useful until service account has securityReviewer role)
  if (process.env.CREATOR_UIDS && token.uid) {
    const allowed = process.env.CREATOR_UIDS.split(",").map((s) => s.trim()).filter(Boolean);
    if (allowed.includes(token.uid)) return Response.json({ isCreator: true });
  }
  const isCreator = token.email ? await canAccessProject(token.email) : false;
  return Response.json({ isCreator });
});
