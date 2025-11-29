import { Module } from '@nestjs/common';
import { ScanProducer } from './scan.producer';

@Module({
  providers: [ScanProducer],
  exports: [ScanProducer],
})
export class ScanQueueModule {}
