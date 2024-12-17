import { createContext, useContext, useEffect, useState } from 'react';
import Chat from './Chat';
import ChatSettings from './ChatSettings';
import ChatDrawer from './ChatDrawer';
import { useRouter } from 'next/router';
import { useFetch } from '../hooks';
import { ApiSuccess } from '../types';
import { ChatContext } from '../provider';
import { LLMConversation } from './types';
import useTeam from 'hooks/useTeam';
import { Loading } from '../shared';

interface ConversationContextType {
  selectedConversation?: LLMConversation;
  isLoadingConversations: boolean;
  isChatWithPDFProvider: boolean;
  setIsChatWithPDFProvider: (value: boolean) => void;
}

export const ConversationContext =
  createContext<ConversationContextType | null>(null);

export function ChatUI({ slug }) {
  const router = useRouter();
  const conversationId = router.query.conversationId?.[0] as string;

  const setConversationId = (newConversationId: string) => {
    const basePath = router.pathname.split('/[[...conversationId]]')[0];
    const conversationRoute = basePath.split('/[slug]').join(`/${slug}`);

    if (newConversationId === '') {
      router.push(conversationRoute);
    } else {
      router.push(`${conversationRoute}/${newConversationId}`);
    }
  };

  const { urls } = useContext(ChatContext);

  const {
    data: conversationsData,
    isLoading: isLoadingConversations,
    refetch: reloadConversations,
  } = useFetch<ApiSuccess<LLMConversation[]>>({ url: urls?.conversation });

  const conversations = conversationsData?.data;

  useEffect(() => {
    if (conversationId) {
      reloadConversations();
    }
  }, [conversationId, reloadConversations]);

  const [isChatDrawerVisible, setIsChatDrawerVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isChatWithPDFProvider, setIsChatWithPDFProvider] = useState(false);

  const toggleChatDrawerVisibility = () => {
    setIsChatDrawerVisible(!isChatDrawerVisible);
  };

  const selectedConversation = conversations?.find(
    (c) => c.id === conversationId
  );

  const { isLoading } = useTeam();

  if (isLoading) {
    return <Loading />;
  }

  return (
    <ConversationContext.Provider
      value={{
        selectedConversation,
        isLoadingConversations,
        isChatWithPDFProvider,
        setIsChatWithPDFProvider,
      }}
    >
      <div className="w-full h-full relative flex bg-gray-50 border border-gray-200 rounded-lg shadow-md">
        <ChatDrawer
          isChatDrawerVisible={isChatDrawerVisible}
          toggleChatDrawerVisibility={toggleChatDrawerVisibility}
          setShowSettings={setShowSettings}
          conversations={conversations}
          conversationId={conversationId}
          setConversationId={setConversationId}
        />
        <div className="flex max-w-full flex-col w-full h-full">
          <div className="flex-1 max-h-full h-full p-4 bg-white border-t border-gray-300 rounded-b-lg shadow-inner">
            {showSettings ? (
              <div className="p-4 border-t border-gray-300 bg-white rounded-b-lg shadow-inner">
                <ChatSettings />
              </div>
            ) : (
              <div className="h-full border-t border-gray-300 bg-white rounded-b-lg shadow-inner">
                <Chat
                  setShowSettings={setShowSettings}
                  conversationId={conversationId}
                  setConversationId={setConversationId}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </ConversationContext.Provider>
  );
}
