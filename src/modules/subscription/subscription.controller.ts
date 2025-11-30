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
import {
  SubscriptionResponseDto,
  CheckoutSessionResponseDto,
  PortalSessionResponseDto,
  CancelSubscriptionResponseDto,
  WebhookReceivedResponseDto,
} from './dto/subscription-response.dto';

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
  @ApiOperation({
    summary: 'Get current subscription',
    description:
      'Returns the current user subscription. Creates a FREE subscription if none exists.',
  })
  @ApiStandardResponse({
    status: 200,
    description: 'Subscription retrieved',
    type: SubscriptionResponseDto,
  })
  getMe(@AuthenticatedUser() user: KeycloakJWT) {
    return this.subscriptionService.getOrCreateSubscription(user.sub);
  }

  @Post('checkout')
  @ApiOperation({
    summary: 'Create Stripe Checkout session for PRO upgrade',
    description:
      'Creates a Stripe Checkout session. Redirect the user to the returned URL to complete payment.',
  })
  @ApiStandardResponse({
    status: 200,
    description: 'Checkout session created',
    type: CheckoutSessionResponseDto,
  })
  createCheckout(@AuthenticatedUser() user: KeycloakJWT) {
    return this.stripeService.createCheckoutSession(user.sub);
  }

  @Post('portal')
  @ApiOperation({
    summary: 'Create Stripe Billing Portal session',
    description:
      'Creates a Stripe Billing Portal session where users can manage their subscription, update payment methods, and view invoices.',
  })
  @ApiStandardResponse({
    status: 200,
    description: 'Portal session created',
    type: PortalSessionResponseDto,
  })
  @ApiStandardErrorResponse({
    status: 400,
    description: 'User has not subscribed yet (no Stripe customer)',
    errorCode: 'BAD_REQUEST',
  })
  createPortal(@AuthenticatedUser() user: KeycloakJWT) {
    return this.stripeService.createPortalSession(user.sub);
  }

  @Post('cancel')
  @ApiOperation({
    summary: 'Cancel subscription at period end',
    description:
      'Schedules subscription cancellation at the end of the current billing period. User keeps PRO access until then.',
  })
  @ApiStandardResponse({
    status: 200,
    description: 'Subscription cancellation scheduled',
    type: CancelSubscriptionResponseDto,
  })
  @ApiStandardErrorResponse({
    status: 400,
    description: 'User has no active Stripe subscription',
    errorCode: 'BAD_REQUEST',
  })
  cancel(@AuthenticatedUser() user: KeycloakJWT) {
    return this.stripeService.cancelSubscription(user.sub);
  }

  @Public()
  @Post('webhook')
  @ApiOperation({
    summary: 'Stripe webhook endpoint',
    description:
      'Receives webhook events from Stripe. Do not call directly - this is called by Stripe servers.',
  })
  @ApiStandardResponse({
    status: 200,
    description: 'Webhook processed',
    type: WebhookReceivedResponseDto,
  })
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
