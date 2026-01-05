import { Injectable } from '@nestjs/common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { LoggerService } from '@/shared/logger/logger.service';
import {
  QUEUE_EXCHANGES,
  QUEUE_ROUTING_KEYS,
} from '@/shared/queues/constants/queue.constant';
import { ScanJobDto } from './dto/scan-job.dto';

@Injectable()
export class ScanProducer {
  constructor(
    private readonly amqpConnection: AmqpConnection,
    private readonly logger: LoggerService,
  ) {}

  async queueScan(job: ScanJobDto): Promise<void> {
    try {
      await this.amqpConnection.publish(
        QUEUE_EXCHANGES.SCAN,
        QUEUE_ROUTING_KEYS.SCAN_URL,
        job,
      );
    } catch (error) {
      this.logger.error(
        'Failed to queue URL scan job',
        'ScanProducer',
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}
