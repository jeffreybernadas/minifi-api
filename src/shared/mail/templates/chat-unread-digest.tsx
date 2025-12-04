import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from '@react-email/components';
import { ChatUnreadDigestProps } from '@/common/interfaces/email.interface';
import * as React from 'react';

const LOGO_URL = 'https://cdn-icons-png.flaticon.com/128/7347/7347153.png';

export const ChatUnreadDigestTemplate = (props: ChatUnreadDigestProps) => {
  const { unreadChats, totalUnreadCount } = props;

  const previewText = `You have ${totalUnreadCount || 0} unread message${totalUnreadCount && totalUnreadCount > 1 ? 's' : ''}`;

  return (
    <Html>
      <Head />
      <Tailwind>
        <Body className="mx-auto my-auto bg-white px-2 font-sans">
          <Preview>{previewText}</Preview>
          <Container className="mx-auto my-[40px] max-w-[465px] rounded border border-[#eaeaea] border-solid p-[20px]">
            <Section className="mt-[32px]">
              <Img
                src={LOGO_URL}
                width="40"
                height="37"
                alt="Minifi"
                className="mx-auto my-0"
              />
            </Section>

            <Heading className="mx-0 my-[30px] p-0 text-center font-normal text-[24px] text-black">
              You have {totalUnreadCount || 0} unread message
              {totalUnreadCount && totalUnreadCount > 1 ? 's' : ''}
            </Heading>

            <Text className="text-[14px] text-black leading-[24px]">
              Here's a summary of your unread messages from today:
            </Text>

            <Hr className="mx-0 my-[26px] w-full border border-[#eaeaea] border-solid" />

            {unreadChats && unreadChats.length > 0 ? (
              unreadChats.map((chat, index) => (
                <Section key={chat.chatId} className="mb-[20px]">
                  <Text className="text-[16px] text-black leading-[24px] font-semibold m-0">
                    {chat.chatName}
                    <span className="inline-block ml-[12px] text-[12px] font-medium text-white bg-blue-600 px-[12px] py-[4px] rounded-full">
                      {chat.unreadCount} unread
                    </span>
                  </Text>

                  <Text className="text-[14px] text-[#666666] leading-[24px] italic m-0 mt-[8px]">
                    "
                    {chat.lastMessageContent?.substring(0, 100) ||
                      'No message content'}
                    {chat.lastMessageContent &&
                    chat.lastMessageContent.length > 100
                      ? '...'
                      : ''}
                    "
                  </Text>

                  {index < (unreadChats?.length || 0) - 1 && (
                    <Hr className="mx-0 my-[20px] w-full border border-[#eaeaea] border-solid" />
                  )}
                </Section>
              ))
            ) : (
              <Text className="text-[14px] text-black leading-[24px]">
                No unread messages.
              </Text>
            )}

            <Hr className="mx-0 my-[26px] w-full border border-[#eaeaea] border-solid" />

            <Text className="text-[14px] text-black leading-[24px]">
              Open your chat app to read and respond to these messages.
            </Text>

            <Hr className="mx-0 my-[26px] w-full border border-[#eaeaea] border-solid" />

            <Section>
              <Img
                src={LOGO_URL}
                width="24"
                height="24"
                alt="Minifi"
                className="my-0"
              />
              <Text className="text-[#666666] text-[12px] leading-[20px] mt-[16px]">
                Minifi - Links made simple.
              </Text>
              <Text className="text-[#999999] text-[11px] leading-[16px] mt-[8px]">
                © {new Date().getFullYear()} Minifi. All rights reserved.
              </Text>
              <Text className="text-[#999999] text-[11px] leading-[16px]">
                <Link
                  href="https://minifi.link"
                  className="text-[#666666] underline"
                >
                  minifi.link
                </Link>{' '}
                &bull;{' '}
                <Link
                  href="https://minifi.link/privacy"
                  className="text-[#666666] underline"
                >
                  Privacy
                </Link>{' '}
                &bull;{' '}
                <Link
                  href="https://minifi.link/terms"
                  className="text-[#666666] underline"
                >
                  Terms
                </Link>
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

ChatUnreadDigestTemplate.PreviewProps = {
  unreadChats: [
    {
      chatId: 'chat-123',
      chatName: 'Support Chat',
      unreadCount: 5,
      lastMessageContent:
        'Thanks for your question! Did you try to send a request for re-scanning the link?',
      lastMessageSenderId: 'admin-123',
    },
  ],
  totalUnreadCount: 5,
} as ChatUnreadDigestProps;

export default ChatUnreadDigestTemplate;
