import { Injectable, BadRequestException } from '@nestjs/common';
import Stripe from 'stripe';
import { InjectStripeClient } from '@golevelup/nestjs-stripe';
import { ConfigService } from '@nestjs/config';
import { GlobalConfig } from '@/config/config.type';
import { PrismaService } from '@/database/database.service';
import { SubscriptionService } from './subscription.service';
import {
  SubscriptionStatus,
  SubscriptionTier,
} from '@/generated/prisma/client';
import { LoggerService } from '@/shared/logger/logger.service';

/**
 * StripeService
 *
 * Handles all Stripe API interactions for subscription management.
 *
 * Key responsibilities:
 * - Creating Checkout sessions for PRO upgrades
 * - Creating Billing Portal sessions for subscription management
 * - Cancelling subscriptions
 * - Processing webhook events to sync local DB with Stripe
 *
 * Webhook flow:
 * 1. Stripe sends event to POST /api/v1/subscriptions/webhook
 * 2. Controller calls verifyAndParseWebhook() to validate signature
 * 3. Controller calls syncFromStripeEvent() to process the event
 * 4. Event handlers update local DB via SubscriptionService
 */
@Injectable()
export class StripeService {
  constructor(
    @InjectStripeClient() private readonly stripe: Stripe,
    private readonly configService: ConfigService<GlobalConfig>,
    private readonly prisma: PrismaService,
    private readonly subscriptionService: SubscriptionService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Create a Stripe Checkout session for PRO upgrade.
   *
   * Flow:
   * 1. Get or create local subscription
   * 2. Create Stripe Customer if none exists (saves stripeCustomerId)
   * 3. Create Checkout session with PRO price
   * 4. Return URL for frontend to redirect user
   *
   * Called by: POST /subscriptions/checkout
   *
   * @param userId - Keycloak user ID
   * @returns Stripe Checkout URL
   */
  async createCheckoutSession(userId: string) {
    const subscription =
      await this.subscriptionService.getOrCreateSubscription(userId);

    // Ensure Stripe customer
    let stripeCustomerId = subscription.stripeCustomerId;
    if (!stripeCustomerId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });

      const customer = await this.stripe.customers.create({
        email: user?.email ?? undefined,
        metadata: { userId },
      });
      stripeCustomerId = customer.id;

      await this.prisma.subscription.update({
        where: { userId },
        data: { stripeCustomerId },
      });
    }

    const priceId = this.configService.getOrThrow('stripe.priceIdPro', {
      infer: true,
    });

    const successUrl = this.configService.getOrThrow('stripe.successUrl', {
      infer: true,
    });
    const cancelUrl = this.configService.getOrThrow('stripe.cancelUrl', {
      infer: true,
    });

    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer: stripeCustomerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
    });

    return { url: session.url };
  }

  /**
   * Create a Stripe Billing Portal session.
   *
   * The Billing Portal allows users to:
   * - View invoice history
   * - Update payment method
   * - Cancel subscription
   * - Download receipts
   *
   * Called by: POST /subscriptions/portal
   *
   * @param userId - Keycloak user ID
   * @returns Stripe Billing Portal URL
   * @throws BadRequestException if user has no stripeCustomerId
   */
  async createPortalSession(userId: string) {
    const subscription =
      await this.subscriptionService.getOrCreateSubscription(userId);

    if (!subscription.stripeCustomerId) {
      throw new BadRequestException('Stripe customer not found for user');
    }

    const portal = await this.stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: this.configService.getOrThrow('stripe.successUrl', {
        infer: true,
      }),
    });

    return { url: portal.url };
  }

  /**
   * Cancel a user's subscription at period end.
   *
   * Sets cancel_at_period_end=true in Stripe, meaning:
   * - User keeps PRO access until current billing period ends
   * - No more charges after that
   * - Stripe will fire customer.subscription.deleted when period ends
   *
   * Also immediately updates local DB to CANCELLED status.
   *
   * Called by: POST /subscriptions/cancel
   *
   * @param userId - Keycloak user ID
   * @throws BadRequestException if user has no stripeSubscriptionId
   */
  async cancelSubscription(userId: string) {
    const subscription =
      await this.subscriptionService.getOrCreateSubscription(userId);

    if (!subscription.stripeSubscriptionId) {
      throw new BadRequestException('Stripe subscription not found for user');
    }

    await this.stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    await this.subscriptionService.cancelLocal(userId);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // WEBHOOK HANDLING
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Verify webhook signature and parse the event.
   *
   * Stripe signs all webhook payloads. This method:
   * 1. Gets webhook secret from config
   * 2. Calls Stripe SDK to verify signature
   * 3. Returns parsed event or throws on failure
   *
   * Called by: POST /subscriptions/webhook (before processing)
   *
   * @param rawBody - Raw request body (Buffer, not parsed JSON)
   * @param signature - stripe-signature header value
   * @returns Parsed Stripe.Event
   * @throws Error if signature verification fails
   */
  verifyAndParseWebhook(rawBody: Buffer, signature: string): Stripe.Event {
    const webhookSecret = this.configService.getOrThrow(
      'stripe.webhookSecret',
      { infer: true },
    );

    try {
      return this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret,
      );
    } catch (err) {
      this.logger.error(
        `Webhook signature verification failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
        'StripeService',
      );
      throw err;
    }
  }

  /**
   * Route Stripe event to appropriate handler.
   *
   * Event types handled:
   * - checkout.session.completed: User finished checkout → upgrade to PRO
   * - customer.subscription.created: New subscription created
   * - customer.subscription.updated: Subscription modified (upgrade/downgrade)
   * - customer.subscription.deleted: Subscription cancelled
   *
   * Called by: POST /subscriptions/webhook (after signature verification)
   *
   * @param event - Verified Stripe event
   */
  async syncFromStripeEvent(event: Stripe.Event) {
    this.logger.log(`Processing Stripe event: ${event.type}`, 'StripeService', {
      eventType: event.type,
      eventId: event.id,
    });
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.mode === 'subscription' && session.subscription) {
          await this.handleCheckoutCompleted(session);
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscriptionObject = event.data.object;
        await this.handleSubscriptionUpsert(subscriptionObject);
        break;
      }
      case 'customer.subscription.deleted': {
        const subscriptionObject = event.data.object;
        await this.handleSubscriptionDeleted(subscriptionObject);
        break;
      }
      default:
        this.logger.warn(
          `Unhandled Stripe event type: ${event.type}`,
          'StripeService',
        );
        break;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PRIVATE WEBHOOK HANDLERS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Handle checkout.session.completed event.
   *
   * Fired when user completes payment in Stripe Checkout.
   * Fetches full subscription object and updates local DB.
   *
   * Why fetch again? Checkout session has limited data;
   * full subscription has price, period end, status, etc.
   */
  private async handleCheckoutCompleted(
    session: Stripe.Checkout.Session,
  ): Promise<void> {
    const subscriptionId = session.subscription as string;

    const subscription =
      await this.stripe.subscriptions.retrieve(subscriptionId);
    await this.handleSubscriptionUpsert(subscription);
  }

  /**
   * Handle subscription create/update events.
   *
   * Extracts relevant data from Stripe subscription object:
   * - stripeCustomerId, stripeSubscriptionId, stripePriceId
   * - currentPeriodEnd (for displaying expiry to user)
   * - tier (PRO if priceId matches STRIPE_PRICE_ID_PRO, else FREE)
   * - status (mapped from Stripe status)
   *
   * Finds local subscription by stripeCustomerId (saved during checkout)
   * and updates it via SubscriptionService.
   */
  private async handleSubscriptionUpsert(subscription: Stripe.Subscription) {
    const stripeCustomerId = subscription.customer as string;
    const stripeSubscriptionId = subscription.id;
    const firstItem = subscription.items?.data?.[0];
    const stripePriceId = firstItem?.price?.id;
    const currentPeriodEndSeconds = firstItem?.current_period_end;

    const currentPeriodEnd = currentPeriodEndSeconds
      ? new Date(currentPeriodEndSeconds * 1000)
      : null;

    const tier =
      stripePriceId ===
      this.configService.getOrThrow('stripe.priceIdPro', { infer: true })
        ? SubscriptionTier.PRO
        : SubscriptionTier.FREE;

    const status = this.mapStripeStatus(subscription.status);

    this.logger.log(
      'Looking up local subscription by stripeCustomerId',
      'StripeService',
      {
        stripeCustomerId,
        stripeSubscriptionId,
        tier,
        status,
      },
    );

    const local = await this.prisma.subscription.findFirst({
      where: { stripeCustomerId },
      select: { userId: true },
    });

    if (!local) {
      this.logger.error(
        `No local subscription found for stripeCustomerId: ${stripeCustomerId}. ` +
          'This usually means the webhook fired before checkout completed or the customer was created without saving to DB.',
        'StripeService',
      );
      return;
    }

    this.logger.log(
      `Updating subscription for user ${local.userId}`,
      'StripeService',
      {
        userId: local.userId,
        tier,
        status,
      },
    );

    await this.subscriptionService.updateSubscriptionFromStripe({
      userId: local.userId,
      tier,
      status,
      stripeCustomerId,
      stripeSubscriptionId,
      stripePriceId,
      currentPeriodEnd,
    });

    this.logger.log(
      `Successfully updated subscription for user ${local.userId}`,
      'StripeService',
    );
  }

  /**
   * Handle subscription deleted event.
   *
   * Fired when subscription is fully cancelled (after period end).
   * Reverts user to FREE tier with CANCELLED status.
   * Clears Stripe IDs but keeps stripeCustomerId for potential re-subscription.
   */
  private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    const stripeCustomerId =
      typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer.id;

    this.logger.log('Processing subscription deletion', 'StripeService', {
      stripeCustomerId,
      subscriptionId: subscription.id,
    });

    const local = await this.prisma.subscription.findFirst({
      where: { stripeCustomerId },
      select: { userId: true },
    });

    if (!local) {
      this.logger.warn(
        `No local subscription found for deleted stripeCustomerId: ${stripeCustomerId}`,
        'StripeService',
      );
      return;
    }

    await this.subscriptionService.updateSubscriptionFromStripe({
      userId: local.userId,
      tier: SubscriptionTier.FREE,
      status: SubscriptionStatus.CANCELLED,
      stripeCustomerId,
      stripeSubscriptionId: null,
      stripePriceId: null,
      currentPeriodEnd: null,
    });

    this.logger.log(
      `Subscription cancelled for user ${local.userId}`,
      'StripeService',
    );
  }

  /**
   * Map Stripe subscription status to local enum.
   *
   * Stripe statuses: active, past_due, unpaid, canceled,
   *                  incomplete, incomplete_expired, trialing, paused
   *
   * Local mapping:
   * - active          → ACTIVE
   * - past_due        → PAST_DUE
   * - incomplete/expired → INCOMPLETE
   * - trialing        → TRIALING
   * - canceled/other  → CANCELLED
   */
  private mapStripeStatus(
    status: Stripe.Subscription.Status,
  ): SubscriptionStatus {
    switch (status) {
      case 'active':
        return SubscriptionStatus.ACTIVE;
      case 'past_due':
        return SubscriptionStatus.PAST_DUE;
      case 'incomplete':
      case 'incomplete_expired':
        return SubscriptionStatus.INCOMPLETE;
      case 'trialing':
        return SubscriptionStatus.TRIALING;
      case 'canceled':
      default:
        return SubscriptionStatus.CANCELLED;
    }
  }
}
