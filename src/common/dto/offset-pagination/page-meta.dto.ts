import { ApiProperty } from '@nestjs/swagger';
import { OffsetPageOptionsDto } from './page-options.dto';

export interface OffsetPageMetaDtoParameters {
  pageOptionsDto: OffsetPageOptionsDto;
  itemCount: number;
}

/**
 * Metadata for the offset-based pagination
 * - page - Current page number
 * - limit - Number of items per page
 * - itemCount - Total number of items in the database
 * - pageCount - Total number of pages
 * - hasPreviousPage - Whether there is a previous page
 * - hasNextPage - Whether there is a next page
 */
export class OffsetPageMetaDto {
  @ApiProperty({
    description: 'Current page number',
  })
  readonly page: number;

  @ApiProperty({
    description: 'Number of items per page',
  })
  readonly limit: number;

  @ApiProperty({
    description: 'Total number of items',
  })
  readonly itemCount: number;

  @ApiProperty({
    description: 'Total number of pages',
  })
  readonly pageCount: number;

  @ApiProperty({
    description: 'Whether there is a previous page',
  })
  readonly hasPreviousPage: boolean;

  @ApiProperty({
    description: 'Whether there is a next page',
  })
  readonly hasNextPage: boolean;

  constructor({ pageOptionsDto, itemCount }: OffsetPageMetaDtoParameters) {
    this.page = pageOptionsDto.page ?? 1;
    this.limit = pageOptionsDto.limit ?? 10;
    this.itemCount = itemCount;
    this.pageCount = Math.ceil(this.itemCount / this.limit);
    this.hasPreviousPage = this.page > 1;
    this.hasNextPage = this.page < this.pageCount;
  }
}
