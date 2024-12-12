import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

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

  const conversations = await prisma.lLMConversation.findMany({
    where: {
      tenant: tenant as string,
    },
  });

  res.json({ data: conversations });
};

export default handler;
