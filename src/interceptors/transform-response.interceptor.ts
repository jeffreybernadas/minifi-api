import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  HttpStatus,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { Response } from 'express';

interface ApiResponse<T = unknown> {
  success: boolean;
  statusCode: number;
  path: string;
  timestamp: string;
  message?: string;
  data?: T;
  meta?: Record<string, unknown>;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

interface PaginatedData<T = unknown> {
  data: T[];
  meta: Record<string, unknown>;
}

@Injectable()
export class TransformResponseInterceptor implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse> {
    const response = context.switchToHttp().getResponse<Response>();
    const request = context.switchToHttp().getRequest<{ url: string }>();
    const statusCode: number = response.statusCode || HttpStatus.OK;
    const path: string = request.url;
    const timestamp: string = new Date().toISOString();

    return next.handle().pipe(
      map((data: unknown): ApiResponse => {
        // Handle null/undefined responses
        if (data === null || data === undefined) {
          return {
            success: true,
            statusCode,
            path,
            timestamp,
            data: null,
          } as ApiResponse;
        }

        // Check if data is already in our standard API response format
        if (this.isApiResponse(data)) {
          return data;
        }

        // Check if response is already paginated (has data and meta properties)
        if (this.isPaginatedResponse(data)) {
          return {
            success: true,
            statusCode,
            path,
            timestamp,
            data: data.data,
            meta: data.meta,
          } as ApiResponse;
        }

        // Handle array responses
        if (Array.isArray(data)) {
          return {
            success: true,
            statusCode,
            path,
            timestamp,
            data,
            meta: {
              count: data.length,
            },
          } as ApiResponse;
        }

        // Handle single object responses
        return {
          success: true,
          statusCode,
          path,
          timestamp,
          data,
        } as ApiResponse;
      }),
    );
  }

  private isApiResponse(response: unknown): response is ApiResponse {
    return (
      typeof response === 'object' &&
      response !== null &&
      'success' in response &&
      'statusCode' in response &&
      'path' in response &&
      'timestamp' in response &&
      typeof (response as ApiResponse).success === 'boolean' &&
      typeof (response as ApiResponse).statusCode === 'number' &&
      typeof (response as ApiResponse).path === 'string' &&
      typeof (response as ApiResponse).timestamp === 'string'
    );
  }

  private isPaginatedResponse(response: unknown): response is PaginatedData {
    return (
      typeof response === 'object' &&
      response !== null &&
      'data' in response &&
      'meta' in response &&
      Array.isArray((response as PaginatedData).data)
    );
  }
}
