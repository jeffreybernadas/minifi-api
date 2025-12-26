/**
 * WebSocket module configuration token
 */
export const WEBSOCKET_CONFIGURATION_OPTIONS = 'WEBSOCKET_CONFIGURATION';

/**
 * System event names for WebSocket communication
 */
export const WEBSOCKET_EVENTS = {
  // Connection events
  CONNECTION: 'connection',
  CONNECTED: 'connected',
  DISCONNECT: 'disconnect',
  DISCONNECTING: 'disconnecting',
  ERROR: 'error',

  // System events
  PING: 'ping',
  PONG: 'pong',

  // Authentication events
  AUTHENTICATE: 'authenticate',
  AUTHENTICATED: 'authenticated',
  UNAUTHORIZED: 'unauthorized',

  // Room events
  JOIN_ROOM: 'join-room',
  JOINED_ROOM: 'joined-room',
  LEAVE_ROOM: 'leave-room',
  LEFT_ROOM: 'left-room',

  // User events
  GET_ONLINE_USERS: 'get-online-users',
  ONLINE_USERS: 'online-users',

  // Chat message events
  NEW_MESSAGE: 'chat:new-message',
  MESSAGE_UPDATED: 'chat:message-updated',
  MESSAGE_DELETED: 'chat:message-deleted',

  // Chat typing indicators
  USER_TYPING: 'chat:user-typing',
  USER_STOPPED_TYPING: 'chat:user-stopped-typing',

  // Chat read receipts
  MESSAGE_READ: 'chat:message-read',
  MESSAGES_READ: 'chat:messages-read',

  // Chat unread notifications (sent to user's personal room)
  UNREAD_INCREMENT: 'chat:unread-increment',

  // Chat member events
  USER_JOINED_CHAT: 'chat:user-joined',

  // Global presence (user-level online status)
  GET_PRESENCE: 'get-presence',
  PRESENCE_STATUS: 'presence-status',
  PRESENCE_USER_ONLINE: 'presence:user-online',
  PRESENCE_USER_OFFLINE: 'presence:user-offline',
  PRESENCE_ADMIN_ONLINE: 'presence:admin-online',
  PRESENCE_ADMIN_OFFLINE: 'presence:admin-offline',
} as const;

/**
 * WebSocket namespaces
 */
export const WEBSOCKET_NAMESPACES = {
  DEFAULT: '/',
  CHAT: '/chat',
  NOTIFICATIONS: '/notifications',
} as const;
