/**
 * Masks IP addresses for privacy compliance (GDPR)
 * Replaces last octet of IPv4 or last segments of IPv6 with 'xxx'
 *
 * @param ip - IP address to mask
 * @returns Masked IP address or undefined if input is invalid
 * @example
 * maskIpAddress('192.168.1.100') // => '192.168.xxx.xxx'
 * maskIpAddress('2001:0db8:85a3:0000:0000:8a2e:0370:7334') // => '2001:0db8:xxx:xxx'
 */
export function maskIpAddress(
  ip: string | null | undefined,
): string | undefined {
  if (!ip) {
    return undefined;
  }

  // IPv4: 192.168.1.100 -> 192.168.xxx.xxx
  const ipv4Regex = /^(\d{1,3}\.\d{1,3})\.\d{1,3}\.\d{1,3}$/;
  if (ipv4Regex.test(ip)) {
    return ip.replace(/\.\d{1,3}\.\d{1,3}$/, '.xxx.xxx');
  }

  // IPv6: 2001:0db8:85a3:0000:0000:8a2e:0370:7334 -> 2001:0db8:xxx:xxx
  if (ip.includes(':')) {
    const match = ip.match(/^([0-9a-fA-F]{1,4}:[0-9a-fA-F]{1,4})/);
    if (match) {
      return `${match[1]}:xxx:xxx`;
    }
  }

  // If format doesn't match, return undefined (invalid IP)
  return undefined;
}
