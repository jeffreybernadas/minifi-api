import { config } from 'dotenv';
import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { getConfig } from '@/config/sentry/sentry.config';

// Load environment variables before initializing Sentry
config();

// Ensure to call this before requiring any other modules!
Sentry.init({
  dsn: getConfig().dsn,

  integrations: [
    // Add our Profiling integration
    nodeProfilingIntegration(),
  ],

  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for tracing.
  // We recommend adjusting this value in production
  // Learn more at
  // https://docs.sentry.io/platforms/javascript/guides/nestjs/configuration/options/#tracesSampleRate
  tracesSampleRate: 1.0,

  // Set profilesSampleRate to 1.0 to profile 100%
  // of sampled transactions.
  // This is relative to tracesSampleRate
  // Learn more at
  // https://docs.sentry.io/platforms/javascript/guides/nestjs/configuration/options/#profilesSampleRate
  profilesSampleRate: 1.0,
});
