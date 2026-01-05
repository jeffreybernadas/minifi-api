import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum } from 'class-validator';
import { AdvisoryStatus, AdvisoryType } from '@/generated/prisma/client';
import { OffsetPageOptionsDto } from '@/common/dto/offset-pagination';

export class AdvisoryFilterDto extends OffsetPageOptionsDto {
  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: AdvisoryStatus,
    example: AdvisoryStatus.PUBLISHED,
  })
  @IsOptional()
  @IsEnum(AdvisoryStatus)
  status?: AdvisoryStatus;

  @ApiPropertyOptional({
    description: 'Filter by type',
    enum: AdvisoryType,
    example: AdvisoryType.INFO,
  })
  @IsOptional()
  @IsEnum(AdvisoryType)
  type?: AdvisoryType;
}
