import { Module } from '@nestjs/common';
import { LinkController } from './link.controller';
import { RedirectController } from './redirect.controller';
import { LinkService } from './link.service';

@Module({
  controllers: [LinkController, RedirectController],
  providers: [LinkService],
  exports: [LinkService],
})
export class LinkModule {}
