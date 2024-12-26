import type { NextApiRequest, NextApiResponse } from 'next';
import controllers from '@/lib/llm';
import { jacksonOptions } from '@/lib/llm/env';
import { getSession } from '@/lib/session';

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

// Get Conversations
const handleGET = async (req: NextApiRequest, res: NextApiResponse) => {
  const { tenant } = req.query;
  const session = await getSession(req, res);

  const { chatController } = await controllers(jacksonOptions);

  const conversations = await chatController.getConversationsByTenantAndUser({
    tenant: tenant as string,
    userId: session?.user.id as string,
  });

  res.json({ data: conversations });
};

export default handler;
