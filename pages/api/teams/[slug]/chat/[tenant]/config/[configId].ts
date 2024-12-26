import type { NextApiRequest, NextApiResponse } from 'next';
import {
  deleteLLMConfigSchema,
  updateLLMConfigSchema,
  validateWithSchema,
} from '@/lib/llm/zod';
import controllers, { LLMProvider } from '@/lib/llm';
import { jacksonOptions } from '@/lib/llm/env';

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
  const { chatController } = await controllers(jacksonOptions);
  const { configId, tenant } = validateWithSchema(
    deleteLLMConfigSchema,
    req.query
  );

  await chatController.deleteLLMConfig({
    configId,
    tenant: tenant,
  });

  res.status(204).end();
};

// Update llm config
const handlePUT = async (req: NextApiRequest, res: NextApiResponse) => {
  const { chatController } = await controllers(jacksonOptions);
  const providers = await chatController.getLLMProviders(
    req.query.tenant as string,
    false
  );

  const { configId, tenant, apiKey, models, baseURL, provider } =
    validateWithSchema(updateLLMConfigSchema(providers), {
      ...req.body,
      ...req.query,
    });

  await chatController.updateLLMConfig(configId, {
    tenant,
    apiKey,
    baseURL,
    provider: provider as LLMProvider,
    models,
  });

  res.status(204).end();
};

export default handler;
