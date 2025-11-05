import { ApiProperty } from '@nestjs/swagger';

/**
 * Metadata for the cursor-based pagination
 * - limit - Number of items per page
 * - nextCursor - Cursor for next page (optional)
 * - previousCursor - Cursor for previous page (optional)
 * - hasNextPage - Whether there are more items after this page
 * - hasPreviousPage - Whether there are more items before this page
 */
export class CursorMetaDto {
  @ApiProperty({
    description: 'Number of items per page',
  })
  readonly limit: number;

  @ApiProperty({
    description: 'Cursor for next page',
    required: false,
  })
  readonly nextCursor?: string;

  @ApiProperty({
    description: 'Cursor for previous page',
    required: false,
  })
  readonly previousCursor?: string;

  @ApiProperty({
    description: 'Whether there are more items after this page',
  })
  readonly hasNextPage: boolean;

  @ApiProperty({
    description: 'Whether there are more items before this page',
  })
  readonly hasPreviousPage: boolean;

  constructor(
    limit: number,
    nextCursor?: string,
    previousCursor?: string,
    hasNextPage = false,
    hasPreviousPage = false,
  ) {
    this.limit = limit;
    this.nextCursor = nextCursor;
    this.previousCursor = previousCursor;
    this.hasNextPage = hasNextPage;
    this.hasPreviousPage = hasPreviousPage;
  }
}
