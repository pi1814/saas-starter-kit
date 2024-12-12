import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { createLLMConfigSchema, validateWithSchema } from '@/lib/llm/zod';
import { LLM_PROVIDERS } from '@/lib/llm/ee/chat/llm-providers';
import crypto from 'crypto';

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
  const { tenant } = req.query;

  // Validate tenant parameter
  if (!tenant || typeof tenant !== 'string') {
    return res.status(400).json({ error: 'Invalid tenant parameter' });
  }

  try {
    const configs = await prisma.lLMConfig.findMany({
      where: {
        tenant: tenant,
        isChatWithPDFProvider: false,
      },
      select: {
        provider: true,
      },
    });

    // Check if configs is empty
    if (!configs || configs.length === 0) {
      return res.status(404).json({ error: 'No configurations found' });
    }

    res.json({ data: configs });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getLLMProviders = async (tenant: string, filterByTenant?: boolean) => {
  if (filterByTenant) {
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
      id: key,
      name: LLM_PROVIDERS[key].name,
    }));
};

// Create Chat Config
const handlePOST = async (req: NextApiRequest, res: NextApiResponse) => {
  if (!req.body) {
    return res.status(400).json({ error: 'Request body is required' });
  }

  const providers = await getLLMProviders(req.query.tenant as string, false);

  const { provider, apiKey, models, isChatWithPDFProvider, baseURL, tenant } =
    validateWithSchema(createLLMConfigSchema(providers), {
      ...req.body,
      ...req.query,
    });

  if (!apiKey && provider !== 'ollama' && !isChatWithPDFProvider) {
    throw new Error('API Key is required');
  }

  const config = await createLLMConfig({
    provider: provider,
    models: models || [],
    isChatWithPDFProvider,
    apiKey,
    baseURL,
    tenant,
  });
  res.status(201).json({ data: { config } });
};

const createLLMConfig = async (llmConfig) => {
  if (!llmConfig || typeof llmConfig !== 'object') {
    throw new Error('Invalid configuration object');
  }

  const { apiKey, provider, tenant, isChatWithPDFProvider } = llmConfig;

  if (!apiKey && provider !== 'ollama' && !isChatWithPDFProvider) {
    throw new Error('API Key is required');
  }

  const vaultResult = '';

  const config = await storeLLMConfig({
    provider: llmConfig.provider,
    baseURL: llmConfig.baseURL || '',
    models: llmConfig.models || [],
    terminusToken: vaultResult || '',
    apiKey,
    tenant,
    isChatWithPDFProvider,
  });
  return config;
};

const storeLLMConfig = async (config) => {
  const createdAt = new Date();
  const id = crypto.randomBytes(20).toString('hex');

  const newConfig = await prisma.lLMConfig.create({
    data: {
      id,
      createdAt,
      ...config,
    },
  });
  return newConfig;
};

export default handler;
