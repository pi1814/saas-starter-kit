import { ChatContextProvider, ChatUI } from '@/components/chats';
import { GetServerSidePropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

const ChatPage = ({
  llmTenant,
}: {
  llmTenant: string;
  hasValidLicense: boolean;
}) => {
  return (
    <ChatContextProvider
      value={{
        urls: {
          chat: `/api/chat/${llmTenant}`,
          llmConfig: `/api/chat/${llmTenant}/config`,
          llmProviders: `/api/chat/${llmTenant}/providers`,
          fileUpload: `/api/chat/${llmTenant}/upload-file`,
          conversation: `/api/chat/${llmTenant}/conversation`,
        },
      }}
    >
      <ChatUI />
    </ChatContextProvider>
  );
};

export const getServerSideProps = async (
  context: GetServerSidePropsContext
) => {
  const { locale } = context;

  return {
    props: {
      ...(locale ? await serverSideTranslations(locale, ['common']) : {}),
    },
  };
};

export default ChatPage;
