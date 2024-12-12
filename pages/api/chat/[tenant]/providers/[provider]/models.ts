import { LLMModel, LLMProvider } from '@/lib/llm';
import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { JacksonError } from '@/lib/llm/controller/error';
import { LLM_PROVIDERS } from '@/lib/llm/ee/chat/llm-providers';

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

  const models = await getLLMModels(
    tenant as string,
    provider as LLMProvider,
    filterByTenant
  );

  res.json({ data: models });
};

const getLLMModels = async (
  tenant: string,
  provider: LLMProvider,
  filterByTenant?: boolean // fetch models by saved configs
): Promise<LLMModel[]> => {
  if (filterByTenant) {
    // Fetch configurations for the specified tenant and provider using Prisma
    const configs = await prisma.lLMConfig.findMany({
      where: {
        tenant: tenant,
        provider: provider,
      },
      select: {
        models: true, // Select only the models field
      },
    });

    if (configs.length === 0) {
      throw new JacksonError('Config not found', 404);
    }

    // Extract unique models from configurations
    const modelsFromConfigs = Array.from(
      new Set(configs.map((c) => c.models).flat())
    ).filter((m) => Boolean(m));

    if (modelsFromConfigs.length === 0) {
      throw new JacksonError('No models found', 404);
    }

    // Map to the actual model objects based on the provider's model definitions
    const models = modelsFromConfigs
      .map((model: string) =>
        LLM_PROVIDERS[provider].models.find((m) => m.id === model)
      )
      .filter((m) => m !== undefined);

    return models as LLMModel[]; // Return the filtered models
  }

  // Will be used for dropdown while creating a new config
  return LLM_PROVIDERS[provider].models;
};

export default handler;
