import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

export class UpdateTagDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;

  @ApiPropertyOptional({ example: '#3B82F6' })
  @IsOptional()
  @IsString()
  @Matches(HEX_COLOR_REGEX)
  backgroundColor?: string;

  @ApiPropertyOptional({ example: '#FFFFFF' })
  @IsOptional()
  @IsString()
  @Matches(HEX_COLOR_REGEX)
  textColor?: string;
}
