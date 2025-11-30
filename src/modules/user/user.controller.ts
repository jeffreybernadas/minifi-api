import { Controller, Get, Patch, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import {
  ApiStandardResponse,
  ApiStandardErrorResponse,
} from '@/decorators/swagger.decorator';
import { UserProfileDto } from './dto/user-profile.dto';
import { UpdateUserPreferencesDto } from './dto/update-user-preferences.dto';
import { KeycloakJWT } from './interfaces/keycloak-jwt.interface';
import { AuthenticatedUser } from 'nest-keycloak-connect';
import { UserService } from './user.service';

@ApiTags('users')
@ApiBearerAuth('JWT')
@Controller({
  path: 'users',
  version: '1',
})
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('/profile')
  @ApiOperation({
    summary: 'Get current user profile',
    description:
      'Retrieves the complete user profile by merging Keycloak authentication data with application-specific data from the local database. This endpoint also creates the user record in the database (sync-on-demand pattern).',
  })
  @ApiStandardResponse({
    description: 'User profile retrieved successfully',
    type: UserProfileDto,
  })
  @ApiStandardErrorResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
    errorCode: 'UNAUTHORIZED',
  })
  async getUserProfile(
    @AuthenticatedUser() keycloakUser: KeycloakJWT,
  ): Promise<UserProfileDto> {
    // Get user from database or create if doesn't exist (sync-on-demand)
    const localUser = await this.userService.getOrCreateUser(keycloakUser);

    // Merge Keycloak JWT data with local database data
    return {
      // Keycloak fields
      sub: keycloakUser.sub,
      email: keycloakUser.email,
      email_verified: keycloakUser.email_verified,
      preferred_username: keycloakUser.preferred_username,
      given_name: keycloakUser.given_name,
      family_name: keycloakUser.family_name,
      name: keycloakUser.name,
      realm_roles: keycloakUser.realm_access?.roles,
      client_roles: keycloakUser.resource_access,
      iat: keycloakUser.iat,
      exp: keycloakUser.exp,
      iss: keycloakUser.iss,
      aud: keycloakUser.aud,
      session_state: keycloakUser.session_state,
      azp: keycloakUser.azp,
      scope: keycloakUser.scope,
      jti: keycloakUser.jti,
      typ: keycloakUser.typ,
      sid: keycloakUser.sid,
      acr: keycloakUser.acr,
      'allowed-origins': keycloakUser['allowed-origins'],
      locale: keycloakUser.locale,
      picture: keycloakUser.picture,

      // Application-specific fields (from local database)
      emailNotificationsEnabled: localUser.emailNotificationsEnabled,
      phoneNumber: localUser.phoneNumber,
      avatarUrl: localUser.avatarUrl,
      address: localUser.address,
      createdAt: localUser.createdAt,
      updatedAt: localUser.updatedAt,
    };
  }

  @Patch('/preferences')
  @ApiOperation({
    summary: 'Update user preferences',
    description:
      'Updates app-specific user preferences such as email notification settings, phone number, avatar, and address. Keycloak-managed fields (email, name) cannot be updated here.',
  })
  @ApiStandardResponse({
    description: 'Preferences updated successfully',
    type: UpdateUserPreferencesDto,
  })
  @ApiStandardErrorResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
    errorCode: 'UNAUTHORIZED',
  })
  @ApiStandardErrorResponse({
    status: 404,
    description: 'User not found',
    errorCode: 'USER_NOT_FOUND',
  })
  async updatePreferences(
    @AuthenticatedUser() keycloakUser: KeycloakJWT,
    @Body() dto: UpdateUserPreferencesDto,
  ): Promise<UpdateUserPreferencesDto> {
    const updated = await this.userService.updatePreferences(
      keycloakUser.sub,
      dto,
    );

    return {
      emailNotificationsEnabled: updated.emailNotificationsEnabled,
      phoneNumber: updated.phoneNumber ?? undefined,
      avatarUrl: updated.avatarUrl ?? undefined,
      address: updated.address ?? undefined,
    };
  }
}
