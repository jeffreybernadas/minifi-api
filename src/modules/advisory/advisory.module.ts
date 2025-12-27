import { Module } from '@nestjs/common';
import { AdvisoryController } from './advisory.controller';
import { AdvisoryPublicController } from './advisory-public.controller';
import { AdvisoryService } from './advisory.service';

@Module({
  controllers: [AdvisoryController, AdvisoryPublicController],
  providers: [AdvisoryService],
  exports: [AdvisoryService],
})
export class AdvisoryModule {}
