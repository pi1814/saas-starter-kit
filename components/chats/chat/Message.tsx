import React from 'react';
import { Sparkles, User, Copy } from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';
import { useTranslation } from 'next-i18next';

const Message = (props: any) => {
  const { t } = useTranslation('common');
  const { message } = props;
  const { role, content: text } = message;

  const isUser = role === 'user';

  const [showActions, setShowActions] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`w-full py-4 px-4 md:px-6 lg:px-8 transition-colors duration-200 ${
        isUser
          ? 'bg-blue-50 dark:bg-blue-900/30'
          : 'bg-gray-50 dark:bg-gray-800/50'
      }`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="max-w-4xl mx-auto flex items-start space-x-4">
        <div className="shrink-0">
          <div
            className={`w-9 h-9 rounded-md flex items-center justify-center ${
              isUser ? 'bg-blue-500 text-white' : 'bg-emerald-500 text-white'
            }`}
          >
            {isUser ? (
              <User className="w-5 h-5" />
            ) : (
              <Sparkles className="w-5 h-5" />
            )}
          </div>
        </div>

        <div className="flex-grow min-w-0">
          <div
            className={`prose dark:prose-invert max-w-full break-words ${
              text === null ? 'opacity-50' : ''
            }`}
          >
            {!isUser && text === null ? (
              <div className="flex items-center space-x-2 animate-pulse">
                <div className="h-2 w-2 bg-gray-300 rounded-full"></div>
                <div className="h-2 w-2 bg-gray-300 rounded-full"></div>
                <div className="h-2 w-2 bg-gray-300 rounded-full"></div>
              </div>
            ) : (
              <MarkdownRenderer content={text} />
            )}
          </div>
        </div>

        {showActions && (
          <div className="flex flex-col space-y-2 opacity-70 hover:opacity-100 transition-opacity">
            <button
              onClick={handleCopyMessage}
              className="hover:bg-gray-200 p-1 rounded-md transition-colors"
              title="Copy message"
            >
              {copied ? (
                <span className="text-xs text-green-600">
                  {t('copied-prompt')}
                </span>
              ) : (
                <Copy className="w-4 h-4 text-gray-500" />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Message;
