import { ChatContextProvider, ChatUI } from '@/components/chats';
import useTeam from 'hooks/useTeam';
import { GetServerSidePropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { Error, Loading } from '@/components/shared';
import { useTranslation } from 'next-i18next';

const ChatPage = ({
  llmTenant,
}: {
  llmTenant: string;
  hasValidLicense: boolean;
}) => {
  const { t } = useTranslation('common');
  const { isLoading, isError, team } = useTeam();

  if (isLoading) {
    return <Loading />;
  }

  if (isError) {
    return <Error message={isError?.message} />;
  }

  if (!team) {
    return <Error message={t('team-not-found')} />;
  }
  return (
    <ChatContextProvider
      value={{
        urls: {
          chat: `/api/teams/${team.slug}/chat/${llmTenant}`,
          llmConfig: `/api/teams/${team.slug}/chat/${llmTenant}/config`,
          llmProviders: `/api/teams/${team.slug}/chat/${llmTenant}/providers`,
          fileUpload: `/api/teams/${team.slug}/chat/${llmTenant}/upload-file`,
          conversation: `/api/teams/${team.slug}/chat/${llmTenant}/conversation`,
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
