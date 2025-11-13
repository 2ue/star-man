# Star-Man 修复计划

> **基于**: [CODE_REVIEW_LINUS.md](./CODE_REVIEW_LINUS.md)
> **策略**: 直接重构，不做数据迁移，保证功能正常
> **原则**: Linus 式实用主义 - 先易后难，快速迭代，充分测试

---

## 【执行策略】

**Phase 1: 快速胜利** ⚡（预计 3-4 小时）
- 低风险、高收益的改进
- 不涉及数据结构变更
- 立即见效

**Phase 2: 数据结构重构** 🔥（预计 4-6 小时）
- 推倒重来，不做数据迁移
- 删除旧数据库，重新同步
- 完整测试功能

---

## Phase 1: 快速胜利 ⚡

### 1.1 移除运行时 Schema 同步

**问题**: `Database.initializeSchema()` 在生产环境自动执行 `prisma db push`

**修复**:
- [ ] 删除 `packages/core/src/database.ts` 中的 `initializeSchema()` 方法
- [ ] 修改 `initialize()` 方法：
  ```typescript
  async initialize(): Promise<void> {
    try {
      await this.prisma.$connect();
      // 简单检查 schema 是否存在
      await this.prisma.starredRepo.findFirst();
    } catch (error) {
      throw new Error(
        'Database not initialized. Please run: cd packages/core && npx prisma db push'
      );
    }
  }
  ```
- [ ] 更新 `CLAUDE.md` 的数据库操作说明

**文件**: `packages/core/src/database.ts:81-96`
**预计时间**: 30 分钟
**风险**: 低

---

### 1.2 重构 RepoAnalyzer（数据驱动）

**问题**: 9 层 if-else 判断分类，难以维护和扩展

**修复**:
- [ ] 定义 `CategoryRule` 接口和规则配置：
  ```typescript
  interface CategoryRule {
    keywords: string[];
    category: string;
    weight: number;
  }

  const CATEGORY_RULES: CategoryRule[] = [
    { keywords: ['frontend', 'ui', 'react', 'vue', 'component'], category: 'Frontend', weight: 0.3 },
    { keywords: ['backend', 'server', 'api', 'rest', 'graphql'], category: 'Backend', weight: 0.3 },
    { keywords: ['mobile', 'android', 'ios', 'react-native'], category: 'Mobile', weight: 0.3 },
    { keywords: ['devops', 'deploy', 'ci/cd', 'docker', 'kubernetes'], category: 'DevOps', weight: 0.3 },
    { keywords: ['data', 'analytics', 'visualization', 'ml', 'ai'], category: 'Data Science', weight: 0.3 },
    { keywords: ['tool', 'utility', 'helper', 'cli'], category: 'Tools', weight: 0.2 },
    { keywords: ['learn', 'tutorial', 'example', 'course'], category: 'Learning', weight: 0.2 },
  ];
  ```

- [ ] 重写 `analyzeCategory()` 方法（88-109 行）：
  ```typescript
  private analyzeCategory(repo: StarredRepo): { category: string; confidence: number } {
    const text = `${repo.name} ${repo.description || ''} ${repo.language || ''}`.toLowerCase();

    // 数据驱动，零特殊情况
    const matches = CATEGORY_RULES.map(rule => ({
      category: rule.category,
      score: rule.keywords.filter(kw => text.includes(kw)).length * rule.weight
    }));

    const best = matches.reduce((a, b) => a.score > b.score ? a : b, { category: 'Other', score: 0 });

    return {
      category: best.score > 0 ? best.category : 'Other',
      confidence: Math.min(best.score, 1.0)
    };
  }
  ```

- [ ] 同样方式重构 `extractTags()` 的框架识别部分

**文件**: `packages/core/src/analyzer.ts:88-109`
**预计时间**: 1 小时
**收益**: 从 50 行 if-else 降到 3 行核心逻辑

---

### 1.3 拆分 getStarredRepos 方法

**问题**: 177 行方法混合了 5 种职责

**修复**:
- [ ] 提取 `buildWhereClause()` 私有方法（查询构建逻辑）
- [ ] 提取 `buildOrderBy()` 私有方法（排序逻辑）
- [ ] 提取 `formatRepos()` 私有方法（格式化逻辑）
- [ ] 简化主方法：
  ```typescript
  async getStarredRepos(options: GetReposOptions = {}): Promise<GetReposResult> {
    const where = this.buildWhereClause(options);
    const orderBy = this.buildOrderBy(options);

    const [repos, total] = await Promise.all([
      this.prisma.starredRepo.findMany({
        where,
        orderBy,
        skip: options.offset || 0,
        take: options.limit || 20
      }),
      this.prisma.starredRepo.count({ where })
    ]);

    return {
      repos: this.formatRepos(repos),
      total
    };
  }
  ```

**文件**: `packages/core/src/star-manager.ts:230-406`
**预计时间**: 2 小时
**收益**: 从 177 行降到 10 行，大幅提升可读性

---

### 1.4 提交验证

- [ ] 运行测试套件：`pnpm test`
- [ ] 测试 CLI 命令：`pnpm cli stats`, `pnpm cli list`
- [ ] 测试 API 接口（如果有）
- [ ] Git commit: `refactor: Phase 1 - 移除运行时同步、重构 Analyzer、拆分长方法`
- [ ] **不要 push**，等 Phase 2 完成后一起提交

---

## Phase 2: 数据结构重构 🔥

### 2.1 修改 Prisma Schema

**问题**: JSON string 存储 tags，导致无法高效查询

**修复**:
- [ ] 修改 `packages/core/prisma/schema.prisma`：

**删除**:
```prisma
model StarredRepo {
  // ...
  topics  String?  // 删除这行
  tags    String?  // 删除这行
}
```

**新增**:
```prisma
model Tag {
  id    Int       @id @default(autoincrement())
  name  String    @unique
  repos RepoTag[]

  @@index([name])
}

model RepoTag {
  repoId Int
  tagId  Int
  repo   StarredRepo @relation(fields: [repoId], references: [id], onDelete: Cascade)
  tag    Tag         @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([repoId, tagId])
  @@index([tagId])
  @@index([repoId])
}
```

**同时修改 StarredRepo**:
```prisma
model StarredRepo {
  // ... 其他字段不变
  tags    RepoTag[]  // 改为关系
  topics  String?    // 保留 topics（GitHub 原始数据），或者也改成关系
}
```

**文件**: `packages/core/prisma/schema.prisma`
**预计时间**: 30 分钟

---

### 2.2 重建数据库

**不做迁移，直接推倒重来**:

- [ ] 删除旧数据库：
  ```bash
  rm packages/core/dev.db
  rm packages/core/dev.db-journal
  ```

- [ ] 生成新 schema：
  ```bash
  cd packages/core
  npx prisma generate
  npx prisma db push
  ```

**预计时间**: 5 分钟
**风险**: 无（反正要重新同步数据）

---

### 2.3 修改代码 - RepoAnalyzer

**目标**: 返回 `string[]` 而不是生成 JSON string

- [ ] 修改 `RepoAnalyzer.analyzeRepo()` 返回类型：
  ```typescript
  export interface RepoAnalysisResult {
    category: string;
    tags: string[];      // 改为 string[] 不是 JSON string
    confidence: number;
  }
  ```

- [ ] 修改 `extractTags()` 方法直接返回 `string[]`，不要 `JSON.stringify()`

**文件**: `packages/core/src/analyzer.ts:55-127`
**预计时间**: 30 分钟

---

### 2.4 修改代码 - StarManager 插入逻辑

**目标**: 插入 repo 时同时创建 Tag 和 RepoTag 记录

- [ ] 修改 `syncStarredRepos()` 的批量插入逻辑（72-157 行）：
  ```typescript
  // 插入新 starred repos
  for (const repo of newStarredRepos) {
    const analysis = this.analyzer.analyzeRepo(repo);

    await this.prisma.starredRepo.create({
      data: {
        // ... 其他字段
        category: analysis.category,
        tags: {
          create: analysis.tags.map(tagName => ({
            tag: {
              connectOrCreate: {
                where: { name: tagName },
                create: { name: tagName }
              }
            }
          }))
        }
      }
    });
  }
  ```

- [ ] 同样修改 `addTagsToRepo()` 方法（如果有）

**文件**: `packages/core/src/star-manager.ts:72-157`
**预计时间**: 1 小时

---

### 2.5 修改代码 - StarManager 查询逻辑

**目标**: 移除所有 `JSON.parse()`，改用 Prisma 关系查询

- [ ] 修改 `getStarredRepos()` 的查询（已在 Phase 1 拆分好）：
  ```typescript
  private buildWhereClause(options: GetReposOptions): any {
    const where: any = {};

    // ... 其他条件不变

    // Tags 查询改用关系
    if (options.tags && options.tags.length > 0) {
      where.tags = {
        some: {
          tag: {
            name: { in: options.tags }
          }
        }
      };
    }

    return where;
  }
  ```

- [ ] 修改查询时包含 tags 关系：
  ```typescript
  const repos = await this.prisma.starredRepo.findMany({
    where,
    orderBy,
    include: {
      tags: {
        include: { tag: true }
      }
    },
    skip: options.offset || 0,
    take: options.limit || 20
  });
  ```

- [ ] 修改 `formatRepos()` 方法：
  ```typescript
  private formatRepos(repos: any[]): any[] {
    return repos.map(repo => ({
      ...repo,
      topics: repo.topics ? JSON.parse(repo.topics) : [],  // topics 还是 JSON（如果保留）
      tags: repo.tags.map((rt: any) => rt.tag.name)        // 从关系提取 tag 名称
    }));
  }
  ```

**文件**: `packages/core/src/star-manager.ts:230-406`
**预计时间**: 1.5 小时

---

### 2.6 修改代码 - API 路由

**目标**: 确保 API 响应格式正确

- [ ] 检查所有 API 路由（`packages/api/src/routes/*`）
- [ ] 确保响应中的 `tags` 字段是 `string[]` 格式
- [ ] 删除任何手动的 `JSON.parse()` 调用

**文件**: `packages/api/src/routes/repos.ts` 等
**预计时间**: 30 分钟

---

### 2.7 修改代码 - CLI 命令

**目标**: 确保 CLI 输出正确

- [ ] 检查 `packages/cli/src/commands/list.ts`
- [ ] 检查 `packages/cli/src/commands/tag.ts`
- [ ] 确保 tags 显示正确

**文件**: `packages/cli/src/commands/*`
**预计时间**: 30 分钟

---

### 2.8 重新同步数据

- [ ] 运行 sync 命令重新拉取 GitHub starred repos：
  ```bash
  pnpm cli sync
  ```

- [ ] 检查数据是否正确写入：
  ```bash
  pnpm cli list --limit 10
  pnpm cli stats
  ```

**预计时间**: 取决于 starred repos 数量（可能 5-30 分钟）

---

### 2.9 测试验证

**单元测试**:
- [ ] 测试 `RepoAnalyzer.analyzeRepo()` 返回正确的 tags 数组
- [ ] 测试 `StarManager.getStarredRepos()` 的 tags 查询
- [ ] 运行：`pnpm test`

**集成测试**:
- [ ] CLI 命令测试：
  ```bash
  pnpm cli list --tags react
  pnpm cli list --category Frontend
  pnpm cli stats
  pnpm cli tag <repo-name> test-tag
  ```

- [ ] API 测试（如果有）：
  ```bash
  pnpm dev:api
  # 测试各个接口
  curl http://localhost:3000/api/repos?tags=react
  curl http://localhost:3000/api/stats
  ```

**性能测试**:
- [ ] 对比查询速度（应该显著提升）：
  ```bash
  # 查询带 tags 过滤的仓库，观察响应时间
  time pnpm cli list --tags react,vue,typescript
  ```

**预计时间**: 1-2 小时

---

### 2.10 更新文档

- [ ] 更新 `CLAUDE.md` 的数据库架构说明
- [ ] 更新 `README.md`（如果需要）
- [ ] 删除 `FIX_PLAN.md`（本文件，任务完成后）

**预计时间**: 30 分钟

---

### 2.11 最终提交

- [ ] 确保所有测试通过
- [ ] 构建项目：`pnpm build`
- [ ] Git commit: `refactor: Phase 2 - 重构数据结构，使用关系表存储 tags`
- [ ] 合并 Phase 1 和 Phase 2 的改动
- [ ] **可选**: Push 到远程仓库

---

## 【总时间估算】

- **Phase 1**: 3-4 小时
- **Phase 2**: 4-6 小时
- **总计**: 7-10 小时（1-2 个工作日）

---

## 【检查清单】

完成后确认：

- [ ] ✅ 数据库使用关系表存储 tags（Tag + RepoTag）
- [ ] ✅ 代码中没有 `JSON.parse(repo.tags)` 或 `JSON.stringify(tags)`
- [ ] ✅ 查询 tags 使用数据库 JOIN，不是内存过滤
- [ ] ✅ 所有测试通过
- [ ] ✅ CLI 命令功能正常
- [ ] ✅ API 接口（如有）功能正常
- [ ] ✅ RepoAnalyzer 使用数据驱动，没有 if-else 特殊情况
- [ ] ✅ getStarredRepos 方法从 177 行降到 10 行
- [ ] ✅ Database.initialize() 不再执行 db push
- [ ] ✅ 文档已更新

---

## 【如果遇到问题】

### 问题 1: Prisma 关系查询不熟悉
**解决**: 参考 Prisma 文档的 Relations 章节

### 问题 2: 性能没有提升
**解决**:
- 检查是否添加了索引（`@@index([name])`, `@@index([tagId])`）
- 使用 `EXPLAIN QUERY PLAN` 检查 SQL 执行计划

### 问题 3: 数据同步失败
**解决**:
- 检查 GitHub Token 权限
- 查看错误日志
- 尝试减少批量大小

---

**生成时间**: 2025-11-13
**基于**: CODE_REVIEW_LINUS.md
**策略**: 直接重构，零妥协，追求"好品味"
