import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength, IsArray } from 'class-validator';

export class SingleUploadDto {
  @ApiProperty({
    description: 'File name',
    example: 'my-file',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'File name must be a string' })
  @MinLength(2, { message: 'File name must be at least 2 characters long' })
  fileName?: string;

  @ApiProperty({
    description: 'Single file upload',
    type: 'string',
    format: 'binary',
  })
  file: any;
}

export class MultipleUploadDto {
  @ApiProperty({
    description: 'Multiple file upload',
    required: false,
    type: 'array',
    items: { type: 'string', format: 'binary' },
  })
  @IsArray({ message: 'Files must be an array' })
  files: any[];
}
