import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  Post,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser, Public } from 'nest-keycloak-connect';
import { KeycloakJWT } from '../user/interfaces/keycloak-jwt.interface';
import { SubscriptionService } from './subscription.service';
import { StripeService } from './stripe.service';
import {
  ApiStandardErrorResponse,
  ApiStandardResponse,
} from '@/decorators/swagger.decorator';
import { Request } from 'express';
import { LoggerService } from '@/shared/logger/logger.service';

@ApiTags('subscriptions')
@ApiBearerAuth('JWT')
@Controller({ path: 'subscriptions', version: '1' })
export class SubscriptionController {
  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly stripeService: StripeService,
    private readonly logger: LoggerService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current subscription' })
  @ApiStandardResponse({ status: 200, description: 'Subscription retrieved' })
  getMe(@AuthenticatedUser() user: KeycloakJWT) {
    return this.subscriptionService.getOrCreateSubscription(user.sub);
  }

  @Post('checkout')
  @ApiOperation({ summary: 'Create Stripe Checkout session for PRO upgrade' })
  @ApiStandardResponse({ status: 200, description: 'Checkout session created' })
  createCheckout(@AuthenticatedUser() user: KeycloakJWT) {
    return this.stripeService.createCheckoutSession(user.sub);
  }

  @Post('portal')
  @ApiOperation({ summary: 'Create Stripe Billing Portal session' })
  @ApiStandardResponse({ status: 200, description: 'Portal session created' })
  createPortal(@AuthenticatedUser() user: KeycloakJWT) {
    return this.stripeService.createPortalSession(user.sub);
  }

  @Post('cancel')
  @ApiOperation({ summary: 'Cancel subscription at period end' })
  @ApiStandardResponse({
    status: 200,
    description: 'Subscription cancellation queued',
  })
  @ApiStandardErrorResponse({
    status: 400,
    description: 'Stripe subscription not found',
    errorCode: 'BAD_REQUEST',
  })
  cancel(@AuthenticatedUser() user: KeycloakJWT) {
    return this.stripeService.cancelSubscription(user.sub);
  }

  @Public()
  @Post('webhook')
  @ApiOperation({ summary: 'Stripe webhook endpoint' })
  async webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    const rawBody = req.rawBody;
    if (!rawBody) {
      this.logger.error('Stripe webhook: rawBody is missing', 'StripeWebhook');
      throw new BadRequestException('Webhook payload missing');
    }

    this.logger.log('Stripe webhook received', 'StripeWebhook', {
      signaturePresent: Boolean(signature),
      bodyLength: rawBody.length,
      isBuffer: Buffer.isBuffer(rawBody),
      signatureStart: signature?.substring(0, 50),
    });

    const event = this.stripeService.verifyAndParseWebhook(rawBody, signature);

    await this.stripeService.syncFromStripeEvent(event);
    return { received: true };
  }
}
