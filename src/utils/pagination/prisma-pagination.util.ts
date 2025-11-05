import {
  CursorMetaDto,
  CursorPageOptionsDto,
  CursorPaginatedDto,
} from '@/common/dto/cursor-pagination';
import {
  OffsetPageMetaDto,
  OffsetPageOptionsDto,
  OffsetPaginatedDto,
} from '@/common/dto/offset-pagination';

/**
 * Paginate results using offset-based pagination with Prisma
 * @param model Prisma model delegate
 * @param pageOptionsDto Offset-based pagination options
 * @param options Additional query options (where, orderBy, select, include, etc.)
 * @returns Paginated results - OffsetPaginatedDto
 */
export async function offsetPaginateWithPrisma<
  T,
  TArgs extends Record<string, unknown>,
>(
  model: {
    findMany: (args?: TArgs) => Promise<T[]>;
    count: (args?: Pick<TArgs, 'where'>) => Promise<number>;
  },
  pageOptionsDto: OffsetPageOptionsDto,
  options: Omit<TArgs, 'skip' | 'take'> = {} as Omit<TArgs, 'skip' | 'take'>,
): Promise<OffsetPaginatedDto<T>> {
  // Build the query options with proper typing
  const queryOptions = {
    ...options,
    skip: pageOptionsDto.skip,
    take: pageOptionsDto.limit ?? 10,
  } as unknown as TArgs;

  // Execute queries in parallel
  const [data, total] = await Promise.all([
    model.findMany(queryOptions),
    model.count({
      where: (options as { where?: unknown }).where,
    } as Pick<TArgs, 'where'>),
  ]);

  const pageMetaDto = new OffsetPageMetaDto({
    itemCount: total,
    pageOptionsDto,
  });

  return new OffsetPaginatedDto(data, pageMetaDto);
}

/**
 * Paginate results using cursor-based pagination with Prisma
 * @param model Prisma model delegate
 * @param pageOptionsDto Cursor-based pagination options (afterCursor, beforeCursor, limit, order)
 * @param options Additional query options (where, orderBy, select, include, etc.)
 * @param cursorField Field to use for cursor (default: 'id')
 * @returns Paginated results - CursorPaginatedDto
 */
export async function cursorPaginateWithPrisma<
  T,
  TArgs extends Record<string, unknown>,
>(
  model: {
    findMany: (args?: TArgs) => Promise<T[]>;
  },
  pageOptionsDto: CursorPageOptionsDto,
  options: Omit<TArgs, 'skip' | 'take' | 'cursor'> = {} as Omit<
    TArgs,
    'skip' | 'take' | 'cursor'
  >,
  cursorField = 'id', // Field to use for cursor
): Promise<CursorPaginatedDto<T>> {
  const { limit, afterCursor, beforeCursor } = pageOptionsDto;
  const take = limit ?? 10;

  // Build the query options
  const queryOptions = {
    ...options,
    take: take + 1, // Take one extra to check if there's a next page
    orderBy:
      (options as { orderBy?: unknown }).orderBy ||
      ({ [cursorField]: pageOptionsDto.order ?? 'asc' } as unknown),
  } as unknown as TArgs;

  // Handle cursor positioning
  if (afterCursor) {
    (queryOptions as { cursor?: unknown }).cursor = {
      [cursorField]: afterCursor,
    };
    (queryOptions as { skip?: number }).skip = 1; // Skip the cursor item itself
  } else if (beforeCursor) {
    (queryOptions as { cursor?: unknown }).cursor = {
      [cursorField]: beforeCursor,
    };
    (queryOptions as { skip?: number }).skip = 1;
    // For "before" cursor, we need to reverse the order and then reverse results
    const orderByObj = (queryOptions as { orderBy?: Record<string, string> })
      .orderBy;
    if (orderByObj && orderByObj[cursorField] === 'asc') {
      orderByObj[cursorField] = 'desc';
    } else if (orderByObj && orderByObj[cursorField] === 'desc') {
      orderByObj[cursorField] = 'asc';
    }
  }

  const results = await model.findMany(queryOptions);

  // If we used beforeCursor, reverse the results back to original order
  if (beforeCursor) {
    results.reverse();
  }

  // Check if there are more items
  const hasNextPage = results.length > take;
  const hasPreviousPage = !!afterCursor || !!beforeCursor;

  // Remove the extra item if present
  if (hasNextPage) {
    results.pop();
  }

  // Generate cursors for next/previous pages
  let nextCursor: string | undefined;
  let previousCursor: string | undefined;

  if (results.length > 0) {
    if (hasNextPage) {
      nextCursor = (results[results.length - 1] as Record<string, unknown>)[
        cursorField
      ] as string;
    }
    if (hasPreviousPage || afterCursor) {
      previousCursor = (results[0] as Record<string, unknown>)[
        cursorField
      ] as string;
    }
  }

  const cursorMetaDto = new CursorMetaDto(
    take,
    nextCursor,
    previousCursor,
    hasNextPage,
    hasPreviousPage,
  );

  return new CursorPaginatedDto(results, cursorMetaDto);
}
