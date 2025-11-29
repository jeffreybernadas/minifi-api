import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { SubscriptionService } from '@/modules/subscription/subscription.service';
import { KeycloakJWT } from '@/modules/user/interfaces/keycloak-jwt.interface';

@Injectable()
export class SubscriptionTierGuard implements CanActivate {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user = req.user as KeycloakJWT | undefined;

    if (!user?.sub) {
      throw new UnauthorizedException();
    }

    const subscription = await this.subscriptionService.getOrCreateSubscription(
      user.sub,
    );

    const requiresPro = Boolean(req.body?.customAlias);

    if (requiresPro && subscription.tier !== 'PRO') {
      throw new ForbiddenException(
        'This feature is available for PRO subscribers. Upgrade to PRO to use custom aliases and other premium features.',
      );
    }

    return true;
  }
}
