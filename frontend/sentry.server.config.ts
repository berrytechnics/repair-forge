import * as Sentry from "@sentry/nextjs";

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || "development",
    sendDefaultPii: true,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    // HTTP tracing is automatically enabled in @sentry/nextjs v10
    // No need to manually add integrations
  });
}
