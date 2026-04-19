import { issueSessionToken, verifyTurnstileToken } from "@/lib/turnstile";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { turnstileToken } = (await request.json()) as {
      turnstileToken?: string;
    };

    if (!turnstileToken) {
      return Response.json({ error: "Missing turnstile token" }, { status: 400 });
    }

    const remoteIp =
      request.headers.get("cf-connecting-ip") ??
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      undefined;

    const result = await verifyTurnstileToken(turnstileToken, remoteIp);
    if (!result.ok) {
      console.warn("turnstile verify failed", { errorCodes: result.errorCodes });
      return Response.json({ error: "Bot check failed" }, { status: 400 });
    }

    const { token, expiresAt } = issueSessionToken();
    return Response.json({ sessionToken: token, expiresAt });
  } catch (err) {
    console.error("turnstile-session failed", err);
    return Response.json({ error: "Bot check failed" }, { status: 500 });
  }
}
