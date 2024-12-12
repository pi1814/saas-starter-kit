import type { JacksonOption } from './typings';
import { prisma } from '@/lib/prisma';
import checkLicense from './ee/common/checkLicense';
import { ChatController } from './ee/chat';

export const controllers = async (
  opts: JacksonOption
): Promise<{
  checkLicense: () => Promise<boolean>;
  chatController: ChatController;
}> => {
  const chatStore = prisma.chatStore;
  const conversationStore = prisma.lLMConversation;
  const llmConfigStore = prisma.lLMConfig;

  // Enterprise Features
  const chatController = new ChatController({
    chatStore,
    conversationStore,
    llmConfigStore,
    opts,
  });

  return {
    checkLicense: () => {
      return checkLicense(opts.boxyhqLicenseKey);
    },
    chatController,
  };
};

export default controllers;

export * from './typings';
export type SAMLJackson = Awaited<ReturnType<typeof controllers>>;
