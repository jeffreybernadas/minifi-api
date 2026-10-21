import type { Payload } from 'elastic-apm-node';

// Libraries that only carry logs to Elasticsearch. The app's own fetch calls use
// Node's built-in undici (node:internal/...), not the npm package
const LOG_SHIPPING_FRAME =
  /node_modules\/(@elastic\/transport|undici|winston-elasticsearch)\//;

interface StackFrame {
  abs_path?: string;
  filename?: string;
}

/**
 * APM error filter. Failed log uploads are already printed by the logger's
 * transport; sent to APM as well, one 3-minute Elasticsearch outage became
 * thousands of app errors.
 */
export function dropLogShippingErrors(payload: Payload): Payload | false {
  const frames: StackFrame[] = payload.exception?.stacktrace ?? [];
  const fromLogShipping = frames.some((frame) =>
    LOG_SHIPPING_FRAME.test(frame.abs_path ?? frame.filename ?? ''),
  );
  return fromLogShipping ? false : payload;
}
