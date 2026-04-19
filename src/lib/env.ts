const REQUIRED_SERVER_VARS = [
  "S3_ENDPOINT",
  "S3_REGION",
  "S3_BUCKET",
  "S3_PUBLIC_BASE",
  "S3_ACCESS_KEY_ID",
  "S3_SECRET_ACCESS_KEY",
  "MONGODB_URI",
  "GOOGLE_SA_CLIENT_EMAIL",
  "GOOGLE_SA_PRIVATE_KEY",
  "GOOGLE_SHEET_ID",
  "GOOGLE_SHEET_TAB",
  "BASE_URL",
  "TURNSTILE_SECRET_KEY",
  "TURNSTILE_SESSION_SECRET",
] as const;

const REQUIRED_PUBLIC_VARS = [
  "NEXT_PUBLIC_MAPBOX_API_KEY",
  "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
] as const;

export function assertServerEnv(): void {
  const missing = REQUIRED_SERVER_VARS.filter((name) => !process.env[name]);
  const missingPublic = REQUIRED_PUBLIC_VARS.filter((name) => !process.env[name]);
  const all = [...missing, ...missingPublic];
  if (all.length > 0) {
    throw new Error(
      `Missing required env vars: ${all.join(", ")}. ` +
        `Copy .env.local.example to .env.local and fill them in.`,
    );
  }
}
