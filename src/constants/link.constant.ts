export const RESERVED_KEYWORDS = [
  'api',
  'v1',
  'links',
  'auth',
  'users',
  'admin',
  'health',
  'docs',
  'login',
  'signup',
  'register',
  'dashboard',
  'settings',
  'profile',
];

export const CUSTOM_ALIAS_MIN_LENGTH = 3;
export const CUSTOM_ALIAS_MAX_LENGTH = 30;
export const CUSTOM_ALIAS_REGEX = /^[a-zA-Z0-9-]+$/;

export const GUEST_LIMITS = {
  maxLinksPerDay: 5,
  retentionDays: 3,
  maxCustomAliases: 0,
  allowTags: false,
  allowQRCodes: false,
  allowPasswordProtection: false,
  allowScheduling: false,
  detailedAnalytics: false,
} as const;

export const FREE_LIMITS = {
  maxLinks: 25,
  retentionDays: 90, // 3 months
  maxCustomAliases: 0,
  allowTags: true,
  allowQRCodes: true,
  allowPasswordProtection: true,
  allowScheduling: true,
  detailedAnalytics: false,
} as const;

export const PRO_LIMITS = {
  maxLinks: -1, // Unlimited
  retentionDays: 730, // 2 years
  maxCustomAliases: -1, // Unlimited
  allowTags: true,
  allowQRCodes: true,
  allowPasswordProtection: true,
  allowScheduling: true,
  detailedAnalytics: true,
} as const;
