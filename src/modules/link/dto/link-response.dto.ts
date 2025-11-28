import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LinkStatus } from '@/generated/prisma/client';

export class LinkResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() userId: string | null;
  @ApiProperty() originalUrl: string;
  @ApiProperty() shortCode: string;
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
  @ApiProperty() clickCount: number;
  @ApiProperty() uniqueClickCount: number;
  @ApiPropertyOptional() lastClickedAt?: Date | null;
  @ApiPropertyOptional() qrCodeUrl?: string | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}
