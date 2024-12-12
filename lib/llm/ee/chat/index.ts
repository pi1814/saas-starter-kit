import crypto from 'crypto';
import axios from 'axios';
import * as jose from 'jose';
import type { JacksonOption, LLMProvider, LLMModel } from '../../typings';
import { loadJWSPrivateKey } from '../../controller/utils';
import { throwIfInvalidLicense } from '../common/checkLicense';
import { LLMChat, LLMConfigPayload, LLMConversation } from './types';
import { JacksonError } from '../../controller/error';
import { LLM_PROVIDERS } from './llm-providers';
import { Prisma } from '@prisma/client';
import { DefaultArgs } from '@prisma/client/runtime/library';

export class ChatController {
  private chatStore: Prisma.ChatStoreDelegate<DefaultArgs>;
  private conversationStore: Prisma.LLMConversationDelegate<DefaultArgs>;
  private llmConfigStore: Prisma.LLMConfigDelegate<DefaultArgs>;
  private opts: JacksonOption;

  constructor({
    chatStore,
    conversationStore,
    llmConfigStore,
    opts,
  }: {
    chatStore: Prisma.ChatStoreDelegate<DefaultArgs>;
    conversationStore: Prisma.LLMConversationDelegate<DefaultArgs>;
    llmConfigStore: Prisma.LLMConfigDelegate<DefaultArgs>;
    opts: JacksonOption;
  }) {
    this.llmConfigStore = llmConfigStore;
    this.chatStore = chatStore;
    this.conversationStore = conversationStore;
    this.opts = opts;
  }

  private async getLLMConfigsByTenant(tenant: string) {
    return await this.llmConfigStore.findMany({
      where: {
        tenant: tenant,
      },
    });
  }

  public async getLLMConfigFromVault(
    tenant: string,
    token: string
  ): Promise<{
    apiKey: string;
    baseURL: string;
  }> {
    const res = await axios.get(
      `${this.opts.terminus?.hostUrl}/v1/vault/${tenant}/${this.opts.terminus?.llm?.product}/data?token=${token}`,
      {
        headers: {
          Authorization: `api-key ${this.opts.terminus?.apiKey?.read}`,
        },
      }
    );

    if (res.data[token]) {
      return JSON.parse(res.data[token]?.data);
    } else {
      throw new JacksonError('Config not found in Vault', 404);
    }
  }

  public async getLLMConfigs(tenant: string) {
    await throwIfInvalidLicense(this.opts.boxyhqLicenseKey);

    const configs = await this.getLLMConfigsByTenant(tenant);

    for (let i = 0; i < configs.length; i++) {
      const data = await this.getLLMConfigFromVault(
        tenant,
        configs[i].terminusToken as string
      );

      if (data) {
        configs[i] = {
          ...configs[i],
          terminusToken: '',
          apiKey: '*'.repeat(data.apiKey.length),
        } as any;
      }
    }

    return configs;
  }

  public async getLLMConfigsByTenantAndProvider(
    tenant: string,
    provider: LLMProvider
  ) {
    await throwIfInvalidLicense(this.opts.boxyhqLicenseKey);

    return await this.llmConfigStore.findMany({
      where: {
        tenant: tenant,
        provider: provider,
      },
    });
  }

  private async storeLLMConfig(config) {
    const id = crypto.randomBytes(20).toString('hex');
    const createdAt = new Date(); // Use Date object for createdAt

    const storedConfig = await this.llmConfigStore.create({
      data: {
        ...config,
        id,
        createdAt,
      },
    });

    return storedConfig;
  }

  private async saveLLMConfigInVault({
    tenant,
    apiKey,
  }: {
    tenant: string;
    provider: string;
    apiKey?: string;
    baseURL?: string;
  }): Promise<string | undefined> {
    const res = await axios.post(
      `${this.opts.terminus?.hostUrl}/v1/vault/${tenant}/${this.opts.terminus?.llm?.product}/data`,
      {
        apiKey: apiKey || '',
      },
      {
        headers: {
          Authorization: `api-key ${this.opts.terminus?.apiKey?.write}`,
        },
      }
    );

    if (res.data?.token) {
      return res.data.token;
    }
  }

  public async createLLMConfig(llmConfig: LLMConfigPayload) {
    await throwIfInvalidLicense(this.opts.boxyhqLicenseKey);

    const { apiKey, provider, tenant, isChatWithPDFProvider } = llmConfig;

    // Validate API Key
    if (!apiKey && provider !== 'ollama' && !isChatWithPDFProvider) {
      throw new Error('API Key is required');
    }

    // Save the LLM config in the vault
    const vaultResult = await this.saveLLMConfigInVault(
      isChatWithPDFProvider
        ? { ...llmConfig, apiKey: `chat_with_pdf_${tenant}_key` }
        : llmConfig
    );

    // Store the LLM config in the database using Prisma
    const config = await this.llmConfigStore.create({
      data: {
        provider: llmConfig.provider,
        baseURL: llmConfig.baseURL || '',
        models: llmConfig.models || [],
        terminusToken: vaultResult || '',
        tenant,
        isChatWithPDFProvider,
      },
    });

    return config;
  }

  private async updateLLMConfigInVault({
    tenant,
    token,
    apiKey,
  }: {
    tenant: string;
    provider: string;
    token: string;
    apiKey?: string;
    baseURL?: string;
  }) {
    await axios.put(
      `${this.opts.terminus?.hostUrl}/v1/vault/${tenant}/${this.opts.terminus?.llm?.product}/data?token=${token}`,
      {
        apiKey,
      },
      {
        headers: {
          Authorization: `api-key ${this.opts.terminus?.apiKey?.write}`,
        },
      }
    );
  }

  public async updateLLMConfig(
    configId: string,
    llmConfig: LLMConfigPayload
  ): Promise<void> {
    await throwIfInvalidLicense(this.opts.boxyhqLicenseKey);

    // Fetch the existing configuration from the database
    const config = await this.llmConfigStore.findUnique({
      where: { id: configId },
    });

    if (!config) {
      throw new Error('Config not found'); // Adjust error handling as needed
    }

    // Fetch the configuration from the vault
    const configFromVault = await this.getLLMConfigFromVault(
      config.tenant,
      config.terminusToken as string
    );

    if (!configFromVault) {
      throw new Error('Config not found in Vault'); // Adjust error handling as needed
    }

    // Update the configuration in the vault
    await this.updateLLMConfigInVault({
      token: config.terminusToken as string,
      tenant: config.tenant,
      provider: llmConfig.provider,
      apiKey: llmConfig.apiKey || configFromVault.apiKey,
      baseURL: llmConfig.baseURL,
    });

    // Update the configuration in the database using Prisma
    await this.llmConfigStore.update({
      where: { id: configId },
      data: {
        provider: llmConfig.provider,
        models: llmConfig.models || [],
        baseURL: llmConfig.baseURL || config.baseURL, // Use existing baseURL if not provided
      },
    });
  }

  public async deleteLLMConfig({
    configId,
    tenant,
  }: {
    configId: string;
    tenant: string;
  }): Promise<void> {
    await throwIfInvalidLicense(this.opts.boxyhqLicenseKey);

    const config = await this.llmConfigStore.findUnique({
      where: { id: configId },
    });

    if (!config) {
      throw new Error('Config not found');
    }

    await this.llmConfigStore.delete({
      where: { id: configId },
    });

    await axios.delete(
      `${this.opts.terminus?.hostUrl}/v1/vault/${tenant}/${this.opts.terminus?.llm?.product}/data?token=${config.terminusToken}`,
      {
        headers: {
          Authorization: `api-key ${this.opts.terminus?.apiKey?.write}`,
        },
      }
    );
  }

  public async getConversationsByTenantAndUser({
    tenant,
    userId,
  }: {
    tenant: string;
    userId: string;
  }) {
    await throwIfInvalidLicense(this.opts.boxyhqLicenseKey);

    const conversations = await this.conversationStore.findMany({
      where: {
        tenant: tenant,
        userId: userId,
      },
    });

    return conversations;
  }

  public async getConversationById(conversationId: string) {
    await throwIfInvalidLicense(this.opts.boxyhqLicenseKey);

    const conversation = await this.conversationStore.findUnique({
      where: {
        id: conversationId,
      },
    });

    if (!conversation) {
      throw new Error('Conversation not found'); // Adjust error handling as needed
    }

    return conversation;
  }

  public async createConversation(
    conversation: Omit<LLMConversation, 'id' | 'createdAt'>
  ) {
    await throwIfInvalidLicense(this.opts.boxyhqLicenseKey);

    const createdAt = new Date(); // Use Date object for createdAt

    const newConversation = await this.conversationStore.create({
      data: {
        ...conversation,
        createdAt,
      },
    });

    return newConversation;
  }

  public async createChat(chat: Omit<LLMChat, 'id' | 'createdAt'>) {
    await throwIfInvalidLicense(this.opts.boxyhqLicenseKey);

    const createdAt = new Date(); // Use Date object for createdAt

    const newChat = await this.chatStore.create({
      data: {
        ...chat,
        createdAt,
      },
    });

    return newChat;
  }

  public async getChatThreadByConversationId(
    conversationId: string,
    userId: string
  ) {
    await throwIfInvalidLicense(this.opts.boxyhqLicenseKey);

    const conversation = await this.getConversationById(conversationId);

    if (userId !== conversation.userId) {
      throw new Error('Forbidden'); // Adjust error handling as needed
    }

    const chatThreads = await this.chatStore.findMany({
      where: {
        conversationId: conversationId,
      },
      orderBy: {
        createdAt: 'asc', // Assuming there's a createdAt field for ordering
      },
    });

    return chatThreads;
  }

  public async getLLMProviders(tenant: string, filterByTenant?: boolean) {
    await throwIfInvalidLicense(this.opts.boxyhqLicenseKey);

    if (filterByTenant) {
      // Fetch configurations for the given tenant
      const configs = await this.getLLMConfigsByTenant(tenant);

      return Array.from(
        new Set(
          configs
            .filter(({ isChatWithPDFProvider }) => !isChatWithPDFProvider)
            .map((config) => config.provider)
        )
      )
        .sort()
        .map((provider) => ({
          id: provider,
          name: LLM_PROVIDERS[provider].name,
        }));
    }

    // Return all available providers when not filtering by tenant
    return Object.keys(LLM_PROVIDERS)
      .sort()
      .map((key) => ({
        id: key as LLMProvider,
        name: LLM_PROVIDERS[key].name,
      }));
  }

  public async getLLMModels(
    tenant: string,
    provider: LLMProvider,
    filterByTenant?: boolean // fetch models by saved configs
  ): Promise<LLMModel[]> {
    await throwIfInvalidLicense(this.opts.boxyhqLicenseKey);

    if (filterByTenant) {
      // Fetch configurations for the given tenant and provider
      const configs = await this.getLLMConfigsByTenantAndProvider(
        tenant,
        provider
      );

      if (configs.length === 0) {
        throw new Error('Config not found'); // Adjusted error handling
      }

      // Extract unique models from the configurations
      const modelsFromConfigs = Array.from(
        new Set(configs.map((c) => c.models).flat())
      ).filter((m) => Boolean(m));

      if (modelsFromConfigs.length === 0) {
        throw new Error('No models found'); // Adjusted error handling
      }

      // Map model IDs to actual model objects from the provider's model list
      const models = modelsFromConfigs
        .map((modelId: string) =>
          LLM_PROVIDERS[provider].models.find((m) => m.id === modelId)
        )
        .filter((m) => m !== undefined);

      return models as LLMModel[];
    }

    // Return all available models for the provider when not filtering by tenant
    return LLM_PROVIDERS[provider].models;
  }

  private getUserRole(email: string) {
    const mappings = this.opts.llm?.documentChat?.roleMapping.split(',');
    if (!mappings) {
      throw new JacksonError(
        'Could not find role mappings on server for chatting with PDF',
        500
      );
    }
    const matchedMapping = mappings.find((m) => {
      const [_email] = m.split(':');
      if (email === _email) {
        return true;
      }
    });

    if (!matchedMapping) {
      throw new JacksonError(
        'Insufficient privileges, no role mapped for given user',
        403
      );
    }

    return matchedMapping.split(':')[1];
  }

  public async generateDocumentChatJWT({ email }: { email: string }) {
    if (!this.opts.llm?.documentChat?.jwtSigningKey) {
      throw new JacksonError(
        'Could not load JWT signing keys for chatting with PDF',
        500
      );
    }
    const jwsAlg = 'RS256';
    const signingKey = await loadJWSPrivateKey(
      this.opts.llm?.documentChat?.jwtSigningKey,
      jwsAlg
    );

    const jwt = await new jose.SignJWT({
      role: this.getUserRole(email),
    })
      .setProtectedHeader({ alg: jwsAlg })
      .setIssuer('urn:boxyhq')
      .setAudience('urn:boxyhq')
      .setExpirationTime('3d')
      .sign(signingKey);

    return jwt;
  }
}
