import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance monitoring
  tracesSampleRate: 0.1, // 10% of transactions for performance

  // Session replay for debugging
  replaysSessionSampleRate: 0.1, // 10% of sessions
  replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

  // Only enable in production
  enabled: process.env.NODE_ENV === 'production',

  // Environment
  environment: process.env.NODE_ENV,

  // Ignore common non-errors
  ignoreErrors: [
    // Browser extensions
    'ResizeObserver loop limit exceeded',
    'ResizeObserver loop completed with undelivered notifications',
    // Network errors
    'Network request failed',
    'Failed to fetch',
    'Load failed',
    // User cancelled
    'AbortError',
  ],

  // Don't send PII
  beforeSend(event) {
    // Remove user email from error reports
    if (event.user) {
      delete event.user.email;
    }
    return event;
  },
});
