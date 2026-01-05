import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { KeycloakJWT } from '@/modules/user/interfaces/keycloak-jwt.interface';
import { KeycloakAuthService } from '@/shared/keycloak/keycloak-auth.service';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly keycloakAuthService: KeycloakAuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as KeycloakJWT | undefined;

    if (!user?.sub) {
      throw new UnauthorizedException('Authentication required');
    }

    if (!this.keycloakAuthService.isAdmin(user)) {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}
