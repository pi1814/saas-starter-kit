import React, { useRef, useEffect } from 'react';
import Message from './Message'; // Ensure you have a Message component imported

const ConversationArea = ({
  conversationThread,
  trailingThread,
  className,
}) => {
  const bottomOfChatRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    if (bottomOfChatRef.current) {
      bottomOfChatRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversationThread, trailingThread]);

  // Combine and render messages
  const allMessages = [...(conversationThread ?? []), ...trailingThread];

  return (
    <div
      className={`w-full overflow-y-auto flex-1 bg-white ${className}`}
      data-testid="conversation-area"
    >
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {allMessages?.map((message, index) => (
          <Message key={`message-${index}`} message={message} />
        ))}
        <div ref={bottomOfChatRef}></div>
      </div>
    </div>
  );
};

export default ConversationArea;
