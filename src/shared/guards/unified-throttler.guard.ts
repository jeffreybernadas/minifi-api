import { Injectable } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerRequest } from '@nestjs/throttler';
import { Socket } from 'socket.io';

/**
 * Unified throttler guard that handles both HTTP and WebSocket contexts
 * Extends ThrottlerGuard to support rate limiting across both protocols
 * Uses the same Redis storage configured in ThrottlerModule
 */
@Injectable()
export class UnifiedThrottlerGuard extends ThrottlerGuard {
  /**
   * Override handleRequest to support both HTTP and WebSocket contexts
   */
  async handleRequest(requestProps: ThrottlerRequest): Promise<boolean> {
    const { context } = requestProps;

    // Detect context type
    if (context.getType() === 'ws') {
      return this.handleWebSocketRequest(requestProps);
    }

    // Use default HTTP handling from parent class
    return super.handleRequest(requestProps);
  }

  /**
   * Handle WebSocket-specific rate limiting
   */
  private async handleWebSocketRequest(
    requestProps: ThrottlerRequest,
  ): Promise<boolean> {
    const { context, limit, ttl, throttler, blockDuration, generateKey } =
      requestProps;

    // Get WebSocket client
    const client = context.switchToWs().getClient<Socket>();

    // Extract tracker (IP address) from WebSocket client
    const tracker = this.getTrackerFromSocket(client);

    // Get throttler name with fallback
    const throttlerName = throttler.name ?? 'default';

    // Generate rate limit key
    const key = generateKey(context, tracker, throttlerName) ?? 'default';

    // Check rate limit using storage service
    const { totalHits, timeToExpire, isBlocked, timeToBlockExpire } =
      await this.storageService.increment(
        key,
        ttl,
        limit,
        blockDuration,
        throttlerName,
      );

    // Throw error if rate limit exceeded
    if (isBlocked) {
      await this.throwThrottlingException(context, {
        limit,
        ttl,
        key,
        tracker,
        totalHits,
        timeToExpire,
        isBlocked,
        timeToBlockExpire,
      });
    }

    return true;
  }

  /**
   * Extract IP address from WebSocket client
   */
  private getTrackerFromSocket(client: Socket): string {
    // Try to get IP from handshake
    const address =
      client.handshake?.address || client.conn?.remoteAddress || 'unknown';

    return address;
  }
}
