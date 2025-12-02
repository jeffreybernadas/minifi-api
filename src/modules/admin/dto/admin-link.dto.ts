import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { LinkStatus, ScanStatus } from '@/generated/prisma/client';
import { CUSTOM_ALIAS_REGEX } from '@/constants/link.constant';
import { OffsetPageOptionsDto } from '@/common/dto/offset-pagination';

export class AdminLinkFilterDto extends OffsetPageOptionsDto {
  @ApiPropertyOptional({
    description:
      'Search query - searches in shortCode, customAlias, originalUrl, title (case-insensitive)',
    example: 'my-link',
  })
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by link status',
    enum: LinkStatus,
  })
  @IsOptional()
  @IsEnum(LinkStatus)
  status?: LinkStatus;

  @ApiPropertyOptional({
    description: 'Filter by scan status',
    enum: ScanStatus,
  })
  @IsOptional()
  @IsEnum(ScanStatus)
  scanStatus?: ScanStatus;

  @ApiPropertyOptional({ description: 'Filter by guest links' })
  @IsOptional()
  @IsBoolean()
  isGuest?: boolean;

  @ApiPropertyOptional({ description: 'Filter by archived status' })
  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;

  @ApiPropertyOptional({ description: 'Filter by user ID' })
  @IsOptional()
  @IsString()
  userId?: string;
}

export class AdminLinkResponseDto {
  @ApiProperty({ description: 'Link ID' })
  id: string;

  @ApiPropertyOptional({ description: 'Owner user ID' })
  userId?: string;

  @ApiPropertyOptional({ description: 'Owner email' })
  userEmail?: string;

  @ApiProperty({ description: 'Original URL' })
  originalUrl: string;

  @ApiProperty({ description: 'Short code' })
  shortCode: string;

  @ApiPropertyOptional({ description: 'Custom alias' })
  customAlias?: string;

  @ApiPropertyOptional({ description: 'Link title' })
  title?: string;

  @ApiPropertyOptional({ description: 'Link description' })
  description?: string;

  @ApiProperty({ description: 'Link status', enum: LinkStatus })
  status: LinkStatus;

  @ApiProperty({ description: 'Is guest link' })
  isGuest: boolean;

  @ApiProperty({ description: 'Security scan status', enum: ScanStatus })
  scanStatus: ScanStatus;

  @ApiPropertyOptional({ description: 'Security score' })
  scanScore?: number;

  @ApiPropertyOptional({ description: 'When the scan was performed' })
  scannedAt?: Date;

  @ApiProperty({ description: 'Has password protection' })
  hasPassword: boolean;

  @ApiPropertyOptional({ description: 'Scheduled activation date' })
  scheduledAt?: Date;

  @ApiPropertyOptional({ description: 'Expiration date' })
  expiresAt?: Date;

  @ApiPropertyOptional({ description: 'Click limit' })
  clickLimit?: number;

  @ApiProperty({ description: 'Is one-time link' })
  isOneTime: boolean;

  @ApiProperty({ description: 'Is archived' })
  isArchived: boolean;

  @ApiProperty({ description: 'Total click count' })
  clickCount: number;

  @ApiProperty({ description: 'Unique click count' })
  uniqueClickCount: number;

  @ApiPropertyOptional({ description: 'Last clicked at' })
  lastClickedAt?: Date;

  @ApiProperty({ description: 'When the link was created' })
  createdAt: Date;

  @ApiProperty({ description: 'When the link was last updated' })
  updatedAt: Date;
}

export class AdminLinkDetailDto extends AdminLinkResponseDto {
  @ApiPropertyOptional({ description: 'Guest IP address' })
  guestIpAddress?: string;

  @ApiPropertyOptional({ description: 'Guest user agent' })
  guestUserAgent?: string;

  @ApiPropertyOptional({ description: 'Scan details' })
  scanDetails?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Notes' })
  notes?: string;

  @ApiPropertyOptional({ description: 'QR code URL' })
  qrCodeUrl?: string;
}

export class AdminEditLinkDto {
  @ApiPropertyOptional({ description: 'Link title' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ description: 'Link description' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ description: 'Link status', enum: LinkStatus })
  @IsOptional()
  @IsEnum(LinkStatus)
  status?: LinkStatus;

  @ApiPropertyOptional({
    description: 'Custom alias (3-30 chars, letters/numbers/hyphens only)',
    example: 'my-custom-link',
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(CUSTOM_ALIAS_REGEX, {
    message: 'Custom alias can only contain letters, numbers, and hyphens',
  })
  customAlias?: string;

  @ApiPropertyOptional({ description: 'Expiration date' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({ description: 'Click limit' })
  @IsOptional()
  @IsInt()
  @Min(1)
  clickLimit?: number;

  @ApiPropertyOptional({ description: 'Is archived' })
  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class BlockLinkDto {
  @ApiProperty({ description: 'Reason for blocking the link' })
  @IsString()
  @MaxLength(500)
  reason: string;
}
