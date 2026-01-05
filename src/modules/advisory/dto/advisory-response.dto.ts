import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AdvisoryType, AdvisoryStatus } from '@/generated/prisma/client';

export class AdvisoryResponseDto {
  @ApiProperty({
    description: 'Advisory ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Advisory title',
    example: 'Scheduled Maintenance',
  })
  title: string;

  @ApiProperty({
    description: 'HTML content',
    example:
      '<p>We will be performing maintenance on <strong>January 1st</strong>.</p>',
  })
  content: string;

  @ApiProperty({
    description: 'Advisory type for styling',
    enum: AdvisoryType,
    example: AdvisoryType.INFO,
  })
  type: AdvisoryType;

  @ApiProperty({
    description: 'Advisory status',
    enum: AdvisoryStatus,
    example: AdvisoryStatus.DRAFT,
  })
  status: AdvisoryStatus;

  @ApiPropertyOptional({
    description: 'When the advisory was published',
    example: '2025-01-01T00:00:00.000Z',
  })
  publishedAt?: string | null;

  @ApiPropertyOptional({
    description: 'When the advisory expires',
    example: '2025-01-31T23:59:59.000Z',
  })
  expiresAt?: string | null;

  @ApiProperty({
    description: 'When the advisory was created',
    example: '2025-01-01T00:00:00.000Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'When the advisory was last updated',
    example: '2025-01-01T00:00:00.000Z',
  })
  updatedAt: string;
}

export class AdvisoryListResponseDto extends AdvisoryResponseDto {
  @ApiProperty({
    description: 'Number of users who have dismissed this advisory',
    example: 42,
  })
  dismissalCount: number;
}
