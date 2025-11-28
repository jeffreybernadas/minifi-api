import { Controller, Get, Param, Post, Body } from '@nestjs/common';
import { Public } from 'nest-keycloak-connect';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
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
  ): Promise<RedirectResponseDto> {
    const link = await this.linkService.resolveShortCode(code);

    if (link.password) {
      return { requiresPassword: true, code };
    }

    await this.trackClickAsync(link.id);

    return {
      requiresPassword: false,
      originalUrl: link.originalUrl,
      shortCode: link.shortCode,
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
  ): Promise<VerifyPasswordResponseDto> {
    const isValid = await this.linkService.verifyLinkPassword(code, dto);

    if (!isValid) {
      return { success: false };
    }

    const link = await this.linkService.resolveShortCode(code);
    await this.trackClickAsync(link.id);

    return {
      success: true,
      originalUrl: link.originalUrl,
      shortCode: link.shortCode,
    };
  }

  private async trackClickAsync(linkId: string): Promise<void> {
    await this.linkService.incrementClickCount(linkId);
  }
}
