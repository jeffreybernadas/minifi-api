import { Inject, Injectable } from '@nestjs/common';
import { KEYCLOAK_INSTANCE } from 'nest-keycloak-connect';
import type { KeycloakJWT } from '@/modules/user/interfaces/keycloak-jwt.interface';

/**
 * Service for Keycloak token validation
 * Wraps KEYCLOAK_INSTANCE to provide token validation for WebSocket connections
 */
@Injectable()
export class KeycloakAuthService {
  constructor(
    @Inject(KEYCLOAK_INSTANCE)
    private readonly keycloak: {
      grantManager: {
        createGrant: (data: { access_token: string }) => Promise<{
          access_token?: { content?: KeycloakJWT };
        }>;
      };
    },
  ) {}

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
}
