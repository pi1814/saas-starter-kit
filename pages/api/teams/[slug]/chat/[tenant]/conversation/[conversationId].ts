import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { JacksonError } from '@/lib/llm/controller/error';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { method } = req;

  try {
    switch (method) {
      case 'GET':
        await handleGET(req, res);
        break;
      default:
        res.setHeader('Allow', 'GET');
        res.status(405).json({
          error: { message: `Method ${method} Not Allowed` },
        });
    }
  } catch (error: any) {
    console.error(error);

    const message = error.message || 'Something went wrong';
    const status = error.status || 500;

    res.status(status).json({ error: { message } });
  }
};

// Get Chat Thread by Conversation ID
const handleGET = async (req: NextApiRequest, res: NextApiResponse) => {
  // const { tenant } = req.query;

  const userId = req.body.userId;

  const chat = await getChatThreadByConversationId(
    req.query.conversationId as string,
    userId
  );

  if (chat) res.json({ data: chat });
};

const getChatThreadByConversationId = async (
  conversationId: string,
  userId: string
) => {
  const conversation = await getConversationById(conversationId);

  if (userId !== conversation.userId) {
    throw new JacksonError('Forbidden', 403);
  }

  const chats = await prisma.chatStore.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' }, // Order by creation date ascending
  });

  return chats; // Return the list of chats
};

const getConversationById = async (conversationId: string) => {
  const conversation = await prisma.lLMConversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) {
    throw new JacksonError('Conversation not found', 404);
  }

  return conversation;
};

export default handler;
