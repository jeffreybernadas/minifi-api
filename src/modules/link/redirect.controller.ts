import { Controller, Get, Param, Post, Body, Req } from '@nestjs/common';
import { Public } from 'nest-keycloak-connect';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { LinkService } from './link.service';
import { VerifyPasswordDto } from './dto/verify-password.dto';
import {
  RedirectResponseDto,
  VerifyPasswordResponseDto,
} from './dto/redirect-response.dto';
import {
  ApiStandardResponse,
  ApiStandardErrorResponse,
} from '@/decorators/swagger.decorator';
import { Link, ScanStatus } from '@/generated/prisma/client';
import { UrlScanDetails } from '@/common/interfaces/scan.interface';

@Public()
@ApiTags('redirect')
@Controller({ path: 'redirect', version: '1' })
export class RedirectController {
  constructor(private readonly linkService: LinkService) {}

  @Public()
  @Get(':code')
  @ApiOperation({
    summary: 'Get link details for client-side redirect',
    description:
      'Retrieves link information for client-side redirect pattern. Returns the original URL and link metadata for regular links, or indicates password requirement for password-protected links. The short code can be either a random shortCode or a custom alias. Click tracking is performed asynchronously. Frontend should handle the actual redirect via window.location.href.',
  })
  @ApiStandardResponse({
    status: 200,
    description:
      'Link details retrieved successfully - Ready for client-side redirect',
    type: RedirectResponseDto,
  })
  @ApiStandardErrorResponse({
    status: 403,
    description:
      'Forbidden - Link is archived, disabled, expired, or not yet active',
    errorCode: 'FORBIDDEN',
  })
  @ApiStandardErrorResponse({
    status: 404,
    description: 'Not Found - Link with this code does not exist',
    errorCode: 'NOT_FOUND',
  })
  async getRedirectInfo(
    @Param('code') code: string,
    @Req() req: Request,
  ): Promise<RedirectResponseDto> {
    const link = await this.linkService.resolveShortCode(code);

    if (link.password) {
      return { requiresPassword: true, code };
    }

    const warning = this.buildScanWarning(link);

    // Fire-and-forget tracking
    await this.trackClickAsync(link.id, req);

    return {
      requiresPassword: false,
      originalUrl: link.originalUrl,
      shortCode: link.shortCode ?? undefined,
      ...(warning ? { warning } : {}),
    };
  }

  @Public()
  @Post(':code/verify')
  @ApiOperation({
    summary: 'Verify password and get original URL',
    description:
      'Verifies the password for a password-protected link and returns the original URL if valid. Used in conjunction with the GET endpoint when requiresPassword is true. Returns success status and link details on successful verification. Click tracking is performed on successful password verification.',
  })
  @ApiStandardResponse({
    status: 200,
    description:
      'Password verification result - Returns link details on success',
    type: VerifyPasswordResponseDto,
  })
  @ApiStandardErrorResponse({
    status: 400,
    description: 'Bad Request - Link is not password protected',
    errorCode: 'BAD_REQUEST',
  })
  @ApiStandardErrorResponse({
    status: 403,
    description: 'Forbidden - Invalid password provided',
    errorCode: 'FORBIDDEN',
  })
  @ApiStandardErrorResponse({
    status: 404,
    description: 'Not Found - Link with this code does not exist',
    errorCode: 'NOT_FOUND',
  })
  async verifyPassword(
    @Param('code') code: string,
    @Body() dto: VerifyPasswordDto,
    @Req() req: Request,
  ): Promise<VerifyPasswordResponseDto> {
    const isValid = await this.linkService.verifyLinkPassword(code, dto);

    if (!isValid) {
      return { success: false };
    }

    const link = await this.linkService.resolveShortCode(code);
    const warning = this.buildScanWarning(link);

    // Fire-and-forget tracking
    await this.trackClickAsync(link.id, req);

    return {
      success: true,
      originalUrl: link.originalUrl,
      shortCode: link.shortCode ?? undefined,
      ...(warning ? { warning } : {}),
    };
  }

  /**
   * Track click in background (fire-and-forget)
   * Both methods handle errors internally - safe to call without await
   */
  private async trackClickAsync(linkId: string, req: Request): Promise<void> {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
      req.ip ??
      req.socket.remoteAddress;

    const userAgent = req.headers['user-agent'];
    const referrer = req.headers.referer ?? req.headers.referrer;

    const utms = {
      utm_source: req.query.utm_source as string | undefined,
      utm_medium: req.query.utm_medium as string | undefined,
      utm_campaign: req.query.utm_campaign as string | undefined,
      utm_term: req.query.utm_term as string | undefined,
      utm_content: req.query.utm_content as string | undefined,
    };

    // Fire-and-forget: start both operations without awaiting
    await this.linkService.incrementClickCount(linkId);
    await this.linkService.trackLinkClick(linkId, {
      ip,
      userAgent,
      referrer: referrer as string | undefined,
      utms,
    });
  }

  private buildScanWarning(link: Link) {
    const scanStatus = link.scanStatus;

    if (
      !link ||
      scanStatus === ScanStatus.SAFE ||
      scanStatus === ScanStatus.PENDING
    ) {
      return undefined;
    }

    const details = link.scanDetails as unknown as UrlScanDetails | undefined;

    return {
      isSafe: details?.isSafe,
      status: scanStatus,
      scanScore: link.scanScore,
      threats: details?.threats,
      reasoning: details?.reasoning,
      recommendations: details?.recommendations,
      scannedAt: link.scannedAt,
    };
  }
}
