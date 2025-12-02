import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from 'nest-keycloak-connect';
import { AdminGuard } from '@/shared/guards/admin.guard';
import { AdminLinkService } from './admin-link.service';
import { KeycloakJWT } from '@/modules/user/interfaces/keycloak-jwt.interface';
import {
  ApiStandardResponse,
  ApiStandardErrorResponse,
  ApiPaginatedResponse,
} from '@/decorators/swagger.decorator';
import { OffsetPaginatedDto } from '@/common/dto/offset-pagination';
import {
  AdminLinkFilterDto,
  AdminLinkResponseDto,
  AdminLinkDetailDto,
  AdminEditLinkDto,
  BlockLinkDto,
} from './dto';

@ApiTags('admin/links')
@ApiBearerAuth('JWT')
@UseGuards(AdminGuard)
@Controller({ path: 'admin/links', version: '1' })
export class AdminLinkController {
  constructor(private readonly adminLinkService: AdminLinkService) {}

  @Get()
  @ApiOperation({
    summary: 'List all links',
    description:
      'Returns a paginated list of all links with optional filtering by status, scan status, guest flag, archived status, user ID, and search query.',
  })
  @ApiPaginatedResponse(AdminLinkResponseDto)
  @ApiStandardErrorResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
    errorCode: 'UNAUTHORIZED',
  })
  @ApiStandardErrorResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
    errorCode: 'FORBIDDEN',
  })
  getLinks(
    @Query() filters: AdminLinkFilterDto,
  ): Promise<OffsetPaginatedDto<AdminLinkResponseDto>> {
    return this.adminLinkService.getLinks(filters);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get link details',
    description:
      'Returns detailed information about a specific link including scan details, guest info, and notes.',
  })
  @ApiStandardResponse({
    status: 200,
    description: 'Link details retrieved successfully',
    type: AdminLinkDetailDto,
  })
  @ApiStandardErrorResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
    errorCode: 'UNAUTHORIZED',
  })
  @ApiStandardErrorResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
    errorCode: 'FORBIDDEN',
  })
  @ApiStandardErrorResponse({
    status: 404,
    description: 'Link not found',
    errorCode: 'NOT_FOUND',
  })
  getLinkById(@Param('id') id: string): Promise<AdminLinkDetailDto> {
    return this.adminLinkService.getLinkById(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Edit a link',
    description:
      'Updates link properties including title, description, status, custom alias, expiration, click limit, archived status, and notes.',
  })
  @ApiStandardResponse({
    status: 200,
    description: 'Link updated successfully',
    type: AdminLinkDetailDto,
  })
  @ApiStandardErrorResponse({
    status: 400,
    description: 'Invalid update data',
    errorCode: 'VALIDATION_ERROR',
  })
  @ApiStandardErrorResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
    errorCode: 'UNAUTHORIZED',
  })
  @ApiStandardErrorResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
    errorCode: 'FORBIDDEN',
  })
  @ApiStandardErrorResponse({
    status: 404,
    description: 'Link not found',
    errorCode: 'NOT_FOUND',
  })
  editLink(
    @Param('id') id: string,
    @Body() dto: AdminEditLinkDto,
  ): Promise<AdminLinkDetailDto> {
    return this.adminLinkService.editLink(id, dto);
  }

  @Patch(':id/block')
  @ApiOperation({
    summary: 'Block a link',
    description:
      'Blocks a link with a specified reason. Blocked links cannot be accessed via their short code.',
  })
  @ApiStandardResponse({
    status: 200,
    description: 'Link blocked successfully',
    type: AdminLinkDetailDto,
  })
  @ApiStandardErrorResponse({
    status: 400,
    description: 'Invalid block reason',
    errorCode: 'VALIDATION_ERROR',
  })
  @ApiStandardErrorResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
    errorCode: 'UNAUTHORIZED',
  })
  @ApiStandardErrorResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
    errorCode: 'FORBIDDEN',
  })
  @ApiStandardErrorResponse({
    status: 404,
    description: 'Link not found',
    errorCode: 'NOT_FOUND',
  })
  blockLink(
    @Param('id') id: string,
    @Body() dto: BlockLinkDto,
  ): Promise<AdminLinkDetailDto> {
    return this.adminLinkService.blockLink(id, dto.reason);
  }

  @Patch(':id/unblock')
  @ApiOperation({
    summary: 'Unblock a link',
    description:
      'Removes the block from a link, restoring access. The status is intelligently determined based on scheduling and expiration.',
  })
  @ApiStandardResponse({
    status: 200,
    description: 'Link unblocked successfully',
    type: AdminLinkDetailDto,
  })
  @ApiStandardErrorResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
    errorCode: 'UNAUTHORIZED',
  })
  @ApiStandardErrorResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
    errorCode: 'FORBIDDEN',
  })
  @ApiStandardErrorResponse({
    status: 404,
    description: 'Link not found',
    errorCode: 'NOT_FOUND',
  })
  unblockLink(@Param('id') id: string): Promise<AdminLinkDetailDto> {
    return this.adminLinkService.unblockLink(id);
  }

  @Post(':id/rescan')
  @ApiOperation({
    summary: 'Force security rescan',
    description:
      'Queues the link for a security rescan using OpenAI. Resets scan status to PENDING.',
  })
  @ApiStandardResponse({
    status: 202,
    description: 'Rescan queued successfully',
    type: AdminLinkDetailDto,
  })
  @ApiStandardErrorResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
    errorCode: 'UNAUTHORIZED',
  })
  @ApiStandardErrorResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
    errorCode: 'FORBIDDEN',
  })
  @ApiStandardErrorResponse({
    status: 404,
    description: 'Link not found',
    errorCode: 'NOT_FOUND',
  })
  rescanLink(
    @AuthenticatedUser() admin: KeycloakJWT,
    @Param('id') id: string,
  ): Promise<AdminLinkDetailDto> {
    return this.adminLinkService.rescanLink(id, admin.sub);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a link permanently',
    description:
      'Permanently deletes a link and all associated analytics data. This action is irreversible.',
  })
  @ApiStandardResponse({
    status: 200,
    description: 'Link deleted successfully',
  })
  @ApiStandardErrorResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
    errorCode: 'UNAUTHORIZED',
  })
  @ApiStandardErrorResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
    errorCode: 'FORBIDDEN',
  })
  @ApiStandardErrorResponse({
    status: 404,
    description: 'Link not found',
    errorCode: 'NOT_FOUND',
  })
  deleteLink(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.adminLinkService.deleteLink(id);
  }
}
