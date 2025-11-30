import { Module } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { SubscriptionController } from './subscription.controller';
import { StripeService } from './stripe.service';
import { SubscriptionTierGuard } from '@/shared/guards/subscription-tier.guard';
import { UsageLimitGuard } from '@/shared/guards/usage-limit.guard';

@Module({
  controllers: [SubscriptionController],
  providers: [
    SubscriptionService,
    StripeService,
    SubscriptionTierGuard,
    UsageLimitGuard,
  ],
  exports: [SubscriptionService, SubscriptionTierGuard, UsageLimitGuard],
})
export class SubscriptionModule {}
