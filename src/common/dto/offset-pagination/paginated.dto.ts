import { ApiProperty } from '@nestjs/swagger';
import { IsArray } from 'class-validator';
import { OffsetPageMetaDto } from './page-meta.dto';

/**
 * Paginated response for offset-based pagination
 * - data - Array of items
 * - meta - Metadata for pagination
 */
export class OffsetPaginatedDto<T> {
  @IsArray()
  @ApiProperty({ isArray: true })
  readonly data: T[];

  @ApiProperty({ type: () => OffsetPageMetaDto })
  readonly meta: OffsetPageMetaDto;

  constructor(data: T[], meta: OffsetPageMetaDto) {
    this.data = data;
    this.meta = meta;
  }
}
