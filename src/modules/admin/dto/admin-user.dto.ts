import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { SubscriptionTier, UserType } from '@/generated/prisma/client';
import { OffsetPageOptionsDto } from '@/common/dto/offset-pagination';

export class AdminUserFilterDto extends OffsetPageOptionsDto {
  @ApiPropertyOptional({
    description:
      'Search query - searches in email, username, firstName, lastName, id (case-insensitive)',
    example: 'john',
  })
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by user type', enum: UserType })
  @IsOptional()
  @IsEnum(UserType)
  userType?: UserType;

  @ApiPropertyOptional({ description: 'Filter by blocked status' })
  @IsOptional()
  @IsBoolean()
  isBlocked?: boolean;

  @ApiPropertyOptional({ description: 'Filter by email verified status' })
  @IsOptional()
  @IsBoolean()
  emailVerified?: boolean;
}

export class AdminUserResponseDto {
  @ApiProperty({ description: 'User ID (Keycloak sub)' })
  id: string;

  @ApiProperty({ description: 'User email' })
  email: string;

  @ApiPropertyOptional({ description: 'Username' })
  username?: string;

  @ApiPropertyOptional({ description: 'First name' })
  firstName?: string;

  @ApiPropertyOptional({ description: 'Last name' })
  lastName?: string;

  @ApiProperty({ description: 'Email verified status' })
  emailVerified: boolean;

  @ApiProperty({ description: 'User type', enum: UserType })
  userType: UserType;

  @ApiProperty({ description: 'Is user blocked' })
  isBlocked: boolean;

  @ApiPropertyOptional({ description: 'When the user was blocked' })
  blockedAt?: Date;

  @ApiPropertyOptional({ description: 'Reason for blocking' })
  blockedReason?: string;

  @ApiProperty({ description: 'Total links count' })
  linksCount: number;

  @ApiProperty({ description: 'Active links count' })
  activeLinksCount: number;

  @ApiProperty({ description: 'Total clicks across all links' })
  totalClicks: number;

  @ApiProperty({ description: 'When the user was created' })
  createdAt: Date;

  @ApiProperty({ description: 'When the user was last updated' })
  updatedAt: Date;
}

export class AdminUserDetailDto extends AdminUserResponseDto {
  @ApiPropertyOptional({ description: 'Phone number' })
  phoneNumber?: string;

  @ApiPropertyOptional({ description: 'Avatar URL' })
  avatarUrl?: string;

  @ApiPropertyOptional({ description: 'Address' })
  address?: string;

  @ApiProperty({ description: 'Email notifications enabled' })
  emailNotificationsEnabled: boolean;

  @ApiPropertyOptional({
    description: 'Subscription tier',
    enum: SubscriptionTier,
  })
  subscriptionTier?: SubscriptionTier;

  @ApiPropertyOptional({ description: 'Subscription status' })
  subscriptionStatus?: string;

  @ApiPropertyOptional({ description: 'Stripe customer ID' })
  stripeCustomerId?: string;
}

export class ChangeTierDto {
  @ApiProperty({ description: 'New subscription tier', enum: SubscriptionTier })
  @IsEnum(SubscriptionTier)
  tier: SubscriptionTier;
}

export class BlockUserDto {
  @ApiProperty({ description: 'Reason for blocking the user' })
  @IsString()
  @IsNotEmpty({ message: 'Block reason is required' })
  @MaxLength(500)
  reason: string;
}
