import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { assertServerEnv } = await import("./lib/env");
    assertServerEnv();
    // Recipients live in Postgres (warranty_settings), edited via the admin
    // dashboard. config/notifications.json is only a fallback seed, so an
    // empty list is not a boot-time error.
    await import("../sentry.server.config");
    // Schema first: a failed migration stops the server (CI then rolls back).
    const { migrate } = await import("./lib/db");
    await migrate();
    // Local only (set SEED_MOCK_DATA=true yourself); no-op unless the
    // warranty table is empty. A failed seed must not stop the server.
    if (process.env.SEED_MOCK_DATA === "true") {
      const { seedMockDataIfEmpty } = await import("./lib/dev-seed");
      await seedMockDataIfEmpty().catch((err) =>
        console.error("[dev-seed] failed", err),
      );
    }
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
