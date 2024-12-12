import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import {
  deleteLLMConfigSchema,
  updateLLMConfigSchema,
  validateWithSchema,
} from '@/lib/llm/zod';
import { JacksonError } from '@/lib/llm/controller/error';
import { LLM_PROVIDERS } from '@/lib/llm/ee/chat/llm-providers';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { method } = req;

  try {
    switch (method) {
      case 'PUT':
        await handlePUT(req, res);
        break;
      case 'DELETE':
        await handleDELETE(req, res);
        break;

      default:
        res.setHeader('Allow', 'GET, POST');
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

// Delete llm config
const handleDELETE = async (req: NextApiRequest, res: NextApiResponse) => {
  const { configId, tenant } = validateWithSchema(
    deleteLLMConfigSchema,
    req.query
  );

  // Fetch the configuration from the database using Prisma
  const config = await prisma.lLMConfig.findUnique({
    where: { id: configId, tenant: tenant },
  });

  if (!config) {
    throw new JacksonError('Config not found', 404);
  }

  // Delete the configuration from the database
  await prisma.lLMConfig.delete({
    where: { id: configId, tenant: tenant },
  });

  res.status(204).end();
};

// Update llm config
const handlePUT = async (req: NextApiRequest, res: NextApiResponse) => {
  const configs = await prisma.lLMConfig.findMany({
    where: {
      tenant: req.query.tenant as string,
      isChatWithPDFProvider: false,
    },
    select: {
      provider: true,
    },
  });

  const providers = Array.from(
    new Set(configs.map((config) => config.provider))
  )
    .sort()
    .map((provider) => ({
      id: provider,
      name: LLM_PROVIDERS[provider]?.name || provider,
    }));

  const { configId, tenant, baseURL, provider } = validateWithSchema(
    updateLLMConfigSchema(providers),
    {
      ...req.body,
      ...req.query,
    }
  );

  // Fetch the configuration from the database using Prisma
  const config = await prisma.lLMConfig.findUnique({
    where: { id: configId },
  });

  if (!config) {
    throw new JacksonError('Config not found', 404);
  }

  await prisma.lLMConfig.update({
    where: { id: configId },
    data: {
      provider: provider,
      // models: models || [],
      baseURL: baseURL || config.baseURL,
      tenant: tenant,
      // apiKey: apiKey,
    },
  });

  res.status(204).end();
};

export default handler;
