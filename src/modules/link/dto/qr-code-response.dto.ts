import { ApiProperty } from '@nestjs/swagger';

export class QrCodeResponseDto {
  @ApiProperty({ description: 'URL to the generated QR code image' })
  qrCodeUrl: string;
}
