import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import {
  Request as ExpressRequest,
  Response as ExpressResponse,
} from 'express';
import { Socket } from 'socket.io';
import { CustomErrorException } from '@/filters/exceptions/custom-error.exception';
import { CustomWsErrorException } from '@/filters/exceptions/websocket-error.exception';
import { Prisma } from '@/generated/prisma';
import { WebSocketErrorResponse } from '@/common/interfaces/websocket.interface';
import { SentryExceptionCaptured } from '@sentry/nestjs';

@Catch()
export class ExceptionsFilter<T> implements ExceptionFilter {
  @SentryExceptionCaptured()
  catch(exception: T, host: ArgumentsHost): void {
    const contextType = host.getType<'http' | 'ws'>();

    // Parse exception to get error details
    const { statusCode, message, customCode } = this.parseException(exception);

    // Handle based on context type
    if (contextType === 'ws') {
      this.handleWebSocketError(host, statusCode, message, customCode);
    } else {
      this.handleHttpError(host, statusCode, message, customCode);
    }
  }

  /**
   * Parse exception to extract error details
   */
  private parseException(exception: T): {
    statusCode: number;
    message: string;
    customCode: string;
  } {
    let statusCode: number;
    let message: string;
    let customCode: string;

    // Handle WebSocket-specific exceptions first
    if (exception instanceof CustomWsErrorException) {
      const wsException = exception as CustomWsErrorException;
      statusCode = wsException.getStatusCode();
      message = wsException.message;
      customCode = wsException.getCustomCode();
    }
    // Handle NestJS WsException
    else if (exception instanceof WsException) {
      const wsException = exception as WsException;
      const error = wsException.getError();
      statusCode = 400; // Default WebSocket error status
      message = typeof error === 'string' ? error : 'WebSocket error';
      customCode = 'WS_ERROR';
    }
    // Handle Prisma Known Request Errors
    else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const prismaError = exception as Prisma.PrismaClientKnownRequestError;
      switch (prismaError.code) {
        case 'P2002': // Unique constraint violation
          statusCode = 409;
          message = `Unique constraint failed on field(s): ${prismaError.meta?.target}`;
          customCode = 'UNIQUE_CONSTRAINT_VIOLATION';
          break;
        case 'P2025': // Record not found
          statusCode = 404;
          message = `Record not found`;
          customCode = 'RECORD_NOT_FOUND';
          break;
        default:
          statusCode = 400;
          message = `Database error: ${prismaError.message}`;
          customCode = 'PRISMA_ERROR';
      }
    }
    // Handle CustomErrorException specifically
    else if (exception instanceof CustomErrorException) {
      const customException = exception as CustomErrorException;
      statusCode = customException.getStatus();
      message = customException.message;
      customCode = customException.getCustomCode();
    } else if (exception instanceof HttpException) {
      // Handle other HttpExceptions
      const httpException = exception as HttpException;
      statusCode = httpException.getStatus();
      const exceptionResponse = httpException.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        customCode = 'GENERIC_ERROR';
      } else if (exceptionResponse && typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as Record<string, unknown>;
        message = (responseObj.message as string) || 'An error occurred';
        customCode = (responseObj.customCode as string) || 'GENERIC_ERROR';
      } else {
        message = 'An error occurred';
        customCode = 'GENERIC_ERROR';
      }
    } else {
      // Handle non-HTTP exceptions
      statusCode = 500;
      message = (exception as HttpException).message ?? 'Internal server error';
      customCode = 'GENERIC_ERROR';
    }

    return { statusCode, message, customCode };
  }

  /**
   * Handle HTTP error response
   */
  private handleHttpError(
    host: ArgumentsHost,
    statusCode: number,
    message: string,
    customCode: string,
  ): void {
    const request = host.switchToHttp().getRequest<ExpressRequest>();
    const response = host.switchToHttp().getResponse<ExpressResponse>();

    response.status(statusCode).json({
      success: false,
      statusCode,
      path: request.url,
      timestamp: new Date().toISOString(),
      error: {
        code: customCode,
        message,
      },
    });
  }

  /**
   * Handle WebSocket error response
   */
  private handleWebSocketError(
    host: ArgumentsHost,
    statusCode: number,
    message: string,
    customCode: string,
  ): void {
    const client = host.switchToWs().getClient<Socket>();

    const errorResponse: WebSocketErrorResponse = {
      success: false,
      statusCode,
      timestamp: new Date().toISOString(),
      error: {
        code: customCode,
        message,
      },
    };

    // Emit error to the specific client
    client.emit('error', errorResponse);
  }
}
