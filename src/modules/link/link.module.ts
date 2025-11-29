import { Module } from '@nestjs/common';
import { LinkController } from './link.controller';
import { RedirectController } from './redirect.controller';
import { LinkService } from './link.service';
import { TagController } from './tag.controller';
import { TagService } from './tag.service';
import { ScanQueueModule } from '@/shared/queues/scan/scan.module';

@Module({
  imports: [ScanQueueModule],
  controllers: [LinkController, RedirectController, TagController],
  providers: [LinkService, TagService],
  exports: [LinkService, TagService],
})
export class LinkModule {}
