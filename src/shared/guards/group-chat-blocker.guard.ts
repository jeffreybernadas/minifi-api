import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ChatType } from '@/generated/prisma/client';

@Injectable()
export class GroupChatBlockerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const body = req.body;

    if (body?.type === ChatType.GROUP) {
      throw new ForbiddenException(
        'Group chats are not available. Please use support chat for assistance.',
      );
    }

    return true;
  }
}
