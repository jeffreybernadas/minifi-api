import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '@/shared/guards/admin.guard';
import { AdminService } from './admin.service';
import {
  ApiStandardResponse,
  ApiStandardErrorResponse,
} from '@/decorators/swagger.decorator';
import {
  AdminStatsDto,
  PlatformAnalyticsDto,
  SecurityOverviewDto,
} from './dto';

@ApiTags('admin')
@ApiBearerAuth('JWT')
@UseGuards(AdminGuard)
@Controller({ path: 'admin', version: '1' })
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  @ApiOperation({
    summary: 'Get platform statistics',
    description:
      'Returns high-level platform statistics including user counts, link counts, click totals, and growth metrics for the last 30 days.',
  })
  @ApiStandardResponse({
    status: 200,
    description: 'Platform stats retrieved successfully',
    type: AdminStatsDto,
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
  getStats(): Promise<AdminStatsDto> {
    return this.adminService.getStats();
  }

  @Get('analytics')
  @ApiOperation({
    summary: 'Get platform analytics',
    description:
      'Returns detailed platform analytics including daily trends for users, links, and clicks over the last 30 days, plus top countries, devices, browsers, and referrers.',
  })
  @ApiStandardResponse({
    status: 200,
    description: 'Platform analytics retrieved successfully',
    type: PlatformAnalyticsDto,
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
  getAnalytics(): Promise<PlatformAnalyticsDto> {
    return this.adminService.getAnalytics();
  }

  @Get('security')
  @ApiOperation({
    summary: 'Get security overview',
    description:
      'Returns security-related metrics including links by scan status, pending scans, malicious/suspicious counts, and recent security alerts.',
  })
  @ApiStandardResponse({
    status: 200,
    description: 'Security overview retrieved successfully',
    type: SecurityOverviewDto,
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
  getSecurityOverview(): Promise<SecurityOverviewDto> {
    return this.adminService.getSecurityOverview();
  }
}
