import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { PrismaService } from '@/database/database.service';
import { LoggerService } from '@/shared/logger/logger.service';
import { ScanJobDto } from './dto/scan-job.dto';
import {
  QUEUE_EXCHANGES,
  QUEUE_NAMES,
  QUEUE_ROUTING_KEYS,
} from '@/shared/queues/constants/queue.constant';
import { UrlScanService } from '@/shared/scan/url-scan.service';
import { UrlScanStatus } from '@/common/interfaces/scan.interface';
import { ScanStatus } from '@/generated/prisma/client';
import { EmailProducer } from '@/shared/queues/email/email.producer';
import { EmailRenderer } from '@/utils/email/email.util';

@Injectable()
export class ScanConsumer {
  private readonly cacheTtlSeconds = 60 * 60 * 24; // 24 hours

  constructor(
    private readonly scanService: UrlScanService,
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
    private readonly configService: ConfigService,
    private readonly emailProducer: EmailProducer,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  @RabbitSubscribe({
    exchange: QUEUE_EXCHANGES.SCAN,
    routingKey: QUEUE_ROUTING_KEYS.SCAN_URL,
    queue: QUEUE_NAMES.SCAN_URL,
  })
  async handleScan(job: ScanJobDto): Promise<void> {
    const cacheKey = `scan:url:${job.url}`;

    try {
      const link = await this.prisma.link.findUnique({
        where: { id: job.linkId },
        include: {
          user: {
            select: { id: true, email: true },
          },
        },
      });

      if (!link) {
        this.logger.warn('Link not found for URL scan', 'ScanConsumer', {
          linkId: job.linkId,
        });
        return;
      }

      let result =
        !job.force &&
        (await this.cache.get<Awaited<ReturnType<UrlScanService['scanUrl']>>>(
          cacheKey,
        ));

      if (!result) {
        result = await this.scanService.scanUrl(job.url);
        await this.cache.set(cacheKey, result, this.cacheTtlSeconds);
      }

      const statusMap: Record<UrlScanStatus, ScanStatus> = {
        SAFE: ScanStatus.SAFE,
        SUSPICIOUS: ScanStatus.SUSPICIOUS,
        MALICIOUS: ScanStatus.MALICIOUS,
        ADULT_CONTENT: ScanStatus.ADULT_CONTENT,
      };

      await this.prisma.link.update({
        where: { id: job.linkId },
        data: {
          scanStatus: statusMap[result.status],
          scanScore: result.score,
          scanDetails: {
            isSafe: result.isSafe,
            threats: result.threats,
            reasoning: result.reasoning,
            recommendations: result.recommendations,
          },
          scannedAt: new Date(),
          lastScanVersion:
            result.modelVersion ??
            this.configService.getOrThrow('openai.model'),
        },
      });

      this.logger.log('URL scan completed', 'ScanConsumer', {
        linkId: job.linkId,
        status: result.status,
        requestedBy: job.requestedBy,
      });

      // Send security alert email for non-safe statuses
      if (link.userId && result.status !== 'SAFE' && link.user?.email) {
        const defaultSender = this.configService.getOrThrow('resend.sender', {
          infer: true,
        });

        const baseUrl = this.configService.getOrThrow('app.frontendUrl', {
          infer: true,
        });

        const html = await EmailRenderer.renderSecurityAlert({
          baseUrl: baseUrl ?? '',
          originalUrl: link.originalUrl,
          shortCode: link.shortCode,
          status: result.status,
          score: result.score,
          threats: result.threats,
          reasoning: result.reasoning,
          recommendations: result.recommendations,
          scannedAt: new Date(),
        });

        await this.emailProducer.publishSendEmail({
          userId: link.userId,
          to: link.user.email,
          subject: `Security warning for your link ${link.shortCode}`,
          html,
          from: defaultSender,
        });
      }
    } catch (error) {
      this.logger.error(
        'URL scan failed',
        'ScanConsumer',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
