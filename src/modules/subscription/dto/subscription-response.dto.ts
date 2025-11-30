import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Response DTO for GET /subscriptions/me
 */
export class SubscriptionResponseDto {
  @ApiProperty({ example: 'sub_1234567890' })
  id: string;

  @ApiProperty({ example: 'user_keycloak_id_123' })
  userId: string;

  @ApiProperty({ enum: ['FREE', 'PRO'], example: 'PRO' })
  tier: string;

  @ApiProperty({
    enum: ['ACTIVE', 'CANCELLED', 'PAST_DUE', 'INCOMPLETE', 'TRIALING'],
    example: 'ACTIVE',
  })
  status: string;

  @ApiPropertyOptional({ example: 'cus_1234567890' })
  stripeCustomerId?: string | null;

  @ApiPropertyOptional({ example: 'sub_stripe_1234567890' })
  stripeSubscriptionId?: string | null;

  @ApiPropertyOptional({ example: 'price_1234567890' })
  stripePriceId?: string | null;

  @ApiPropertyOptional({
    example: '2025-12-31T23:59:59.000Z',
    description: 'When the current billing period ends',
  })
  stripeCurrentPeriodEnd?: Date | null;

  @ApiProperty({
    example: false,
    description: 'True if user has cancelled but period has not ended yet',
  })
  cancelAtPeriodEnd: boolean;

  @ApiPropertyOptional({
    example: '2025-12-31T23:59:59.000Z',
    description: 'When the subscription will actually end (if cancelled)',
  })
  stripeCancelAt?: Date | null;

  @ApiProperty({ example: true })
  emailNotifications: boolean;

  @ApiProperty({ example: true })
  securityAlertEmails: boolean;

  @ApiProperty({ example: '2025-01-15T10:30:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2025-01-20T14:45:00.000Z' })
  updatedAt: Date;
}

/**
 * Response DTO for POST /subscriptions/checkout
 */
export class CheckoutSessionResponseDto {
  @ApiProperty({
    example: 'https://checkout.stripe.com/c/pay/cs_test_a1b2c3...',
    description: 'Stripe Checkout URL - redirect user here to complete payment',
  })
  url: string;
}

/**
 * Response DTO for POST /subscriptions/portal
 */
export class PortalSessionResponseDto {
  @ApiProperty({
    example: 'https://billing.stripe.com/p/session/test_a1b2c3...',
    description:
      'Stripe Billing Portal URL - redirect user here to manage subscription',
  })
  url: string;
}

/**
 * Response DTO for POST /subscriptions/cancel
 */
export class CancelSubscriptionResponseDto {
  @ApiProperty({
    example: true,
    description: 'Whether cancellation is scheduled for period end',
  })
  cancelAtPeriodEnd: boolean;

  @ApiPropertyOptional({
    example: '2025-12-31T23:59:59.000Z',
    description: 'When the subscription will end',
  })
  currentPeriodEnd: Date | null;

  @ApiProperty({
    example: 'active',
    description:
      'Current Stripe subscription status (remains active until period end)',
  })
  status: string;
}

/**
 * Response DTO for POST /subscriptions/webhook
 */
export class WebhookReceivedResponseDto {
  @ApiProperty({ example: true })
  received: boolean;
}
