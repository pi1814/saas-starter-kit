import controllers, { LLMProvider } from '@/lib/llm';
import type { NextApiRequest, NextApiResponse } from 'next';
import { jacksonOptions } from '@/lib/llm/env';

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

// Get Models list for dropdown
const handleGET = async (req: NextApiRequest, res: NextApiResponse) => {
  const { tenant, provider, filterByTenant: filterByTenantParam } = req.query;
  const filterByTenant = filterByTenantParam !== 'false';

  const { chatController } = await controllers(jacksonOptions);

  const models = await chatController.getLLMModels(
    tenant as string,
    provider as LLMProvider,
    filterByTenant
  );

  res.json({ data: models });
};

export default handler;
