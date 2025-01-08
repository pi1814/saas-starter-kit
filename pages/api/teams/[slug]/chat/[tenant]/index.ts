import { ApiError } from '@/lib/errors';
import controllers, { LLMProvider } from '@/lib/llm';
import { generateChatResponse } from '@/lib/llm/llm';
import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@/lib/session';
import { jacksonOptions } from '@/lib/llm/env';

/**
 * If no conversationId is provided it will be treated as new conversation and will be created.
 * Post api will send the conversationId and message to the LLM provider and return the response.
 * If the conversationId is provided it will be treated as existing conversation and will be used to send the message.
 * Post api will send the conversationId and message to the LLM provider and return the response.
 */

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { method } = req;

  try {
    switch (method) {
      case 'POST':
        await handlePOST(req, res);
        break;
      default:
        res.setHeader('Allow', 'POST');
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

async function handlePOST(req: NextApiRequest, res: NextApiResponse) {
  const { tenant } = req.query;
  const { messages, model, provider, isChatWithPDFProvider } = req.body;
  const session = await getSession(req, res);
  const { chatController } = await controllers(jacksonOptions);

  let { conversationId } = req.body;

  if (!isChatWithPDFProvider) {
    if (!provider) {
      res.status(400).json({ error: { message: 'Provider is required' } });
      return;
    }

    if (!model) {
      res.status(400).json({ error: { message: 'Model is required' } });
      return;
    }
  }

  try {
    const llmConfigs = await chatController.getLLMConfigsByTenantAndProvider(
      tenant as string,
      isChatWithPDFProvider ? 'openai' : provider
    );

    if (llmConfigs.length === 0) {
      res.status(400).json({
        error: {
          message: conversationId
            ? 'The provider and model related to this conversation are no longer available.'
            : 'LLM Config not found. Please create one before using LLM.',
        },
      });
      return;
    }
    if (!isChatWithPDFProvider) {
      const allowedModels = await chatController.getLLMModels(
        tenant as string,
        provider as LLMProvider
      );
      // const allowedModels = getLLMModels(provider, llmConfigs);

      if (
        allowedModels.length > 0 &&
        allowedModels.find((m) => m.id === model.id) === undefined
      ) {
        res.status(400).json({
          error: {
            message: conversationId
              ? 'The provider and model related to this conversation are no longer available.'
              : 'Model not allowed',
          },
        });
        return;
      }
    }

    let config;
    if (isChatWithPDFProvider) {
      config = llmConfigs.find((c) => c.isChatWithPDFProvider);
      if (config === undefined) {
        res.status(400).json({
          error: { message: 'No config found for chat with Document' },
        });
        return;
      }
    } else {
      config =
        llmConfigs.find((c) => c.models.includes(model.id)) || llmConfigs[0];
    }

    if (!conversationId) {
      const conversation = await chatController.createConversation({
        tenant: tenant as string,
        userId: session?.user.id as string,
        title: messages[0].content.trim().slice(0, 50),
        provider: isChatWithPDFProvider ? 'openai' : provider,
        model: model?.id || '',
      });
      conversationId = conversation.id;
    } else {
      const conversation =
        await chatController.getConversationById(conversationId);
      if (!conversation) {
        res.status(404).json({ error: { message: 'Conversation not found' } });
        return;
      }
    }

    await chatController.createChat({
      conversationId,
      role: 'user',
      content: messages[messages.length - 1].content,
    });

    const responseMessage = await generateChatResponse(
      messages.map((m) => {
        return {
          content: m.content,
          role: m.role,
        };
      }),
      isChatWithPDFProvider ? 'openai' : provider,
      isChatWithPDFProvider ? 'gpt-4o' : model,
      {
        ...config,
      },
      true
    );

    if (!responseMessage) {
      res
        .status(400)
        .json({ error: 'Unable get response from LLM. Please try again.' });
    }

    if (typeof responseMessage === 'string') {
      await chatController.createChat({
        conversationId,
        role: 'assistant',
        content: responseMessage,
      });

      res.status(200).json({ message: responseMessage, conversationId });
    } else {
      res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();
      let message = '';
      for await (const chunk of responseMessage) {
        if (!chunk || !chunk.choices) {
          continue;
        }
        if (chunk.choices.length === 0) {
          continue;
        }
        if (chunk.choices[0]?.delta?.content) {
          // skip first empty line
          if (!message && chunk.choices[0]?.delta?.content === '\n') {
            continue;
          }
          message += chunk.choices[0]?.delta?.content;
          if (!chunk) {
            continue;
          }
          await res.write(JSON.stringify(chunk) + '\n');
        }
      }
      await res.write(JSON.stringify({ conversationId }) + '\n');
      res.end();

      await chatController.createChat({
        conversationId,
        role: 'assistant',
        content: message,
      });
    }
  } catch (error: any) {
    const { status, message } = decodeError(provider, error);
    throw new ApiError(message, status);
  }
}

const decodeError = (provider: string, error: any) => {
  switch (provider) {
    case 'openai':
      return {
        status: error.status || 400,
        message: error?.code || error?.message,
      };
    case 'mistral':
      return {
        status: (error?.message || '').indexOf('401') !== -1 ? 401 : 400,
        message:
          (error?.message || '').indexOf('Unauthorized') !== -1
            ? 'Unauthorized'
            : error?.message,
      };
  }
  return { status: 500, message: error?.message };
};

export default handler;
