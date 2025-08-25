# Star Manager

一个基于 Octokit 的 GitHub Star 管理工具，支持获取、分析、标记和管理用户的 star 仓库。

## ✨ 功能特性

- 🔄 **增量同步**：获取用户所有 star 仓库并支持增量更新
- 🏷️ **智能分析**：自动分析仓库信息并打标签分类
- 🔗 **GitHub 集成**：支持设置 GitHub 仓库的 topics
- 🖥️ **多接口支持**：提供 CLI 和 REST API 两种使用方式
- 💾 **数据库支持**：使用 Prisma ORM，支持 SQLite 和 MySQL
- 🔧 **模块化设计**：core + cli + api 三层架构，易于扩展

## 🛠️ 技术栈

- **语言**：TypeScript
- **包管理**：pnpm (单仓形式)
- **GitHub API**：@octokit/rest
- **数据库**：Prisma ORM (SQLite/MySQL)
- **CLI 框架**：commander.js
- **API 框架**：Express.js

## 🚀 快速开始

### 1. 环境要求

- Node.js >= 18
- pnpm >= 8
- GitHub Personal Access Token

### 2. 安装依赖

```bash
pnpm install
```

### 3. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
# GitHub Personal Access Token（必需）
GITHUB_TOKEN=your_github_token_here

# 数据库路径（必需）
DATABASE_URL=./data/star-man.db

# API 配置（可选，仅启动 API 时需要）
API_PORT=3000
API_HOST=localhost
```

> 💡 **获取 GitHub Token**：访问 [GitHub Settings > Personal Access Tokens](https://github.com/settings/tokens)，创建新 token，至少需要 `public_repo` 权限。

### 4. 初始化数据库

```bash
cd packages/core && pnpm run db:push
```

### 5. 构建项目

```bash
pnpm build
```

## 📖 使用指南

### CLI 命令行使用

#### 基本命令

```bash
# 查看帮助
pnpm cli --help

# 同步 GitHub star 仓库（增量）
pnpm cli sync

# 完整同步所有仓库
pnpm cli sync --full

# 查看统计信息
pnpm cli stats

# 查看详细统计（包含分类、语言统计）
pnpm cli stats --detailed
```

#### 仓库管理

```bash
# 列出仓库（默认显示20个）
pnpm cli list

# 限制显示数量
pnpm cli list --limit 10

# 搜索仓库
pnpm cli list --search "react"

# 按语言筛选
pnpm cli list --language "TypeScript"

# 按分类筛选
pnpm cli list --category "Frontend"
```

#### 标签管理

```bash
# 查看所有标签统计
pnpm cli tag list-all

# 为仓库添加标签（使用仓库ID）
pnpm cli tag 123456 --add "frontend,react"

# 设置仓库标签（覆盖现有标签）
pnpm cli tag 123456 --set "vue,frontend,spa"

# 移除仓库标签
pnpm cli tag 123456 --remove "old-tag"

# 查看仓库当前标签
pnpm cli tag 123456 --list
```

#### 取消 Star

```bash
# 通过仓库ID取消star
pnpm cli unstar --ids "123456,789012"

# 通过仓库全名取消star
pnpm cli unstar --names "facebook/react,vuejs/vue"
```

### API 服务使用

#### 启动服务

```bash
# 启动 API 服务
pnpm api

# 开发模式启动（自动重启）
pnpm dev:api
```

服务启动后可访问：
- **API 服务**：http://localhost:3000
- **API 文档**：http://localhost:3000/api-docs
- **健康检查**：http://localhost:3000/health

#### API 端点

**仓库相关**
- `GET /api/repos` - 获取仓库列表
  - 参数：`limit`, `offset`, `category`, `language`, `search`, `tags`
- `GET /api/repos/search?q=keyword` - 搜索仓库

**统计相关**
- `GET /api/stats` - 获取统计概览
- `GET /api/stats/categories` - 获取分类统计
- `GET /api/stats/languages` - 获取语言统计

**同步相关**
- `POST /api/sync` - 触发同步
  - 请求体：`{ "incremental": true }`
- `GET /api/sync/status` - 获取同步状态

**取消 Star**
- `DELETE /api/repos/:id/unstar` - 取消指定仓库的 star

#### API 使用示例

```bash
# 获取仓库列表
curl "http://localhost:3000/api/repos?limit=5"

# 搜索 React 相关仓库
curl "http://localhost:3000/api/repos/search?q=react"

# 获取统计信息
curl "http://localhost:3000/api/stats"

# 触发同步
curl -X POST "http://localhost:3000/api/sync" \
  -H "Content-Type: application/json" \
  -d '{"incremental": true}'
```

## 📁 项目结构

```
star-man/
├── packages/
│   ├── core/                    # 核心逻辑包
│   │   ├── src/
│   │   │   ├── star-manager.ts  # 主要管理类
│   │   │   ├── github.ts        # GitHub API 封装
│   │   │   ├── analyzer.ts      # 仓库智能分析
│   │   │   ├── database.ts      # 数据库操作
│   │   │   ├── config.ts        # 配置管理
│   │   │   └── types.ts         # 类型定义
│   │   └── prisma/
│   │       └── schema.prisma    # 数据库模式定义
│   ├── cli/                     # 命令行工具包
│   │   └── src/
│   │       ├── bin.ts           # CLI 程序入口
│   │       └── commands/        # 各种命令实现
│   │           ├── sync.ts      # 同步命令
│   │           ├── list.ts      # 列表命令
│   │           ├── stats.ts     # 统计命令
│   │           ├── tag.ts       # 标签管理命令
│   │           └── unstar.ts    # 取消star命令
│   └── api/                     # REST API 包
│       └── src/
│           ├── server.ts        # Express 服务器
│           └── routes/          # API 路由
│               ├── repos.ts     # 仓库相关路由
│               ├── stats.ts     # 统计相关路由
│               ├── sync.ts      # 同步相关路由
│               └── unstar.ts    # 取消star路由
├── data/                        # 数据存储目录
│   └── test.db                 # SQLite 数据库文件
├── scripts/
│   └── setup.sh                # 项目设置脚本
├── .env.example                # 环境变量模板
├── CLAUDE.md                   # Claude Code 工作指南
└── README.md                   # 项目文档
```

## 🔧 核心功能详解

### 1. 增量同步算法

- **首次同步**：获取用户所有 star 仓库
- **增量同步**：只处理新增和取消的 star，跳过不变的仓库
- **数据保持**：被取消的 star 不会删除，只标记为 `isStarred: false`
- **批量处理**：使用事务批量插入，提升性能

### 2. 智能分析系统

自动分析仓库并生成：
- **主要编程语言**：基于 GitHub API 数据
- **仓库分类**：根据名称、描述、topics 智能分类
  - Frontend, Backend, Mobile, DevOps, Tools 等
- **自动标签**：基于技术栈和用途生成相关标签
- **流行度评分**：综合 stars、forks、watchers 数量

### 3. 标签管理系统

- **本地标签**：支持为仓库添加自定义标签
- **批量操作**：支持批量添加、删除、设置标签
- **标签统计**：提供标签使用频率统计
- **搜索筛选**：支持按标签搜索和筛选仓库

## ⚙️ 配置选项

| 环境变量 | 类型 | 描述 | 示例 |
|---------|------|------|------|
| `GITHUB_TOKEN` | 必需 | GitHub Personal Access Token | `ghp_xxxxxxxxxxxx` |
| `DATABASE_URL` | 必需 | 数据库连接路径 | `./data/star-man.db` |
| `API_PORT` | 可选 | API 服务端口 | `3000` |
| `API_HOST` | 可选 | API 服务主机 | `localhost` |

### 数据库配置说明

**SQLite（推荐，默认）：**
```env
DATABASE_URL=./data/star-man.db
```

**MySQL：**
```env
DATABASE_URL=mysql://user:password@localhost:3306/star_man
```

**PostgreSQL：**
```env
DATABASE_URL=postgresql://user:password@localhost:5432/star_man
```

## 🔍 故障排除

### 常见问题

**1. GitHub API 限制**
- 确保 token 有正确权限（至少 `public_repo`）
- 注意 API 调用频率限制（认证用户每小时 5000 次）

**2. 数据库连接问题**
- 检查 `DATABASE_URL` 配置是否正确
- 确保数据库文件目录有写权限

**3. 构建失败**
- 确保 Node.js 版本 >= 18
- 运行 `pnpm install` 重新安装依赖

**4. CLI 命令找不到**
- 确保已运行 `pnpm build`
- 从项目根目录执行命令

### 调试模式

启用调试日志：
```bash
DEBUG=star-manager:* pnpm cli sync
```

## 🛣️ 开发指南

### 添加新功能

1. **核心逻辑**：在 `packages/core/src/` 中实现
2. **CLI 命令**：在 `packages/cli/src/commands/` 中添加
3. **API 端点**：在 `packages/api/src/routes/` 中添加
4. **类型定义**：在 `packages/core/src/types.ts` 中维护

### 数据库操作

```bash
cd packages/core

# 生成 Prisma 客户端
pnpm run db:generate

# 推送数据库变更（开发环境）
pnpm run db:push

# 创建迁移文件（生产环境）
pnpm run db:migrate
```

### 运行测试

```bash
# 运行所有测试
pnpm test

# 运行代码检查
pnpm lint
```

## 📊 性能优化

### 大量仓库处理

如果你有大量 star 仓库（>1000个）：

1. **使用增量同步**：`pnpm cli sync`（默认）
2. **考虑使用 MySQL**：替代 SQLite 获得更好性能
3. **定期清理**：删除不需要的历史数据

### 数据库优化

数据库已预设索引：
- `ownerLogin` - 按用户筛选
- `language` - 按语言筛选  
- `category` - 按分类筛选
- `isStarred` - 区分活跃和已取消的 star
- `syncAt` - 同步时间排序

## 📄 许可证

MIT License - 详见 LICENSE 文件

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

### 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 📈 更新日志

### v1.0.0 (2025-08-18)
- 🎉 初始版本发布
- ✅ 支持 GitHub star 仓库同步
- ✅ 提供 CLI 和 API 接口
- ✅ 智能仓库分析和标签管理
- ✅ 统一配置管理系统
- ✅ 支持简洁路径配置

## Web 前端（Vite + React + Tailwind v3）

- 位置：`packages/web`
- 启动：

```bash
# 确保 API 服务在 3801 端口启动
pnpm dev:api   # 后端 API（默认端口 3801）
pnpm dev:web   # 前端 Web（默认端口 5173，已配置 /api 代理到 3801）
```

- 环境配置：
  - 开发环境：前端使用 Vite 代理到 `http://localhost:3801`，无需额外配置
  - 生产环境：设置 `VITE_API_URL` 环境变量指向生产 API 地址
  - 代理配置：`/api/*`、`/api-docs`、`/health` 自动代理到后端

- 技术栈：Vite 5 + React 18 + TypeScript 5 + Tailwind CSS 3 + DaisyUI 4 + Lucide Icons + TanStack Query/Router + Axios。
- 布局特性：精致紧凑、侧边导航 + 顶栏、卡片化内容、表单与排版使用 Tailwind 官方插件与 DaisyUI。