import { IsNotEmpty, IsString, IsArray, IsNumber } from 'class-validator';

/**
 * DTO for unread chat data in digest email
 */
export class UnreadChatDataDto {
  @IsString()
  @IsNotEmpty()
  chatId: string;

  @IsString()
  chatName: string;

  @IsNumber()
  @IsNotEmpty()
  unreadCount: number;

  @IsString()
  @IsNotEmpty()
  lastMessageContent: string;

  @IsString()
  @IsNotEmpty()
  lastMessageSenderId: string;
}

/**
 * DTO for chat unread digest job
 * Used when publishing unread digest email tasks to queue
 */
export class ChatUnreadDigestJobDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  userEmail: string;

  @IsArray()
  @IsNotEmpty()
  unreadChats: UnreadChatDataDto[];

  @IsNumber()
  @IsNotEmpty()
  totalUnreadCount: number;
}
