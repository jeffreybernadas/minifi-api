import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/database/database.service';
import { LoggerService } from '@/shared/logger/logger.service';
import { User } from '@prisma/client';
import { KeycloakJWT } from './interfaces/keycloak-jwt.interface';

/**
 * Service for managing user profiles with sync-on-demand pattern
 * Users are created in the local database on their first profile fetch
 * after login/registration in Keycloak
 */
@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Get user from local database or create if doesn't exist (sync-on-demand)
   * Flow:
   * - Check if user exists in database using Keycloak sub (user ID)
   * - If exists: Return existing user record (no update)
   * - If not exists: Create new user with Keycloak data + null local fields
   *
   * @param keycloakUser - Decoded JWT token from Keycloak
   * @returns Local database user record
   */
  async getOrCreateUser(keycloakUser: KeycloakJWT): Promise<User> {
    const userId = keycloakUser.sub;

    try {
      // Check if user exists in database
      let user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      // If user exists, return it (no update needed)
      if (user) {
        return user;
      }

      // User doesn't exist, create new record
      this.logger.log(
        `Creating new user in database: ${userId}`,
        'UserService',
      );

      user = await this.prisma.user.create({
        data: {
          // Use Keycloak sub as primary key
          id: userId,
          // Keycloak fields (cached for reference)
          email: keycloakUser.email,
          username: keycloakUser.preferred_username,
          firstName: keycloakUser.given_name,
          lastName: keycloakUser.family_name,
          emailVerified: keycloakUser.email_verified ?? false,
          // Application-specific fields (start as null)
          phoneNumber: null,
          avatarUrl: null,
          address: null,
        },
      });
      return user;
    } catch (error) {
      this.logger.error(
        `Failed to get or create user ${userId}`,
        String(error),
        'UserService',
      );
      throw error;
    }
  }
}
