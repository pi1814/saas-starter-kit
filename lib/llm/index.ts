import type { JacksonOption } from './typings';
import { prisma } from '@/lib/prisma';
import { ChatController } from './ee/chat';

export const controllers = async (
  opts: JacksonOption
): Promise<{
  chatController: ChatController;
}> => {
  const chatStore = prisma.chatStore;
  const conversationStore = prisma.lLMConversation;
  const llmConfigStore = prisma.lLMConfig;

  const chatController = new ChatController({
    chatStore,
    conversationStore,
    llmConfigStore,
    opts,
  });

  return {
    chatController,
  };
};

export default controllers;

export * from './typings';
export type SAMLJackson = Awaited<ReturnType<typeof controllers>>;
