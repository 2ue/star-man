import { Ollama } from 'ollama';
import OpenAI from 'openai';
import { AIConfig, AIAnalysisResult, ChatMessage, ChatContext } from '../types';

export class LLMService {
  private config: AIConfig;
  private ollamaClient?: Ollama;
  private openaiClient?: OpenAI;

  constructor(config: AIConfig) {
    this.config = config;

    // 初始化 Ollama 客户端
    if (config.ollama?.baseUrl) {
      this.ollamaClient = new Ollama({
        host: config.ollama.baseUrl,
      });
    }

    // 初始化 OpenAI 客户端
    if (config.openai?.apiKey) {
      this.openaiClient = new OpenAI({
        apiKey: config.openai.apiKey,
      });
    }
  }

  /**
   * 调用 Ollama 模型
   */
  private async callOllama(prompt: string, systemPrompt?: string): Promise<string> {
    if (!this.ollamaClient) {
      throw new Error('Ollama 客户端未初始化');
    }

    try {
      const messages: any[] = [];

      if (systemPrompt) {
        messages.push({
          role: 'system',
          content: systemPrompt,
        });
      }

      messages.push({
        role: 'user',
        content: prompt,
      });

      const response = await this.ollamaClient.chat({
        model: this.config.ollama?.model || 'llama3.2',
        messages,
      });

      return response.message.content;
    } catch (error) {
      console.error('❌ Ollama 调用失败:', error);
      throw error;
    }
  }

  /**
   * 调用 OpenAI 模型
   */
  private async callOpenAI(prompt: string, systemPrompt?: string): Promise<string> {
    if (!this.openaiClient) {
      throw new Error('OpenAI 客户端未初始化');
    }

    try {
      const messages: any[] = [];

      if (systemPrompt) {
        messages.push({
          role: 'system',
          content: systemPrompt,
        });
      }

      messages.push({
        role: 'user',
        content: prompt,
      });

      const response = await this.openaiClient.chat.completions.create({
        model: this.config.openai?.model || 'gpt-4o-mini',
        messages,
      });

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('❌ OpenAI 调用失败:', error);
      throw error;
    }
  }

  /**
   * 调用 LLM（根据配置选择模型）
   */
  private async callLLM(prompt: string, systemPrompt?: string): Promise<string> {
    switch (this.config.model) {
      case 'ollama':
        return await this.callOllama(prompt, systemPrompt);
      case 'openai':
        return await this.callOpenAI(prompt, systemPrompt);
      case 'gemini':
        // TODO: 实现 Gemini
        throw new Error('Gemini 暂未实现');
      case 'qwen':
        // TODO: 实现 Qwen
        throw new Error('Qwen 暂未实现');
      default:
        throw new Error(`不支持的模型: ${this.config.model}`);
    }
  }

  /**
   * 智能分类仓库
   */
  async categorizeRepo(repo: any): Promise<AIAnalysisResult> {
    const systemPrompt = `你是一个 GitHub 仓库分析专家。你的任务是分析仓库并提供准确的分类和标签。

分类选项：
- Frontend: 前端框架、UI 组件库、前端工具
- Backend: 后端框架、API 服务、服务器工具
- Mobile: 移动应用开发、跨平台框架
- DevOps: CI/CD、容器化、部署工具
- Data Science: 数据分析、机器学习、可视化
- Tools: 开发工具、CLI 工具、实用程序
- Learning: 教程、示例、学习资源
- System: 系统编程、底层工具
- Other: 其他类型

请以 JSON 格式返回结果，包含：
- category: 分类名称
- tags: 3-5个相关标签（小写，用连字符分隔）
- confidence: 置信度（0-1）
- reasoning: 分类理由（简短说明）`;

    const topics = repo.topics
      ? (typeof repo.topics === 'string' ? JSON.parse(repo.topics) : repo.topics)
      : [];

    const prompt = `分析以下 GitHub 仓库：

名称: ${repo.name}
完整名称: ${repo.fullName || repo.full_name || ''}
描述: ${repo.description || '无描述'}
语言: ${repo.language || '未知'}
Topics: ${topics.length > 0 ? topics.join(', ') : '无'}
Stars: ${repo.stargazersCount || repo.stargazers_count || 0}
Forks: ${repo.forksCount || repo.forks_count || 0}

请返回 JSON 格式的分析结果。`;

    try {
      const response = await this.callLLM(prompt, systemPrompt);

      // 尝试解析 JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return {
          category: result.category || 'Other',
          tags: result.tags || [],
          confidence: result.confidence || 0.5,
          reasoning: result.reasoning || '自动分析',
        };
      }

      // 如果无法解析 JSON，返回默认值
      return {
        category: 'Other',
        tags: [],
        confidence: 0.3,
        reasoning: '无法解析 AI 响应',
      };
    } catch (error) {
      console.error('❌ AI 分类失败:', error);
      throw error;
    }
  }

  /**
   * 生成仓库摘要
   */
  async generateSummary(repo: any): Promise<string> {
    const systemPrompt = `你是一个技术文档专家。请用简洁的中文总结 GitHub 仓库的核心功能和特点，不超过 100 字。`;

    const topics = repo.topics
      ? (typeof repo.topics === 'string' ? JSON.parse(repo.topics) : repo.topics)
      : [];

    const prompt = `总结以下仓库：

名称: ${repo.name}
描述: ${repo.description || '无描述'}
语言: ${repo.language || '未知'}
Topics: ${topics.length > 0 ? topics.join(', ') : '无'}

请用一段话总结这个仓库的核心功能和特点。`;

    try {
      const summary = await this.callLLM(prompt, systemPrompt);
      return summary.trim();
    } catch (error) {
      console.error('❌ 生成摘要失败:', error);
      throw error;
    }
  }

  /**
   * 对话式查询（流式响应）
   */
  async *chatStream(message: string, context: ChatContext): AsyncGenerator<string> {
    const systemPrompt = `你是 Star Manager 的 AI 助手。你可以帮助用户：
1. 查询和搜索 GitHub Star 仓库
2. 推荐相关仓库
3. 分析技术栈
4. 整理和分类仓库

用户的仓库信息会在上下文中提供。请用友好、专业的语气回答问题。`;

    // 构建上下文
    let contextInfo = '';
    if (context.repoContext && context.repoContext.length > 0) {
      contextInfo = '\n\n用户的部分仓库信息：\n';
      context.repoContext.slice(0, 10).forEach((repo: any) => {
        contextInfo += `- ${repo.name}: ${repo.description || '无描述'} (${repo.language || '未知语言'})\n`;
      });
    }

    const fullPrompt = message + contextInfo;

    // 根据模型选择流式响应方式
    if (this.config.model === 'ollama' && this.ollamaClient) {
      const response = await this.ollamaClient.chat({
        model: this.config.ollama?.model || 'llama3.2',
        messages: [
          { role: 'system', content: systemPrompt },
          ...context.history.map(msg => ({
            role: msg.role,
            content: msg.content,
          })),
          { role: 'user', content: fullPrompt },
        ],
        stream: true,
      });

      for await (const part of response) {
        yield part.message.content;
      }
    } else if (this.config.model === 'openai' && this.openaiClient) {
      const stream = await this.openaiClient.chat.completions.create({
        model: this.config.openai?.model || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          ...context.history.map(msg => ({
            role: msg.role,
            content: msg.content,
          })),
          { role: 'user', content: fullPrompt },
        ],
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          yield content;
        }
      }
    } else {
      throw new Error(`不支持流式响应的模型: ${this.config.model}`);
    }
  }

  /**
   * 对话式查询（非流式）
   */
  async chat(message: string, context: ChatContext): Promise<string> {
    const systemPrompt = `你是 Star Manager 的 AI 助手。你可以帮助用户：
1. 查询和搜索 GitHub Star 仓库
2. 推荐相关仓库
3. 分析技术栈
4. 整理和分类仓库

用户的仓库信息会在上下文中提供。请用友好、专业的语气回答问题。`;

    // 构建上下文
    let contextInfo = '';
    if (context.repoContext && context.repoContext.length > 0) {
      contextInfo = '\n\n用户的部分仓库信息：\n';
      context.repoContext.slice(0, 10).forEach((repo: any) => {
        contextInfo += `- ${repo.name}: ${repo.description || '无描述'} (${repo.language || '未知语言'})\n`;
      });
    }

    const fullPrompt = message + contextInfo;

    // 构建消息历史
    const messages = [
      systemPrompt,
      ...context.history.map(msg => msg.content).join('\n'),
      fullPrompt,
    ].join('\n\n');

    return await this.callLLM(messages);
  }

  /**
   * 批量分析仓库
   */
  async batchAnalyze(repos: any[], onProgress?: (current: number, total: number) => void): Promise<Map<number, AIAnalysisResult>> {
    const results = new Map<number, AIAnalysisResult>();
    const total = repos.length;

    console.log(`🚀 开始批量分析 ${total} 个仓库...`);

    for (let i = 0; i < repos.length; i++) {
      try {
        const result = await this.categorizeRepo(repos[i]);
        results.set(repos[i].id, result);

        if (onProgress) {
          onProgress(i + 1, total);
        }

        // 避免请求过快
        if (i < repos.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error(`❌ 分析仓库 ${repos[i].name} 失败:`, error);
      }
    }

    console.log(`✅ 批量分析完成`);
    return results;
  }
}
