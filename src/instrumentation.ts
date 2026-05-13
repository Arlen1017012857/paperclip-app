import * as Sentry from "@sentry/nextjs";

export async function register() {
  // Server-side Sentry init (replaces sentry.server.config.ts)
  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
      tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0,
    });
  }
}

export const onRequestError = Sentry.captureRequestError;
