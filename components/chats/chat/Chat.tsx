import { useContext, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { useAutoResizeTextArea, useFetch } from '../hooks';
import { LLMChat, LLMModel, LLMProvidersOptionsType } from './types';
import { ApiSuccess } from '../types';
import { ChatContext } from '../provider';
import { ConversationContext } from './ChatUI';
import { defaultHeaders } from '../utils';
import DynamicChatInput from './DynamicChatInput';
import ConversationArea from './ConversationArea';

interface ChatProps {
  setShowSettings: (value: boolean) => void;
  conversationId?: string;
  setConversationId: (value: string) => void;
}

const Chat = ({
  setShowSettings,
  conversationId,
  setConversationId,
}: ChatProps) => {
  const { t } = useTranslation('common');
  const [errorMessage, setErrorMessage] = useState('');
  const [message, setMessage] = useState('');
  const textAreaRef = useAutoResizeTextArea();
  const bottomOfChatRef = useRef<HTMLDivElement>(null);

  // Get the provider/model plus loading state from the context
  const { provider, model, onError, urls } = useContext(ChatContext);
  const selectedConversation =
    useContext(ConversationContext)?.selectedConversation;
  let isChatWithPDFProvider =
    useContext(ConversationContext)?.isChatWithPDFProvider;
  if (selectedConversation) {
    isChatWithPDFProvider = selectedConversation.isChatWithPDFProvider;
  }
  const [selectedProvider, setSelectedProvider] = useState('');
  const [selectedModel, setSelectedModel] = useState('');

  const [requestInProgress, setRequestInProgress] = useState(false);
  const [isArchived, setIsArchived] = useState(false);

  // Fetch conversation thread
  const {
    data: conversationThreadData,
    isLoading: isLoadingConversationThread,
    error: errorLoadingThread,
    refetch: reloadConversationThread,
  } = useFetch<ApiSuccess<LLMChat[]>>({
    url: conversationId ? `${urls?.conversation}/${conversationId}` : undefined,
  });

  const conversationThread = conversationThreadData?.data;

  useEffect(() => {
    if (!isLoadingConversationThread && errorLoadingThread) {
      onError?.(errorLoadingThread.message);
    }
  }, [isLoadingConversationThread, errorLoadingThread]);

  const {
    data: providersData,
    isLoading: isLoadingProviders,
    error: errorLoadingProviders,
  } = useFetch<ApiSuccess<LLMProvidersOptionsType>>({
    url: urls?.llmProviders,
  });

  const providers = providersData?.data;

  const showCreateLLMConfigMessage =
    !isChatWithPDFProvider &&
    Array.isArray(providers) &&
    providers?.length === 0;
  const showProviderSelection =
    !isChatWithPDFProvider &&
    !showCreateLLMConfigMessage &&
    !provider &&
    Array.isArray(providers) &&
    providers?.length > 0 &&
    (selectedProvider === '' || selectedModel === '');

  const {
    data: modelsData,
    isLoading: isLoadingModels,
    error: errorLoadingModels,
  } = useFetch<ApiSuccess<LLMModel[]>>({
    url: selectedProvider
      ? `${urls?.llmProviders}/${selectedProvider}/models`
      : undefined,
  });
  const models = modelsData?.data;

  useEffect(() => {
    if (errorLoadingProviders || errorLoadingModels) {
      onError?.(errorLoadingProviders?.message || errorLoadingModels?.message);
    }
  }, [errorLoadingProviders, errorLoadingModels]);

  useEffect(() => {
    setSelectedProvider(selectedConversation?.provider || '');
    setSelectedModel(selectedConversation?.model || '');
  }, [selectedConversation]);

  useEffect(() => {
    if (selectedConversation && !isChatWithPDFProvider) {
      if (
        providers?.findIndex((p) => p.id === selectedConversation.provider) ===
          -1 ||
        models?.findIndex((m) => m.id === selectedConversation.model) === -1
      ) {
        setIsArchived(true);
      } else {
        setIsArchived(false);
      }
    }
  }, [selectedConversation, providers, models, isChatWithPDFProvider]);

  useEffect(() => {
    if (textAreaRef.current) {
      textAreaRef.current.style.height = '24px';
      textAreaRef.current.style.height = `${textAreaRef.current.scrollHeight}px`;
    }
  }, [message, textAreaRef]);

  function isRefInView(ref) {
    if (!ref.current) return false;

    const rect = ref.current.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <=
        (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  }

  const [trailingThread, setTrailingThread] = useState<
    { content: string | null; role: string }[]
  >([]);

  useEffect(() => {
    if (bottomOfChatRef.current) {
      if (isRefInView(bottomOfChatRef)) {
        bottomOfChatRef.current.scrollIntoView({
          behavior: 'auto',
        });
      }
    }
  }, [conversationThread, trailingThread]);

  const sendMessage = async (e: any) => {
    try {
      setRequestInProgress(true);
      e.preventDefault();
      const _model = models?.find((m) => m.id === (model || selectedModel));

      if (!isChatWithPDFProvider) {
        if (!provider && !selectedProvider) {
          setErrorMessage('Please select a Provider');
          return;
        }
        if (!_model) {
          setErrorMessage('Please select a Model');
          return;
        }
      }
      if (message.length < 1) {
        setErrorMessage('Please enter a message.');
        return;
      } else {
        setErrorMessage('');
      }

      // Add the message to the conversation
      setTrailingThread([
        { content: message, role: 'user' },
        { content: null, role: 'assistant' },
      ]);

      // Clear the message & remove empty chat
      setMessage('');

      if (!urls?.chat) {
        throw new Error('Missing API path for LLM chat');
      }

      const response = await fetch(urls.chat, {
        method: 'POST',
        headers: defaultHeaders,
        body: JSON.stringify({
          messages: [
            ...(conversationThread ?? []),
            { content: message, role: 'user' },
          ],
          model: _model,
          provider: provider || selectedProvider,
          conversationId,
          isChatWithPDFProvider,
        }),
      });

      if (response.ok) {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder('utf-8');
        let receivedData = '';
        if (reader) {
          let done = false;
          let value;
          do {
            const op = await reader.read();
            done = op.done;
            value = op.value;
            if (done) break;
            const dt = decoder.decode(value, { stream: true });
            const jsonData = dt.split('\n').map((d) => {
              if (!d) {
                return {
                  choices: [
                    {
                      delta: {
                        content: '',
                      },
                    },
                  ],
                };
              }
              return JSON.parse(d);
            });
            for (const data of jsonData) {
              if (data.conversationId) {
                // last chunk
                if (conversationId !== data.conversationId) {
                  setConversationId(data.conversationId);
                }
                setTrailingThread([]);
                reloadConversationThread();
              } else if (data.choices) {
                // new chunks get appended
                if (data.choices[0]?.delta?.content) {
                  receivedData += data.choices[0]?.delta?.content || '';
                  setTrailingThread([
                    { content: message, role: 'user' },
                    { content: receivedData, role: 'assistant' },
                  ]);
                }
              } else if (data?.error?.message) {
                setErrorMessage(data?.error?.message);
              }
            }
          } while (!done);
        }
      } else {
        const data = await response.json();
        setErrorMessage(data?.error?.message);
      }
    } catch (error: any) {
      setErrorMessage(error.message);

      // setIsLoading(false);
    } finally {
      setRequestInProgress(false);
    }
  };

  const handleKeypress = (e: any) => {
    // It's triggers by pressing the enter key
    if (e.keyCode == 13 && !e.shiftKey) {
      sendMessage(e);
      e.preventDefault();
    }
  };

  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!urls?.fileUpload) {
      throw new Error('Missing API path for file upload');
    }
    const files = e.target.files;
    if (files && files.length > 0) {
      const formData = new FormData();
      formData.append('file', files[0]);
      setIsUploadingFile(true);
      const response = await fetch(urls.fileUpload, {
        method: 'POST',
        body: formData,
      });
      setIsUploadingFile(false);
      if (!response.ok) {
        const json = await response.json();
        onError?.(json.error.message);
        return;
      }
    }
  };

  const providerName = providers?.find(
    (p) => p.id === (provider || selectedProvider)
  )?.name;
  const modelName = models?.find(
    (m) => m.id === (model || selectedModel)
  )?.name;

  return (
    <div className="relative h-full w-full flex flex-col items-stretch flex-1">
      <div className="flex-1 h-full">
        <div className="h-full bg-white dark:bg-gray-800 flex flex-col">
          {showProviderSelection && !conversationId && (
            <div className="py-6 relative w-full bg-gray-50">
              <div className="flex items-center justify-center gap-4 max-w-4xl mx-auto px-4">
                <div className="flex flex-col w-full md:w-1/2 lg:w-1/3 xl:w-1/4">
                  <select
                    className="select-bordered select rounded-lg px-3 py-2 border border-gray-300 focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                    name="provider"
                    onChange={(e) => {
                      setSelectedProvider(e.target.value);
                      setSelectedModel('');
                    }}
                    value={selectedProvider}
                    disabled={isLoadingProviders}
                    required
                  >
                    {[
                      {
                        id: '',
                        name: 'Provider',
                      },
                      ...(providers || []),
                    ].map(({ id, name }) => (
                      <option value={id} key={id || name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col w-full md:w-1/2 lg:w-1/3 xl:w-1/4">
                  {Array.isArray(models) && models.length > 0 ? (
                    <select
                      className="select-bordered select rounded-lg px-3 py-2 border border-gray-300 focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                      name="model"
                      onChange={(e) => {
                        setSelectedModel(e.target.value);
                      }}
                      disabled={isLoadingModels}
                      value={selectedModel}
                      required
                    >
                      {[
                        {
                          id: '',
                          name: 'Model',
                        },
                        ...(models || []),
                      ].map(({ id, name }) => (
                        <option value={id} key={id || name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      name="model"
                      className="input input-bordered rounded-lg px-3 py-2 border border-gray-300 focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                      placeholder="Select Model"
                      onChange={(e) => {
                        setSelectedModel(e.target.value);
                      }}
                      value={selectedModel}
                    />
                  )}
                </div>
              </div>
            </div>
          )}
          {selectedProvider && selectedModel && (
            <div className="sticky top-0 z-40 rounded-xl flex w-full items-center justify-center gap-1 border-b border-gray-200 bg-gray-50 p-3 text-gray-700 shadow-sm">
              {t('bui-chat-provider')}: {providerName} | {t('bui-chat-model')}:{' '}
              {modelName || ''}
              {isArchived && (
                <span className="font-bold ml-2 text-red-500">
                  ({t('bui-chat-archived')})
                </span>
              )}
            </div>
          )}
          <ConversationArea
            conversationThread={conversationThread ?? []}
            trailingThread={trailingThread}
            className={undefined}
          />
          {showCreateLLMConfigMessage && (
            <div className="py-10 relative w-full flex flex-col h-full">
              <div className="flex items-center justify-center gap-2">
                {t('bui-chat-no-chat-configs-found')}
              </div>
              <div className="flex items-center justify-center gap-2">
                {t('bui-chat-goto')}{' '}
                <span
                  className="link text-blue-700"
                  onClick={() => {
                    setShowSettings(true);
                  }}
                >
                  {t('settings')}
                </span>{' '}
                {t('bui-chat-to-create-new-config')}
              </div>
            </div>
          )}
        </div>
      </div>
      <DynamicChatInput
        message={message}
        setMessage={setMessage}
        sendMessage={sendMessage}
        handleKeypress={handleKeypress}
        handleFileChange={handleFileChange}
        isChatWithPDFProvider={isChatWithPDFProvider}
        isUploadingFile={isUploadingFile}
        errorMessage={errorMessage}
        provider={provider}
        selectedProvider={selectedProvider}
        model={model}
        selectedModel={selectedModel}
        requestInProgress={requestInProgress}
        isArchived={isArchived}
      />
    </div>
  );
};

export default Chat;
