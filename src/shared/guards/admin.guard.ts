import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { KeycloakJWT } from '@/modules/user/interfaces/keycloak-jwt.interface';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as KeycloakJWT | undefined;

    if (!user?.sub) {
      throw new UnauthorizedException('Authentication required');
    }

    const realmRoles = user.realm_access?.roles ?? [];
    const resourceRoles = user.resource_access?.['minifi-api']?.roles ?? [];
    const allRoles = [...realmRoles, ...resourceRoles];

    const isAdmin =
      allRoles.includes('admin') || allRoles.includes('superadmin');

    if (!isAdmin) {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}
