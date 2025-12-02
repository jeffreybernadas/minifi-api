import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/database/database.service';
import { LinkStatus, Prisma, ScanStatus } from '@/generated/prisma/client';
import { OffsetPaginatedDto } from '@/common/dto/offset-pagination';
import { offsetPaginateWithPrisma } from '@/utils/pagination/prisma-pagination.util';
import { ScanProducer } from '@/shared/queues/scan/scan.producer';
import { LoggerService } from '@/shared/logger/logger.service';
import { ConfigService } from '@nestjs/config';
import { GlobalConfig } from '@/config/config.type';
import { RESERVED_KEYWORDS } from '@/constants/link.constant';
import {
  AdminLinkFilterDto,
  AdminLinkResponseDto,
  AdminLinkDetailDto,
  AdminEditLinkDto,
} from './dto';

@Injectable()
export class AdminLinkService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scanProducer: ScanProducer,
    private readonly logger: LoggerService,
    private readonly configService: ConfigService<GlobalConfig>,
  ) {}

  async getLinks(
    filters: AdminLinkFilterDto,
  ): Promise<OffsetPaginatedDto<AdminLinkResponseDto>> {
    const where: Prisma.LinkWhereInput = {
      ...(filters.status && { status: filters.status }),
      ...(filters.scanStatus && { scanStatus: filters.scanStatus }),
      ...(filters.isGuest !== undefined && { isGuest: filters.isGuest }),
      ...(filters.isArchived !== undefined && {
        isArchived: filters.isArchived,
      }),
      ...(filters.userId && { userId: filters.userId }),
      ...(filters.search && {
        OR: [
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
          {
            originalUrl: {
              contains: filters.search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            title: {
              contains: filters.search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
        ],
      }),
    };

    const paginated = await offsetPaginateWithPrisma(
      this.prisma.link,
      filters,
      {
        where,
        orderBy: { createdAt: filters.order ?? 'desc' },
        include: { user: { select: { email: true } } },
      },
    );

    return {
      ...paginated,
      data: paginated.data.map((link: any) => this.mapToLinkResponse(link)),
    };
  }

  async getLinkById(id: string): Promise<AdminLinkDetailDto> {
    const link = await this.prisma.link.findUnique({
      where: { id },
      include: { user: { select: { email: true } } },
    });

    if (!link) {
      throw new NotFoundException('Link not found');
    }

    return this.mapToLinkDetail(link);
  }

  async editLink(
    id: string,
    dto: AdminEditLinkDto,
  ): Promise<AdminLinkDetailDto> {
    const link = await this.prisma.link.findUnique({ where: { id } });
    if (!link) {
      throw new NotFoundException('Link not found');
    }

    // Validate customAlias if provided
    if (dto.customAlias !== undefined) {
      await this.validateAndCheckCustomAlias(dto.customAlias, id);
    }

    const data: Prisma.LinkUpdateInput = {
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.status !== undefined && { status: dto.status }),
      ...(dto.customAlias !== undefined && { customAlias: dto.customAlias }),
      ...(dto.expiresAt !== undefined && {
        expiresAt: new Date(dto.expiresAt),
      }),
      ...(dto.clickLimit !== undefined && { clickLimit: dto.clickLimit }),
      ...(dto.isArchived !== undefined && { isArchived: dto.isArchived }),
      ...(dto.notes !== undefined && { notes: dto.notes }),
    };

    await this.prisma.link.update({ where: { id }, data });

    return this.getLinkById(id);
  }

  /**
   * Validates customAlias for reserved keywords and checks uniqueness
   */
  private async validateAndCheckCustomAlias(
    alias: string,
    excludeId: string,
  ): Promise<void> {
    // Check reserved keywords
    if (RESERVED_KEYWORDS.includes(alias.toLowerCase())) {
      throw new BadRequestException(
        'This alias is reserved. Please choose another.',
      );
    }

    // Check uniqueness against both shortCode and customAlias
    const existing = await this.prisma.link.findFirst({
      where: {
        OR: [{ shortCode: alias }, { customAlias: alias }],
        id: { not: excludeId },
      },
      select: { id: true },
    });

    if (existing) {
      throw new BadRequestException(
        'This alias is already taken. Please choose another.',
      );
    }
  }

  async blockLink(id: string, reason: string): Promise<AdminLinkDetailDto> {
    const link = await this.prisma.link.findUnique({ where: { id } });
    if (!link) {
      throw new NotFoundException('Link not found');
    }

    await this.prisma.link.update({
      where: { id },
      data: {
        status: LinkStatus.BLOCKED,
        notes: `[BLOCKED] ${reason}${link.notes ? `\n\n${link.notes}` : ''}`,
      },
    });

    return this.getLinkById(id);
  }

  async unblockLink(id: string): Promise<AdminLinkDetailDto> {
    const link = await this.prisma.link.findUnique({ where: { id } });
    if (!link) {
      throw new NotFoundException('Link not found');
    }

    const now = new Date();
    let status: LinkStatus = LinkStatus.ACTIVE;

    if (link.isArchived) {
      status = LinkStatus.ARCHIVED;
    } else if (link.scheduledAt && link.scheduledAt > now) {
      status = LinkStatus.SCHEDULED;
    } else if (link.expiresAt && link.expiresAt <= now) {
      status = LinkStatus.DISABLED;
    }

    await this.prisma.link.update({
      where: { id },
      data: { status, notes: null },
    });

    return this.getLinkById(id);
  }

  async rescanLink(id: string, adminId: string): Promise<AdminLinkDetailDto> {
    const link = await this.prisma.link.findUnique({ where: { id } });
    if (!link) {
      throw new NotFoundException('Link not found');
    }

    await this.prisma.link.update({
      where: { id },
      data: {
        scanStatus: ScanStatus.PENDING,
        scanScore: null,
        scanDetails: {},
        scannedAt: null,
        lastScanVersion: null,
      },
    });

    const enableUrlScan = this.configService.get<boolean>('app.enableUrlScan', {
      infer: true,
    });
    if (enableUrlScan) {
      try {
        await this.scanProducer.queueScan({
          linkId: link.id,
          url: link.originalUrl,
          requestedBy: adminId,
          force: true,
        });
      } catch (error) {
        this.logger.error(
          `Failed to enqueue admin rescan for link ${id}`,
          'AdminLinkService',
          error instanceof Error ? error.stack : undefined,
        );
      }
    }

    return this.getLinkById(id);
  }

  async deleteLink(id: string): Promise<{ success: boolean }> {
    const link = await this.prisma.link.findUnique({ where: { id } });
    if (!link) {
      throw new NotFoundException('Link not found');
    }

    await this.prisma.link.delete({ where: { id } });

    return { success: true };
  }

  private mapToLinkResponse(link: any): AdminLinkResponseDto {
    return {
      id: link.id,
      userId: link.userId ?? undefined,
      userEmail: link.user?.email ?? undefined,
      originalUrl: link.originalUrl,
      shortCode: link.shortCode,
      customAlias: link.customAlias ?? undefined,
      title: link.title ?? undefined,
      description: link.description ?? undefined,
      status: link.status,
      isGuest: link.isGuest,
      scanStatus: link.scanStatus,
      scanScore: link.scanScore ?? undefined,
      scannedAt: link.scannedAt ?? undefined,
      hasPassword: Boolean(link.password),
      scheduledAt: link.scheduledAt ?? undefined,
      expiresAt: link.expiresAt ?? undefined,
      clickLimit: link.clickLimit ?? undefined,
      isOneTime: link.isOneTime,
      isArchived: link.isArchived,
      clickCount: link.clickCount,
      uniqueClickCount: link.uniqueClickCount,
      lastClickedAt: link.lastClickedAt ?? undefined,
      createdAt: link.createdAt,
      updatedAt: link.updatedAt,
    };
  }

  private mapToLinkDetail(link: any): AdminLinkDetailDto {
    return {
      ...this.mapToLinkResponse(link),
      guestIpAddress: link.guestIpAddress ?? undefined,
      guestUserAgent: link.guestUserAgent ?? undefined,
      scanDetails: link.scanDetails ?? undefined,
      notes: link.notes ?? undefined,
      qrCodeUrl: link.qrCodeUrl ?? undefined,
    };
  }
}
