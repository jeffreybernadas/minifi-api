import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/database/database.service';
import {
  SubscriptionStatus,
  SubscriptionTier,
  UserType,
} from '@/generated/prisma/client';

/**
 * SubscriptionService
 *
 * Manages user subscription records in the local database.
 * Works alongside StripeService to keep local state in sync with Stripe.
 *
 * Key responsibilities:
 * - CRUD operations for Subscription model
 * - Syncing User.userType with subscription tier
 * - Providing subscription data for guards and controllers
 */
@Injectable()
export class SubscriptionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get or create a subscription for a user.
   *
   * Used by:
   * - SubscriptionController.getMe() - GET /subscriptions/me
   * - StripeService.createCheckoutSession() - before creating Stripe checkout
   * - StripeService.createPortalSession() - to get stripeCustomerId
   * - StripeService.cancelSubscription() - to get stripeSubscriptionId
   * - UsageLimitGuard - to check tier for link count limits
   * - SubscriptionTierGuard - to check tier for PRO-only features
   *
   * @param userId - Keycloak user ID (sub claim)
   * @returns Existing subscription or newly created FREE subscription
   * @throws NotFoundException if user doesn't exist in database
   */
  async getOrCreateSubscription(userId: string) {
    const existing = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (existing) return existing;

    // Verify user exists before creating subscription
    // Users are created via sync-on-demand when they first access their profile
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(
        'User not found. Please access your profile first to sync your account.',
      );
    }

    const subscription = await this.prisma.subscription.create({
      data: {
        userId,
        tier: SubscriptionTier.FREE,
        status: SubscriptionStatus.ACTIVE,
      },
    });

    await this.syncUserType(userId, SubscriptionTier.FREE);
    return subscription;
  }

  /**
   * Update local subscription from Stripe webhook data.
   *
   * Called by StripeService webhook handlers after receiving events:
   * - customer.subscription.created
   * - customer.subscription.updated
   * - customer.subscription.deleted
   *
   * Uses upsert to handle edge cases where subscription might not exist.
   * Also syncs User.userType to match the new tier.
   *
   * @param params - Subscription data from Stripe event
   */
  async updateSubscriptionFromStripe(params: {
    userId: string;
    tier: SubscriptionTier;
    status: SubscriptionStatus;
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
    stripePriceId?: string | null;
    currentPeriodEnd?: Date | null;
    cancelAtPeriodEnd?: boolean;
    stripeCancelAt?: Date | null;
  }) {
    const {
      userId,
      tier,
      status,
      stripeCustomerId,
      stripeSubscriptionId,
      stripePriceId,
      currentPeriodEnd,
      cancelAtPeriodEnd,
      stripeCancelAt,
    } = params;

    await this.prisma.subscription.upsert({
      where: { userId },
      update: {
        tier,
        status,
        stripeCustomerId,
        stripeSubscriptionId,
        stripePriceId,
        stripeCurrentPeriodEnd: currentPeriodEnd,
        cancelAtPeriodEnd: cancelAtPeriodEnd ?? false,
        stripeCancelAt,
      },
      create: {
        userId,
        tier,
        status,
        stripeCustomerId,
        stripeSubscriptionId,
        stripePriceId,
        stripeCurrentPeriodEnd: currentPeriodEnd,
        cancelAtPeriodEnd: cancelAtPeriodEnd ?? false,
        stripeCancelAt,
      },
    });

    await this.syncUserType(userId, tier);
  }

  /**
   * Sync User.userType field with subscription tier.
   *
   * Keeps the User model's userType in sync with subscription changes.
   * This allows quick tier checks without joining Subscription table.
   *
   * Mapping:
   * - SubscriptionTier.PRO  → UserType.PRO
   * - SubscriptionTier.FREE → UserType.FREE
   *
   * @param userId - User ID to update
   * @param tier - New subscription tier
   */
  private async syncUserType(userId: string, tier: SubscriptionTier) {
    const nextUserType =
      tier === SubscriptionTier.PRO ? UserType.PRO : UserType.FREE;

    await this.prisma.user.update({
      where: { id: userId },
      data: { userType: nextUserType },
    });
  }
}
