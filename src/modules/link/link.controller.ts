import { AuthenticatedUser, Public } from 'nest-keycloak-connect';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { LinkService } from './link.service';
import { CreateLinkDto } from './dto/create-link.dto';
import { CreateGuestLinkDto } from './dto/create-guest-link.dto';
import { LinkFilterDto } from './dto/link-filter.dto';
import { UpdateLinkDto } from './dto/update-link.dto';
import { KeycloakJWT } from '../user/interfaces/keycloak-jwt.interface';
import {
  ApiStandardResponse,
  ApiStandardErrorResponse,
  ApiPaginatedResponse,
} from '@/decorators/swagger.decorator';
import { LinkResponseDto } from './dto/link-response.dto';
import { OffsetPaginatedDto } from '@/common/dto/offset-pagination';
import {
  LinkAnalyticsResponseDto,
  LinkAnalyticsSummaryDto,
} from './dto/analytics-response.dto';
import { AnalyticsFilterDto } from './dto/analytics-filter.dto';
import { QrCodeResponseDto } from './dto/qr-code-response.dto';
import { UseGuards } from '@nestjs/common';
import { SubscriptionTierGuard } from '@/shared/guards/subscription-tier.guard';
import { UsageLimitGuard } from '@/shared/guards/usage-limit.guard';

@ApiTags('links')
@ApiBearerAuth('JWT')
@Controller({ path: 'links', version: '1' })
export class LinkController {
  constructor(private readonly linkService: LinkService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a short link (authenticated users)',
    description:
      'Creates a new shortened link for authenticated users. Supports advanced features like custom aliases (PRO only), password protection, scheduling, click limits, tags, and more. Link retention varies by user tier: FREE (3 months), PRO (2 years).',
  })
  @ApiStandardResponse({
    status: 201,
    description: 'Link created successfully',
    type: LinkResponseDto,
  })
  @ApiStandardErrorResponse({
    status: 400,
    description: 'Validation Error - Invalid input data',
    errorCode: 'VALIDATION_ERROR',
  })
  @ApiStandardErrorResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
    errorCode: 'UNAUTHORIZED',
  })
  @ApiStandardErrorResponse({
    status: 403,
    description: 'Forbidden - Custom aliases require PRO tier',
    errorCode: 'FORBIDDEN',
  })
  @UseGuards(UsageLimitGuard, SubscriptionTierGuard)
  createLink(
    @AuthenticatedUser() user: KeycloakJWT,
    @Body() dto: CreateLinkDto,
  ): Promise<LinkResponseDto> {
    return this.linkService.createLink(user.sub, dto);
  }

  @Public()
  @Post('guest')
  @ApiOperation({
    summary: 'Create a short link as guest (no authentication required)',
    description:
      'Creates a shortened link without authentication. Guest users are limited to 5 links per day with 3-day retention. No advanced features available (no custom aliases, password protection, scheduling, tags, etc.). Rate limited by IP address.',
  })
  @ApiStandardResponse({
    status: 201,
    description: 'Guest link created successfully',
    type: LinkResponseDto,
  })
  @ApiStandardErrorResponse({
    status: 400,
    description: 'Validation Error - Invalid URL format',
    errorCode: 'VALIDATION_ERROR',
  })
  @ApiStandardErrorResponse({
    status: 429,
    description: 'Too Many Requests - Guest limit of 5 links per day exceeded',
    errorCode: 'TOO_MANY_REQUESTS',
  })
  createGuestLink(
    @Body() dto: CreateGuestLinkDto,
    @Req() req: Request,
  ): Promise<LinkResponseDto> {
    const ipAddress =
      (req.headers['x-forwarded-for'] as string) ||
      req.ip ||
      req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.linkService.createGuestLink(dto, ipAddress, userAgent);
  }

  @Get()
  @ApiOperation({
    summary: 'List user links with filters and pagination',
    description:
      'Retrieves paginated list of links belonging to the authenticated user. Supports filtering by status, tags, archived state, and searching by title/description/URL. Results are ordered by creation date (newest first by default).',
  })
  @ApiPaginatedResponse(LinkResponseDto)
  @ApiStandardErrorResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
    errorCode: 'UNAUTHORIZED',
  })
  getUserLinks(
    @AuthenticatedUser() user: KeycloakJWT,
    @Query() filters: LinkFilterDto,
  ): Promise<OffsetPaginatedDto<LinkResponseDto>> {
    return this.linkService.getUserLinks(user.sub, filters);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a single link by ID',
    description:
      'Retrieves detailed information about a specific link. User must be the owner of the link to access this information.',
  })
  @ApiStandardResponse({
    status: 200,
    description: 'Link details retrieved successfully',
    type: LinkResponseDto,
  })
  @ApiStandardErrorResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
    errorCode: 'UNAUTHORIZED',
  })
  @ApiStandardErrorResponse({
    status: 404,
    description: 'Not Found - Link does not exist or user is not the owner',
    errorCode: 'NOT_FOUND',
  })
  getLinkById(
    @AuthenticatedUser() user: KeycloakJWT,
    @Param('id') id: string,
  ): Promise<LinkResponseDto> {
    return this.linkService.getLinkById(id, user.sub);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update an existing link',
    description:
      'Updates properties of an existing link. User must be the owner. Can update title, description, custom alias, password, scheduling, expiration, click limits, tags, and more. Custom aliases require PRO tier.',
  })
  @ApiStandardResponse({
    status: 200,
    description: 'Link updated successfully',
    type: LinkResponseDto,
  })
  @ApiStandardErrorResponse({
    status: 400,
    description: 'Validation Error - Invalid update data',
    errorCode: 'VALIDATION_ERROR',
  })
  @ApiStandardErrorResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
    errorCode: 'UNAUTHORIZED',
  })
  @ApiStandardErrorResponse({
    status: 403,
    description: 'Forbidden - Custom aliases require PRO tier',
    errorCode: 'FORBIDDEN',
  })
  @ApiStandardErrorResponse({
    status: 404,
    description: 'Not Found - Link does not exist or user is not the owner',
    errorCode: 'NOT_FOUND',
  })
  updateLink(
    @AuthenticatedUser() user: KeycloakJWT,
    @Param('id') id: string,
    @Body() dto: UpdateLinkDto,
  ): Promise<LinkResponseDto> {
    return this.linkService.updateLink(id, user.sub, dto);
  }

  @Post(':id/rescan')
  @ApiOperation({
    summary: 'Request URL scan for a link',
    description:
      'Queues a URL scan using OpenAI and resets the link scan status to PENDING. Returns the link data immediately.',
  })
  @ApiStandardResponse({
    status: 202,
    description: 'Rescan queued; scan status set to PENDING',
    type: LinkResponseDto,
  })
  @ApiStandardErrorResponse({
    status: 404,
    description: 'Not Found - Link does not exist or user is not the owner',
    errorCode: 'NOT_FOUND',
  })
  requestScan(
    @AuthenticatedUser() user: KeycloakJWT,
    @Param('id') id: string,
  ): Promise<LinkResponseDto> {
    return this.linkService.requestScan(id, user.sub, true);
  }

  @Post(':id/qr')
  @ApiOperation({
    summary: 'Generate a QR code for a link',
    description:
      'Generates a QR code pointing to the short URL and uploads it to storage. Returns the QR code URL and stores it on the link record.',
  })
  @ApiStandardResponse({
    status: 200,
    description: 'QR code generated successfully',
    type: QrCodeResponseDto,
  })
  @ApiStandardErrorResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
    errorCode: 'UNAUTHORIZED',
  })
  @ApiStandardErrorResponse({
    status: 404,
    description: 'Not Found - Link does not exist or user is not the owner',
    errorCode: 'NOT_FOUND',
  })
  generateQrCode(
    @AuthenticatedUser() user: KeycloakJWT,
    @Param('id') id: string,
  ) {
    return this.linkService.generateQrCode(id, user.sub);
  }

  @Patch(':id/archive')
  @ApiOperation({
    summary: 'Archive a link (soft delete)',
    description:
      'Archives a link by marking it as archived. The link becomes inactive and cannot be accessed via its short code, but all data is preserved in the database. Archived links can be restored using the unarchive endpoint. User must be the owner of the link.',
  })
  @ApiStandardResponse({
    status: 200,
    description: 'Link archived successfully',
    type: LinkResponseDto,
  })
  @ApiStandardErrorResponse({
    status: 400,
    description: 'Bad Request - Link is already archived',
    errorCode: 'BAD_REQUEST',
  })
  @ApiStandardErrorResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
    errorCode: 'UNAUTHORIZED',
  })
  @ApiStandardErrorResponse({
    status: 404,
    description: 'Not Found - Link does not exist or user is not the owner',
    errorCode: 'NOT_FOUND',
  })
  archiveLink(
    @AuthenticatedUser() user: KeycloakJWT,
    @Param('id') id: string,
  ): Promise<LinkResponseDto> {
    return this.linkService.archiveLink(id, user.sub);
  }

  @Patch(':id/unarchive')
  @ApiOperation({
    summary: 'Unarchive a link (restore)',
    description:
      'Restores an archived link by marking it as active. The link becomes accessible again via its short code. The status is intelligently determined: SCHEDULED if scheduledAt is in the future, DISABLED if already expired, or ACTIVE otherwise. User must be the owner of the link.',
  })
  @ApiStandardResponse({
    status: 200,
    description: 'Link unarchived successfully',
    type: LinkResponseDto,
  })
  @ApiStandardErrorResponse({
    status: 400,
    description: 'Bad Request - Link is not archived',
    errorCode: 'BAD_REQUEST',
  })
  @ApiStandardErrorResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
    errorCode: 'UNAUTHORIZED',
  })
  @ApiStandardErrorResponse({
    status: 404,
    description: 'Not Found - Link does not exist or user is not the owner',
    errorCode: 'NOT_FOUND',
  })
  unarchiveLink(
    @AuthenticatedUser() user: KeycloakJWT,
    @Param('id') id: string,
  ): Promise<LinkResponseDto> {
    return this.linkService.unarchiveLink(id, user.sub);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a link permanently (hard delete)',
    description:
      'Permanently deletes a link from the database. This action is irreversible and all associated data (analytics, tags) will also be deleted due to cascade constraints. The link cannot be recovered after deletion. For temporary hiding, use the archive endpoint instead. User must be the owner of the link.',
  })
  @ApiStandardResponse({
    status: 200,
    description: 'Link permanently deleted successfully',
  })
  @ApiStandardErrorResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
    errorCode: 'UNAUTHORIZED',
  })
  @ApiStandardErrorResponse({
    status: 404,
    description: 'Not Found - Link does not exist or user is not the owner',
    errorCode: 'NOT_FOUND',
  })
  deleteLink(
    @AuthenticatedUser() user: KeycloakJWT,
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    return this.linkService.deleteLink(id, user.sub);
  }

  @Get(':id/analytics')
  @ApiOperation({
    summary: 'Get link analytics (paginated detail)',
    description:
      'Returns click-level analytics for a link (IP, UA, geo, UTM, referrer). User must own the link.',
  })
  @ApiPaginatedResponse(LinkAnalyticsResponseDto)
  @ApiStandardErrorResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
    errorCode: 'UNAUTHORIZED',
  })
  @ApiStandardErrorResponse({
    status: 404,
    description: 'Not Found - Link does not exist or user is not the owner',
    errorCode: 'NOT_FOUND',
  })
  getLinkAnalytics(
    @AuthenticatedUser() user: KeycloakJWT,
    @Param('id') id: string,
    @Query() filters: AnalyticsFilterDto,
  ): Promise<OffsetPaginatedDto<LinkAnalyticsResponseDto>> {
    return this.linkService.getLinkAnalytics(id, user.sub, filters);
  }

  @Get(':id/analytics/summary')
  @ApiOperation({
    summary: 'Get link analytics summary',
    description:
      'Returns summary analytics for a link: total clicks, unique visitors, top countries/cities/devices/browsers/referrers, and clicks by date. User must own the link.',
  })
  @ApiStandardResponse({
    status: 200,
    description: 'Analytics summary retrieved successfully',
    type: LinkAnalyticsSummaryDto,
  })
  @ApiStandardErrorResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
    errorCode: 'UNAUTHORIZED',
  })
  @ApiStandardErrorResponse({
    status: 404,
    description: 'Not Found - Link does not exist or user is not the owner',
    errorCode: 'NOT_FOUND',
  })
  getAnalyticsSummary(
    @AuthenticatedUser() user: KeycloakJWT,
    @Param('id') id: string,
  ): Promise<LinkAnalyticsSummaryDto> {
    return this.linkService.getAnalyticsSummary(id, user.sub);
  }
}
