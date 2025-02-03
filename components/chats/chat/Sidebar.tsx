import { useTranslation } from 'next-i18next';
import { Plus, Settings, Search, X } from 'lucide-react'; // Importing trash icon for delete
import { LLMConversation } from './types';
import { ConversationContext } from './ChatUI';
import { useContext, useEffect, useState } from 'react';
import { Badge, ConfirmationModal } from '../shared';
import toast from 'react-hot-toast';
import { ChatContext } from '../provider';
import { useFetch } from '../hooks';
import { ApiSuccess } from '../types';
import { defaultHeaders } from '../utils';

type SidebarProps = {
  setShowSettings: (value: boolean) => void;
  toggleChatDrawerVisibility?: () => void;
  conversations?: LLMConversation[];
  conversationId?: string;
  setConversationId: (value: string) => void;
};

const Sidebar = ({
  toggleChatDrawerVisibility,
  setShowSettings,
  conversations,
  conversationId,
  setConversationId,
}: SidebarProps) => {
  const { t } = useTranslation('common');
  const setIsChatWithPDFProvider =
    useContext(ConversationContext)?.setIsChatWithPDFProvider;

  const { urls } = useContext(ChatContext);

  const removeConversation = async (conversationId: string) => {
    if (!conversationId) {
      console.error('Invalid conversation ID');
      return;
    }
    console.log(
      `Deleting conversation at: ${urls?.conversation}/${conversationId}`
    );

    try {
      const response = await fetch(`${urls?.conversation}/${conversationId}`, {
        method: 'DELETE',
        headers: defaultHeaders,
      });

      if (!response.ok) {
        const json = await response.json();
        toast.error(json.error.message || 'Failed to delete conversation');
        return;
      }

      toast.success(t('bui-chat-conversation-deleted'));
      setConversationId('');
      reloadConversations();
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast.error('An error occurred while deleting the conversation.');
    }
  };

  const { refetch: reloadConversations } = useFetch<
    ApiSuccess<LLMConversation[]>
  >({
    url: urls?.conversation,
  });

  useEffect(() => {
    if (conversationId) {
      reloadConversations();
    }
  }, [conversationId, reloadConversations]);

  return (
    <div className="flex h-[93vh] w-full flex-1 items-start border-white/20 dark:bg-gray-800">
      <nav className="flex h-[93vh] flex-1 flex-col space-y-1 p-2">
        <div
          className="flex py-3 px-3 items-center gap-3 rounded-md hover:bg-gray-500/10 transition-colors duration-200 text-white cursor-pointer text-sm mb-1 flex-shrink-0 border border-white/20"
          onClick={() => {
            setConversationId('');
            setIsChatWithPDFProvider?.(false);
            setShowSettings(false);
            if (typeof toggleChatDrawerVisibility === 'function') {
              toggleChatDrawerVisibility();
            }
          }}
        >
          <Plus className="h-5 w-5" />
          {t('bui-chat-new-chat')}
        </div>
        <div className="flex-col flex-1 border-b border-white/20 overflow-y-scroll">
          {!conversationId && (
            <ConversationTile
              key="untitled"
              conversation={{ id: '', title: 'Untitled' }}
              conversationId={conversationId}
              onClick={() => {
                if (typeof toggleChatDrawerVisibility === 'function') {
                  toggleChatDrawerVisibility();
                }
                setIsChatWithPDFProvider?.(false);
                setShowSettings(false);
              }}
              onDelete={() => removeConversation('')}
            />
          )}
          {conversations?.map((c) => (
            <ConversationTile
              key={c.id}
              conversation={c}
              onClick={() => {
                setConversationId(c.id);
                if (typeof toggleChatDrawerVisibility === 'function') {
                  toggleChatDrawerVisibility();
                }
                setShowSettings(false);
                setIsChatWithPDFProvider?.(false);
              }}
              onDelete={() => removeConversation(c.id)} // Handle delete for each conversation
              conversationId={conversationId}
            />
          ))}
        </div>
        <button
          className="flex py-3 px-3 items-center gap-3 rounded-md hover:bg-gray-500/10 transition-colors duration-200 text-white cursor-pointer text-sm"
          onClick={() => {
            setShowSettings(false);
            setIsChatWithPDFProvider?.(true);
            setConversationId('');
            if (typeof toggleChatDrawerVisibility === 'function') {
              toggleChatDrawerVisibility();
            }
          }}
        >
          <Search className="h-5 w-5" />
          {t('bui-chat-with-pdf')}
        </button>
        <div
          className="flex py-3 px-3 items-center gap-3 rounded-md hover:bg-gray-500/10 transition-colors duration-200 text-white cursor-pointer text-sm"
          onClick={() => {
            setShowSettings(true);
            setConversationId('');
            if (typeof toggleChatDrawerVisibility === 'function') {
              toggleChatDrawerVisibility();
            }
          }}
        >
          <Settings className="h-5 w-5" />
          {t('settings')}
        </div>
      </nav>
    </div>
  );
};

function ConversationTile({
  conversation,
  onClick,
  onDelete,
  conversationId,
}: {
  conversation: Partial<LLMConversation>;
  onClick?: (id: string) => void;
  onDelete?: () => void;
  conversationId?: string;
}) {
  const { title, isChatWithPDFProvider, id } = conversation;
  const { t } = useTranslation('common');

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleDelete = () => {
    if (typeof onDelete === 'function') {
      onDelete();
    }
    setShowConfirmDialog(false);
  };

  return (
    <>
      <div
        key={conversation.id}
        className={`flex flex-col gap-2 mb-2 text-gray-100 text-sm rounded-md ${conversation.id === conversationId ? 'bg-gray-500/10' : ''}`}
        onClick={() => {
          if (typeof onClick === 'function') {
            onClick(id!);
          }
        }}
      >
        <a className="flex py-3 px-3 items-center gap-3 relative rounded-md hover:bg-[#2A2B32] cursor-pointer break-all hover:pr-4 group">
          <div className="flex-1 text-ellipsis max-h-5 overflow-hidden break-all relative">
            {title}
          </div>
          {isChatWithPDFProvider && <Badge className="bg-blue-500">PDF</Badge>}

          {/* Delete Button */}
          {conversationId && (
            <button
              className="ml-auto text-gray-400 hover:text-red-500 transition-colors duration-200"
              onClick={(e) => {
                e.stopPropagation(); // Prevent triggering the onClick of the tile
                setShowConfirmDialog(true); // Show confirmation dialog
              }}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </a>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmationModal
        visible={showConfirmDialog}
        onCancel={() => setShowConfirmDialog(false)}
        onConfirm={() => handleDelete()}
        title={t('bui-chat-conversation-deletion-title')}
        description={t('bui-chat-conversation-deletion-description')}
      />
    </>
  );
}

export default Sidebar;
