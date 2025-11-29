/**
 * RabbitMQ Queue Constants
 * Defines exchange names, queue names, and routing keys for message queues
 */

/**
 * Exchange names
 */
export const QUEUE_EXCHANGES = {
  EMAIL: 'email.exchange',
  CHAT: 'chat.exchange',
  SCAN: 'scan.exchange',
} as const;

/**
 * Queue names
 */
export const QUEUE_NAMES = {
  // Email queues
  EMAIL_SEND: 'email.send',

  // Chat queues
  CHAT_UNREAD_DIGEST: 'chat.unread.digest',

  // URL scan queues
  SCAN_URL: 'scan.url',
} as const;

/**
 * Routing keys for topic exchanges
 */
export const QUEUE_ROUTING_KEYS = {
  // Email routing keys
  EMAIL_SEND: 'email.send',

  // Chat routing keys
  CHAT_UNREAD_DIGEST: 'chat.unread.digest',

  // URL scan routing keys
  SCAN_URL: 'scan.url',
} as const;
