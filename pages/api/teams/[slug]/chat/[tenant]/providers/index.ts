import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { LLM_PROVIDERS } from '@/lib/llm/ee/chat/llm-providers';
import { LLMProvider } from '@/lib/llm';

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

  const uniqueProviders = await getLLMProviders(
    tenant as string,
    filterByTenant
  );

  res.json({ data: uniqueProviders });
};

const getLLMProviders = async (tenant: string, filterByTenant?: boolean) => {
  if (filterByTenant) {
    // Will be used for dropdown while chatting with LLM
    const configs = await prisma.lLMConfig.findMany({
      where: {
        tenant: tenant as string,
        isChatWithPDFProvider: false,
      },
      select: {
        provider: true,
      },
    });
    return Array.from(new Set(configs.map((config) => config.provider)))
      .sort()
      .map((provider) => ({
        id: provider,
        name: LLM_PROVIDERS[provider].name,
      }));
  }

  // Will be used for dropdown while creating a new config
  return Object.keys(LLM_PROVIDERS)
    .sort()
    .map((key) => ({
      id: key as LLMProvider,
      name: LLM_PROVIDERS[key].name,
    }));
};

export default handler;
