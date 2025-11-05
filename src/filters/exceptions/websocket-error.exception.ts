import { CustomErrorCode } from '@/enums/custom-error-enum';
import { WsException } from '@nestjs/websockets';

/**
 * Custom WebSocket exception with status code and custom error code
 * Extends WsException from @nestjs/websockets
 */
export class CustomWsErrorException extends WsException {
  private readonly statusCode: number;
  private readonly customCode: CustomErrorCode;

  constructor(
    message: string,
    statusCode: number,
    customCode: CustomErrorCode,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.customCode = customCode;
  }

  getStatusCode(): number {
    return this.statusCode;
  }

  getCustomCode(): string {
    return this.customCode;
  }
}
