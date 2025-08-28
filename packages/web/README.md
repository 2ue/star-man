# Star-Man Web

Star-Man 项目的前端应用，用于管理和浏览 GitHub Star 仓库的 Web 界面。

## 项目概述

基于 React + TypeScript + Vite 构建的现代 Web 应用，提供直观的界面来管理你的 GitHub Star 仓库，支持智能分类、标签管理和数据可视化。

## 主要功能

- 📊 **数据仪表板** - 实时显示 GitHub Star 统计信息
- 📋 **仓库列表** - 分页浏览、搜索和过滤 Star 仓库
- 🏷️ **智能标签** - 自动分析和手动管理仓库标签
- 🔄 **同步管理** - 手动/自动同步 GitHub Star 数据
- 🎨 **现代 UI** - 响应式设计，支持深色模式

## 技术栈

- **框架**: React 18 + TypeScript
- **构建工具**: Vite
- **路由**: TanStack Router
- **状态管理**: TanStack Query (React Query)
- **样式**: TailwindCSS + DaisyUI
- **图标**: Lucide React
- **HTTP 客户端**: Axios
- **日期处理**: Day.js

## 项目结构

```
src/
├── components/          # 通用组件
│   └── Pagination.tsx   # 分页组件
├── lib/                 # 工具库
│   └── api.ts          # API 封装
├── pages/              # 页面组件
│   ├── Dashboard.tsx   # 数据仪表板
│   ├── Repos.tsx       # 仓库列表
│   └── Sync.tsx        # 同步管理
├── types/              # 类型定义
│   └── api.ts          # API 相关类型
├── App.tsx             # 应用主组件
├── main.tsx            # 应用入口
└── index.css           # 全局样式
```

## 环境配置

### 环境变量

复制 `.env.example` 为 `.env` 并配置必要的环境变量：

```bash
# 开发服务器配置
VITE_DEV_PORT=5143
VITE_DEV_HOST=true

# API 配置（必需）
VITE_API_PROXY_TARGET=http://[::1]:3801

# 可选配置
VITE_API_URL=                          # 生产环境 API 地址
VITE_API_TIMEOUT=10000                 # API 请求超时时间
VITE_SYNC_TIMEOUT=180000               # 同步操作超时时间
VITE_STATS_REFRESH_INTERVAL=30000      # 统计数据刷新间隔
VITE_ENABLE_API_LOGGING=false          # 启用 API 日志
VITE_ENABLE_PROXY_LOGGING=false        # 启用代理日志
```

### 必需配置项

- `VITE_API_PROXY_TARGET`: 开发环境下的 API 代理目标地址（必须配置）

## 开发指南

### 环境要求

- Node.js 16+
- pnpm（推荐）

### 安装依赖

```bash
pnpm install
```

### 开发服务器

```bash
# 启动开发服务器
pnpm dev

# 指定端口启动
pnpm dev:port 3000
```

### 构建部署

```bash
# 构建生产版本
pnpm build

# 预览构建结果
pnpm preview

# 代码检查
pnpm lint
```

## 开发说明

### API 集成

- 开发环境：通过 Vite 代理转发 `/api` 请求到后端服务
- 生产环境：根据 `VITE_API_URL` 配置决定 API 基础地址

### 主要页面

1. **Dashboard** (`/`) - 显示 Star 仓库的统计信息和图表
2. **Repos** (`/repos`) - 仓库列表页面，支持搜索、过滤、分页
3. **Sync** (`/sync`) - 同步管理页面，查看同步历史和手动触发同步

### 样式系统

- 使用 TailwindCSS 作为基础样式框架
- 集成 DaisyUI 组件库提供预设组件
- 支持深色模式切换
- 响应式设计，适配移动端

### 状态管理

- 使用 TanStack Query 管理服务器状态
- 自动缓存和重新验证数据
- 内置加载状态和错误处理

## 部署说明

### 生产环境配置

1. 设置 `VITE_API_URL` 为生产环境 API 地址
2. 构建项目：`pnpm build`
3. 将 `dist/` 目录部署到 Web 服务器
4. 配置服务器支持 SPA 路由（History API）

### Docker 部署

```dockerfile
FROM nginx:alpine
COPY dist/ /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
```

### Nginx 配置示例

```nginx
server {
    listen 80;
    server_name localhost;
    
    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://api-server:3801;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 故障排查

### 常见问题

1. **API 代理失败**
   - 检查 `VITE_API_PROXY_TARGET` 配置
   - 确认后端服务已启动
   - 查看浏览器网络面板错误信息

2. **构建失败**
   - 清理缓存：`rm -rf node_modules && pnpm install`
   - 检查 TypeScript 类型错误

3. **样式异常**
   - 确认 TailwindCSS 配置正确
   - 检查 PostCSS 配置

### 调试模式

启用详细日志以便调试：

```bash
# 启用 API 请求日志
VITE_ENABLE_API_LOGGING=true pnpm dev

# 启用代理日志
VITE_ENABLE_PROXY_LOGGING=true pnpm dev
```

## 相关项目

- [star-man/core](../core) - 核心业务逻辑
- [star-man/api](../api) - REST API 服务
- [star-man/cli](../cli) - 命令行工具