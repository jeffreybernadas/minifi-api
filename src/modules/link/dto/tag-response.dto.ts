import { ApiProperty } from '@nestjs/swagger';

export class TagResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() userId: string;
  @ApiProperty() name: string;
  @ApiProperty({ example: '#3B82F6' }) backgroundColor: string;
  @ApiProperty({ example: '#FFFFFF' }) textColor: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}
