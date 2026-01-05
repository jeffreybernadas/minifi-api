import { Module } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { SubscriptionController } from './subscription.controller';
import { StripeService } from './stripe.service';
import { SubscriptionTierGuard } from '@/shared/guards/subscription-tier.guard';
import { UsageLimitGuard } from '@/shared/guards/usage-limit.guard';
import { EmailQueueModule } from '@/shared/queues/email/email.module';

@Module({
  imports: [EmailQueueModule],
  controllers: [SubscriptionController],
  providers: [
    SubscriptionService,
    StripeService,
    SubscriptionTierGuard,
    UsageLimitGuard,
  ],
  exports: [
    SubscriptionService,
    StripeService,
    SubscriptionTierGuard,
    UsageLimitGuard,
  ],
})
export class SubscriptionModule {}
