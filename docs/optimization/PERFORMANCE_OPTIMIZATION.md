# Star-Man 性能优化指南

> 文档版本: v1.0  
> 更新时间: 2025-08-26  
> 适用版本: Star-Man v1.0.0  

## 🎯 优化目标

| 性能指标 | 当前状态 | 目标状态 | 改进幅度 |
|----------|----------|----------|----------|
| 同步5000仓库 | 25-40秒 | 8-15秒 | **60%+** |
| API响应时间 | 500-2000ms | <200ms | **75%+** |
| 内存使用 | 200MB+ | <100MB | **50%+** |
| 数据库查询 | 200-1000ms | <50ms | **80%+** |
| 标签筛选 | 1-2秒 | <100ms | **90%+** |

---

## 🚀 立即执行优化 (高优先级)

### 1. 数据库索引优化

#### 1.1 添加复合索引

**位置:** `packages/core/prisma/schema.prisma`

```prisma
model StarredRepo {
  // ... 现有字段 ...

  // 新增复合索引
  @@index([isStarred, category, language])      // 多条件查询
  @@index([isStarred, stargazersCount])         // 按star数排序
  @@index([isStarred, pushedAt])               // 按活跃时间排序
  @@index([isStarred, starredAt])              // 按收藏时间排序
  @@index([category, language])                // 分类+语言组合
}
```

**执行命令:**
```bash
cd packages/core
pnpm db:push
```

**预期效果:** 多条件查询性能提升 **3-5倍**

#### 1.2 标签查询表重构

**问题:** 当前标签存储为JSON，无法利用索引

**解决方案:** 创建关联表

```prisma
// 新增标签表
model Tag {
  id        Int      @id @default(autoincrement())
  name      String   @unique
  createdAt DateTime @default(now())
  
  // 关联关系
  repos     RepoTag[]
}

model RepoTag {
  repoId Int
  tagId  Int
  
  repo StarredRepo @relation(fields: [repoId], references: [id])
  tag  Tag         @relation(fields: [tagId], references: [id])
  
  @@id([repoId, tagId])
  @@index([tagId])      // 按标签查询
  @@index([repoId])     // 按仓库查询
}
```

**迁移脚本示例:**

```typescript
// scripts/migrate-tags.ts
async function migrateTags() {
  const repos = await prisma.starredRepo.findMany({
    where: { tags: { not: null } }
  });
  
  for (const repo of repos) {
    const tags = JSON.parse(repo.tags || '[]');
    
    for (const tagName of tags) {
      // 创建或获取标签
      const tag = await prisma.tag.upsert({
        where: { name: tagName },
        update: {},
        create: { name: tagName }
      });
      
      // 创建关联关系
      await prisma.repoTag.upsert({
        where: { repoId_tagId: { repoId: repo.id, tagId: tag.id } },
        update: {},
        create: { repoId: repo.id, tagId: tag.id }
      });
    }
  }
}
```

**预期效果:** 标签查询性能提升 **10-20倍**

### 2. GitHub API 调用优化

#### 2.1 动态延迟调整

**位置:** `packages/core/src/github.ts`

```typescript
export class GitHubService {
  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  private calculateDelay(headers: any): number {
    const remaining = parseInt(headers['x-ratelimit-remaining'] || '0');
    const reset = parseInt(headers['x-ratelimit-reset'] || '0');
    const now = Math.floor(Date.now() / 1000);
    
    if (remaining < 10) {
      // 接近限流时增加延迟
      return Math.max((reset - now) * 1000 / remaining, 1000);
    } else if (remaining > 1000) {
      // 充裕时减少延迟
      return 50;
    }
    
    return 100; // 默认延迟
  }

  async getAllStarredRepos(onProgress?: (current: number, page: number) => void): Promise<StarredRepo[]> {
    // ... 现有代码 ...
    
    for (;;) {
      try {
        const response = await this.octokit.rest.activity.listReposStarredByUser({
          username,
          per_page: perPage,
          page,
          headers: { Accept: 'application/vnd.github.star+json' },
        });

        // 动态计算延迟
        const delayMs = this.calculateDelay(response.headers);
        await this.delay(delayMs);
        
        // ... 其余代码 ...
      } catch (error) {
        // ... 错误处理 ...
      }
    }
  }
}
```

**预期效果:** 同步时间减少 **30-50%**

#### 2.2 并发控制优化

```typescript
import PQueue from 'p-queue';

export class GitHubService {
  private queue = new PQueue({
    concurrency: 2,              // 最多2个并发请求
    interval: 1000,             // 每秒间隔
    intervalCap: 10             // 每秒最多10个请求
  });

  async getRepoDetails(owner: string, repo: string) {
    return this.queue.add(async () => {
      return this.octokit.rest.repos.get({ owner, repo });
    });
  }
}
```

### 3. 查询优化重构

#### 3.1 标签筛选优化

**位置:** `packages/core/src/star-manager.ts`

```typescript
async getStarredRepos(options: GetReposOptions = {}): Promise<GetReposResult> {
  const { tags, ...otherOptions } = options;
  
  let baseQuery: any = {
    where: this.buildWhereClause(otherOptions),
    orderBy: this.buildOrderClause(otherOptions),
    skip: otherOptions.offset || 0,
    take: otherOptions.limit || 20
  };

  // 标签筛选优化：使用关联查询代替内存过滤
  if (tags && tags.length > 0) {
    baseQuery.where.repoTags = {
      some: {
        tag: {
          name: { in: tags }
        }
      }
    };
    
    // 包含关联数据
    baseQuery.include = {
      repoTags: {
        include: { tag: true }
      }
    };
  }

  const [repos, total] = await Promise.all([
    this.prisma.starredRepo.findMany(baseQuery),
    this.prisma.starredRepo.count({ where: baseQuery.where })
  ]);

  return {
    repos: repos.map(repo => this.formatRepo(repo)),
    total
  };
}
```

**预期效果:** 标签查询速度提升 **10倍以上**

---

## ⚡ 短期优化方案 (中优先级)

### 4. 缓存策略实现

#### 4.1 Redis 缓存层

**安装依赖:**
```bash
pnpm add redis @types/redis
```

**缓存服务实现:**

```typescript
// packages/core/src/cache.ts
import Redis from 'redis';

export class CacheService {
  private redis: Redis.RedisClientType;

  constructor(url?: string) {
    this.redis = Redis.createClient({ url });
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);
    return value ? JSON.parse(value) : null;
  }

  async set<T>(key: string, value: T, ttlSeconds: number = 300): Promise<void> {
    await this.redis.setEx(key, ttlSeconds, JSON.stringify(value));
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  // 缓存键生成
  static buildKey(prefix: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|');
    return `${prefix}:${Buffer.from(sortedParams).toString('base64')}`;
  }
}
```

**集成到 StarManager:**

```typescript
// packages/core/src/star-manager.ts
export class StarManager {
  private cache?: CacheService;

  constructor(config: Config) {
    // ... 现有代码 ...
    if (config.redis?.url) {
      this.cache = new CacheService(config.redis.url);
    }
  }

  async getStarredRepos(options: GetReposOptions = {}): Promise<GetReposResult> {
    // 尝试从缓存获取
    if (this.cache) {
      const cacheKey = CacheService.buildKey('repos', options);
      const cached = await this.cache.get<GetReposResult>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // 查询数据库
    const result = await this.queryDatabase(options);

    // 写入缓存 (5分钟TTL)
    if (this.cache) {
      const cacheKey = CacheService.buildKey('repos', options);
      await this.cache.set(cacheKey, result, 300);
    }

    return result;
  }
}
```

**预期效果:** 
- 重复查询响应时间: **50ms** (vs 500ms+)
- 数据库负载减少: **60-80%**

#### 4.2 内存缓存优化

**轻量级内存缓存 (无需Redis):**

```typescript
// packages/core/src/memory-cache.ts
interface CacheItem<T> {
  value: T;
  expiry: number;
}

export class MemoryCache {
  private cache = new Map<string, CacheItem<any>>();
  private maxSize: number;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item || Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  set<T>(key: string, value: T, ttlMs: number = 300000): void {
    // LRU 驱逐策略
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, {
      value,
      expiry: Date.now() + ttlMs
    });
  }
}
```

### 5. 批量操作优化

#### 5.1 事务批处理优化

```typescript
async syncStarredRepos(incremental: boolean = true): Promise<SyncResult> {
  // ... 现有逻辑 ...

  // 优化：使用 createMany 代替逐个 upsert
  if (newStarredRepos.length > 0) {
    const BATCH_SIZE = 100; // 增加批次大小
    
    for (let i = 0; i < newStarredRepos.length; i += BATCH_SIZE) {
      const batch = newStarredRepos.slice(i, i + BATCH_SIZE);
      
      // 批量插入新仓库
      const reposData = batch.map(repo => ({
        id: repo.id,
        nodeId: repo.node_id,
        // ... 其他字段映射
      }));

      await this.prisma.$transaction([
        // 批量插入仓库
        this.prisma.starredRepo.createMany({
          data: reposData,
          skipDuplicates: true
        }),
        
        // 批量插入标签关联 (如果使用新的标签表结构)
        ...this.createTagRelations(batch)
      ]);
    }
  }
}
```

**预期效果:** 同步性能提升 **2-3倍**

---

## 🔧 长期优化规划 (低优先级)

### 6. 架构级优化

#### 6.1 读写分离

```typescript
// packages/core/src/database.ts
export class Database {
  private readPrisma: PrismaClient;   // 只读实例
  private writePrisma: PrismaClient;  // 读写实例

  constructor(config: DatabaseConfig) {
    this.readPrisma = new PrismaClient({
      datasources: { db: { url: config.readUrl || config.url } }
    });
    
    this.writePrisma = new PrismaClient({
      datasources: { db: { url: config.url } }
    });
  }

  getReadPrisma(): PrismaClient {
    return this.readPrisma;
  }

  getWritePrisma(): PrismaClient {
    return this.writePrisma;
  }
}
```

#### 6.2 分库分表策略

```typescript
// 按用户分片的数据库设计
interface DatabaseShard {
  userId: string;
  databaseUrl: string;
}

export class ShardManager {
  private shards: Map<string, PrismaClient> = new Map();
  
  getShardForUser(userId: string): PrismaClient {
    const shardKey = this.calculateShard(userId);
    
    if (!this.shards.has(shardKey)) {
      this.shards.set(shardKey, new PrismaClient({
        datasources: { db: { url: this.getShardUrl(shardKey) } }
      }));
    }
    
    return this.shards.get(shardKey)!;
  }
}
```

### 7. 搜索性能优化

#### 7.1 全文搜索集成

```typescript
// Elasticsearch 集成示例
import { Client as ElasticClient } from '@elastic/elasticsearch';

export class SearchService {
  private client: ElasticClient;

  async indexRepository(repo: StarredRepo): Promise<void> {
    await this.client.index({
      index: 'repositories',
      id: repo.id.toString(),
      body: {
        name: repo.name,
        description: repo.description,
        language: repo.language,
        tags: repo.tags,
        owner: repo.ownerLogin,
        stars: repo.stargazersCount,
        updated: repo.updatedAt
      }
    });
  }

  async searchRepositories(query: string, filters: any = {}): Promise<SearchResult> {
    const searchBody = {
      query: {
        bool: {
          must: [
            {
              multi_match: {
                query: query,
                fields: ['name^3', 'description^2', 'tags'],
                type: 'best_fields',
                fuzziness: 'AUTO'
              }
            }
          ],
          filter: this.buildFilters(filters)
        }
      },
      highlight: {
        fields: {
          name: {},
          description: {}
        }
      }
    };

    const result = await this.client.search({
      index: 'repositories',
      body: searchBody
    });

    return this.formatSearchResults(result.body);
  }
}
```

**预期效果:** 复杂搜索响应时间 **< 50ms**

---

## 📊 性能监控实现

### 8. 关键指标监控

#### 8.1 性能日志记录

```typescript
// packages/core/src/performance.ts
export class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();

  startTimer(operation: string): () => void {
    const startTime = process.hrtime.bigint();
    
    return () => {
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1_000_000; // 转换为毫秒
      
      this.recordMetric(operation, duration);
    };
  }

  recordMetric(operation: string, value: number): void {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }
    
    const values = this.metrics.get(operation)!;
    values.push(value);
    
    // 保留最近100个数据点
    if (values.length > 100) {
      values.shift();
    }
  }

  getStats(operation: string): PerformanceStats | null {
    const values = this.metrics.get(operation);
    if (!values || values.length === 0) return null;

    const sorted = [...values].sort((a, b) => a - b);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];

    return { avg, p50, p95, p99, count: values.length };
  }
}
```

#### 8.2 集成监控

```typescript
// packages/core/src/star-manager.ts
export class StarManager {
  private monitor = new PerformanceMonitor();

  async getStarredRepos(options: GetReposOptions = {}): Promise<GetReposResult> {
    const endTimer = this.monitor.startTimer('getStarredRepos');
    
    try {
      // ... 查询逻辑 ...
      const result = await this.queryRepos(options);
      
      endTimer();
      return result;
    } catch (error) {
      endTimer();
      throw error;
    }
  }

  async getPerformanceStats(): Promise<Record<string, PerformanceStats>> {
    return {
      getStarredRepos: this.monitor.getStats('getStarredRepos'),
      syncRepos: this.monitor.getStats('syncStarredRepos'),
      // ... 其他操作统计
    };
  }
}
```

---

## 🚦 实施计划

### Phase 1: 立即优化 (1周内)

| 任务 | 预估工时 | 预期收益 | 优先级 |
|------|----------|----------|---------|
| 添加数据库复合索引 | 2小时 | 查询性能提升3-5倍 | 🔴 最高 |
| 标签查询表重构 | 8小时 | 标签筛选提升10倍+ | 🔴 最高 |
| GitHub API动态延迟 | 4小时 | 同步速度提升30%+ | 🟡 高 |
| 批量操作优化 | 6小时 | 写入性能提升2-3倍 | 🟡 高 |

**总计:** 20小时，预期整体性能提升 **50-80%**

### Phase 2: 中期优化 (1月内)

| 任务 | 预估工时 | 预期收益 | 优先级 |
|------|----------|----------|---------|
| Redis缓存层 | 16小时 | 重复查询提升10倍+ | 🟡 高 |
| 并发控制优化 | 8小时 | API稳定性提升 | 🟡 高 |
| 性能监控实现 | 12小时 | 问题定位能力 | 🔵 中 |
| 内存缓存优化 | 6小时 | 轻量级加速 | 🔵 中 |

**总计:** 42小时

### Phase 3: 长期规划 (3月内)

| 任务 | 预估工时 | 预期收益 | 优先级 |
|------|----------|----------|---------|
| 全文搜索集成 | 40小时 | 搜索体验质的飞跃 | 🔵 中 |
| 读写分离架构 | 32小时 | 大规模扩展能力 | 🟢 低 |
| 分库分表设计 | 60小时 | 海量数据支持 | 🟢 低 |
| 微服务架构 | 120小时 | 架构级升级 | 🟢 低 |

---

## 🧪 性能测试计划

### 基准测试场景

```typescript
// 性能测试用例
describe('Performance Tests', () => {
  const testDataSizes = [100, 1000, 5000, 10000];
  
  testDataSizes.forEach(size => {
    describe(`${size} repositories`, () => {
      it('should sync within acceptable time', async () => {
        const startTime = Date.now();
        await starManager.syncStarredRepos();
        const duration = Date.now() - startTime;
        
        // 性能基准: 1000个仓库 < 10秒
        const maxDuration = (size / 1000) * 10 * 1000;
        expect(duration).toBeLessThan(maxDuration);
      });
      
      it('should query with filters efficiently', async () => {
        const startTime = Date.now();
        await starManager.getStarredRepos({
          category: 'Frontend',
          language: 'JavaScript',
          tags: ['react', 'typescript'],
          limit: 50
        });
        const duration = Date.now() - startTime;
        
        expect(duration).toBeLessThan(200); // < 200ms
      });
    });
  });
});
```

### 压力测试

```typescript
// 并发查询测试
async function stressTest() {
  const concurrency = 50;
  const queries = Array(concurrency).fill(null).map(() => 
    starManager.getStarredRepos({ limit: 20 })
  );
  
  const startTime = Date.now();
  await Promise.all(queries);
  const duration = Date.now() - startTime;
  
  console.log(`${concurrency} concurrent queries: ${duration}ms`);
  console.log(`Average per query: ${duration / concurrency}ms`);
}
```

---

## 📋 检查清单

### 优化前检查

- [ ] 备份当前数据库
- [ ] 记录当前性能基准
- [ ] 准备回滚方案
- [ ] 设置监控告警

### 优化后验证

- [ ] 功能回归测试通过
- [ ] 性能基准达到预期
- [ ] 错误率在可接受范围
- [ ] 内存使用未显著增加
- [ ] 监控指标正常

### 部署检查

- [ ] 生产环境配置更新
- [ ] 数据库迁移脚本就绪  
- [ ] 缓存服务正常运行
- [ ] 监控面板配置完成
- [ ] 回滚流程文档化

---

通过按阶段实施这些优化方案，Star-Man 项目将实现显著的性能提升，为未来的功能扩展和用户增长奠定坚实基础。