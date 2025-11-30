import { Injectable } from '@nestjs/common';
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
   */
  async getOrCreateSubscription(userId: string) {
    const existing = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (existing) return existing;

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
  }) {
    const {
      userId,
      tier,
      status,
      stripeCustomerId,
      stripeSubscriptionId,
      stripePriceId,
      currentPeriodEnd,
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
      },
      create: {
        userId,
        tier,
        status,
        stripeCustomerId,
        stripeSubscriptionId,
        stripePriceId,
        stripeCurrentPeriodEnd: currentPeriodEnd,
      },
    });

    await this.syncUserType(userId, tier);
  }

  /**
   * Cancel subscription locally (immediate effect).
   *
   * Called by StripeService.cancelSubscription() after setting
   * cancel_at_period_end=true in Stripe.
   *
   * Note: This immediately reverts the user to FREE tier locally,
   * even though Stripe subscription remains active until period end.
   * For more accurate handling, you could wait for the webhook instead.
   *
   * @param userId - User ID to cancel subscription for
   */
  async cancelLocal(userId: string) {
    await this.prisma.subscription.update({
      where: { userId },
      data: {
        status: SubscriptionStatus.CANCELLED,
        tier: SubscriptionTier.FREE,
      },
    });
    await this.syncUserType(userId, SubscriptionTier.FREE);
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
