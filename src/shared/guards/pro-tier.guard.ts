import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { KeycloakJWT } from '@/modules/user/interfaces/keycloak-jwt.interface';
import { SubscriptionService } from '@/modules/subscription/subscription.service';
import { KeycloakAuthService } from '@/shared/keycloak/keycloak-auth.service';

/**
 * ProTierGuard
 * Restricts access to PRO subscribers only.
 * Used for chat endpoints (PRO-to-admin chat feature).
 */
@Injectable()
export class ProTierGuard implements CanActivate {
  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly keycloakAuthService: KeycloakAuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user = req.user as KeycloakJWT | undefined;

    if (!user?.sub) {
      throw new UnauthorizedException();
    }

    // Admin users can bypass subscription check
    if (this.keycloakAuthService.isAdmin(user)) {
      return true;
    }

    const subscription = await this.subscriptionService.getOrCreateSubscription(
      user.sub,
    );

    if (subscription.tier !== 'PRO') {
      throw new ForbiddenException(
        'Chat is available for PRO subscribers only. Upgrade to PRO to access direct support.',
      );
    }

    return true;
  }
}
