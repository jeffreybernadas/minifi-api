import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { OffsetPageOptionsDto } from '@/common/dto/offset-pagination';

export class AnalyticsFilterDto extends OffsetPageOptionsDto {
  @ApiPropertyOptional({ description: 'Filter by country code' })
  @IsOptional()
  @IsString()
  countryCode?: string;

  @ApiPropertyOptional({ description: 'Filter by device' })
  @IsOptional()
  @IsString()
  device?: string;

  @ApiPropertyOptional({ description: 'Search referrer or URL' })
  @IsOptional()
  @IsString()
  search?: string;
}
