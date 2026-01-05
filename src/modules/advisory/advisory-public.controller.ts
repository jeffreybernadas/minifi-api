import { Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from 'nest-keycloak-connect';
import {
  ApiStandardResponse,
  ApiStandardErrorResponse,
} from '@/decorators/swagger.decorator';
import { KeycloakJWT } from '@/modules/user/interfaces/keycloak-jwt.interface';
import { AdvisoryService } from './advisory.service';
import { AdvisoryResponseDto } from './dto';

@ApiTags('advisories')
@ApiBearerAuth('JWT')
@Controller({ path: 'advisories', version: '1' })
export class AdvisoryPublicController {
  constructor(private readonly advisoryService: AdvisoryService) {}

  @Get('active')
  @ApiOperation({
    summary: 'Get active advisories for current user',
    description:
      'Returns all published advisories that the current user has not dismissed and are not expired.',
  })
  @ApiStandardResponse({
    status: 200,
    description: 'Active advisories retrieved successfully',
    type: AdvisoryResponseDto,
    isArray: true,
  })
  @ApiStandardErrorResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
    errorCode: 'UNAUTHORIZED',
  })
  getActive(
    @AuthenticatedUser() user: KeycloakJWT,
  ): Promise<AdvisoryResponseDto[]> {
    return this.advisoryService.getActiveForUser(user.sub);
  }

  @Post(':id/dismiss')
  @ApiOperation({
    summary: 'Dismiss an advisory',
    description:
      'Marks an advisory as dismissed for the current user. The advisory will no longer appear in their active list.',
  })
  @ApiStandardResponse({
    status: 200,
    description: 'Advisory dismissed successfully',
  })
  @ApiStandardErrorResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
    errorCode: 'UNAUTHORIZED',
  })
  @ApiStandardErrorResponse({
    status: 404,
    description: 'Advisory not found',
    errorCode: 'NOT_FOUND',
  })
  dismiss(
    @AuthenticatedUser() user: KeycloakJWT,
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    return this.advisoryService.dismiss(user.sub, id);
  }
}
