import { createHash } from 'crypto';

/**
 * Generates a unique visitor ID by hashing IP address + User Agent
 * Used for tracking unique visitors while preserving privacy
 *
 * @param ip - Visitor IP address
 * @param userAgent - Browser user agent string
 * @returns SHA-256 hash of combined IP + UA (64 characters)
 */
export function generateVisitorId(
  ip: string | undefined,
  userAgent: string | undefined,
): string {
  const combined = `${ip || 'unknown'}|${userAgent || 'unknown'}`;
  return createHash('sha256').update(combined).digest('hex');
}

/**
 * Extracts domain from a referrer URL
 *
 * @param referrer - Full referrer URL
 * @returns Domain name or null if invalid
 * @example
 * extractReferrerDomain('https://google.com/search?q=test') // => 'google.com'
 */
export function extractReferrerDomain(
  referrer: string | undefined,
): string | null {
  if (!referrer) return null;

  try {
    const url = new URL(referrer);
    return url.hostname;
  } catch {
    return null;
  }
}
