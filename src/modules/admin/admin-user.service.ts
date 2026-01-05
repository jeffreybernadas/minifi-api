import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/database/database.service';
import {
  LinkStatus,
  Prisma,
  SubscriptionStatus,
  SubscriptionTier,
  UserType,
} from '@/generated/prisma/client';
import { OffsetPaginatedDto } from '@/common/dto/offset-pagination';
import { offsetPaginateWithPrisma } from '@/utils/pagination/prisma-pagination.util';
import { StripeService } from '@/modules/subscription/stripe.service';
import { LoggerService } from '@/shared/logger/logger.service';
import {
  AdminUserFilterDto,
  AdminUserResponseDto,
  AdminUserDetailDto,
} from './dto';

@Injectable()
export class AdminUserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,
    private readonly logger: LoggerService,
  ) {}

  async getUsers(
    filters: AdminUserFilterDto,
  ): Promise<OffsetPaginatedDto<AdminUserResponseDto>> {
    const where: Prisma.UserWhereInput = {
      ...(filters.userType && { userType: filters.userType }),
      ...(filters.isBlocked !== undefined && { isBlocked: filters.isBlocked }),
      ...(filters.emailVerified !== undefined && {
        emailVerified: filters.emailVerified,
      }),
      ...(filters.search && {
        OR: [
          {
            email: {
              contains: filters.search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            username: {
              contains: filters.search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            firstName: {
              contains: filters.search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            lastName: {
              contains: filters.search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            id: {
              contains: filters.search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
        ],
      }),
    };

    const paginated = await offsetPaginateWithPrisma(
      this.prisma.user,
      filters,
      {
        where,
        orderBy: { createdAt: filters.order ?? 'desc' },
        include: {
          _count: { select: { links: true } },
          links: { select: { clickCount: true, status: true } },
        },
      },
    );

    return {
      ...paginated,
      data: paginated.data.map((user: any) => this.mapToUserResponse(user)),
    };
  }

  async getUserById(id: string): Promise<AdminUserDetailDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        subscription: true,
        _count: { select: { links: true } },
        links: { select: { clickCount: true, status: true } },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.mapToUserDetail(user);
  }

  async changeTier(
    id: string,
    tier: SubscriptionTier,
  ): Promise<AdminUserDetailDto> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const userType =
      tier === SubscriptionTier.PRO ? UserType.PRO : UserType.FREE;

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id },
        data: { userType },
      }),
      this.prisma.subscription.upsert({
        where: { userId: id },
        update: { tier, status: SubscriptionStatus.ACTIVE },
        create: { userId: id, tier, status: SubscriptionStatus.ACTIVE },
      }),
    ]);

    return this.getUserById(id);
  }

  async blockUser(id: string, reason: string): Promise<AdminUserDetailDto> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.update({
      where: { id },
      data: {
        isBlocked: true,
        blockedAt: new Date(),
        blockedReason: reason,
      },
    });

    return this.getUserById(id);
  }

  async unblockUser(id: string): Promise<AdminUserDetailDto> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.update({
      where: { id },
      data: {
        isBlocked: false,
        blockedAt: null,
        blockedReason: null,
      },
    });

    return this.getUserById(id);
  }

  async deleteUser(id: string): Promise<{ success: boolean }> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check for active Stripe subscription and cancel it before deletion
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId: id },
      select: { stripeSubscriptionId: true, status: true },
    });

    if (
      subscription?.stripeSubscriptionId &&
      subscription.status === SubscriptionStatus.ACTIVE
    ) {
      try {
        await this.stripeService.cancelSubscriptionImmediately(
          subscription.stripeSubscriptionId,
        );
        this.logger.log(
          `Cancelled Stripe subscription for deleted user: ${id}`,
          'AdminUserService',
        );
      } catch (error) {
        // Log but don't block deletion - admin action takes priority
        this.logger.error(
          `Failed to cancel Stripe subscription for user ${id}: ${error.message}`,
          error.stack,
          'AdminUserService',
        );
      }
    }

    await this.prisma.user.delete({ where: { id } });

    return { success: true };
  }

  private mapToUserResponse(user: any): AdminUserResponseDto {
    const activeLinksCount =
      user.links?.filter((l: any) => l.status === LinkStatus.ACTIVE).length ??
      0;
    const totalClicks =
      user.links?.reduce(
        (sum: number, l: any) => sum + (l.clickCount ?? 0),
        0,
      ) ?? 0;

    return {
      id: user.id,
      email: user.email,
      username: user.username ?? undefined,
      firstName: user.firstName ?? undefined,
      lastName: user.lastName ?? undefined,
      emailVerified: user.emailVerified,
      userType: user.userType,
      isBlocked: user.isBlocked,
      blockedAt: user.blockedAt ?? undefined,
      blockedReason: user.blockedReason ?? undefined,
      linksCount: user._count?.links ?? 0,
      activeLinksCount,
      totalClicks,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private mapToUserDetail(user: any): AdminUserDetailDto {
    return {
      ...this.mapToUserResponse(user),
      phoneNumber: user.phoneNumber ?? undefined,
      avatarUrl: user.avatarUrl ?? undefined,
      address: user.address ?? undefined,
      emailNotificationsEnabled: user.emailNotificationsEnabled,
      subscriptionTier: user.subscription?.tier,
      subscriptionStatus: user.subscription?.status,
      stripeCustomerId: user.subscription?.stripeCustomerId ?? undefined,
    };
  }
}
