import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { StarManager } from '../star-manager';
import { createChatModel } from './llm-factory';
import { loadAIConfigFromEnv } from './config';

export interface AIRepoAnalysisResult {
  category: string;
  tags: string[];
  summary: string;
}

export class AIRepoAnalyzerService {
  constructor(private readonly starManager: StarManager) {}

  async analyzeRepoById(repoId: number): Promise<AIRepoAnalysisResult> {
    const repo = await this.starManager.getRepoById(repoId);
    if (!repo) {
      throw new Error(`仓库（id=${repoId}）不存在或尚未同步`);
    }

    const aiConfig = loadAIConfigFromEnv();
    if (!aiConfig) {
      throw new Error('AI 未配置：请设置 AI_PROVIDER 与 AI_MODEL 等环境变量。');
    }

    let model: BaseChatModel;
    try {
      model = await createChatModel(aiConfig);
    } catch (error) {
      console.error('[AI] 创建模型失败（analyzeRepoById）:', error);
      throw new Error('AI 模型初始化失败，请检查配置。');
    }

    const topics = Array.isArray(repo.topics) ? repo.topics : [];
    const tags = Array.isArray(repo.tags) ? repo.tags : [];

    const repoInfo = {
      id: repo.id,
      fullName: repo.fullName,
      name: repo.name,
      description: repo.description,
      language: repo.language,
      topics,
      tags,
      category: repo.category,
      stars: repo.stargazersCount,
      forks: repo.forksCount,
      htmlUrl: repo.htmlUrl,
      createdAt: repo.createdAt,
      updatedAt: repo.updatedAt,
      pushedAt: repo.pushedAt,
    };

    const prompt = [
      '你是一个帮助开发者整理 GitHub Star 仓库的智能助手。',
      '请根据给定仓库的信息，输出三个字段：',
      '1. category：一个简短的高层主题分类（可以是中文，如 "LLM 应用"、"系统设计"；也可以是英文，如 "frontend", "backend"）。',
      '2. tags：3-8 个标签，用于后续搜索与过滤，尽量简洁（中英文均可）。',
      '3. summary：1-2 句中文总结，说明这个仓库主要做什么、适合什么场景。',
      '',
      '请严格输出 JSON，格式如下：',
      '{',
      '  "category": "LLM 应用",',
      '  "tags": ["chatbot", "langchain", "openai"],',
      '  "summary": "这是一个使用 LangChain 和 OpenAI 搭建的聊天机器人示例..."',
      '}',
      '',
      '下面是仓库的详细信息（JSON）：',
      JSON.stringify(repoInfo, null, 2),
      '',
      '只返回 JSON，不要添加其他解释或 Markdown。'
    ].join('\n');

    const response = await model.invoke(prompt as any);
    let rawText = '';
    const content: any = (response as any).content;

    if (typeof content === 'string') {
      rawText = content;
    } else if (Array.isArray(content)) {
      rawText = content
        .map((part: any) => {
          if (typeof part === 'string') return part;
          if (typeof part?.text === 'string') return part.text;
          return '';
        })
        .join('\n');
    } else if (typeof content?.toString === 'function') {
      rawText = content.toString();
    }

    const parsed = this.parseAIAnalysis(rawText);
    if (!parsed) {
      throw new Error('AI 返回结果解析失败，请稍后重试。');
    }

    return parsed;
  }

  private parseAIAnalysis(text: string): AIRepoAnalysisResult | null {
    if (!text) return null;
    const trimmed = text.trim();
    let jsonText = trimmed;
    let parsed: any;

    try {
      parsed = JSON.parse(jsonText);
    } catch {
      const firstBrace = Math.min(
        ...['{', '[']
          .map(ch => jsonText.indexOf(ch))
          .filter(idx => idx >= 0)
      );
      const lastBrace = Math.max(
        ...['}', ']']
          .map(ch => jsonText.lastIndexOf(ch))
          .filter(idx => idx >= 0)
      );

      if (firstBrace >= 0 && lastBrace > firstBrace) {
        const substring = jsonText.slice(firstBrace, lastBrace + 1);
        try {
          parsed = JSON.parse(substring);
        } catch {
          return null;
        }
      } else {
        return null;
      }
    }

    if (Array.isArray(parsed)) {
      // 如果模型返回数组，取第一个元素作为结果
      parsed = parsed[0];
    }

    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    const category = typeof parsed.category === 'string' ? parsed.category.trim() : '';
    const tagsRaw = Array.isArray(parsed.tags) ? parsed.tags : [];
    const summary = typeof parsed.summary === 'string' ? parsed.summary.trim() : '';

    const tags = tagsRaw
      .map((t: any) => (typeof t === 'string' ? t.trim() : ''))
      .filter((t: string) => t.length > 0);

    if (!category && tags.length === 0 && !summary) {
      return null;
    }

    return {
      category: category || '未分类',
      tags,
      summary,
    };
  }
}

