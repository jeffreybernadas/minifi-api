import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

@Injectable()
export class AddMemberBlockerGuard implements CanActivate {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  canActivate(_context: ExecutionContext): boolean {
    throw new ForbiddenException(
      'Adding members to chats is not available. Support chats are direct conversations with our admin.',
    );
  }
}
