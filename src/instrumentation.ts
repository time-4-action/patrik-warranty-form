import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { assertServerEnv } = await import("./lib/env");
    assertServerEnv();
    // Recipients now live in Mongo (warranty_settings collection), edited via
    // the admin dashboard. config/notifications.json is only a fallback seed,
    // so an empty list is no longer a boot-time error.
    await import("../sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
