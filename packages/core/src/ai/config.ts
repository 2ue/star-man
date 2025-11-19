import { config as loadDotEnv } from 'dotenv';
import { join } from 'path';
import { existsSync } from 'fs';

// 在单独运行 core 包（如通过 Node REPL 或独立脚本）时，确保 .env 已经加载。
// 如果上层已经加载过，这里再次加载不会有副作用。
const rootEnvPath = join(process.cwd(), '.env');
if (existsSync(rootEnvPath)) {
  loadDotEnv({ path: rootEnvPath, override: false });
}

export type AIProvider = 'openai' | 'openai-compatible' | 'ollama';

export interface AIConfig {
  provider: AIProvider;
  model: string;
  openaiApiKey?: string;
  openaiBaseUrl?: string;
  ollamaBaseUrl?: string;
}

export function loadAIConfigFromEnv(): AIConfig | null {
  const provider = (process.env.AI_PROVIDER || '').trim() as AIProvider;
  const model = (process.env.AI_MODEL || '').trim();

  if (!provider || !model) {
    // 未配置 AI，视为功能关闭
    return null;
  }

  if (provider === 'openai' || provider === 'openai-compatible') {
    const apiKey = (process.env.OPENAI_API_KEY || '').trim();
    if (!apiKey) {
      console.error('[AI] OPENAI_API_KEY 未配置，无法启用 OpenAI 提供方');
      return null;
    }

    return {
      provider,
      model,
      openaiApiKey: apiKey,
      openaiBaseUrl: (process.env.OPENAI_BASE_URL || '').trim() || undefined,
    };
  }

  if (provider === 'ollama') {
    return {
      provider,
      model,
      ollamaBaseUrl: (process.env.OLLAMA_BASE_URL || 'http://localhost:11434').trim(),
    };
  }

  console.error(`[AI] 不支持的 AI_PROVIDER: ${provider}`);
  return null;
}

