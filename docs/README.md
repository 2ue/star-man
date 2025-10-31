# Star-Man Docker 部署

## 🚀 快速部署

Star-Man 提供了完整的 Docker 部署方案，支持一键部署。

### 前置要求

- Docker 20.0+
- Docker Compose 2.0+

### 部署步骤

```bash
# 1. 克隆项目
git clone https://github.com/your-repo/star-man.git
cd star-man

# 2. 配置环境
cp .env.production.example .env.production
# 编辑 .env.production，填入你的 GITHUB_TOKEN

# 3. 启动服务
docker-compose up -d

# 4. 访问应用
open http://localhost:3801
```

## 📁 文件说明

| 文件 | 说明 |
|------|------|
| `Dockerfile` | 多阶段构建，生产环境优化 |
| `docker-compose.yml` | 容器编排配置 |
| `.env.production.example` | 生产环境配置模板 |
| `.dockerignore` | Docker 构建忽略文件 |
| `docs/docker-deployment.md` | 详细部署文档 |

## ⚙️ 配置说明

### 必需配置

```bash
GITHUB_TOKEN=ghp_your_github_token_here
```

### 可选配置

```bash
HOST_PORT=3801        # 宿主机端口
NODE_ENV=production   # 运行环境
DATABASE_URL=file:///app/data/star-man.db  # 数据库配置
```

## 🐳 使用方式

### 基本使用

```bash
# 启动服务
docker-compose up -d

# 查看状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

### 高级配置

- �� [详细部署文档](./docker-deployment.md)
- 🔄 [更新与维护](./docker-deployment.md#更新部署)
- 🛠️ [故障排除](./docker-deployment.md#故障排除)

## 📊 架构图

```
┌─────────────────────────────────────┐
│   Docker Container (star-man)       │
│   Port: 3801                        │
│                                      │
│   ┌──────────────────────┐          │
│   │  Express Server      │          │
│   │  ├─ /api/*  → API    │          │
│   │  └─ /*      → Web    │          │
│   └──────────────────────┘          │
│                                      │
│   ┌──────────────────────┐          │
│   │  SQLite Database     │◄─────────┼─ Volume: star-man-data
│   │  /app/data/*.db      │          │
│   └──────────────────────┘          │
└─────────────────────────────────────┘
```

## 🔧 开发环境

本地开发请参考 [项目根目录 README](../README.md)

## 📞 支持

- 📖 [完整文档](../README.md)
- 🐛 [报告问题](https://github.com/your-repo/star-man/issues)
- 💬 [讨论](https://github.com/your-repo/star-man/discussions)