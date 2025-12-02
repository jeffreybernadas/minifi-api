import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { LinkStatus } from '@/generated/prisma/client';
import { OffsetPageOptionsDto } from '@/common/dto/offset-pagination';

export class LinkFilterDto extends OffsetPageOptionsDto {
  @ApiPropertyOptional({
    enum: LinkStatus,
    description: 'Filter by link status',
  })
  @IsOptional()
  @IsEnum(LinkStatus)
  status?: LinkStatus;

  @ApiPropertyOptional({ description: 'Filter by tag id' })
  @IsOptional()
  @IsString()
  tagId?: string;

  @ApiPropertyOptional({
    description: 'Filter by archived status',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;

  // Override parent's search property documentation to specify which fields are searchable
  @ApiPropertyOptional({
    description:
      'Search query - searches in title, description, originalUrl, shortCode, and customAlias (case-insensitive)',
    example: 'my-link',
  })
  override search?: string;
}
