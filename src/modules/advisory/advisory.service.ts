import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/database/database.service';
import { CacheService } from '@/shared/cache/cache.service';
import {
  Advisory,
  AdvisoryStatus,
  AdvisoryType,
  Prisma,
} from '@/generated/prisma/client';
import { OffsetPaginatedDto } from '@/common/dto/offset-pagination';
import { offsetPaginateWithPrisma } from '@/utils/pagination/prisma-pagination.util';
import {
  CreateAdvisoryDto,
  UpdateAdvisoryDto,
  AdvisoryResponseDto,
  AdvisoryListResponseDto,
  AdvisoryFilterDto,
} from './dto';

// Priority order: CRITICAL (highest) → WARNING → MAINTENANCE → INFO (lowest)
const TYPE_PRIORITY: Record<AdvisoryType, number> = {
  [AdvisoryType.CRITICAL]: 0,
  [AdvisoryType.WARNING]: 1,
  [AdvisoryType.MAINTENANCE]: 2,
  [AdvisoryType.INFO]: 3,
};

@Injectable()
export class AdvisoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  /**
   * Create a new advisory (starts as DRAFT)
   */
  async create(dto: CreateAdvisoryDto): Promise<AdvisoryResponseDto> {
    // Validate expiresAt if provided (no publishedAt check needed for DRAFT)
    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    if (expiresAt && expiresAt <= new Date()) {
      throw new BadRequestException('ExpiresAt must be in the future');
    }

    const advisory = await this.prisma.advisory.create({
      data: {
        title: dto.title,
        content: dto.content,
        type: dto.type,
        expiresAt,
      },
    });

    return this.mapToResponse(advisory);
  }

  /**
   * Get all advisories with pagination and filters (admin)
   */
  async findAll(
    filters: AdvisoryFilterDto,
  ): Promise<OffsetPaginatedDto<AdvisoryListResponseDto>> {
    const where: Prisma.AdvisoryWhereInput = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.type) {
      where.type = filters.type;
    }

    const paginated = await offsetPaginateWithPrisma(
      this.prisma.advisory,
      filters,
      {
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { dismissals: true },
          },
        },
      },
    );

    return {
      ...paginated,
      data: paginated.data.map(
        (advisory: Advisory & { _count: { dismissals: number } }) =>
          this.mapToListResponse(advisory, advisory._count.dismissals),
      ),
    };
  }

  /**
   * Get a single advisory by ID (admin)
   */
  async findOne(id: string): Promise<AdvisoryResponseDto> {
    const advisory = await this.prisma.advisory.findUnique({
      where: { id },
    });

    if (!advisory) {
      throw new NotFoundException('Advisory not found');
    }

    return this.mapToResponse(advisory);
  }

  /**
   * Update an advisory (admin)
   */
  async update(
    id: string,
    dto: UpdateAdvisoryDto,
  ): Promise<AdvisoryResponseDto> {
    const advisory = await this.prisma.advisory.findUnique({
      where: { id },
    });

    if (!advisory) {
      throw new NotFoundException('Advisory not found');
    }

    // Validate expiresAt if provided
    let expiresAt: Date | null | undefined = undefined;
    if (dto.expiresAt !== undefined) {
      expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;

      // If advisory is published, ensure expiresAt is after publishedAt
      if (
        expiresAt &&
        advisory.publishedAt &&
        expiresAt <= advisory.publishedAt
      ) {
        throw new BadRequestException('ExpiresAt must be after publishedAt');
      }

      // Ensure expiresAt is in the future
      if (expiresAt && expiresAt <= new Date()) {
        throw new BadRequestException('ExpiresAt must be in the future');
      }
    }

    const updated = await this.prisma.advisory.update({
      where: { id },
      data: {
        title: dto.title,
        content: dto.content,
        type: dto.type,
        expiresAt,
      },
    });

    return this.mapToResponse(updated);
  }

  /**
   * Delete an advisory (admin)
   */
  async delete(id: string): Promise<{ success: boolean }> {
    const advisory = await this.prisma.advisory.findUnique({
      where: { id },
    });

    if (!advisory) {
      throw new NotFoundException('Advisory not found');
    }

    await this.prisma.advisory.delete({ where: { id } });

    return { success: true };
  }

  /**
   * Publish an advisory (admin)
   */
  async publish(id: string): Promise<AdvisoryResponseDto> {
    const advisory = await this.prisma.advisory.findUnique({
      where: { id },
    });

    if (!advisory) {
      throw new NotFoundException('Advisory not found');
    }

    if (advisory.status === AdvisoryStatus.PUBLISHED) {
      throw new BadRequestException('Advisory is already published');
    }

    const updated = await this.prisma.advisory.update({
      where: { id },
      data: {
        status: AdvisoryStatus.PUBLISHED,
        publishedAt: new Date(),
      },
    });

    return this.mapToResponse(updated);
  }

  /**
   * Archive an advisory (admin)
   */
  async archive(id: string): Promise<AdvisoryResponseDto> {
    const advisory = await this.prisma.advisory.findUnique({
      where: { id },
    });

    if (!advisory) {
      throw new NotFoundException('Advisory not found');
    }

    const updated = await this.prisma.advisory.update({
      where: { id },
      data: {
        status: AdvisoryStatus.ARCHIVED,
      },
    });

    return this.mapToResponse(updated);
  }

  /**
   * Get active advisories for a user (not dismissed, published, not expired)
   * Sorted by priority: CRITICAL → WARNING → MAINTENANCE → INFO, then by publishedAt desc
   * Cached for 5 minutes per user
   */
  async getActiveForUser(userId: string): Promise<AdvisoryResponseDto[]> {
    const cacheKey = `advisory:active:${userId}`;
    const cached = await this.cache.get<AdvisoryResponseDto[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const now = new Date();

    const advisories = await this.prisma.advisory.findMany({
      where: {
        status: AdvisoryStatus.PUBLISHED,
        // Only show if publishedAt is set and in the past (publish() always sets publishedAt)
        publishedAt: { lte: now },
        // Not expired
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        // Not dismissed by this user
        dismissals: {
          none: {
            userId: userId,
          },
        },
      },
    });

    // Sort by type priority (CRITICAL first), then by publishedAt (newest first)
    // Note: In-memory sorting is used because Prisma doesn't support custom sort functions.
    // For small datasets (<100 advisories), this is acceptable. If advisory count grows,
    // consider adding a priority field to the database or using raw SQL with CASE WHEN.
    const sorted = Array.from(advisories);
    sorted.sort((a, b) => {
      const priorityDiff = TYPE_PRIORITY[a.type] - TYPE_PRIORITY[b.type];
      if (priorityDiff !== 0) return priorityDiff;

      // Same priority, sort by publishedAt descending (newest first)
      const aTime = a.publishedAt?.getTime() ?? 0;
      const bTime = b.publishedAt?.getTime() ?? 0;
      return bTime - aTime;
    });

    const result = sorted.map((a) => this.mapToResponse(a));

    // Cache for 5 minutes (300 seconds)
    await this.cache.set(cacheKey, result, 300);

    return result;
  }

  /**
   * Dismiss an advisory for a user
   */
  async dismiss(
    userId: string,
    advisoryId: string,
  ): Promise<{ success: boolean }> {
    const advisory = await this.prisma.advisory.findUnique({
      where: { id: advisoryId },
    });

    if (!advisory) {
      throw new NotFoundException('Advisory not found');
    }

    // Upsert to handle race conditions
    await this.prisma.userAdvisoryDismissal.upsert({
      where: {
        userId_advisoryId: {
          userId,
          advisoryId,
        },
      },
      create: {
        userId,
        advisoryId,
      },
      update: {}, // No-op if already exists
    });

    // Invalidate user's cache so dismissed advisory disappears immediately
    const cacheKey = `advisory:active:${userId}`;
    await this.cache.del(cacheKey);

    return { success: true };
  }

  /**
   * Map advisory to response DTO
   */
  private mapToResponse(advisory: Advisory): AdvisoryResponseDto {
    return {
      id: advisory.id,
      title: advisory.title,
      content: advisory.content,
      type: advisory.type,
      status: advisory.status,
      publishedAt: advisory.publishedAt?.toISOString() ?? null,
      expiresAt: advisory.expiresAt?.toISOString() ?? null,
      createdAt: advisory.createdAt.toISOString(),
      updatedAt: advisory.updatedAt.toISOString(),
    };
  }

  /**
   * Map advisory to list response DTO (includes dismissal count)
   */
  private mapToListResponse(
    advisory: Advisory,
    dismissalCount: number,
  ): AdvisoryListResponseDto {
    return {
      ...this.mapToResponse(advisory),
      dismissalCount,
    };
  }
}
