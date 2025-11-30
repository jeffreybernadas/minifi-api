import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';
import { UserModule } from './user/user.module';
import { FileModule } from './file/file.module';
import { ChatModule } from './chat/chat.module';
import { LinkModule } from './link/link.module';
import { SubscriptionModule } from './subscription/subscription.module';

@Module({
  imports: [
    HealthModule,
    UserModule,
    FileModule,
    ChatModule,
    LinkModule,
    SubscriptionModule,
  ],
})
export class ApiModule {}
