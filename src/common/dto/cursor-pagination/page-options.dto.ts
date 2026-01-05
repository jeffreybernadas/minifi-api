import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Order } from '@/constants/app.constant';

/**
 * Input parameters for the cursor-based pagination
 * - limit - Number of items per page (default: 10)
 * - afterCursor - Cursor for pagination (after this cursor)
 * - beforeCursor - Cursor for pagination (before this cursor)
 * - order - Sort order (default: asc)
 * - search - Search query (optional)
 */
export class CursorPageOptionsDto {
  @ApiPropertyOptional({
    minimum: 1,
    maximum: 50,
    default: 10,
    description: 'Number of items per page',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  @IsOptional()
  readonly limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Cursor for pagination (after this cursor)',
  })
  @IsString()
  @IsOptional()
  readonly afterCursor?: string;

  @ApiPropertyOptional({
    description: 'Cursor for pagination (before this cursor)',
  })
  @IsString()
  @IsOptional()
  readonly beforeCursor?: string;

  @ApiPropertyOptional({
    enum: Order,
    default: Order.Asc,
    description: 'Sort order',
  })
  @IsEnum(Order)
  @IsOptional()
  readonly order?: Order = Order.Asc;

  @ApiPropertyOptional({
    description: 'Search query',
    maxLength: 200,
  })
  @IsString()
  @MaxLength(200)
  @IsOptional()
  readonly search?: string;
}
