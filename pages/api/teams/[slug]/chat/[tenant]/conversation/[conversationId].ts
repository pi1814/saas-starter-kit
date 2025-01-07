import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@/lib/session';
import controllers from '@/lib/llm';
import { jacksonOptions } from '@/lib/llm/env';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { method } = req;

  try {
    switch (method) {
      case 'GET':
        await handleGET(req, res);
        break;
      case 'DELETE':
        await handleDELETE(req, res);
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
  const { tenant } = req.query;
  const session = await getSession(req, res);
  const { chatController } = await controllers(jacksonOptions);

  const chat = await chatController.getChatThreadByConversationId(
    req.query.conversationId as string,
    tenant as string,
    session?.user.id as string
  );

  if (chat) res.json({ data: chat });
};

const handleDELETE = async (req: NextApiRequest, res: NextApiResponse) => {
  const { tenant } = req.query;
  const session = await getSession(req, res);
  const { chatController } = await controllers(jacksonOptions);

  const conversation = await chatController.getConversationById(
    req.query.conversationId as string
  );

  if (tenant !== conversation.tenant) {
    throw new Error('Forbidden');
  }

  if (session?.user.id !== conversation.userId) {
    throw new Error('Forbidden');
  }

  await chatController.deleteChatByConversationId(
    req.query.conversationId as string
  );
};

export default handler;
