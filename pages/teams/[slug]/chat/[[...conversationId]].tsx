import { ChatContextProvider, ChatUI } from '@/components/chats';
import useTeam from 'hooks/useTeam';
import { GetServerSidePropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { Error, Loading } from '@/components/shared';
import { useTranslation } from 'next-i18next';

const ChatPage = ({ slug }) => {
  const { t } = useTranslation('common');
  const { isLoading, isError, team } = useTeam(slug as string);

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
          chat: `/api/teams/${team.slug}/chat/${team.id}`,
          llmConfig: `/api/teams/${team.slug}/chat/${team.id}/config`,
          llmProviders: `/api/teams/${team.slug}/chat/${team.id}/providers`,
          fileUpload: `/api/teams/${team.slug}/chat/${team.id}/upload-file`,
          conversation: `/api/teams/${team.slug}/chat/${team.id}/conversation`,
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
  const { locale, query } = context;

  return {
    props: {
      ...(locale ? await serverSideTranslations(locale, ['common']) : {}),
      slug: query.slug,
    },
  };
};

export default ChatPage;
