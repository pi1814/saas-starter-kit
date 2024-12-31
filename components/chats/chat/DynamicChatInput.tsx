import React, { useState, useRef, useEffect } from 'react';
import { SendHorizontal, Paperclip } from 'lucide-react';

const DynamicChatInput = ({
  message,
  setMessage,
  sendMessage,
  handleKeypress,
  handleFileChange,
  isChatWithPDFProvider,
  isUploadingFile,
  provider,
  selectedProvider,
  model,
  selectedModel,
  requestInProgress,
  isArchived,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [inputHeight, setInputHeight] = useState('auto');

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      const newHeight = Math.min(Math.max(scrollHeight, 48), 200); // Min 48px, Max 200px

      textarea.style.height = `${newHeight}px`;
      setInputHeight(`${newHeight}px`);
    }
  }, [message]);

  // Handle input change with dynamic expansion
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
  };

  // Handle key events for send functionality
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
    handleKeypress(e);
  };

  return (
    <div className="mb-4 z-40 mt-auto w-full rounded-xl bg-gray-800 border-t border-gray-200">
      <div className="max-w-4xl mx-auto px-4 py-3">
        <div
          className="flex bg-white items-end rounded-xl border border-gray-300 
          focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 
          transition-all duration-200 ease-in-out"
          style={{
            minHeight: '48px',
            maxHeight: '200px',
          }}
        >
          {isChatWithPDFProvider && (
            <div className="flex items-center pl-2">
              <input
                type="file"
                accept=".pdf"
                className="hidden"
                id="pdf-files"
                onChange={handleFileChange}
                disabled={isUploadingFile}
              />
              <label
                htmlFor="pdf-files"
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-full cursor-pointer transition-colors"
              >
                {isUploadingFile ? (
                  <div className="animate-spin h-5 w-5 border-2 border-gray-300 border-t-blue-500 rounded-full"></div>
                ) : (
                  <Paperclip className="h-5 w-5" />
                )}
              </label>
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={message}
            placeholder="Send a message..."
            rows={1}
            className="w-full px-3 py-2 bg-transparent outline-none resize-none 
            text-gray-800 placeholder-gray-400"
            style={{
              height: inputHeight,
              overflowY: message.length > 0 ? 'auto' : 'hidden',
            }}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
          />

          <div
            className="flex items-center p-2"
            style={{
              height: inputHeight,
            }}
          >
            <button
              disabled={
                message.length === 0 ||
                (!provider && !selectedProvider && !isChatWithPDFProvider) ||
                (!model && !selectedModel && !isChatWithPDFProvider) ||
                requestInProgress ||
                isArchived
              }
              onClick={sendMessage}
              className="p-2 rounded-full 
              bg-blue-500 text-white 
              disabled:bg-gray-300 disabled:cursor-not-allowed
              hover:bg-blue-600 
              transition-colors duration-200
              focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <SendHorizontal className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DynamicChatInput;
