import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Inject,
  HttpStatus,
} from '@nestjs/common';
import { PrismaService } from '@/database/database.service';
import {
  Link,
  LinkStatus,
  ScanStatus,
  UserType,
  Prisma,
} from '@/generated/prisma/client';
import {
  CUSTOM_ALIAS_MAX_LENGTH,
  CUSTOM_ALIAS_MIN_LENGTH,
  CUSTOM_ALIAS_REGEX,
  FREE_LIMITS,
  GUEST_LIMITS,
  PRO_LIMITS,
  RESERVED_KEYWORDS,
} from '@/constants/link.constant';
import { generateShortCode } from '@/utils/shortcode/shortcode.util';
import { hashPassword, verifyPassword } from '@/utils/password/password.util';
import { generateQRCodeBuffer } from '@/utils/qrcode/qrcode.util';
import {
  generateVisitorId,
  extractReferrerDomain,
} from '@/utils/visitor/visitor-id.util';
import { LoggerService } from '@/shared/logger/logger.service';
import UAParser from 'ua-parser-js';
import * as geoip from 'geoip-lite';
import { CreateLinkDto } from './dto/create-link.dto';
import { CreateGuestLinkDto } from './dto/create-guest-link.dto';
import { UpdateLinkDto } from './dto/update-link.dto';
import { LinkResponseDto } from './dto/link-response.dto';
import { LinkFilterDto } from './dto/link-filter.dto';
import { VerifyPasswordDto } from './dto/verify-password.dto';
import {
  LinkAnalyticsResponseDto,
  LinkAnalyticsSummaryDto,
} from './dto/analytics-response.dto';
import { AnalyticsFilterDto } from './dto/analytics-filter.dto';
import { CustomErrorException } from '@/filters/exceptions/custom-error.exception';
import { CustomErrorCode } from '@/enums/custom-error-enum';
import { OffsetPaginatedDto } from '@/common/dto/offset-pagination';
import { offsetPaginateWithPrisma } from '@/utils/pagination/prisma-pagination.util';
import { MINIO_CONNECTION } from '@/constants/minio.constant';
import { Client as MinioClient } from 'minio';
import { ConfigService } from '@nestjs/config';
import { GlobalConfig } from '@/config/config.type';
import { QrCodeResponseDto } from './dto/qr-code-response.dto';
import { ScanProducer } from '@/shared/queues/scan/scan.producer';
import { UrlScanDetails } from '@/common/interfaces/scan.interface';

@Injectable()
export class LinkService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(MINIO_CONNECTION) private readonly minioClient: MinioClient,
    private readonly configService: ConfigService<GlobalConfig>,
    private readonly logger: LoggerService,
    private readonly scanProducer: ScanProducer,
  ) {}

  async createLink(
    userId: string,
    dto: CreateLinkDto,
  ): Promise<LinkResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, userType: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (dto.customAlias && user.userType !== UserType.PRO) {
      throw new ForbiddenException(
        'Custom aliases are available for PRO users only',
      );
    }

    if (dto.customAlias) {
      this.validateCustomAlias(dto.customAlias);
      await this.ensureAliasAvailability(dto.customAlias);
    }

    let scheduledAt: Date | undefined;
    if (dto.scheduledAt) {
      scheduledAt = new Date(dto.scheduledAt);
      if (Number.isNaN(scheduledAt.getTime())) {
        throw new BadRequestException('Invalid scheduledAt date');
      }
      if (scheduledAt <= new Date()) {
        throw new BadRequestException('Scheduled time must be in the future');
      }
    }

    let expiresAt: Date | undefined;
    if (dto.expiresAt) {
      expiresAt = new Date(dto.expiresAt);
      if (Number.isNaN(expiresAt.getTime())) {
        throw new BadRequestException('Invalid expiresAt date');
      }
    } else {
      expiresAt = this.getDefaultExpiry(user.userType);
    }

    if (scheduledAt && expiresAt && scheduledAt >= expiresAt) {
      throw new BadRequestException(
        'Expiration must be after the scheduled time',
      );
    }

    const shortCode = await this.generateUniqueShortCode();
    const passwordHash = dto.password
      ? await hashPassword(dto.password)
      : undefined;

    if (dto.tagIds?.length) {
      await this.ensureTagsBelongToUser(userId, dto.tagIds);
    }

    const link = await this.prisma.link.create({
      data: {
        userId,
        originalUrl: dto.originalUrl,
        shortCode,
        customAlias: dto.customAlias,
        title: dto.title,
        description: dto.description,
        status: scheduledAt ? LinkStatus.SCHEDULED : LinkStatus.ACTIVE,
        scheduledAt,
        expiresAt,
        clickLimit: dto.clickLimit,
        isOneTime: dto.isOneTime ?? false,
        isArchived: false,
        notes: dto.notes,
        password: passwordHash,
        scanStatus: ScanStatus.PENDING,
        tags: dto.tagIds?.length
          ? {
              create: dto.tagIds.map((tagId) => ({
                tag: { connect: { id: tagId } },
              })),
            }
          : undefined,
      },
    });

    await this.enqueueScan(link.id, link.originalUrl, userId);

    return this.mapToLinkResponse(link);
  }

  async createGuestLink(
    dto: CreateGuestLinkDto,
    ipAddress: string | undefined,
    userAgent: string | undefined,
  ): Promise<LinkResponseDto> {
    if (!ipAddress) {
      throw new BadRequestException('IP address is required for guest links');
    }

    await this.validateGuestRateLimit(ipAddress);
    const shortCode = await this.generateUniqueShortCode();

    const expiresAt = this.addDays(new Date(), GUEST_LIMITS.retentionDays);

    const link = await this.prisma.link.create({
      data: {
        userId: null,
        isGuest: true,
        guestIpAddress: ipAddress,
        guestUserAgent: userAgent,
        originalUrl: dto.originalUrl,
        shortCode,
        status: LinkStatus.ACTIVE,
        expiresAt,
        scanStatus: ScanStatus.PENDING,
      },
    });

    return this.mapToLinkResponse(link);
  }

  async validateGuestRateLimit(ipAddress: string): Promise<void> {
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);

    const count = await this.prisma.link.count({
      where: {
        isGuest: true,
        guestIpAddress: ipAddress,
        createdAt: { gte: oneDayAgo },
      },
    });

    if (count >= GUEST_LIMITS.maxLinksPerDay) {
      throw new CustomErrorException(
        `Guest users can only create ${GUEST_LIMITS.maxLinksPerDay} links per day. Please try again tomorrow or sign up for a free account.`,
        HttpStatus.TOO_MANY_REQUESTS,
        CustomErrorCode.TOO_MANY_REQUESTS,
      );
    }
  }

  async getUserLinks(
    userId: string,
    filters: LinkFilterDto,
  ): Promise<OffsetPaginatedDto<LinkResponseDto>> {
    const where: Prisma.LinkWhereInput = {
      userId,
      isArchived: filters.isArchived ?? false,
      status: filters.status,
      ...(filters.search
        ? {
            OR: [
              {
                title: {
                  contains: filters.search,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
              {
                description: {
                  contains: filters.search,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
              {
                originalUrl: {
                  contains: filters.search,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
            ],
          }
        : {}),
      ...(filters.tagId ? { tags: { some: { tagId: filters.tagId } } } : {}),
    };

    const paginatedLinks = await offsetPaginateWithPrisma(
      this.prisma.link,
      filters,
      {
        where,
        orderBy: { createdAt: filters.order ?? 'desc' },
      },
    );

    // Map links to response DTOs
    return {
      ...paginatedLinks,
      data: paginatedLinks.data.map((link) => this.mapToLinkResponse(link)),
    };
  }

  async getLinkById(id: string, userId: string): Promise<LinkResponseDto> {
    const link = await this.prisma.link.findFirst({
      where: { id, userId },
    });

    if (!link) {
      throw new NotFoundException('Link not found');
    }

    return this.mapToLinkResponse(link);
  }

  async updateLink(
    id: string,
    userId: string,
    dto: UpdateLinkDto,
  ): Promise<LinkResponseDto> {
    const link = await this.prisma.link.findFirst({
      where: { id, userId },
    });

    if (!link) {
      throw new NotFoundException('Link not found');
    }

    if (dto.customAlias) {
      this.validateCustomAlias(dto.customAlias);
      await this.ensureAliasAvailability(dto.customAlias, id);
    }

    let scheduledAt = link.scheduledAt;
    if (dto.scheduledAt) {
      scheduledAt = new Date(dto.scheduledAt);
      if (Number.isNaN(scheduledAt.getTime())) {
        throw new BadRequestException('Invalid scheduledAt date');
      }
      if (scheduledAt <= new Date()) {
        throw new BadRequestException('Scheduled time must be in the future');
      }
    }

    let expiresAt = link.expiresAt;
    if (dto.expiresAt) {
      expiresAt = new Date(dto.expiresAt);
      if (Number.isNaN(expiresAt.getTime())) {
        throw new BadRequestException('Invalid expiresAt date');
      }
    }

    if (scheduledAt && expiresAt && scheduledAt >= expiresAt) {
      throw new BadRequestException(
        'Expiration must be after the scheduled time',
      );
    }

    const password = dto.password
      ? await hashPassword(dto.password)
      : undefined;

    if (dto.tagIds?.length) {
      await this.ensureTagsBelongToUser(userId, dto.tagIds);
    }

    const data = {
      customAlias: dto.customAlias,
      title: dto.title,
      description: dto.description,
      scheduledAt,
      expiresAt,
      clickLimit: dto.clickLimit,
      isOneTime: dto.isOneTime ?? link.isOneTime,
      isArchived: dto.isArchived ?? link.isArchived,
      notes: dto.notes,
      password,
      status: scheduledAt
        ? LinkStatus.SCHEDULED
        : (dto.isArchived ?? link.isArchived)
          ? LinkStatus.ARCHIVED
          : link.status,
    };

    const updated = await this.prisma.link.update({
      where: { id },
      data: {
        ...data,
        ...(dto.tagIds
          ? {
              tags: {
                deleteMany: {},
                create: dto.tagIds.map((tagId) => ({
                  tag: { connect: { id: tagId } },
                })),
              },
            }
          : {}),
      },
    });

    return this.mapToLinkResponse(updated);
  }

  async requestScan(
    id: string,
    userId: string,
    force = false,
  ): Promise<LinkResponseDto> {
    const link = await this.prisma.link.findFirst({
      where: { id, userId },
    });

    if (!link) {
      throw new NotFoundException('Link not found');
    }

    const updated = await this.prisma.link.update({
      where: { id },
      data: {
        scanStatus: ScanStatus.PENDING,
        scanScore: null,
        scanDetails: {},
        scannedAt: null,
        lastScanVersion: null,
      },
    });

    await this.enqueueScan(updated.id, updated.originalUrl, userId, force);

    return this.mapToLinkResponse(updated);
  }

  async deleteLink(id: string, userId: string): Promise<{ success: boolean }> {
    const link = await this.prisma.link.findFirst({
      where: { id, userId },
    });

    if (!link) {
      throw new NotFoundException('Link not found');
    }

    // Hard delete - permanently remove from database
    await this.prisma.link.delete({
      where: { id },
    });

    return { success: true };
  }

  async archiveLink(id: string, userId: string): Promise<LinkResponseDto> {
    const link = await this.prisma.link.findFirst({
      where: { id, userId },
    });

    if (!link) {
      throw new NotFoundException('Link not found');
    }

    if (link.isArchived) {
      throw new BadRequestException('Link is already archived');
    }

    const updated = await this.prisma.link.update({
      where: { id },
      data: { isArchived: true, status: LinkStatus.ARCHIVED },
    });

    return this.mapToLinkResponse(updated);
  }

  async unarchiveLink(id: string, userId: string): Promise<LinkResponseDto> {
    const link = await this.prisma.link.findFirst({
      where: { id, userId },
    });

    if (!link) {
      throw new NotFoundException('Link not found');
    }

    if (!link.isArchived) {
      throw new BadRequestException('Link is not archived');
    }

    // Determine status when unarchiving
    const now = new Date();
    let status: LinkStatus = LinkStatus.ACTIVE;

    if (link.scheduledAt && link.scheduledAt > now) {
      status = LinkStatus.SCHEDULED;
    } else if (link.expiresAt && link.expiresAt <= now) {
      status = LinkStatus.DISABLED;
    }

    const updated = await this.prisma.link.update({
      where: { id },
      data: { isArchived: false, status },
    });

    return this.mapToLinkResponse(updated);
  }

  async generateQrCode(
    linkId: string,
    userId: string,
  ): Promise<QrCodeResponseDto> {
    const link = await this.prisma.link.findFirst({
      where: { id: linkId, userId },
    });

    if (!link) {
      throw new NotFoundException('Link not found');
    }

    const shortUrl = `${this.configService.getOrThrow('app.url', { infer: true })}/${link.customAlias ?? link.shortCode}`;
    const qrBuffer = await generateQRCodeBuffer(shortUrl);

    const bucket = 'qr-codes';
    const exists = await this.minioClient.bucketExists(bucket);
    if (!exists) {
      await this.minioClient.makeBucket(bucket);
    }

    const objectName = `qr-${linkId}.png`;
    await this.minioClient.putObject(
      bucket,
      objectName,
      qrBuffer,
      qrBuffer.length,
      {
        'Content-Type': 'image/png',
      },
    );

    const qrCodeUrl = `${this.configService.getOrThrow('minio.url', { infer: true })}/${bucket}/${objectName}`;

    await this.prisma.link.update({
      where: { id: linkId },
      data: { qrCodeUrl },
    });

    return { qrCodeUrl };
  }

  async resolveShortCode(code: string): Promise<Link> {
    const link = await this.prisma.link.findFirst({
      where: {
        OR: [{ shortCode: code }, { customAlias: code }],
      },
    });

    if (!link) {
      throw new NotFoundException('Link not found');
    }

    if (link.isArchived || link.status === LinkStatus.DISABLED) {
      throw new ForbiddenException('Link is not active');
    }

    if (link.expiresAt && link.expiresAt <= new Date()) {
      await this.prisma.link.update({
        where: { id: link.id },
        data: { status: LinkStatus.DISABLED, isArchived: true },
      });
      throw new ForbiddenException('Link has expired');
    }

    if (link.status === LinkStatus.SCHEDULED) {
      throw new ForbiddenException('Link is scheduled and not yet active');
    }

    // Check click limit
    if (link.clickLimit && link.clickCount >= link.clickLimit) {
      await this.prisma.link.update({
        where: { id: link.id },
        data: { status: LinkStatus.DISABLED, isArchived: true },
      });
      throw new ForbiddenException('Link has reached its click limit');
    }

    // Check one-time link
    if (link.isOneTime && link.clickCount >= 1) {
      throw new ForbiddenException('This one-time link has already been used');
    }

    return link;
  }

  /**
   * Increment click count - fire-and-forget safe (never throws)
   * Validation is done in resolveShortCode before this is called
   */
  async incrementClickCount(linkId: string): Promise<void> {
    try {
      const link = await this.prisma.link.findUnique({
        where: { id: linkId },
      });

      if (!link) return; // Already validated in resolveShortCode

      // One-time links: delete
      if (link.isOneTime) {
        await this.prisma.link.delete({ where: { id: linkId } });
        return;
      }

      // Regular links: just increment
      await this.prisma.link.update({
        where: { id: linkId },
        data: { clickCount: { increment: 1 }, lastClickedAt: new Date() },
      });
    } catch (error) {
      this.logger.error(
        `Failed to increment click count for ${linkId}`,
        'LinkService',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /**
   * Track link click with detailed analytics - fire-and-forget safe (never throws)
   */
  async trackLinkClick(
    linkId: string,
    context?: {
      ip?: string;
      userAgent?: string;
      referrer?: string;
      utms?: {
        utm_source?: string;
        utm_medium?: string;
        utm_campaign?: string;
        utm_term?: string;
        utm_content?: string;
      };
    },
  ): Promise<void> {
    try {
      const link = await this.prisma.link.findUnique({
        where: { id: linkId },
      });
      if (!link) return;

      // Parse user agent
      const parser = new UAParser(context?.userAgent);
      const ua = parser.getResult();

      // Lookup geolocation
      const geo = context?.ip ? geoip.lookup(context.ip) : null;

      // Generate visitor ID (hash of IP + UA)
      const visitorId = generateVisitorId(context?.ip, context?.userAgent);

      // Extract referrer domain
      const referrerDomain = extractReferrerDomain(context?.referrer);

      // Check if this is a unique visitor
      const existingVisit = await this.prisma.linkAnalytics.findFirst({
        where: { linkId, visitorId },
        select: { id: true },
      });
      const isUnique = !existingVisit;

      // Create analytics record
      await this.prisma.linkAnalytics.create({
        data: {
          linkId,
          visitorId,
          isUnique,
          clickedAt: new Date(),
          ipAddress: context?.ip,
          userAgent: context?.userAgent,
          browser: ua.browser.name ?? undefined,
          browserVersion: ua.browser.version ?? undefined,
          os: ua.os.name ?? undefined,
          osVersion: ua.os.version ?? undefined,
          device: ua.device.type ?? 'desktop',
          country: geo?.country,
          countryCode: geo?.country,
          city: geo?.city,
          region: geo?.region,
          latitude: geo?.ll?.[0],
          longitude: geo?.ll?.[1],
          referrer: context?.referrer,
          referrerDomain,
          utmSource: context?.utms?.utm_source,
          utmMedium: context?.utms?.utm_medium,
          utmCampaign: context?.utms?.utm_campaign,
          utmTerm: context?.utms?.utm_term,
          utmContent: context?.utms?.utm_content,
        },
      });

      // Update unique click count if this is a new visitor
      if (isUnique) {
        await this.prisma.link.update({
          where: { id: linkId },
          data: { uniqueClickCount: { increment: 1 } },
        });
      }
    } catch (error) {
      this.logger.error(
        `Failed to track click for link ${linkId}`,
        'LinkService',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /**
   * Get paginated link analytics
   */
  async getLinkAnalytics(
    linkId: string,
    userId: string,
    filters: AnalyticsFilterDto,
  ): Promise<OffsetPaginatedDto<LinkAnalyticsResponseDto>> {
    // Verify ownership
    const link = await this.prisma.link.findFirst({
      where: { id: linkId, userId },
    });
    if (!link) {
      throw new NotFoundException('Link not found');
    }

    // Build where clause with filters
    const where: Prisma.LinkAnalyticsWhereInput = {
      linkId,
      ...(filters.countryCode && { countryCode: filters.countryCode }),
      ...(filters.device && { device: filters.device }),
      ...(filters.search && {
        OR: [
          { referrer: { contains: filters.search, mode: 'insensitive' } },
          { utmSource: { contains: filters.search, mode: 'insensitive' } },
          { utmCampaign: { contains: filters.search, mode: 'insensitive' } },
        ],
      }),
    };

    // Paginate
    const paginated = await offsetPaginateWithPrisma(
      this.prisma.linkAnalytics,
      filters,
      { where, orderBy: { clickedAt: 'desc' } },
    );

    return {
      ...paginated,
      data: paginated.data as LinkAnalyticsResponseDto[],
    };
  }

  /**
   * Get analytics summary with aggregations
   */
  async getAnalyticsSummary(
    linkId: string,
    userId: string,
  ): Promise<LinkAnalyticsSummaryDto> {
    // Verify ownership
    const link = await this.prisma.link.findFirst({
      where: { id: linkId, userId },
    });
    if (!link) {
      throw new NotFoundException('Link not found');
    }

    // Run all aggregations in parallel
    const [
      totalClicks,
      uniqueVisitors,
      byCountry,
      byCity,
      byDevice,
      byBrowser,
      byReferrer,
      clicksByDate,
    ] = await Promise.all([
      // Total clicks
      this.prisma.linkAnalytics.count({ where: { linkId } }),

      // Unique visitors
      this.prisma.linkAnalytics.count({
        where: { linkId, isUnique: true },
      }),

      // Top 5 countries
      this.prisma.linkAnalytics.groupBy({
        by: ['country'],
        _count: { country: true },
        where: { linkId, country: { not: null } },
        orderBy: { _count: { country: 'desc' } },
        take: 5,
      }),

      // Top 5 cities
      this.prisma.linkAnalytics.groupBy({
        by: ['city'],
        _count: { city: true },
        where: { linkId, city: { not: null } },
        orderBy: { _count: { city: 'desc' } },
        take: 5,
      }),

      // Top 5 devices
      this.prisma.linkAnalytics.groupBy({
        by: ['device'],
        _count: { device: true },
        where: { linkId, device: { not: null } },
        orderBy: { _count: { device: 'desc' } },
        take: 5,
      }),

      // Top 5 browsers
      this.prisma.linkAnalytics.groupBy({
        by: ['browser'],
        _count: { browser: true },
        where: { linkId, browser: { not: null } },
        orderBy: { _count: { browser: 'desc' } },
        take: 5,
      }),

      // Top 5 referrers by domain
      this.prisma.linkAnalytics.groupBy({
        by: ['referrerDomain'],
        _count: { referrerDomain: true },
        where: { linkId, referrerDomain: { not: null } },
        orderBy: { _count: { referrerDomain: 'desc' } },
        take: 5,
      }),

      // Clicks by date (last 30 days)
      this.prisma.$queryRaw<Array<{ date: Date; count: bigint }>>`
        SELECT
          DATE("clickedAt") as date,
          COUNT(*)::bigint as count
        FROM "LinkAnalytics"
        WHERE "linkId" = ${linkId}
        GROUP BY DATE("clickedAt")
        ORDER BY DATE("clickedAt") DESC
        LIMIT 30
      `,
    ]);

    return {
      totalClicks,
      uniqueVisitors,
      clicksByDate: clicksByDate
        .filter((row) => row.date != null)
        .map((row) => ({
          date: row.date.toISOString().split('T')[0]!,
          count: Number(row.count),
        })),
      topCountries: byCountry.map((item) => ({
        country: item.country!,
        count: item._count.country,
      })),
      topCities: byCity.map((item) => ({
        city: item.city!,
        count: item._count.city,
      })),
      topDevices: byDevice.map((item) => ({
        device: item.device!,
        count: item._count.device,
      })),
      topBrowsers: byBrowser.map((item) => ({
        browser: item.browser!,
        count: item._count.browser,
      })),
      topReferrers: byReferrer.map((item) => ({
        referrer: item.referrerDomain!,
        count: item._count.referrerDomain,
      })),
    };
  }

  async verifyLinkPassword(
    code: string,
    dto: VerifyPasswordDto,
  ): Promise<boolean> {
    const link = await this.prisma.link.findFirst({
      where: { OR: [{ shortCode: code }, { customAlias: code }] },
    });

    if (!link) {
      throw new NotFoundException('Link not found');
    }

    if (!link.password) {
      throw new BadRequestException('This link is not password protected');
    }

    const isValid = await verifyPassword(dto.password, link.password);
    if (!isValid) {
      throw new ForbiddenException('Invalid password');
    }

    return true;
  }

  private async generateUniqueShortCode(): Promise<string> {
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      const code = generateShortCode();
      const existing = await this.prisma.link.findFirst({
        where: {
          OR: [{ shortCode: code }, { customAlias: code }],
        },
        select: { id: true },
      });

      if (!existing) {
        return code;
      }

      attempts += 1;
    }

    throw new BadRequestException(
      'Unable to generate a unique short code. Please try again.',
    );
  }

  private validateCustomAlias(alias: string): void {
    if (
      alias.length < CUSTOM_ALIAS_MIN_LENGTH ||
      alias.length > CUSTOM_ALIAS_MAX_LENGTH
    ) {
      throw new BadRequestException(
        `Custom alias must be between ${CUSTOM_ALIAS_MIN_LENGTH} and ${CUSTOM_ALIAS_MAX_LENGTH} characters.`,
      );
    }

    if (!CUSTOM_ALIAS_REGEX.test(alias)) {
      throw new BadRequestException(
        'Custom alias can only contain letters, numbers, and hyphens.',
      );
    }

    if (RESERVED_KEYWORDS.includes(alias.toLowerCase())) {
      throw new BadRequestException(
        'This alias is reserved. Please choose another.',
      );
    }
  }

  private async ensureAliasAvailability(
    alias: string,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.prisma.link.findFirst({
      where: {
        customAlias: alias,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });

    if (existing) {
      throw new BadRequestException('Custom alias is already taken');
    }
  }

  private mapToLinkResponse(link: Link): LinkResponseDto {
    return {
      id: link.id,
      userId: link.userId,
      originalUrl: link.originalUrl,
      shortCode: link.shortCode,
      customAlias: link.customAlias ?? undefined,
      title: link.title ?? undefined,
      description: link.description ?? undefined,
      status: link.status,
      hasPassword: Boolean(link.password),
      scheduledAt: link.scheduledAt,
      expiresAt: link.expiresAt,
      clickLimit: link.clickLimit,
      isOneTime: link.isOneTime,
      isArchived: link.isArchived,
      notes: link.notes,
      scanStatus: link.scanStatus,
      scanScore: link.scanScore,
      scanDetails: this.extractScanDetails(link),
      scannedAt: link.scannedAt,
      lastScanVersion: link.lastScanVersion,
      clickCount: link.clickCount,
      uniqueClickCount: link.uniqueClickCount,
      lastClickedAt: link.lastClickedAt,
      qrCodeUrl: link.qrCodeUrl,
      createdAt: link.createdAt,
      updatedAt: link.updatedAt,
    };
  }

  private async enqueueScan(
    linkId: string,
    url: string,
    requestedBy?: string,
    force = false,
  ): Promise<void> {
    const enableUrlScan = this.configService.get<boolean>('app.enableUrlScan', {
      infer: true,
    });

    if (!enableUrlScan) {
      this.logger.warn(
        `URL scan skipped (feature disabled) for link ${linkId}`,
        'LinkService',
      );
      return;
    }

    try {
      await this.scanProducer.queueScan({
        linkId,
        url,
        requestedBy,
        force,
      });
    } catch (error) {
      this.logger.error(
        `Failed to enqueue URL scan for link ${linkId}`,
        'LinkService',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private getDefaultExpiry(userType: UserType): Date {
    const retentionDays =
      userType === UserType.PRO
        ? PRO_LIMITS.retentionDays
        : userType === UserType.FREE
          ? FREE_LIMITS.retentionDays
          : GUEST_LIMITS.retentionDays;

    return this.addDays(new Date(), retentionDays);
  }

  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  private async ensureTagsBelongToUser(
    userId: string,
    tagIds: string[],
  ): Promise<void> {
    const tags = await this.prisma.tag.findMany({
      where: { id: { in: tagIds }, userId },
      select: { id: true },
    });

    if (tags.length !== tagIds.length) {
      throw new BadRequestException(
        'One or more tags do not belong to the user',
      );
    }
  }

  private extractScanDetails(link: Link): UrlScanDetails {
    return link.scanDetails as unknown as UrlScanDetails;
  }
}
