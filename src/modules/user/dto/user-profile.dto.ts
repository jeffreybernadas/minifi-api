import { ApiProperty } from '@nestjs/swagger';

export class UserProfileDto {
  // Keycloak data

  @ApiProperty({
    description: 'Unique user identifier from Keycloak',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  sub: string;

  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'Whether email is verified',
    example: true,
  })
  email_verified: boolean;

  @ApiProperty({
    description: 'Username',
    example: 'john.doe',
    required: false,
  })
  preferred_username?: string;

  @ApiProperty({
    description: 'First name',
    example: 'John',
    required: false,
  })
  given_name?: string;

  @ApiProperty({
    description: 'Last name',
    example: 'Doe',
    required: false,
  })
  family_name?: string;

  @ApiProperty({
    description: 'Full name',
    example: 'John Doe',
    required: false,
  })
  name?: string;

  @ApiProperty({
    description: 'Realm roles assigned to the user',
    example: ['user', 'admin'],
    type: [String],
    required: false,
  })
  realm_roles?: string[];

  @ApiProperty({
    description: 'Client roles assigned to the user',
    example: { account: { roles: ['manage-account', 'view-profile'] } },
    required: false,
  })
  client_roles?: Record<string, { roles: string[] }>;

  @ApiProperty({
    description: 'Token issued at timestamp',
    example: 1609459200,
  })
  iat: number;

  @ApiProperty({
    description: 'Token expiration timestamp',
    example: 1609462800,
  })
  exp: number;

  @ApiProperty({
    description: 'Token issuer',
    example: 'http://localhost:8080/realms/my-realm',
  })
  iss: string;

  @ApiProperty({
    description: 'Audience',
    example: 'account',
  })
  aud: string | string[];

  @ApiProperty({
    description: 'Session state',
    example: '123e4567-e89b-12d3-a456-426614174001',
    required: false,
  })
  session_state?: string;

  @ApiProperty({
    description: 'Authorized party',
    example: 'nest-starter-client',
    required: false,
  })
  azp?: string;

  @ApiProperty({
    description: 'Scope',
    example: 'openid profile email',
    required: false,
  })
  scope?: string;

  @ApiProperty({
    description: 'JWT ID - unique identifier for this token',
    example: '83f926e1-1ddb-4350-8bd1-78b0dfc72575',
    required: false,
  })
  jti?: string;

  @ApiProperty({
    description: 'Token type',
    example: 'Bearer',
    required: false,
  })
  typ?: string;

  @ApiProperty({
    description: 'Session ID',
    example: '5126821e-8f0e-4523-807d-71b9e9b2dda0',
    required: false,
  })
  sid?: string;

  @ApiProperty({
    description: 'Authentication Context Class Reference',
    example: '1',
    required: false,
  })
  acr?: string;

  @ApiProperty({
    description: 'Allowed origins for CORS',
    example: ['http://localhost:3000/*'],
    type: [String],
    required: false,
  })
  'allowed-origins'?: string[];

  @ApiProperty({
    description: 'User locale/language preference',
    example: 'en',
    required: false,
  })
  locale?: string;

  @ApiProperty({
    description: 'User profile picture URL',
    example: 'https://avatars.githubusercontent.com/u/0?v=0',
    required: false,
  })
  picture?: string;

  // Application-specific data

  @ApiProperty({
    description: 'Phone number',
    example: '+1234567890',
    required: false,
  })
  phoneNumber?: string | null;

  @ApiProperty({
    description: 'Whether to receive email notifications',
    example: true,
    required: false,
  })
  emailNotificationsEnabled?: boolean;

  @ApiProperty({
    description: 'Avatar URL',
    example: 'https://example.com/avatar.jpg',
    required: false,
  })
  avatarUrl?: string | null;

  @ApiProperty({
    description: 'Street address',
    example: '123 Main St',
    required: false,
  })
  address?: string | null;

  @ApiProperty({
    description: 'User subscription tier',
    example: 'FREE',
    enum: ['GUEST', 'FREE', 'PRO'],
  })
  userType: string;

  @ApiProperty({
    description: 'Account creation timestamp',
    example: '2025-10-05T12:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last profile update timestamp',
    example: '2025-10-05T12:00:00.000Z',
  })
  updatedAt: Date;
}
