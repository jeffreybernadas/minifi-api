import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/database/database.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';

@Injectable()
export class TagService {
  constructor(private readonly prisma: PrismaService) {}

  async createTag(userId: string, dto: CreateTagDto) {
    return await this.prisma.tag.create({
      data: {
        userId,
        name: dto.name,
        backgroundColor: dto.backgroundColor,
        textColor: dto.textColor,
      },
    });
  }

  async getUserTags(userId: string) {
    return await this.prisma.tag.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateTag(tagId: string, userId: string, dto: UpdateTagDto) {
    const existing = await this.prisma.tag.findFirst({
      where: { id: tagId, userId },
    });

    if (!existing) {
      throw new NotFoundException('Tag not found');
    }

    return this.prisma.tag.update({
      where: { id: tagId },
      data: {
        name: dto.name ?? existing.name,
        backgroundColor: dto.backgroundColor ?? existing.backgroundColor,
        textColor: dto.textColor ?? existing.textColor,
      },
    });
  }

  async deleteTag(tagId: string, userId: string) {
    const existing = await this.prisma.tag.findFirst({
      where: { id: tagId, userId },
    });

    if (!existing) {
      throw new NotFoundException('Tag not found');
    }

    await this.prisma.tag.delete({
      where: { id: tagId },
    });

    return { success: true };
  }

  async addTagToLink(linkId: string, tagId: string, userId: string) {
    const [link, tag] = await Promise.all([
      this.prisma.link.findFirst({ where: { id: linkId, userId } }),
      this.prisma.tag.findFirst({ where: { id: tagId, userId } }),
    ]);

    if (!link) {
      throw new NotFoundException('Link not found');
    }

    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    await this.prisma.linkTag.upsert({
      where: { linkId_tagId: { linkId, tagId } },
      create: { linkId, tagId },
      update: {},
    });

    return { success: true };
  }

  async removeTagFromLink(linkId: string, tagId: string, userId: string) {
    const link = await this.prisma.link.findFirst({
      where: { id: linkId, userId },
    });

    if (!link) {
      throw new NotFoundException('Link not found');
    }

    await this.prisma.linkTag.deleteMany({
      where: { linkId, tagId },
    });

    return { success: true };
  }
}
