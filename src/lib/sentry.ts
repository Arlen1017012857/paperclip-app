/**
 * Sentry helper utilities.
 *
 * These are safe to call even when Sentry is not configured —
 * they no-op if `SENTRY_DSN` is not set.
 */

export function sentryEnabled(): boolean {
  return !!process.env.SENTRY_DSN;
}

/**
 * Wrap a server action or API handler with Sentry error tracking.
 */
export function withSentry<T extends (...args: unknown[]) => unknown>(fn: T): T {
  if (!sentryEnabled()) return fn;

  const { withServerActionInstrumentation } = require("@sentry/nextjs");
  return withServerActionInstrumentation("app", fn);
}
