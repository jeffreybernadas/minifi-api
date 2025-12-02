import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminUserController } from './admin-user.controller';
import { AdminLinkController } from './admin-link.controller';
import { AdminService } from './admin.service';
import { AdminUserService } from './admin-user.service';
import { AdminLinkService } from './admin-link.service';
import { ScanQueueModule } from '@/shared/queues/scan/scan.module';

@Module({
  imports: [ScanQueueModule],
  controllers: [AdminController, AdminUserController, AdminLinkController],
  providers: [AdminService, AdminUserService, AdminLinkService],
})
export class AdminModule {}
