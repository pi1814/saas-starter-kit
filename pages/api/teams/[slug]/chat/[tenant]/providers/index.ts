import type { NextApiRequest, NextApiResponse } from 'next';
import controllers from '@/lib/llm';
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

const handleGET = async (req: NextApiRequest, res: NextApiResponse) => {
  const { tenant, filterByTenant: filterByTenantParam } = req.query;
  const filterByTenant = filterByTenantParam !== 'false';
  const { chatController } = await controllers(jacksonOptions);

  const uniqueProviders = await chatController.getLLMProviders(
    tenant as string,
    filterByTenant
  );

  res.json({ data: uniqueProviders });
};

export default handler;
