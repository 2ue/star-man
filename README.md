# Star Manager

一个现代化的 GitHub Star 管理工具，帮助你高效管理和组织收藏的仓库。支持智能分析、标签管理、增量同步，提供 Web UI、CLI 和 REST API 三种使用方式。

## ✨ 功能特性

- 🌐 **Web 界面**：现代化的 React 应用，直观管理你的 Star 仓库
- 🔄 **增量同步**：智能增量更新，只处理变化的仓库，节省时间和 API 配额
- 🏷️ **智能分析**：自动分析仓库类型、技术栈，生成标签和分类
- 🔍 **强大搜索**：按名称、语言、分类、标签快速筛选
- 📊 **数据统计**：可视化你的技术栈分布和收藏趋势
- 🖥️ **多接口支持**：Web UI / CLI / REST API 三种方式任选
- 💾 **灵活存储**：支持 SQLite（默认）和 MySQL
- 🐳 **开箱即用**：Docker 镜像一键部署，无需配置环境

## 🏗️ 技术架构

### 整体架构

Star Manager 采用**前后端分离**的现代化架构，由三个核心模块组成：

```
┌─────────────────────────────────────────────────────────┐
│                     Star Manager                         │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌───────────┐      ┌───────────┐      ┌───────────┐   │
│  │  Web UI   │      │    CLI    │      │  REST API │   │
│  │  (React)  │      │(Commander)│      │ (Express) │   │
│  └─────┬─────┘      └─────┬─────┘      └─────┬─────┘   │
│        │                  │                    │         │
│        └──────────────────┼────────────────────┘         │
│                           │                              │
│                    ┌──────▼──────┐                       │
│                    │  Core Layer │                       │
│                    │  (Business) │                       │
│                    └──────┬──────┘                       │
│                           │                              │
│                    ┌──────▼──────┐                       │
│                    │   Database  │                       │
│                    │   (Prisma)  │                       │
│                    └─────────────┘                       │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### 技术栈

**前端 (packages/web)**
- React 18 + TypeScript 5
- Vite 5（开发服务器 + 构建工具）
- Tailwind CSS 3 + DaisyUI 4
- TanStack Router + TanStack Query
- Axios（API 请求）

**后端 (packages/api)**
- Express.js（REST API 服务器）
- Swagger UI（API 文档）
- TypeScript 5

**命令行 (packages/cli)**
- Commander.js（CLI 框架）
- TypeScript 5

**核心逻辑 (packages/core)**
- Octokit（GitHub API 客户端）
- Prisma ORM（数据库抽象层）
- SQLite / MySQL（数据存储）

**部署方案**
- Docker（单镜像部署）
- nginx（生产环境反向代理）
- GitHub Actions（CI/CD）

### 运行时架构

**开发环境**（前后端分离）
```
浏览器 (localhost:3800)
    │
    ↓
Vite Dev Server (3800) ─── 代理 ───→ Express API (3801)
    │                                      │
    └────── 热重载 ──────┘                 │
                                           ↓
                                      Database
```

**生产环境**（Docker 单镜像）
```
浏览器 (localhost:3800)
    │
    ↓
nginx (3800) ─── 静态文件
    │
    └─── /api/* ───→ Express API (3801)
                           │
                           ↓
                      Database
```

## 🚀 快速开始

### 方式一：Docker 部署（推荐）

最快的方式，适合生产环境或快速体验。

#### 1. 使用预构建镜像

我们提供两个镜像源，任选其一：

```bash
# 从 Docker Hub 拉取（国内推荐）
docker pull huby11111/star-man:latest

# 或从 GitHub Container Registry 拉取
docker pull ghcr.io/2ue/star-man:latest
```

📦 **镜像仓库**：
- Docker Hub: [huby11111/star-man](https://hub.docker.com/r/huby11111/star-man)
- GHCR: [ghcr.io/2ue/star-man](https://github.com/2ue/star-man/pkgs/container/star-man)

#### 2. 准备环境变量

创建 `.env` 文件：

```env
GITHUB_TOKEN=ghp_your_github_token_here
DATABASE_URL=file:/app/data/star-man.db
API_PORT=3801
API_HOST=0.0.0.0
```

> 💡 **获取 GitHub Token**：
> 1. 访问 [GitHub Settings → Personal Access Tokens](https://github.com/settings/tokens)
> 2. 创建新 token，至少需要 `public_repo` 权限
> 3. 复制 token 到 `.env` 文件

#### 3. 使用 Docker Compose（推荐）

```bash
# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

#### 4. 或使用 Docker 命令

```bash
docker run -d \
  --name star-man \
  -p 3800:3800 \
  --env-file .env \
  -v $(pwd)/data:/app/data \
  huby11111/star-man:latest
```

#### 5. 访问服务

容器启动后（需 10-30 秒初始化），访问：

- 🌐 **Web 界面**：http://localhost:3800
- 📚 **API 文档**：http://localhost:3800/api-docs
- 🏥 **健康检查**：http://localhost:3800/health

---

### 方式二：本地开发

适合开发者进行二次开发或调试。

#### 1. 环境要求

- Node.js >= 18
- pnpm >= 8
- GitHub Personal Access Token

#### 2. 一键初始化

```bash
# 克隆项目
git clone https://github.com/2ue/star-man.git
cd star-man

# 运行初始化脚本
pnpm setup
```

初始化脚本会自动：
- ✅ 安装所有依赖
- ✅ 创建 `.env` 配置文件（需手动填入 GitHub Token）
- ✅ 生成 Prisma Client
- ✅ 初始化数据库

#### 3. 配置 GitHub Token

编辑 `.env` 文件，填入你的 GitHub Token：

```env
GITHUB_TOKEN=ghp_your_github_token_here
DATABASE_URL=./data/star-man.db
API_PORT=3801
API_HOST=localhost
```

#### 4. 启动开发服务器

```bash
pnpm dev
```

这会同时启动：
- 🌐 **Web 界面**：http://localhost:3800
- 🔌 **API 服务**：http://localhost:3801
- 📚 **API 文档**：http://localhost:3801/api-docs

**单独启动**：
```bash
pnpm dev:web    # 只启动前端
pnpm dev:api    # 只启动后端
pnpm dev:cli    # 只启动 CLI 监听模式
```

---

### 方式三：CLI 使用

#### 同步 Star 仓库

```bash
# 增量同步（推荐）
pnpm cli sync

# 完整同步
pnpm cli sync --full
```

#### 查看统计信息

```bash
# 基本统计
pnpm cli stats

# 详细统计（包含分类、语言分布）
pnpm cli stats --detailed
```

#### 列出仓库

```bash
# 列出前 20 个仓库
pnpm cli list

# 搜索仓库
pnpm cli list --search "react"

# 按语言筛选
pnpm cli list --language "TypeScript"

# 按分类筛选
pnpm cli list --category "Frontend"
```

#### 更多命令

```bash
pnpm cli --help
```

## 📖 详细文档

### API 文档

启动服务后访问 Swagger UI：
- 开发环境：http://localhost:3801/api-docs
- 生产环境：http://localhost:3800/api-docs

### 主要 API 端点

**仓库相关**
- `GET /api/repos` - 获取仓库列表（支持分页、筛选、搜索）
- `GET /api/repos/search?q=keyword` - 搜索仓库

**统计相关**
- `GET /api/stats` - 获取统计概览
- `GET /api/stats/categories` - 获取分类统计
- `GET /api/stats/languages` - 获取语言统计

**同步相关**
- `POST /api/sync` - 触发同步
- `GET /api/sync/status` - 获取同步状态

**示例**：
```bash
# 获取仓库列表
curl "http://localhost:3800/api/repos?limit=10"

# 搜索 React 相关仓库
curl "http://localhost:3800/api/repos/search?q=react"

# 触发增量同步
curl -X POST "http://localhost:3800/api/sync" \
  -H "Content-Type: application/json" \
  -d '{"incremental": true}'
```

## 📁 项目结构

```
star-man/
├── packages/
│   ├── web/                     # Web 前端
│   │   ├── src/
│   │   │   ├── components/      # React 组件
│   │   │   ├── routes/          # 路由页面
│   │   │   └── lib/             # 工具函数
│   │   └── vite.config.ts       # Vite 配置
│   │
│   ├── api/                     # REST API 服务
│   │   └── src/
│   │       ├── server.ts        # Express 服务器
│   │       └── routes/          # API 路由
│   │
│   ├── cli/                     # 命令行工具
│   │   └── src/
│   │       ├── bin.ts           # CLI 入口
│   │       └── commands/        # 命令实现
│   │
│   └── core/                    # 核心业务逻辑
│       ├── src/
│       │   ├── star-manager.ts  # 主管理类
│       │   ├── github.ts        # GitHub API 封装
│       │   ├── analyzer.ts      # 仓库智能分析
│       │   └── database.ts      # 数据库操作
│       └── prisma/
│           └── schema.prisma    # 数据库 Schema
│
├── .github/workflows/           # GitHub Actions
├── Dockerfile                   # 生产镜像构建
├── docker-compose.yml           # Docker Compose 配置
├── nginx.conf                   # nginx 配置
└── README.md                    # 本文档
```

## ⚙️ 配置说明

### 环境变量

| 变量 | 必需 | 说明 | 示例 |
|------|------|------|------|
| `GITHUB_TOKEN` | ✅ | GitHub Personal Access Token | `ghp_xxxx` |
| `DATABASE_URL` | ✅ | 数据库连接字符串 | `./data/star-man.db` |
| `API_PORT` | ❌ | API 服务端口 | `3801` |
| `API_HOST` | ❌ | API 监听地址 | `0.0.0.0` |

### 数据库配置

**SQLite（默认，推荐）**
```env
# 相对路径（推荐）
DATABASE_URL=./data/star-man.db

# file: 协议
DATABASE_URL=file:./data/star-man.db
```

**MySQL**
```env
DATABASE_URL=mysql://user:password@localhost:3306/star_man
```

## 🔧 开发指南

### 添加新功能

1. **核心逻辑**：在 `packages/core/src/` 实现
2. **API 接口**：在 `packages/api/src/routes/` 添加路由
3. **CLI 命令**：在 `packages/cli/src/commands/` 添加命令
4. **Web 页面**：在 `packages/web/src/routes/` 添加路由

### 数据库操作

```bash
# 修改 schema 后生成 Prisma Client
pnpm --filter @star-man/core db:generate

# 推送数据库变更（开发环境）
pnpm --filter @star-man/core db:push

# 创建迁移文件（生产环境）
pnpm --filter @star-man/core db:migrate
```

### 构建和测试

```bash
# 构建所有包
pnpm build

# 运行测试
pnpm test

# 代码检查
pnpm lint
```

### 本地构建 Docker 镜像

```bash
# 构建镜像
docker build -t star-man:latest .

# 运行本地镜像
docker-compose -f docker-compose.local.yml up -d
```

## 🔍 故障排查

### Docker 相关

**容器无法启动**
```bash
# 查看日志
docker-compose logs star-man

# 检查健康状态
docker inspect star-man | grep Health
```

**数据库问题**
- 确保 `./data` 目录有写权限
- 检查 `DATABASE_URL` 配置是否正确

### 开发环境

**GitHub API 限制**
- 未认证：60 次/小时
- 已认证：5000 次/小时
- 确保 Token 有 `public_repo` 权限

**端口冲突**
- Web: 3800
- API: 3801
- 修改 `.env` 中的端口配置

**路径问题**
- 相对路径基于项目根目录解析
- 启用调试：`DEBUG=1 pnpm cli sync`

## 🚢 部署方案

### Docker Compose（推荐）

```yaml
services:
  star-man:
    image: huby11111/star-man:latest
    container_name: star-man
    restart: unless-stopped
    ports:
      - "3800:3800"
    environment:
      GITHUB_TOKEN: ${GITHUB_TOKEN}
      DATABASE_URL: file:/app/data/star-man.db
    volumes:
      - ./data:/app/data
```

### 多镜像源

国内用户推荐使用 Docker Hub：
```bash
docker pull huby11111/star-man:latest
```

国外用户或需要最新版本：
```bash
docker pull ghcr.io/2ue/star-man:latest
```

## 📊 核心特性详解

### 增量同步算法

- **首次同步**：获取所有 Star 仓库
- **增量同步**：只处理变化的仓库（新增/取消）
- **数据保留**：取消的 Star 标记为 `isStarred: false`，不删除
- **批量优化**：事务批量插入，减少数据库操作

### 智能分析系统

自动分析每个仓库：
- **编程语言**：基于 GitHub API
- **仓库分类**：Frontend、Backend、Mobile、DevOps、Tools 等
- **自动标签**：根据 name、description、topics 生成
- **流行度评分**：综合 stars、forks、watchers

## 📄 许可证

MIT License - 详见 [LICENSE](./LICENSE) 文件

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

### 贡献步骤

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 📈 更新日志

查看 [Releases](https://github.com/2ue/star-man/releases) 获取完整更新历史。

### v0.0.3 (2025-11-04)
- ✨ 优化 Docker 发布流程
- ✨ 自动创建 GitHub Release
- 🐳 发布到 Docker Hub 和 GHCR

### v0.0.2 (2025-11-04)
- 🐛 修复 Docker 镜像命名问题
- 🔧 修复 ESLint 配置

## 🔗 相关链接

- 📖 [详细文档](./docs/README.md)
- 🐛 [问题反馈](https://github.com/2ue/star-man/issues)
- 🐳 [Docker Hub](https://hub.docker.com/r/huby11111/star-man)
- 📦 [GitHub Packages](https://github.com/2ue/star-man/pkgs/container/star-man)

---

**Made with ❤️ by [2ue](https://github.com/2ue)**
