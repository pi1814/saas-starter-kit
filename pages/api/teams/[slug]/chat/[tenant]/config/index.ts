import type { NextApiRequest, NextApiResponse } from 'next';
import { createLLMConfigSchema, validateWithSchema } from '@/lib/llm/zod';
import controllers, { LLMProvider } from '@/lib/llm';
import { jacksonOptions } from '@/lib/llm/env';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { method } = req;

  try {
    switch (method) {
      case 'POST':
        await handlePOST(req, res);
        break;
      case 'GET':
        await handleGET(req, res);
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

// Get Chat Configs
const handleGET = async (req: NextApiRequest, res: NextApiResponse) => {
  const { chatController } = await controllers(jacksonOptions);

  const configs = await chatController.getLLMConfigs(
    req.query.tenant as string
  );

  res.json({ data: configs });
};

// Create Chat Config
const handlePOST = async (req: NextApiRequest, res: NextApiResponse) => {
  const { chatController } = await controllers(jacksonOptions);

  const providers = await chatController.getLLMProviders(
    req.query.tenant as string,
    false
  );

  const { provider, apiKey, models, isChatWithPDFProvider, baseURL, tenant } =
    validateWithSchema(createLLMConfigSchema(providers), {
      ...req.body,
      ...req.query,
    });

  if (!apiKey && provider !== 'ollama' && !isChatWithPDFProvider) {
    throw new Error('API Key is required');
  }

  const config = await chatController.createLLMConfig({
    provider: provider as LLMProvider,
    models: models || [],
    isChatWithPDFProvider,
    apiKey,
    baseURL,
    tenant,
  });

  res.status(201).json({ data: { config } });
};

export default handler;
