import { ApiProperty } from '@nestjs/swagger';

export class RedirectResponseDto {
  @ApiProperty()
  requiresPassword: boolean;

  @ApiProperty({ required: false })
  originalUrl?: string;

  @ApiProperty({ required: false })
  shortCode?: string;

  @ApiProperty({ required: false })
  code?: string;
}

export class VerifyPasswordResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty({ required: false })
  originalUrl?: string;

  @ApiProperty({ required: false })
  shortCode?: string;
}
