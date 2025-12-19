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
import { maskIpAddress } from '@/utils/visitor/ip-mask.util';
import { LoggerService } from '@/shared/logger/logger.service';
import { UAParser } from 'ua-parser-js';
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
import {
  UserMonthlyAnalytics,
  TopLinkData,
  TopCountryData,
  TopCityData,
  TopDeviceData,
  TopBrowserData,
  TopOSData,
  TopReferrerData,
} from '@/common/interfaces/email.interface';

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
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
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

    // Guest links are marked SUSPICIOUS by default (no AI scan to save costs)
    // This shows a warning to users clicking the link
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
        scanStatus: ScanStatus.SUSPICIOUS,
        scanScore: 0.5,
        scannedAt: new Date(),
        scanDetails: {
          isSafe: false,
          threats: ['unverified_source'],
          reasoning:
            'This link was created by an anonymous guest user and has not been verified. Proceed with caution.',
          recommendations:
            'Verify the destination URL before entering any sensitive information. For trusted short links, ask the sender to create an account.',
        },
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
              {
                shortCode: {
                  contains: filters.search,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
              {
                customAlias: {
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
        include: {
          tags: {
            include: {
              tag: true,
            },
          },
        },
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
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
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

    // Handle scheduledAt: null = clear, string = update, undefined = keep existing
    let scheduledAt = link.scheduledAt;
    if (dto.scheduledAt === null) {
      scheduledAt = null;
    } else if (dto.scheduledAt !== undefined) {
      scheduledAt = new Date(dto.scheduledAt);
      if (Number.isNaN(scheduledAt.getTime())) {
        throw new BadRequestException('Invalid scheduledAt date');
      }
      if (scheduledAt <= new Date()) {
        throw new BadRequestException('Scheduled time must be in the future');
      }
    }

    // Handle expiresAt: null = clear, string = update, undefined = keep existing
    let expiresAt = link.expiresAt;
    if (dto.expiresAt === null) {
      expiresAt = null;
    } else if (dto.expiresAt !== undefined) {
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

    // Handle password: null = clear, string = update, undefined = keep existing
    let password: string | null | undefined;
    if (dto.password === null) {
      password = null;
    } else if (dto.password !== undefined) {
      password = await hashPassword(dto.password);
    }

    if (dto.tagIds?.length) {
      await this.ensureTagsBelongToUser(userId, dto.tagIds);
    }

    // Check if custom alias is changing - if so, invalidate QR code
    const isAliasChanging =
      dto.customAlias !== undefined && dto.customAlias !== link.customAlias;

    const data: {
      customAlias?: string;
      title?: string;
      description?: string;
      scheduledAt?: Date | null;
      expiresAt?: Date | null;
      clickLimit?: number;
      isOneTime?: boolean;
      isArchived?: boolean;
      notes?: string;
      password?: string | null;
      status?: LinkStatus;
      qrCodeUrl?: string | null;
    } = {
      customAlias: dto.customAlias,
      title: dto.title,
      description: dto.description,
      scheduledAt,
      expiresAt,
      clickLimit: dto.clickLimit,
      isOneTime: dto.isOneTime ?? link.isOneTime,
      isArchived: dto.isArchived ?? link.isArchived,
      notes: dto.notes,
      status: scheduledAt
        ? LinkStatus.SCHEDULED
        : (dto.isArchived ?? link.isArchived)
          ? LinkStatus.ARCHIVED
          : link.status,
      // Invalidate QR code if alias changes (URL will be different)
      ...(isAliasChanging && link.qrCodeUrl ? { qrCodeUrl: null } : {}),
    };

    // Only include password in update if explicitly set (null or new value)
    if (dto.password !== undefined) {
      data.password = password;
    }

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
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
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

    const shortUrl = `${this.configService.getOrThrow('app.frontendUrl', { infer: true })}/r/${link.customAlias ?? link.shortCode}`;
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

    if (link.status === LinkStatus.BLOCKED) {
      throw new ForbiddenException(
        'This link has been blocked by an administrator',
      );
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
      // Check if scheduled time has passed - activate the link on-the-fly
      if (link.scheduledAt && link.scheduledAt <= new Date()) {
        await this.prisma.link.update({
          where: { id: link.id },
          data: { status: LinkStatus.ACTIVE },
        });
        link.status = LinkStatus.ACTIVE;
      } else {
        throw new ForbiddenException('Link is scheduled and not yet active');
      }
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
   * FREE users: No access to click log (returns empty)
   * PRO users: Full paginated click log
   */
  async getLinkAnalytics(
    linkId: string,
    userId: string,
    filters: AnalyticsFilterDto,
  ): Promise<OffsetPaginatedDto<LinkAnalyticsResponseDto>> {
    // Get user with tier info
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { userType: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify link ownership
    const link = await this.prisma.link.findFirst({
      where: { id: linkId, userId },
    });
    if (!link) {
      throw new NotFoundException('Link not found');
    }

    const isPro = user.userType === UserType.PRO;

    // FREE users don't have access to click log
    if (!isPro) {
      return {
        data: [],
        meta: {
          page: 1,
          limit: filters.limit ?? 10,
          itemCount: 0,
          pageCount: 0,
          hasPreviousPage: false,
          hasNextPage: false,
        },
      };
    }

    const startDate = filters.startDate
      ? new Date(filters.startDate)
      : undefined;
    const endDate = filters.endDate ? new Date(filters.endDate) : undefined;
    const hasDateFilter =
      (startDate && !Number.isNaN(startDate.getTime())) ||
      (endDate && !Number.isNaN(endDate.getTime()));

    // PRO users get full click log
    const where: Prisma.LinkAnalyticsWhereInput = {
      linkId,
      ...(filters.countryCode && { countryCode: filters.countryCode }),
      ...(filters.device && { device: filters.device }),
      ...(hasDateFilter && {
        clickedAt: {
          ...(startDate &&
            !Number.isNaN(startDate.getTime()) && { gte: startDate }),
          ...(endDate && !Number.isNaN(endDate.getTime()) && { lte: endDate }),
        },
      }),
      ...(filters.search && {
        OR: [
          { referrer: { contains: filters.search, mode: 'insensitive' } },
          { utmSource: { contains: filters.search, mode: 'insensitive' } },
          { utmCampaign: { contains: filters.search, mode: 'insensitive' } },
        ],
      }),
    };

    const paginated = await offsetPaginateWithPrisma(
      this.prisma.linkAnalytics,
      filters,
      { where, orderBy: { clickedAt: 'desc' } },
    );

    // Mask IP addresses for privacy compliance (GDPR)
    const maskedData = paginated.data.map((analytics) => ({
      ...analytics,
      ipAddress: maskIpAddress(analytics.ipAddress),
    })) as LinkAnalyticsResponseDto[];

    return {
      ...paginated,
      data: maskedData,
    };
  }

  /**
   * Get analytics summary with aggregations
   *
   * Date filtering behavior:
   * - No dates (default): Returns all-time stats, but clicksByDate limited to:
   *   * FREE: Last 7 days
   *   * PRO: Last 90 days
   * - With dates: Filters ALL data (stats + chart) by date range, no limit
   *   * FREE: Date picker disabled (frontend)
   *   * PRO: Can filter any date range
   *
   * Top results:
   * - FREE: Top 5 countries only
   * - PRO: Top 10 for all categories (countries, cities, devices, browsers, referrers)
   */
  async getAnalyticsSummary(
    linkId: string,
    userId: string,
    filters?: AnalyticsFilterDto,
  ): Promise<LinkAnalyticsSummaryDto> {
    // Get user with tier info
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { userType: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify link ownership
    const link = await this.prisma.link.findFirst({
      where: { id: linkId, userId },
    });
    if (!link) {
      throw new NotFoundException('Link not found');
    }

    const isPro = user.userType === UserType.PRO;
    const topLimit = isPro ? 10 : 5;
    const daysLimit = isPro ? 90 : 7;

    // Parse dates if provided
    const startDate = filters?.startDate
      ? new Date(filters.startDate)
      : undefined;
    const endDate = filters?.endDate ? new Date(filters.endDate) : undefined;

    // Validate dates
    const isValidStartDate = startDate && !Number.isNaN(startDate.getTime());
    const isValidEndDate = endDate && !Number.isNaN(endDate.getTime());
    const hasDateFilter = isValidStartDate || isValidEndDate;

    // Build Prisma filter for non-raw queries
    const clickedAtFilter = hasDateFilter
      ? {
          clickedAt: {
            ...(isValidStartDate && { gte: startDate }),
            ...(isValidEndDate && { lte: endDate }),
          },
        }
      : {};

    // Query for clicks by date (timeline chart)
    // Uses raw SQL for efficient date aggregation
    const clicksByDateQuery = hasDateFilter
      ? // Custom date range - filter by dates, no limit
        this.prisma.$queryRaw<Array<{ date: Date; count: bigint }>>`
          SELECT
            DATE("clickedAt") as date,
            COUNT(*)::bigint as count
          FROM "LinkAnalytics"
          WHERE "linkId" = ${linkId}
            ${isValidStartDate ? Prisma.sql`AND "clickedAt" >= ${startDate}` : Prisma.empty}
            ${isValidEndDate ? Prisma.sql`AND "clickedAt" <= ${endDate}` : Prisma.empty}
          GROUP BY DATE("clickedAt")
          ORDER BY DATE("clickedAt") ASC
        `
      : // No date range - limit to recent days (7 for FREE, 90 for PRO)
        this.prisma.$queryRaw<Array<{ date: Date; count: bigint }>>`
          SELECT
            DATE("clickedAt") as date,
            COUNT(*)::bigint as count
          FROM "LinkAnalytics"
          WHERE "linkId" = ${linkId}
            AND "clickedAt" >= NOW() - INTERVAL '${Prisma.raw(daysLimit.toString())} days'
          GROUP BY DATE("clickedAt")
          ORDER BY DATE("clickedAt") ASC
        `;

    const baseQueries = [
      // Total clicks
      this.prisma.linkAnalytics.count({
        where: { linkId, ...clickedAtFilter },
      }),

      // Unique visitors
      this.prisma.linkAnalytics.count({
        where: { linkId, isUnique: true, ...clickedAtFilter },
      }),

      // Top countries (5 for FREE, 10 for PRO)
      this.prisma.linkAnalytics.groupBy({
        by: ['country'],
        _count: { country: true },
        where: { linkId, country: { not: null }, ...clickedAtFilter },
        orderBy: { _count: { country: 'desc' } },
        take: topLimit,
      }),

      clicksByDateQuery,
    ];

    // PRO-only queries
    const proQueries = isPro
      ? [
          // Top 10 cities (PRO only)
          this.prisma.linkAnalytics.groupBy({
            by: ['city'],
            _count: { city: true },
            where: { linkId, city: { not: null }, ...clickedAtFilter },
            orderBy: { _count: { city: 'desc' } },
            take: 10,
          }),

          // Top 10 devices (PRO only)
          this.prisma.linkAnalytics.groupBy({
            by: ['device'],
            _count: { device: true },
            where: { linkId, device: { not: null }, ...clickedAtFilter },
            orderBy: { _count: { device: 'desc' } },
            take: 10,
          }),

          // Top 10 browsers (PRO only)
          this.prisma.linkAnalytics.groupBy({
            by: ['browser'],
            _count: { browser: true },
            where: { linkId, browser: { not: null }, ...clickedAtFilter },
            orderBy: { _count: { browser: 'desc' } },
            take: 10,
          }),

          // Top 10 referrers (PRO only)
          this.prisma.linkAnalytics.groupBy({
            by: ['referrerDomain'],
            _count: { referrerDomain: true },
            where: {
              linkId,
              referrerDomain: { not: null },
              ...clickedAtFilter,
            },
            orderBy: { _count: { referrerDomain: 'desc' } },
            take: 10,
          }),
        ]
      : [];

    const results = await Promise.all([...baseQueries, ...proQueries]);

    // Extract base results
    const [totalClicks, uniqueVisitors, byCountry, clicksByDate] = results as [
      number,
      number,
      Array<{ country: string | null; _count: { country: number } }>,
      Array<{ date: Date; count: bigint }>,
    ];

    // Extract PRO results (or empty arrays for FREE)
    const [byCity, byDevice, byBrowser, byReferrer] = isPro
      ? (results.slice(4) as [
          Array<{ city: string | null; _count: { city: number } }>,
          Array<{ device: string | null; _count: { device: number } }>,
          Array<{ browser: string | null; _count: { browser: number } }>,
          Array<{
            referrerDomain: string | null;
            _count: { referrerDomain: number };
          }>,
        ])
      : [[], [], [], []];

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

  /**
   * Get aggregated analytics for all of a user's links (for API/dashboard)
   *
   * Date filtering behavior:
   * - No dates (default): Returns all-time stats, but clicksByDate limited to:
   *   * FREE: Last 7 days
   *   * PRO: Last 90 days
   * - With dates: Filters ALL data (stats + chart) by date range, no limit
   *   * FREE: Date picker disabled (frontend)
   *   * PRO: Can filter any date range
   */
  async getGlobalAnalytics(
    userId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<UserMonthlyAnalytics> {
    // Get user tier for determining limits
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { userType: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isPro = user.userType === UserType.PRO;
    const daysLimit = isPro ? 90 : 7;
    const hasDateFilter = startDate !== undefined || endDate !== undefined;

    // Build date filter for Prisma queries
    const clickedAtFilter = hasDateFilter
      ? {
          clickedAt: {
            ...(startDate && { gte: startDate }),
            ...(endDate && { lte: endDate }),
          },
        }
      : {};

    const createdAtFilter = hasDateFilter
      ? {
          createdAt: {
            ...(startDate && { gte: startDate }),
            ...(endDate && { lte: endDate }),
          },
        }
      : {};

    // Previous month calculations (only if dates provided for growth)
    const prevMonthStart = startDate
      ? new Date(startDate.getTime() - 30 * 24 * 60 * 60 * 1000)
      : undefined;
    const prevMonthEnd = endDate
      ? new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000)
      : undefined;

    // Build clicks by date query with optional filtering
    const clicksByDateQuery = hasDateFilter
      ? // Custom date range - filter by dates, no limit
        this.prisma.$queryRaw<Array<{ date: Date; count: bigint }>>`
          SELECT
            DATE("clickedAt") as date,
            COUNT(*)::bigint as count
          FROM "LinkAnalytics" la
          JOIN "Link" l ON la."linkId" = l.id
          WHERE l."userId" = ${userId}
            ${startDate ? Prisma.sql`AND la."clickedAt" >= ${startDate}` : Prisma.empty}
            ${endDate ? Prisma.sql`AND la."clickedAt" <= ${endDate}` : Prisma.empty}
          GROUP BY DATE("clickedAt")
          ORDER BY date ASC
        `
      : // No date range - limit to recent days (7 for FREE, 90 for PRO)
        this.prisma.$queryRaw<Array<{ date: Date; count: bigint }>>`
          SELECT
            DATE("clickedAt") as date,
            COUNT(*)::bigint as count
          FROM "LinkAnalytics" la
          JOIN "Link" l ON la."linkId" = l.id
          WHERE l."userId" = ${userId}
            AND la."clickedAt" >= NOW() - INTERVAL '${Prisma.raw(daysLimit.toString())} days'
          GROUP BY DATE("clickedAt")
          ORDER BY date ASC
        `;

    const [
      totalClicks,
      uniqueVisitorsResult,
      totalActiveLinks,
      linksCreatedThisMonth,
      previousMonthClicks,
      topLinksRaw,
      topCountriesRaw,
      topCitiesRaw,
      topDevicesRaw,
      topBrowsersRaw,
      topOsRaw,
      topReferrersRaw,
      clicksByDateRaw,
    ] = await Promise.all([
      // Total clicks (filtered or all-time)
      this.prisma.linkAnalytics.count({
        where: {
          link: { userId },
          ...clickedAtFilter,
        },
      }),

      // Unique visitors (filtered or all-time)
      this.prisma.linkAnalytics.groupBy({
        by: ['visitorId'],
        where: {
          link: { userId },
          ...clickedAtFilter,
          isUnique: true,
        },
      }),

      // Total active links (always all-time)
      this.prisma.link.count({
        where: { userId, isArchived: false },
      }),

      // Links created (filtered or all-time)
      this.prisma.link.count({
        where: {
          userId,
          ...createdAtFilter,
        },
      }),

      // Previous month clicks for growth calculation (only if dates provided)
      hasDateFilter && prevMonthStart && prevMonthEnd
        ? this.prisma.linkAnalytics.count({
            where: {
              link: { userId },
              clickedAt: { gte: prevMonthStart, lte: prevMonthEnd },
            },
          })
        : Promise.resolve(0),

      // Top 5 performing links
      this.prisma.link.findMany({
        where: { userId, isArchived: false },
        select: {
          id: true,
          shortCode: true,
          title: true,
          _count: {
            select: {
              analytics: hasDateFilter ? { where: clickedAtFilter } : true,
            },
          },
        },
        orderBy: { analytics: { _count: 'desc' } },
        take: 5,
      }),

      // Top 5 countries
      this.prisma.linkAnalytics.groupBy({
        by: ['country'],
        where: {
          link: { userId },
          ...clickedAtFilter,
          country: { not: null },
        },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5,
      }),

      // Top 5 cities
      this.prisma.linkAnalytics.groupBy({
        by: ['city'],
        where: {
          link: { userId },
          ...clickedAtFilter,
          city: { not: null },
        },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5,
      }),

      // Top devices
      this.prisma.linkAnalytics.groupBy({
        by: ['device'],
        where: {
          link: { userId },
          ...clickedAtFilter,
          device: { not: null },
        },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),

      // Top browsers
      this.prisma.linkAnalytics.groupBy({
        by: ['browser'],
        where: {
          link: { userId },
          ...clickedAtFilter,
          browser: { not: null },
        },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),

      // Top operating systems
      this.prisma.linkAnalytics.groupBy({
        by: ['os'],
        where: {
          link: { userId },
          ...clickedAtFilter,
          os: { not: null },
        },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),

      // Top 5 referrers
      this.prisma.linkAnalytics.groupBy({
        by: ['referrerDomain'],
        where: {
          link: { userId },
          ...clickedAtFilter,
          referrerDomain: { not: null },
        },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5,
      }),

      // Clicks by date (filtered by range or limited to recent days)
      clicksByDateQuery,
    ]);

    // Get unique clicks for top links
    const topLinks: TopLinkData[] = await Promise.all(
      topLinksRaw
        .filter((l) => l._count.analytics > 0)
        .map(async (link) => {
          const uniqueClicks = await this.prisma.linkAnalytics.count({
            where: {
              link: { shortCode: link.shortCode },
              ...clickedAtFilter,
              isUnique: true,
            },
          });
          return {
            id: link.id,
            shortCode: link.shortCode,
            title: link.title ?? undefined,
            clicks: link._count.analytics,
            uniqueClicks,
          };
        }),
    );

    // Calculate device percentages
    const totalDeviceClicks = topDevicesRaw.reduce(
      (sum, d) => sum + d._count.id,
      0,
    );
    const topDevices: TopDeviceData[] = topDevicesRaw.map((d) => ({
      device: d.device ?? 'Unknown',
      clicks: d._count.id,
      percentage:
        totalDeviceClicks > 0
          ? Math.round((d._count.id / totalDeviceClicks) * 100)
          : 0,
    }));

    const totalBrowserClicks = topBrowsersRaw.reduce(
      (sum, b) => sum + b._count.id,
      0,
    );
    const topBrowsers: TopBrowserData[] = topBrowsersRaw.map((b) => ({
      browser: b.browser ?? 'Unknown',
      clicks: b._count.id,
      percentage:
        totalBrowserClicks > 0
          ? Math.round((b._count.id / totalBrowserClicks) * 100)
          : 0,
    }));

    const totalOsClicks = topOsRaw.reduce((sum, o) => sum + o._count.id, 0);
    const topOs: TopOSData[] = topOsRaw.map((o) => ({
      os: o.os ?? 'Unknown',
      clicks: o._count.id,
      percentage:
        totalOsClicks > 0 ? Math.round((o._count.id / totalOsClicks) * 100) : 0,
    }));

    const topCountries: TopCountryData[] = topCountriesRaw.map((c) => ({
      country: c.country ?? 'Unknown',
      clicks: c._count.id,
    }));

    const topCities: TopCityData[] = topCitiesRaw.map((c) => ({
      city: c.city ?? 'Unknown',
      clicks: c._count.id,
    }));

    const topReferrers: TopReferrerData[] = topReferrersRaw.map((r) => ({
      referrer: r.referrerDomain ?? 'Direct',
      clicks: r._count.id,
    }));

    // Format clicks by date for timeline chart
    const clicksByDate = clicksByDateRaw
      .filter((row) => row.date != null)
      .map((row) => ({
        date: row.date.toISOString().split('T')[0]!,
        count: Number(row.count),
      }));

    // Calculate best day from clicksByDate (highest count)
    const bestDay =
      clicksByDate.length > 0
        ? clicksByDate.reduce(
            (best, current) => (current.count > best.count ? current : best),
            clicksByDate[0]!,
          )
        : undefined;

    // Convert bestDay format to match interface (count -> clicks)
    const bestDayFormatted = bestDay
      ? { date: bestDay.date, clicks: bestDay.count }
      : undefined;

    return {
      totalClicks,
      uniqueVisitors: uniqueVisitorsResult.length,
      totalActiveLinks,
      linksCreatedThisMonth,
      previousMonthClicks,
      topLinks,
      topCountries,
      topCities,
      topDevices,
      topBrowsers,
      topOs,
      topReferrers,
      bestDay: bestDayFormatted,
      clicksByDate,
    };
  }

  /**
   * Get aggregated monthly analytics for all of a user's links (for cron/monthly reports)
   * Used by monthly report cron - runs all queries in parallel for efficiency
   *
   * NOTE: This method is used by the monthly report cron job and expects specific date ranges.
   * For the API dashboard with optional dates, use getGlobalAnalytics() instead.
   */
  async getUserMonthlyAnalytics(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<UserMonthlyAnalytics> {
    // Previous month date range for growth calculation (month-based, NOT 30-day)
    const prevMonthStart = new Date(startDate);
    prevMonthStart.setMonth(prevMonthStart.getMonth() - 1);
    const prevMonthEnd = new Date(endDate);
    prevMonthEnd.setMonth(prevMonthEnd.getMonth() - 1);

    const clickedAtFilter = {
      clickedAt: { gte: startDate, lte: endDate },
    };

    const createdAtFilter = {
      createdAt: { gte: startDate, lte: endDate },
    };

    const [
      totalClicks,
      uniqueVisitorsResult,
      totalActiveLinks,
      linksCreatedThisMonth,
      previousMonthClicks,
      topLinksRaw,
      topCountriesRaw,
      topCitiesRaw,
      topDevicesRaw,
      topBrowsersRaw,
      topOsRaw,
      topReferrersRaw,
      clicksByDateRaw,
    ] = await Promise.all([
      // Total clicks
      this.prisma.linkAnalytics.count({
        where: {
          link: { userId },
          ...clickedAtFilter,
        },
      }),

      // Unique visitors
      this.prisma.linkAnalytics.groupBy({
        by: ['visitorId'],
        where: {
          link: { userId },
          ...clickedAtFilter,
          isUnique: true,
        },
      }),

      // Total active links
      this.prisma.link.count({
        where: { userId, isArchived: false },
      }),

      // Links created
      this.prisma.link.count({
        where: {
          userId,
          ...createdAtFilter,
        },
      }),

      // Previous month clicks for growth calculation
      this.prisma.linkAnalytics.count({
        where: {
          link: { userId },
          clickedAt: { gte: prevMonthStart, lte: prevMonthEnd },
        },
      }),

      // Top 5 performing links
      this.prisma.link.findMany({
        where: { userId, isArchived: false },
        select: {
          id: true,
          shortCode: true,
          title: true,
          _count: {
            select: {
              analytics: { where: clickedAtFilter },
            },
          },
        },
        orderBy: { analytics: { _count: 'desc' } },
        take: 5,
      }),

      // Top 5 countries
      this.prisma.linkAnalytics.groupBy({
        by: ['country'],
        where: {
          link: { userId },
          ...clickedAtFilter,
          country: { not: null },
        },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5,
      }),

      // Top 5 cities
      this.prisma.linkAnalytics.groupBy({
        by: ['city'],
        where: {
          link: { userId },
          ...clickedAtFilter,
          city: { not: null },
        },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5,
      }),

      // Top devices
      this.prisma.linkAnalytics.groupBy({
        by: ['device'],
        where: {
          link: { userId },
          ...clickedAtFilter,
          device: { not: null },
        },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),

      // Top browsers
      this.prisma.linkAnalytics.groupBy({
        by: ['browser'],
        where: {
          link: { userId },
          ...clickedAtFilter,
          browser: { not: null },
        },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),

      // Top operating systems
      this.prisma.linkAnalytics.groupBy({
        by: ['os'],
        where: {
          link: { userId },
          ...clickedAtFilter,
          os: { not: null },
        },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),

      // Top 5 referrers
      this.prisma.linkAnalytics.groupBy({
        by: ['referrerDomain'],
        where: {
          link: { userId },
          ...clickedAtFilter,
          referrerDomain: { not: null },
        },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5,
      }),

      // Clicks by date
      this.prisma.$queryRaw<Array<{ date: Date; count: bigint }>>`
        SELECT
          DATE("clickedAt") as date,
          COUNT(*)::bigint as count
        FROM "LinkAnalytics" la
        JOIN "Link" l ON la."linkId" = l.id
        WHERE l."userId" = ${userId}
          AND la."clickedAt" >= ${startDate}
          AND la."clickedAt" <= ${endDate}
        GROUP BY DATE("clickedAt")
        ORDER BY date ASC
      `,
    ]);

    // Get unique clicks for top links
    const topLinks: TopLinkData[] = await Promise.all(
      topLinksRaw
        .filter((l) => l._count.analytics > 0)
        .map(async (link) => {
          const uniqueClicks = await this.prisma.linkAnalytics.count({
            where: {
              link: { shortCode: link.shortCode },
              ...clickedAtFilter,
              isUnique: true,
            },
          });
          return {
            id: link.id,
            shortCode: link.shortCode,
            title: link.title ?? undefined,
            clicks: link._count.analytics,
            uniqueClicks,
          };
        }),
    );

    // Calculate device percentages
    const totalDeviceClicks = topDevicesRaw.reduce(
      (sum, d) => sum + d._count.id,
      0,
    );
    const topDevices: TopDeviceData[] = topDevicesRaw.map((d) => ({
      device: d.device ?? 'Unknown',
      clicks: d._count.id,
      percentage:
        totalDeviceClicks > 0
          ? Math.round((d._count.id / totalDeviceClicks) * 100)
          : 0,
    }));

    const totalBrowserClicks = topBrowsersRaw.reduce(
      (sum, b) => sum + b._count.id,
      0,
    );
    const topBrowsers: TopBrowserData[] = topBrowsersRaw.map((b) => ({
      browser: b.browser ?? 'Unknown',
      clicks: b._count.id,
      percentage:
        totalBrowserClicks > 0
          ? Math.round((b._count.id / totalBrowserClicks) * 100)
          : 0,
    }));

    const totalOsClicks = topOsRaw.reduce((sum, o) => sum + o._count.id, 0);
    const topOs: TopOSData[] = topOsRaw.map((o) => ({
      os: o.os ?? 'Unknown',
      clicks: o._count.id,
      percentage:
        totalOsClicks > 0 ? Math.round((o._count.id / totalOsClicks) * 100) : 0,
    }));

    const topCountries: TopCountryData[] = topCountriesRaw.map((c) => ({
      country: c.country ?? 'Unknown',
      clicks: c._count.id,
    }));

    const topCities: TopCityData[] = topCitiesRaw.map((c) => ({
      city: c.city ?? 'Unknown',
      clicks: c._count.id,
    }));

    const topReferrers: TopReferrerData[] = topReferrersRaw.map((r) => ({
      referrer: r.referrerDomain ?? 'Direct',
      clicks: r._count.id,
    }));

    // Format clicks by date
    const clicksByDate = clicksByDateRaw
      .filter((row) => row.date != null)
      .map((row) => ({
        date: row.date.toISOString().split('T')[0]!,
        count: Number(row.count),
      }));

    // Calculate best day
    const bestDay =
      clicksByDate.length > 0
        ? clicksByDate.reduce(
            (best, current) => (current.count > best.count ? current : best),
            clicksByDate[0]!,
          )
        : undefined;

    const bestDayFormatted = bestDay
      ? { date: bestDay.date, clicks: bestDay.count }
      : undefined;

    return {
      totalClicks,
      uniqueVisitors: uniqueVisitorsResult.length,
      totalActiveLinks,
      linksCreatedThisMonth,
      previousMonthClicks,
      topLinks,
      topCountries,
      topCities,
      topDevices,
      topBrowsers,
      topOs,
      topReferrers,
      bestDay: bestDayFormatted,
      clicksByDate,
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

  /**
   * Computes the effective status based on current time, scheduledAt, and expiresAt.
   * This ensures accurate status display without waiting for cron jobs.
   */
  private getEffectiveStatus(link: Link): LinkStatus {
    const now = new Date();

    // If link is already in a terminal state, return as-is
    if (
      link.status === LinkStatus.BLOCKED ||
      link.status === LinkStatus.DISABLED ||
      link.status === LinkStatus.ARCHIVED
    ) {
      return link.status;
    }

    // Check if expired
    if (link.expiresAt && link.expiresAt <= now) {
      return LinkStatus.DISABLED;
    }

    // Check if scheduled and time has passed
    if (link.status === LinkStatus.SCHEDULED) {
      if (link.scheduledAt && link.scheduledAt <= now) {
        return LinkStatus.ACTIVE;
      }
      return LinkStatus.SCHEDULED;
    }

    return link.status;
  }

  private mapToLinkResponse(link: Link & { tags?: any[] }): LinkResponseDto {
    return {
      id: link.id,
      userId: link.userId,
      originalUrl: link.originalUrl,
      shortCode: link.shortCode,
      customAlias: link.customAlias ?? undefined,
      title: link.title ?? undefined,
      description: link.description ?? undefined,
      status: this.getEffectiveStatus(link),
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
      tags: link.tags?.map((linkTag) => ({
        id: linkTag.tag.id,
        userId: linkTag.tag.userId,
        name: linkTag.tag.name,
        backgroundColor: linkTag.tag.backgroundColor,
        textColor: linkTag.tag.textColor,
        createdAt: linkTag.tag.createdAt,
        updatedAt: linkTag.tag.updatedAt,
      })),
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
