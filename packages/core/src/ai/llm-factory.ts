import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { loadAIConfigFromEnv, type AIConfig } from './config';

export { type AIConfig } from './config';

/**
 * 创建一个统一的 ChatModel 实例。
 * 调用方通常先通过 loadAIConfigFromEnv() 获取配置，
 * 若返回 null 则表示 AI 未启用。
 */
export async function createChatModel(config?: AIConfig): Promise<BaseChatModel> {
  const resolvedConfig = config ?? loadAIConfigFromEnv();
  if (!resolvedConfig) {
    throw new Error('AI 未配置：请设置 AI_PROVIDER 与 AI_MODEL 等环境变量。');
  }

  switch (resolvedConfig.provider) {
    case 'openai':
    case 'openai-compatible': {
      const { ChatOpenAI } = await import('@langchain/openai');
      const baseOptions: any = {
        apiKey: resolvedConfig.openaiApiKey,
        model: resolvedConfig.model,
      };

      if (resolvedConfig.openaiBaseUrl) {
        baseOptions.configuration = {
          baseURL: resolvedConfig.openaiBaseUrl,
        };
      }

      return new ChatOpenAI(baseOptions) as unknown as BaseChatModel;
    }
    case 'ollama': {
      const { ChatOllama } = await import('@langchain/ollama');
      return new ChatOllama({
        model: resolvedConfig.model,
        baseUrl: resolvedConfig.ollamaBaseUrl,
      }) as unknown as BaseChatModel;
    }
    default:
      // TypeScript 守卫，但运行时仍兜底
      throw new Error(`不支持的 AI 提供方: ${(resolvedConfig as any).provider}`);
  }
}
