import * as Sentry from "@sentry/nextjs";

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV || "development",
    sendDefaultPii: true,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    // Browser tracing and replay are automatically enabled in @sentry/nextjs v10
    // Replay configuration
    replaysSessionSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    replaysOnErrorSampleRate: 1.0,
  });
}

