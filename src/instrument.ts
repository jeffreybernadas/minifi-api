import { config } from 'dotenv';
import * as Sentry from '@sentry/nestjs';
import * as apm from 'elastic-apm-node';
import { getConfig } from '@/config/sentry/sentry.config';
import { dropLogShippingErrors } from '@/utils/apm/log-shipping-filter.util';

// Load environment variables before initializing Sentry
config();

// Sentry reports errors only. Elastic APM does the tracing, and Sentry's
// profiler kept hundreds of MB alive with no traffic at all
Sentry.init({
  dsn: getConfig().dsn,
});

/**
 * APM starts here, before Nest loads http and express. Started later (it used
 * to start in a provider's onModuleInit) it never saw a single request.
 */
if (!process.env.ELASTIC_APM_SERVER_URL) {
  console.info('APM disabled (ELASTIC_APM_SERVER_URL not set)');
} else if (process.env.ELASTIC_APM_ENABLE === '0') {
  console.info('APM disabled (ELASTIC_APM_ENABLE=0)');
} else {
  try {
    apm.start({
      serviceName: process.env.APP_NAME,
      serverUrl: process.env.ELASTIC_APM_SERVER_URL,
      secretToken: process.env.ELASTIC_APM_SECRET_TOKEN,
      environment:
        (process.env.NODE_ENV ?? 'development') === 'development'
          ? 'development'
          : 'production',
      active: true,
      captureBody: 'all',
      errorOnAbortedRequests: true,
      verifyServerCert: false,
      serviceVersion: '1.0.0',
      captureErrorLogStackTraces: 'always',
    });
    apm.addErrorFilter(dropLogShippingErrors);
    console.info(`APM agent started for service: ${process.env.APP_NAME}`);
  } catch (error) {
    console.error(`Failed to start APM agent: ${error}`);
  }
}
