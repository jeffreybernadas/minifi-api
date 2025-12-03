import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/database/database.service';
import { LoggerService } from '@/shared/logger/logger.service';
import { EmailProducer } from '@/shared/queues/email/email.producer';
import { EmailRenderer } from '@/utils/email/email.util';
import { User } from '@/generated/prisma/client';
import { KeycloakJWT } from './interfaces/keycloak-jwt.interface';
import { UpdateUserPreferencesDto } from './dto/update-user-preferences.dto';
import { GlobalConfig } from '@/config/config.type';

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
    private readonly emailProducer: EmailProducer,
    private readonly configService: ConfigService<GlobalConfig>,
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

      // Check if user has admin role from Keycloak JWT
      const realmRoles = keycloakUser.realm_access?.roles ?? [];
      const resourceRoles =
        keycloakUser.resource_access?.['minifi']?.roles ?? [];
      const allRoles = [...realmRoles, ...resourceRoles];
      const isAdmin =
        allRoles.includes('admin') || allRoles.includes('superadmin');

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
          // Admin role flag
          isAdmin,
        },
      });

      // Send welcome email to new user
      await this.sendWelcomeEmail(user);

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

  /**
   * Update user preferences (app-specific fields only)
   * Keycloak fields (email, name, etc.) cannot be updated here
   *
   * @param userId - Keycloak sub (user ID)
   * @param dto - Fields to update
   * @returns Updated user record
   * @throws NotFoundException if user doesn't exist
   */
  async updatePreferences(
    userId: string,
    dto: UpdateUserPreferencesDto,
  ): Promise<User> {
    // Verify user exists first
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(
        'User not found. Please access your profile first to sync your account.',
      );
    }

    this.logger.log(`Updating preferences for user: ${userId}`, 'UserService');

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.emailNotificationsEnabled !== undefined && {
          emailNotificationsEnabled: dto.emailNotificationsEnabled,
        }),
        ...(dto.phoneNumber !== undefined && { phoneNumber: dto.phoneNumber }),
        ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
        ...(dto.address !== undefined && { address: dto.address }),
      },
    });
  }

  /**
   * Send welcome email to newly created user
   */
  private async sendWelcomeEmail(user: User): Promise<void> {
    try {
      const dashboardUrl = this.configService.getOrThrow('app.url', {
        infer: true,
      });
      const defaultSender = this.configService.getOrThrow('resend.sender', {
        infer: true,
      });

      const html = await EmailRenderer.renderWelcome({
        firstName: user.firstName ?? undefined,
        dashboardUrl: `${dashboardUrl}/dashboard`,
      });

      await this.emailProducer.publishSendEmail({
        userId: user.id,
        to: user.email,
        subject: 'Welcome to Minifi! 🎉',
        html,
        from: defaultSender,
      });

      this.logger.log(`Welcome email sent to user: ${user.id}`, 'UserService');
    } catch (error) {
      // Don't fail user creation if email fails
      this.logger.error(
        `Failed to send welcome email to user: ${user.id}`,
        'UserService',
        { error: error instanceof Error ? error.message : 'Unknown error' },
      );
    }
  }
}
