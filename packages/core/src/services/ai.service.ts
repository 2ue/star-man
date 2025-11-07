import { PrismaClient } from '@prisma/client';
import { AIConfig } from '../types';
import { EmbeddingService } from './embedding.service';
import { LLMService } from './llm.service';
import { RecommendationService } from './recommendation.service';

/**
 * AI 服务管理器
 * 统一管理所有 AI 相关服务
 */
export class AIService {
  public embedding: EmbeddingService;
  public llm: LLMService;
  public recommendation: RecommendationService;
  private config: AIConfig;
  private prisma: PrismaClient;

  constructor(config: AIConfig, prisma: PrismaClient) {
    this.config = config;
    this.prisma = prisma;

    // 初始化各个服务
    this.embedding = new EmbeddingService(config, prisma);
    this.llm = new LLMService(config);
    this.recommendation = new RecommendationService(prisma, this.embedding);
  }

  /**
   * 初始化 AI 服务
   */
  async initialize(): Promise<void> {
    if (!this.config.enabled) {
      console.log('⚠️  AI 功能未启用');
      return;
    }

    console.log('🤖 初始化 AI 服务...');

    try {
      // 初始化向量数据库
      await this.embedding.initialize();

      console.log('✅ AI 服务初始化完成');
    } catch (error) {
      console.error('❌ AI 服务初始化失败:', error);
      throw error;
    }
  }

  /**
   * 检查 AI 服务是否可用
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * 获取 AI 配置信息
   */
  getConfig(): AIConfig {
    return this.config;
  }

  /**
   * 创建嵌入任务
   */
  async createEmbeddingTask(repoIds?: number[]): Promise<number> {
    try {
      let repos;

      if (repoIds && repoIds.length > 0) {
        // 嵌入指定的仓库
        repos = await this.prisma.starredRepo.findMany({
          where: {
            id: { in: repoIds },
          },
        });
      } else {
        // 嵌入所有未嵌入的仓库
        repos = await this.embedding.getPendingEmbedRepos();
      }

      if (repos.length === 0) {
        console.log('✅ 没有需要嵌入的仓库');
        return 0;
      }

      // 创建任务记录
      const task = await this.prisma.embeddingTask.create({
        data: {
          status: 'pending',
          repoIds: JSON.stringify(repos.map(r => r.id)),
          total: repos.length,
          progress: 0,
        },
      });

      // 异步执行嵌入任务
      this.executeEmbeddingTask(task.id, repos).catch(error => {
        console.error('❌ 嵌入任务执行失败:', error);
      });

      return task.id;
    } catch (error) {
      console.error('❌ 创建嵌入任务失败:', error);
      throw error;
    }
  }

  /**
   * 执行嵌入任务
   */
  private async executeEmbeddingTask(taskId: number, repos: any[]): Promise<void> {
    try {
      // 更新任务状态为处理中
      await this.prisma.embeddingTask.update({
        where: { id: taskId },
        data: { status: 'processing' },
      });

      // 执行嵌入
      await this.embedding.embedRepos(repos, async (current, total) => {
        // 更新进度
        await this.prisma.embeddingTask.update({
          where: { id: taskId },
          data: {
            progress: Math.floor((current / total) * 100),
          },
        });
      });

      // 更新任务状态为完成
      await this.prisma.embeddingTask.update({
        where: { id: taskId },
        data: {
          status: 'completed',
          progress: 100,
        },
      });

      console.log(`✅ 嵌入任务 ${taskId} 完成`);
    } catch (error) {
      // 更新任务状态为失败
      await this.prisma.embeddingTask.update({
        where: { id: taskId },
        data: {
          status: 'failed',
          error: error instanceof Error ? error.message : '未知错误',
        },
      });

      console.error(`❌ 嵌入任务 ${taskId} 失败:`, error);
    }
  }

  /**
   * 获取嵌入任务状态
   */
  async getEmbeddingTaskStatus(taskId: number) {
    return await this.prisma.embeddingTask.findUnique({
      where: { id: taskId },
    });
  }

  /**
   * 获取所有嵌入任务
   */
  async getEmbeddingTasks(limit: number = 10) {
    return await this.prisma.embeddingTask.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });
  }

  /**
   * 保存对话历史
   */
  async saveChatMessage(role: string, content: string, metadata?: any): Promise<void> {
    try {
      await this.prisma.chatHistory.create({
        data: {
          role,
          content,
          metadata: metadata ? JSON.stringify(metadata) : null,
        },
      });
    } catch (error) {
      console.error('❌ 保存对话历史失败:', error);
    }
  }

  /**
   * 获取对话历史
   */
  async getChatHistory(limit: number = 50) {
    return await this.prisma.chatHistory.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });
  }

  /**
   * 清空对话历史
   */
  async clearChatHistory(): Promise<void> {
    await this.prisma.chatHistory.deleteMany({});
  }
}
