export interface TestEmailTemplateProps {
  name?: string;
  buttonText?: string;
  buttonUrl?: string;
}

export interface UnreadChatData {
  chatId: string;
  chatName: string;
  unreadCount: number;
  lastMessageContent: string;
  lastMessageSenderId: string;
}

export interface ChatUnreadDigestProps {
  unreadChats: UnreadChatData[];
  totalUnreadCount: number;
}

export interface SecurityAlertEmailProps {
  originalUrl: string;
  shortCode: string;
  status: string;
  score?: number;
  threats: string[];
  reasoning?: string;
  recommendations?: string;
  scannedAt?: Date | string;
}
