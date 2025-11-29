import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ScanStatus } from '@/generated/prisma/client';

class RedirectWarningDto {
  @ApiProperty()
  isSafe?: boolean;

  @ApiProperty({ enum: ScanStatus })
  status: ScanStatus;

  @ApiPropertyOptional()
  scanScore?: number | null;

  @ApiPropertyOptional({ type: [String] })
  threats?: string[];

  @ApiPropertyOptional()
  reasoning?: string;

  @ApiPropertyOptional()
  recommendations?: string;

  @ApiPropertyOptional()
  scannedAt?: Date | null;
}

export class RedirectResponseDto {
  @ApiProperty()
  requiresPassword: boolean;

  @ApiProperty({ required: false })
  originalUrl?: string;

  @ApiProperty({ required: false })
  shortCode?: string;

  @ApiProperty({ required: false })
  code?: string;

  @ApiPropertyOptional({ type: RedirectWarningDto })
  warning?: RedirectWarningDto;
}

export class VerifyPasswordResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty({ required: false })
  originalUrl?: string;

  @ApiProperty({ required: false })
  shortCode?: string;

  @ApiPropertyOptional({ type: RedirectWarningDto })
  warning?: RedirectWarningDto;
}
