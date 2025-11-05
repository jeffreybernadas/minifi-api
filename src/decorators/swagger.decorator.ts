import { applyDecorators, Type, HttpStatus } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';
import { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import {
  OffsetPaginatedDto,
  OffsetPageMetaDto,
} from '@/common/dto/offset-pagination';
import {
  CursorPaginatedDto,
  CursorMetaDto,
} from '@/common/dto/cursor-pagination';

export const ApiPaginatedResponse = <TModel extends Type<any>>(
  model: TModel,
) => {
  return applyDecorators(
    ApiExtraModels(OffsetPaginatedDto, OffsetPageMetaDto, model),
    ApiResponse({
      status: 200,
      description: 'Successfully received offset paginated data',
      schema: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true,
          },
          statusCode: {
            type: 'number',
            example: 200,
          },
          path: {
            type: 'string',
            example: '/api/v1/users',
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            example: '2025-09-28T16:20:00.000Z',
          },
          data: {
            type: 'array',
            items: { $ref: getSchemaPath(model) },
          },
          meta: {
            $ref: getSchemaPath(OffsetPageMetaDto),
          },
        },
        required: [
          'success',
          'statusCode',
          'path',
          'timestamp',
          'data',
          'meta',
        ],
      },
    }),
  );
};

export const ApiCursorPaginatedResponse = <TModel extends Type<any>>(
  model: TModel,
) => {
  return applyDecorators(
    ApiExtraModels(CursorPaginatedDto, CursorMetaDto, model),
    ApiResponse({
      status: 200,
      description: 'Successfully received cursor paginated data',
      schema: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true,
          },
          statusCode: {
            type: 'number',
            example: 200,
          },
          path: {
            type: 'string',
            example: '/api/v1/users',
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            example: '2025-09-28T16:20:00.000Z',
          },
          data: {
            type: 'array',
            items: { $ref: getSchemaPath(model) },
          },
          meta: {
            $ref: getSchemaPath(CursorMetaDto),
          },
        },
        required: [
          'success',
          'statusCode',
          'path',
          'timestamp',
          'data',
          'meta',
        ],
      },
    }),
  );
};

interface StandardApiResponseOptions {
  status?: HttpStatus;
  description?: string;
  type?: Type<any>;
  schema?: SchemaObject;
  isArray?: boolean;
}

/**
 * Creates a standard API response decorator that wraps the data in the consistent format:
 * {
 *   success: boolean,
 *   statusCode: number,
 *   path: string,
 *   timestamp: string,
 *   data: T
 * }
 */
export function ApiStandardResponse(options: StandardApiResponseOptions = {}) {
  const {
    status = HttpStatus.OK,
    description = 'Success',
    type,
    schema,
    isArray = false,
  } = options;

  let dataSchema:
    | SchemaObject
    | { $ref: string }
    | { type: string; items?: any };

  if (schema) {
    // Use provided schema directly
    dataSchema = schema;
  } else if (type) {
    // Generate schema from type
    if (isArray) {
      dataSchema = {
        type: 'array',
        items: { $ref: getSchemaPath(type) },
      };
    } else {
      dataSchema = { $ref: getSchemaPath(type) };
    }
  } else {
    // Default to generic object
    dataSchema = { type: 'object' };
  }

  const responseSchema: SchemaObject = {
    type: 'object',
    properties: {
      success: {
        type: 'boolean',
        example: true,
      },
      statusCode: {
        type: 'number',
        example: status,
      },
      path: {
        type: 'string',
        example: '/api/v1/users',
      },
      timestamp: {
        type: 'string',
        format: 'date-time',
        example: '2025-09-28T16:20:00.000Z',
      },
      data: dataSchema,
    },
    required: ['success', 'statusCode', 'path', 'timestamp'],
  };

  const decorators = [
    ApiResponse({
      status,
      description,
      schema: responseSchema,
    }),
  ];

  // Register the type with Swagger if provided
  if (type) {
    decorators.unshift(ApiExtraModels(type));
  }

  return applyDecorators(...decorators);
}

/**
 * Creates a standard error response decorator
 */
export function ApiStandardErrorResponse(
  options: {
    status: HttpStatus;
    description?: string;
    errorCode?: string;
  } = { status: HttpStatus.INTERNAL_SERVER_ERROR },
) {
  const {
    status,
    description = 'Error',
    errorCode = 'GENERIC_ERROR',
  } = options;

  const errorSchema: SchemaObject = {
    type: 'object',
    properties: {
      success: {
        type: 'boolean',
        example: false,
      },
      statusCode: {
        type: 'number',
        example: status,
      },
      path: {
        type: 'string',
        example: '/api/v1/users',
      },
      timestamp: {
        type: 'string',
        format: 'date-time',
        example: '2025-09-28T16:20:00.000Z',
      },
      error: {
        type: 'object',
        properties: {
          code: {
            type: 'string',
            example: errorCode,
          },
          message: {
            oneOf: [
              { type: 'string' },
              { type: 'array', items: { type: 'string' } },
            ],
            example: 'Error message',
          },
        },
        required: ['code', 'message'],
      },
    },
    required: ['success', 'statusCode', 'path', 'timestamp', 'error'],
  };

  return applyDecorators(
    ApiResponse({
      status,
      description,
      schema: errorSchema,
    }),
  );
}
