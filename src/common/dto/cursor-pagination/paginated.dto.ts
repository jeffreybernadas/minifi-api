import { ApiProperty } from '@nestjs/swagger';
import { IsArray } from 'class-validator';
import { CursorMetaDto } from './page-meta.dto';

/**
 * Paginated response for cursor-based pagination
 * - data - Array of items
 * - meta - Metadata for pagination
 */
export class CursorPaginatedDto<T> {
  @IsArray()
  @ApiProperty({ isArray: true })
  readonly data: T[];

  @ApiProperty({ type: () => CursorMetaDto })
  readonly meta: CursorMetaDto;

  constructor(data: T[], meta: CursorMetaDto) {
    this.data = data;
    this.meta = meta;
  }
}
