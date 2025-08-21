# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目架构

Star-Man 是一个 TypeScript 单仓项目，使用 pnpm 管理，采用三层架构设计：

### 核心模块结构
- `packages/core/` - 核心业务逻辑
  - `StarManager` - 主要管理类，位于 `src/star-manager.ts`
  - `GitHubService` - GitHub API 交互，位于 `src/github.ts`
  - `RepoAnalyzer` - 仓库智能分析，位于 `src/analyzer.ts`
  - `Database` - Prisma 数据库封装，位于 `src/database.ts`
  - `Config` - 配置管理，位于 `src/config.ts`
  - `manager-factory.ts` - 单例模式管理器工厂
  
- `packages/cli/` - 命令行工具
  - `bin.ts` - CLI 程序入口
  - `commands/` - 各种命令实现（sync, list, stats, tag, unstar）
  
- `packages/api/` - REST API 服务
  - `server.ts` - Express 服务器
  - `routes/` - API 路由（repos, stats, sync, unstar）

### 数据库架构
使用 Prisma ORM，支持 SQLite（默认）和 MySQL：
- `StarredRepo` - 存储仓库信息，包含自动分析的标签和分类
- `SyncHistory` - 记录同步历史

## 常用开发命令

### 项目构建和运行
```bash
# 安装依赖
pnpm install

# 构建全部包
pnpm build

# 运行测试
pnpm test

# 代码检查
pnpm lint
```

### 数据库操作
```bash
# 进入 core 包目录
cd packages/core

# 生成 Prisma 客户端
pnpm db:generate

# 推送数据库变更（用于开发）
pnpm db:push

# 创建迁移文件
pnpm db:migrate
```

### CLI 使用
```bash
# 同步 GitHub star 仓库
pnpm cli sync

# 查看统计信息
pnpm cli stats

# 列出仓库
pnpm cli list

# 为仓库添加标签
pnpm cli tag <repo-name> <tag1,tag2>

# 取消 star
pnpm cli unstar <repo-name>
```

### API 服务
```bash
# 开发模式启动 API
pnpm dev:api

# 生产模式启动 API
pnpm api
```

## 环境配置

必须配置的环境变量：
- `GITHUB_TOKEN` - GitHub Personal Access Token（需要 public_repo 权限）
- `DATABASE_URL` - 数据库连接字符串（默认使用 SQLite）
- `API_PORT` - API 服务端口（默认 3000）

复制 `.env.example` 为 `.env` 并填入正确的值。

## 核心功能原理

### 增量同步算法
`StarManager.syncStarredRepos()` 实现了高效的增量同步：
1. 获取 GitHub 当前 starred 仓库（集合A）
2. 获取数据库中已 starred 仓库（集合B）  
3. 计算差集：新增仓库 = A - B，取消仓库 = B - A
4. 批量插入新增仓库，批量更新取消的仓库
5. 对于不变的仓库（A ∩ B）完全跳过，零数据库操作

### 智能分析系统
`RepoAnalyzer` 基于仓库的 name、description、language、topics 进行：
- 自动分类识别（框架、工具、库等）
- 智能标签生成
- 技术栈识别

### 数据同步策略
- 取消 star 的仓库不删除，只标记 `isStarred: false`
- 支持恢复历史 star 记录
- 保留完整的同步历史记录

## 开发注意事项

### 数据库修改
- 修改 `packages/core/prisma/schema.prisma` 后必须运行 `pnpm db:generate` 和 `pnpm db:push`
- 生产环境使用 `pnpm db:migrate` 创建迁移文件

### API 开发
- 新增路由在 `packages/api/src/routes/` 下创建
- 在 `server.ts` 中注册路由
- 使用 `@star-man/core` 包的 `StarManager` 进行数据操作

### CLI 开发
- 新增命令在 `packages/cli/src/commands/` 下创建
- 在 `bin.ts` 中注册命令
- 使用 commander.js 框架

### 类型定义
所有类型定义在 `packages/core/src/types.ts` 中，包含：
- `Config` - 配置接口
- `SyncResult` - 同步结果
- `GetReposOptions/Result` - 仓库查询接口
- `StatsResult` - 统计信息接口

## 测试策略

- 核心逻辑测试位于各包的 `test/` 目录
- 使用 Jest 测试框架
- 数据库操作使用内存 SQLite 进行测试
- API 测试使用 supertest

## 故障排查

### GitHub API 限制
- 未认证请求：60次/小时
- 认证请求：5000次/小时
- 注意处理 403 Forbidden 和 rate limit 响应

### 数据库问题
- 检查 `DATABASE_URL` 配置
- 确保数据库文件有写权限
- SQLite 性能问题可考虑迁移到 MySQL

### 常见错误
- Token 权限不足：需要至少 `public_repo` 权限
- 仓库不存在：可能是私有仓库或已删除
- 网络超时：考虑添加重试机制