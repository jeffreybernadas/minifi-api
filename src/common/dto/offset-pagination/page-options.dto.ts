import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Order } from '@/constants/app.constant';

/**
 * Input parameters for the offset-based pagination
 * - page - Page number (default: 1)
 * - limit - Number of items per page (default: 10)
 * - order - Sort order (default: asc)
 * - search - Search query (optional)
 * - skip - Number of items to skip (default: 0)
 */
export class OffsetPageOptionsDto {
  @ApiPropertyOptional({
    minimum: 1,
    default: 1,
    description: 'Page number',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  readonly page?: number = 1;

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
    enum: Order,
    default: Order.Asc,
    description: 'Sort order',
  })
  @IsEnum(Order)
  @IsOptional()
  readonly order?: Order = Order.Asc;

  @ApiPropertyOptional({
    description: 'Search query',
  })
  @IsString()
  @IsOptional()
  readonly search?: string;

  get skip(): number {
    return ((this.page ?? 1) - 1) * (this.limit ?? 10);
  }
}
