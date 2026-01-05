import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LinkStatus, ScanStatus } from '@/generated/prisma/client';
import { TagResponseDto } from './tag-response.dto';

class ScanDetailsDto {
  @ApiPropertyOptional({ type: [String] })
  threats?: string[];

  @ApiPropertyOptional()
  reasoning?: string;

  @ApiPropertyOptional()
  recommendations?: string;
}

export class LinkResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() userId: string | null;
  @ApiProperty() originalUrl: string;
  @ApiPropertyOptional() shortCode?: string; // Nullable when customAlias is used
  @ApiPropertyOptional() customAlias?: string;
  @ApiPropertyOptional() title?: string;
  @ApiPropertyOptional() description?: string;
  @ApiProperty({ enum: LinkStatus }) status: LinkStatus;
  @ApiProperty() hasPassword: boolean;
  @ApiPropertyOptional() scheduledAt?: Date | null;
  @ApiPropertyOptional() expiresAt?: Date | null;
  @ApiPropertyOptional() clickLimit?: number | null;
  @ApiProperty() isOneTime: boolean;
  @ApiProperty() isArchived: boolean;
  @ApiPropertyOptional() notes?: string | null;
  @ApiProperty({ enum: ScanStatus })
  scanStatus: ScanStatus;
  @ApiPropertyOptional()
  scanScore?: number | null;
  @ApiPropertyOptional({ type: ScanDetailsDto })
  scanDetails?: ScanDetailsDto | null;
  @ApiPropertyOptional()
  scannedAt?: Date | null;
  @ApiPropertyOptional()
  lastScanVersion?: string | null;
  @ApiProperty() clickCount: number;
  @ApiProperty() uniqueClickCount: number;
  @ApiPropertyOptional() lastClickedAt?: Date | null;
  @ApiPropertyOptional() qrCodeUrl?: string | null;
  @ApiPropertyOptional({ type: [TagResponseDto] })
  tags?: TagResponseDto[];
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}
