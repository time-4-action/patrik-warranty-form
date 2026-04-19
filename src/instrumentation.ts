import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { assertServerEnv } = await import("./lib/env");
    assertServerEnv();
    const { assertNotificationsConfig } = await import("./lib/notifications-config");
    assertNotificationsConfig();
    await import("../sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
