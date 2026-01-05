import {
  CanActivate,
  ExecutionContext,
  Injectable,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '@/database/database.service';
import { KeycloakJWT } from '@/modules/user/interfaces/keycloak-jwt.interface';
import { CustomErrorException } from '@/filters/exceptions/custom-error.exception';
import { CustomErrorCode } from '@/enums/custom-error-enum';

/**
 * Metadata key used by @Public() decorator from nest-keycloak-connect
 * The @Public() decorator sets this metadata to true
 */
const META_UNPROTECTED = 'unprotected';

/**
 * Guard that prevents blocked users from accessing protected resources.
 * Should be applied after AuthGuard so we have the authenticated user.
 *
 * - Skips check for public/unprotected routes (marked with @Public())
 * - Skips check if user not authenticated (AuthGuard will handle)
 * - Checks database for isBlocked flag
 * - Throws ForbiddenException with specific code if blocked
 */
@Injectable()
export class BlockedUserGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is public/unprotected (skip blocked check)
    // @Public() decorator sets META_UNPROTECTED to true
    const isUnprotected = this.reflector.getAllAndOverride<boolean>(
      META_UNPROTECTED,
      [context.getHandler(), context.getClass()],
    );

    if (isUnprotected) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as KeycloakJWT | undefined;

    // If no user (not authenticated), let AuthGuard handle it
    if (!user?.sub) {
      return true;
    }

    // Check if user is blocked in database
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.sub },
      select: { isBlocked: true, blockedReason: true },
    });

    // If user doesn't exist in DB yet (first login), they're not blocked
    if (!dbUser) {
      return true;
    }

    if (dbUser.isBlocked) {
      throw new CustomErrorException(
        dbUser.blockedReason ||
          'Your account has been suspended. Please contact support for assistance.',
        HttpStatus.FORBIDDEN,
        CustomErrorCode.BLOCKED_USER_ERROR_CODE,
      );
    }

    return true;
  }
}
