import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { SubscriptionService } from '@/modules/subscription/subscription.service';
import { KeycloakJWT } from '@/modules/user/interfaces/keycloak-jwt.interface';

/**
 * ProTierGuard
 * Restricts access to PRO subscribers only.
 * Used for chat endpoints (PRO-to-admin chat feature).
 */
@Injectable()
export class ProTierGuard implements CanActivate {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user = req.user as KeycloakJWT | undefined;

    if (!user?.sub) {
      throw new UnauthorizedException();
    }

    // Admin users can bypass subscription check
    const realmRoles = user.realm_access?.roles ?? [];
    const resourceRoles = user.resource_access?.['minifi']?.roles ?? [];
    const allRoles = [...realmRoles, ...resourceRoles];
    const isAdmin =
      allRoles.includes('admin') || allRoles.includes('superadmin');

    if (isAdmin) {
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
