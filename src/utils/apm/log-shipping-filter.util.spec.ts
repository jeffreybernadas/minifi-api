import { dropLogShippingErrors } from '@/utils/apm/log-shipping-filter.util';

// Frame paths as APM reported them for the 2026-10-18 Elasticsearch outage
function errorFrom(...paths: string[]) {
  return {
    exception: {
      message: 'test',
      stacktrace: paths.map((p) => ({ abs_path: `/app/${p}`, filename: p })),
    },
  };
}

describe('dropLogShippingErrors', () => {
  it.each([
    [
      'undici headers timeout',
      'node_modules/.pnpm/undici@6.23.0/node_modules/undici/lib/dispatcher/client-h1.js',
    ],
    [
      'elastic transport response error',
      'node_modules/.pnpm/@elastic+transport@8.10.1/node_modules/@elastic/transport/lib/Transport.js',
    ],
    [
      'winston transport',
      'node_modules/.pnpm/winston-elasticsearch@0.19.0/node_modules/winston-elasticsearch/bulk_writer.js',
    ],
  ])('drops %s', (_name, path) => {
    expect(dropLogShippingErrors(errorFrom('dist/main.js', path))).toBe(false);
  });

  it('keeps app errors, including built-in fetch failures', () => {
    const payload = errorFrom(
      'node:internal/deps/undici/undici',
      'dist/shared/http/outbound-http.service.js',
    );
    expect(dropLogShippingErrors(payload)).toBe(payload);
  });

  it('keeps errors without a stack trace', () => {
    const payload = { log: { message: 'logged error' } };
    expect(dropLogShippingErrors(payload)).toBe(payload);
  });

  it('falls back to filename when abs_path is missing', () => {
    const payload = {
      exception: {
        stacktrace: [{ filename: 'node_modules/undici/lib/core/request.js' }],
      },
    };
    expect(dropLogShippingErrors(payload)).toBe(false);
  });
});
