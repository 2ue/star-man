import { QdrantClient } from '@qdrant/js-client-rest';
import { Ollama } from 'ollama';
import { AIConfig, EmbeddingResult, SearchResult } from '../types';
import { PrismaClient } from '@prisma/client';

export class EmbeddingService {
  private qdrantClient?: QdrantClient;
  private ollamaClient?: Ollama;
  private config: AIConfig;
  private collectionName: string;
  private prisma: PrismaClient;

  constructor(config: AIConfig, prisma: PrismaClient) {
    this.config = config;
    this.prisma = prisma;
    this.collectionName = config.qdrant?.collection || 'starred_repos';

    // 初始化 Qdrant 客户端
    if (config.qdrant?.url) {
      this.qdrantClient = new QdrantClient({
        url: config.qdrant.url,
      });
    }

    // 初始化 Ollama 客户端
    if (config.ollama?.baseUrl) {
      this.ollamaClient = new Ollama({
        host: config.ollama.baseUrl,
      });
    }
  }

  /**
   * 初始化向量数据库集合
   */
  async initialize(): Promise<void> {
    if (!this.qdrantClient) {
      console.log('⚠️  Qdrant 未配置，跳过向量数据库初始化');
      return;
    }

    try {
      // 检查集合是否存在
      const collections = await this.qdrantClient.getCollections();
      const exists = collections.collections.some(
        (c) => c.name === this.collectionName
      );

      if (!exists) {
        // 创建集合
        await this.qdrantClient.createCollection(this.collectionName, {
          vectors: {
            size: this.config.embedding?.dimension || 768,
            distance: 'Cosine',
          },
        });
        console.log(`✅ 创建 Qdrant 集合: ${this.collectionName}`);
      } else {
        console.log(`✅ Qdrant 集合已存在: ${this.collectionName}`);
      }
    } catch (error) {
      console.error('❌ 初始化 Qdrant 集合失败:', error);
      throw error;
    }
  }

  /**
   * 生成仓库的文本表示（用于嵌入）
   */
  generateRepoText(repo: any): string {
    const parts: string[] = [];

    // 仓库名称（权重最高）
    if (repo.name) {
      parts.push(repo.name);
      parts.push(repo.name); // 重复以增加权重
    }

    // 完整名称
    if (repo.fullName || repo.full_name) {
      parts.push(repo.fullName || repo.full_name);
    }

    // 描述
    if (repo.description) {
      parts.push(repo.description);
    }

    // 语言
    if (repo.language) {
      parts.push(`Language: ${repo.language}`);
    }

    // Topics
    if (repo.topics) {
      const topics = typeof repo.topics === 'string'
        ? JSON.parse(repo.topics)
        : repo.topics;
      if (Array.isArray(topics) && topics.length > 0) {
        parts.push(`Topics: ${topics.join(', ')}`);
      }
    }

    // 分类
    if (repo.category) {
      parts.push(`Category: ${repo.category}`);
    }

    // 标签
    if (repo.tags) {
      const tags = typeof repo.tags === 'string'
        ? JSON.parse(repo.tags)
        : repo.tags;
      if (Array.isArray(tags) && tags.length > 0) {
        parts.push(`Tags: ${tags.join(', ')}`);
      }
    }

    return parts.join(' ');
  }

  /**
   * 使用 Ollama 生成向量嵌入
   */
  async generateEmbeddingWithOllama(text: string): Promise<number[]> {
    if (!this.ollamaClient) {
      throw new Error('Ollama 客户端未初始化');
    }

    try {
      const response = await this.ollamaClient.embeddings({
        model: this.config.ollama?.model || 'nomic-embed-text',
        prompt: text,
      });

      return response.embedding;
    } catch (error) {
      console.error('❌ Ollama 嵌入生成失败:', error);
      throw error;
    }
  }

  /**
   * 生成向量嵌入（支持多种模型）
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const model = this.config.embedding?.model || 'ollama';

    switch (model) {
      case 'ollama':
        return await this.generateEmbeddingWithOllama(text);
      case 'openai':
        // TODO: 实现 OpenAI 嵌入
        throw new Error('OpenAI 嵌入暂未实现');
      case 'local':
        // TODO: 实现本地嵌入模型
        throw new Error('本地嵌入暂未实现');
      default:
        throw new Error(`不支持的嵌入模型: ${model}`);
    }
  }

  /**
   * 为单个仓库生成并存储嵌入
   */
  async embedRepo(repo: any): Promise<EmbeddingResult> {
    const text = this.generateRepoText(repo);
    const embedding = await this.generateEmbedding(text);

    // 存储到数据库
    await this.prisma.starredRepo.update({
      where: { id: repo.id },
      data: {
        embedding: JSON.stringify(embedding),
        lastEmbedAt: new Date(),
      },
    });

    // 存储到 Qdrant
    if (this.qdrantClient) {
      await this.qdrantClient.upsert(this.collectionName, {
        wait: true,
        points: [
          {
            id: repo.id,
            vector: embedding,
            payload: {
              repoId: repo.id,
              name: repo.name,
              fullName: repo.fullName || repo.full_name,
              description: repo.description,
              language: repo.language,
              category: repo.category,
              tags: repo.tags,
              stargazersCount: repo.stargazersCount || repo.stargazers_count,
            },
          },
        ],
      });
    }

    return {
      repoId: repo.id,
      embedding,
      text,
    };
  }

  /**
   * 批量嵌入仓库
   */
  async embedRepos(repos: any[], onProgress?: (current: number, total: number) => void): Promise<void> {
    const total = repos.length;
    console.log(`🚀 开始批量嵌入 ${total} 个仓库...`);

    for (let i = 0; i < repos.length; i++) {
      try {
        await this.embedRepo(repos[i]);
        if (onProgress) {
          onProgress(i + 1, total);
        }

        // 避免请求过快
        if (i < repos.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error(`❌ 嵌入仓库 ${repos[i].name} 失败:`, error);
      }
    }

    console.log(`✅ 批量嵌入完成`);
  }

  /**
   * 语义搜索
   */
  async semanticSearch(query: string, limit: number = 10, filters?: any): Promise<SearchResult[]> {
    if (!this.qdrantClient) {
      throw new Error('Qdrant 客户端未初始化，无法进行语义搜索');
    }

    try {
      // 生成查询向量
      const queryEmbedding = await this.generateEmbedding(query);

      // 构建过滤条件
      const filter: any = {};
      if (filters?.language) {
        filter.must = filter.must || [];
        filter.must.push({
          key: 'language',
          match: { value: filters.language },
        });
      }
      if (filters?.category) {
        filter.must = filter.must || [];
        filter.must.push({
          key: 'category',
          match: { value: filters.category },
        });
      }

      // 执行搜索
      const searchResult = await this.qdrantClient.search(this.collectionName, {
        vector: queryEmbedding,
        limit,
        filter: Object.keys(filter).length > 0 ? filter : undefined,
        with_payload: true,
      });

      // 转换结果
      const results: SearchResult[] = [];
      for (const hit of searchResult) {
        const repo = await this.prisma.starredRepo.findUnique({
          where: { id: hit.id as number },
        });

        if (repo) {
          results.push({
            repo,
            similarity: hit.score,
            reasoning: `与查询 "${query}" 的相似度为 ${(hit.score * 100).toFixed(1)}%`,
          });
        }
      }

      return results;
    } catch (error) {
      console.error('❌ 语义搜索失败:', error);
      throw error;
    }
  }

  /**
   * 查找相似仓库
   */
  async findSimilar(repoId: number, limit: number = 5): Promise<SearchResult[]> {
    if (!this.qdrantClient) {
      throw new Error('Qdrant 客户端未初始化');
    }

    try {
      // 获取仓库的嵌入向量
      const repo = await this.prisma.starredRepo.findUnique({
        where: { id: repoId },
      });

      if (!repo || !repo.embedding) {
        throw new Error(`仓库 ${repoId} 未找到或未生成嵌入`);
      }

      const embedding = JSON.parse(repo.embedding);

      // 搜索相似仓库
      const searchResult = await this.qdrantClient.search(this.collectionName, {
        vector: embedding,
        limit: limit + 1, // +1 因为会包含自己
        with_payload: true,
      });

      // 过滤掉自己，转换结果
      const results: SearchResult[] = [];
      for (const hit of searchResult) {
        if (hit.id !== repoId) {
          const similarRepo = await this.prisma.starredRepo.findUnique({
            where: { id: hit.id as number },
          });

          if (similarRepo) {
            results.push({
              repo: similarRepo,
              similarity: hit.score,
              reasoning: `与 ${repo.name} 功能相似`,
            });
          }
        }
      }

      return results.slice(0, limit);
    } catch (error) {
      console.error('❌ 查找相似仓库失败:', error);
      throw error;
    }
  }

  /**
   * 获取需要嵌入的仓库数量
   */
  async getPendingEmbedCount(): Promise<number> {
    return await this.prisma.starredRepo.count({
      where: {
        OR: [
          { embedding: null },
          { lastEmbedAt: null },
        ],
      },
    });
  }

  /**
   * 获取需要嵌入的仓库
   */
  async getPendingEmbedRepos(limit?: number): Promise<any[]> {
    return await this.prisma.starredRepo.findMany({
      where: {
        OR: [
          { embedding: null },
          { lastEmbedAt: null },
        ],
      },
      take: limit,
      orderBy: {
        stargazersCount: 'desc', // 优先处理热门仓库
      },
    });
  }
}
