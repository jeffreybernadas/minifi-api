import { ApiProperty } from '@nestjs/swagger';
import { IsUrl } from 'class-validator';

export class CreateGuestLinkDto {
  @ApiProperty({
    example: 'https://example.com/very/long/url',
    description: 'Long URL to shorten (guest users get basic shortening only)',
  })
  @IsUrl()
  originalUrl: string;
}
