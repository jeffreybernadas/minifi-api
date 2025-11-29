import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '@/database/database.service';
import { SubscriptionService } from '@/modules/subscription/subscription.service';
import { KeycloakJWT } from '@/modules/user/interfaces/keycloak-jwt.interface';

@Injectable()
export class UsageLimitGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user = req.user as KeycloakJWT | undefined;

    if (!user?.sub) {
      throw new UnauthorizedException();
    }
    const userId = user.sub;

    const subscription =
      await this.subscriptionService.getOrCreateSubscription(userId);

    if (subscription.tier === 'PRO') {
      return true;
    }

    // FREE cap: 25 active (not archived) links
    const activeCount = await this.prisma.link.count({
      where: { userId, isArchived: false },
    });

    if (activeCount >= 25) {
      throw new ForbiddenException(
        'Free plan limit reached: 25 active links. Upgrade to PRO for unlimited links and advanced features.',
      );
    }

    return true;
  }
}
