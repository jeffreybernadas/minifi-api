import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KEYCLOAK_INSTANCE } from 'nest-keycloak-connect';
import type { KeycloakConfig } from '@/config/keycloak/keycloak-config.type';
import type { KeycloakJWT } from '@/modules/user/interfaces/keycloak-jwt.interface';

/**
 * Service for Keycloak authentication utilities
 * - Token validation for WebSocket connections
 * - Role checking (admin detection)
 */
@Injectable()
export class KeycloakAuthService {
  private readonly clientId: string;

  constructor(
    @Inject(KEYCLOAK_INSTANCE)
    private readonly keycloak: {
      grantManager: {
        createGrant: (data: { access_token: string }) => Promise<{
          access_token?: { content?: KeycloakJWT };
        }>;
      };
    },
    private readonly configService: ConfigService,
  ) {
    this.clientId =
      this.configService.getOrThrow<KeycloakConfig>('keycloak')?.clientId ?? '';
  }

  /**
   * Validate a JWT token and extract user information
   * @param token JWT access token
   * @returns User information from token or null if invalid
   */
  async validateToken(token: string): Promise<KeycloakJWT | null> {
    const grant = await this.keycloak.grantManager.createGrant({
      access_token: token,
    });

    const user = grant.access_token?.content;

    if (!user?.sub) {
      return null;
    }

    return user;
  }

  /**
   * Check if a user has admin role from JWT claims
   * Checks both realm roles and client-specific resource roles
   * @param user Keycloak JWT payload
   * @returns true if user has admin or superadmin role
   */
  isAdmin(user: KeycloakJWT | null | undefined): boolean {
    if (!user) return false;

    const realmRoles = user.realm_access?.roles ?? [];
    const resourceRoles = user.resource_access?.[this.clientId]?.roles ?? [];
    const allRoles = [...realmRoles, ...resourceRoles];

    return allRoles.includes('admin') || allRoles.includes('superadmin');
  }
}
