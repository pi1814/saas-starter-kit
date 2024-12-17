import { ChatContextProvider, ChatUI } from '@/components/chats';
import useTeam from 'hooks/useTeam';
import { GetServerSidePropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

const ChatPage = () => {
  const { team } = useTeam();
  return (
    <ChatContextProvider
      value={{
        urls: {
          chat: `/api/chat/${team?.id}`,
          llmConfig: `/api/chat/${team?.id}/config`,
          llmProviders: `/api/chat/${team?.id}/providers`,
          fileUpload: `/api/chat/${team?.id}/upload-file`,
          conversation: `/api/chat/${team?.id}/conversation`,
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
