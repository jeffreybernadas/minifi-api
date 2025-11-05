import { ModuleMetadata } from '@nestjs/common';

/**
 * WebSocket module configuration options
 */
export interface WebSocketOptions {
  port: number;
  path?: string;
  cors?: {
    origin: string | string[];
    credentials?: boolean;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
    username?: string;
  };
  pingTimeout?: number;
  pingInterval?: number;
  maxHttpBufferSize?: number;
  transports?: string[];
}

/**
 * Async configuration options for WebSocket module
 */
export interface WebSocketOptionsAsync extends Pick<ModuleMetadata, 'imports'> {
  name?: string;
  // Using any here as required by NestJS module pattern for dynamic factory functions
  useFactory: (...args: any[]) => WebSocketOptions | Promise<WebSocketOptions>;
  inject?: any[];
}

/**
 * Standardized WebSocket response format matching REST API response structure
 */
export interface WebSocketResponse<T = unknown> {
  success: boolean;
  statusCode: number;
  timestamp: string;
  data?: T;
  meta?: Record<string, unknown>;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * WebSocket error response format
 */
export interface WebSocketErrorResponse {
  success: false;
  statusCode: number;
  timestamp: string;
  error: {
    code: string;
    message: string;
  };
}

/**
 * WebSocket success response format
 */
export interface WebSocketSuccessResponse<T = unknown> {
  success: true;
  statusCode: number;
  timestamp: string;
  data: T;
  meta?: Record<string, unknown>;
}

/**
 * Client authentication payload
 */
export interface ClientAuthPayload {
  userId?: string;
  token?: string;
  sessionId?: string;
}
