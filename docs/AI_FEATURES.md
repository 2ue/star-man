# AI 功能使用指南

## 📖 概述

Star Manager 现已集成 AI 能力，提供智能搜索、推荐和对话功能，帮助您更高效地管理 GitHub Star 仓库。

## ✨ 功能特性

### 1. 语义搜索
- 🔍 **自然语言搜索**：使用自然语言描述查找仓库，如 "前端组件库"、"状态管理工具"
- 🎯 **相似度排序**：根据语义相似度智能排序结果
- 🔀 **混合搜索**：结合关键词和语义搜索，获得最佳结果

### 2. 智能推荐
- 🤝 **相似仓库推荐**：基于向量相似度推荐功能相近的仓库
- 🔥 **热门推荐**：推荐高 Star 数的热门项目
- 📅 **活跃推荐**：推荐最近更新的活跃项目
- 🎨 **个性化推荐**：基于浏览历史的个性化推荐

### 3. AI 分析
- 🏷️ **智能分类**：使用 LLM 理解仓库内容，自动生成准确的分类
- 🔖 **标签生成**：自动生成语义化的标签
- 📝 **摘要生成**：为仓库生成简洁的中文摘要

### 4. AI 助手（规划中）
- 💬 **对话式查询**：通过聊天方式查询和管理仓库
- 🤖 **智能操作**：批量整理、分类等智能操作

## 🚀 快速开始

### 前置要求

1. **Ollama**（推荐）
   ```bash
   # macOS
   brew install ollama
   
   # 启动 Ollama 服务
   ollama serve
   
   # 下载模型
   ollama pull llama3.2
   ollama pull nomic-embed-text
   ```

2. **Qdrant**（可选，用于向量搜索）
   ```bash
   # 使用 Docker 运行
   docker run -d -p 6333:6333 -p 6334:6334 \
     -v $(pwd)/data/qdrant:/qdrant/storage \
     qdrant/qdrant:latest
   ```

### 配置

在 `.env` 文件中添加 AI 配置：

```env
# 启用 AI 功能
AI_ENABLED=true

# 使用 Ollama（本地）
AI_MODEL=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2

# Qdrant 配置
QDRANT_URL=http://localhost:6333
QDRANT_COLLECTION=starred_repos

# 嵌入模型配置
EMBEDDING_MODEL=ollama
EMBEDDING_DIMENSION=768
```

### 初始化

1. **安装依赖**
   ```bash
   pnpm install
   ```

2. **生成 Prisma Client**
   ```bash
   pnpm --filter @star-man/core db:generate
   ```

3. **推送数据库变更**
   ```bash
   pnpm --filter @star-man/core db:push
   ```

4. **启动服务**
   ```bash
   pnpm dev
   ```

## 📚 API 使用

### 1. 语义搜索

```bash
POST /api/ai/search
Content-Type: application/json

{
  "query": "前端组件库",
  "mode": "semantic",
  "limit": 10
}
```

响应：
```json
{
  "results": [
    {
      "repo": { /* 仓库信息 */ },
      "similarity": 0.95,
      "reasoning": "与查询 \"前端组件库\" 的相似度为 95.0%"
    }
  ],
  "total": 10
}
```

### 2. 相似仓库推荐

```bash
GET /api/ai/recommend/:repoId?limit=5
```

响应：
```json
{
  "recommendations": [
    {
      "repo": { /* 仓库信息 */ },
      "similarity": 0.92,
      "reasons": [
        "与当前仓库功能相似",
        "相似度: 92.0%"
      ]
    }
  ]
}
```

### 3. 批量生成嵌入

```bash
POST /api/ai/embed
Content-Type: application/json

{
  "repoIds": [1, 2, 3],  // 可选，不传则处理所有未嵌入的仓库
  "force": false         // 是否强制重新生成
}
```

响应：
```json
{
  "taskId": 1,
  "status": "queued"
}
```

### 4. 查询嵌入任务状态

```bash
GET /api/ai/embed/:taskId
```

响应：
```json
{
  "status": "processing",
  "progress": {
    "current": 50,
    "total": 100
  }
}
```

### 5. AI 分类

```bash
POST /api/ai/categorize/:repoId
```

响应：
```json
{
  "category": "Frontend",
  "tags": ["react", "ui-components", "typescript"],
  "confidence": 0.95,
  "reasoning": "这是一个 React UI 组件库，提供了丰富的可复用组件"
}
```

## 🎨 前端集成

### 使用 AI 搜索组件

```tsx
import { AISearch } from '@/components/AISearch';

function MyPage() {
  return (
    <div>
      <AISearch 
        onSearch={(results) => {
          console.log('搜索结果:', results);
        }}
      />
    </div>
  );
}
```

### 使用推荐组件

```tsx
import { RecommendationCard } from '@/components/RecommendationCard';

function RepoDetail({ repoId }) {
  return (
    <div>
      <h2>相似仓库推荐</h2>
      <RecommendationCard repoId={repoId} limit={5} />
    </div>
  );
}
```

## 🔧 高级配置

### 使用 OpenAI

```env
AI_MODEL=openai
OPENAI_API_KEY=sk-xxx
OPENAI_MODEL=gpt-4o-mini
```

### 使用 Gemini

```env
AI_MODEL=gemini
GEMINI_API_KEY=xxx
GEMINI_MODEL=gemini-1.5-flash
```

### 混合搜索

```bash
POST /api/ai/search
Content-Type: application/json

{
  "query": "react component",
  "mode": "hybrid",  // 结合关键词和语义
  "limit": 10,
  "filters": {
    "language": "TypeScript",
    "category": "Frontend"
  }
}
```

## 📊 性能优化

### 1. 批量嵌入

首次使用时，建议批量生成所有仓库的嵌入向量：

```bash
curl -X POST http://localhost:3800/api/ai/embed \
  -H "Content-Type: application/json" \
  -d '{}'
```

### 2. 缓存策略

- 嵌入向量会缓存在数据库中
- 只有新增或更新的仓库需要重新生成嵌入
- 建议定期（如每周）重新生成嵌入以保持准确性

### 3. 资源占用

- **Ollama**：需要 4-8GB 内存（取决于模型）
- **Qdrant**：需要 1-2GB 内存
- **嵌入生成**：约 100 个仓库/分钟（取决于硬件）

## 🐛 故障排查

### Ollama 连接失败

```bash
# 检查 Ollama 是否运行
curl http://localhost:11434/api/tags

# 重启 Ollama
ollama serve
```

### Qdrant 连接失败

```bash
# 检查 Qdrant 是否运行
curl http://localhost:6333/collections

# 重启 Qdrant
docker restart star-man-qdrant
```

### 嵌入生成失败

1. 检查模型是否已下载：
   ```bash
   ollama list
   ```

2. 下载嵌入模型：
   ```bash
   ollama pull nomic-embed-text
   ```

3. 检查日志：
   ```bash
   docker logs star-man
   ```

## 📈 最佳实践

### 1. 模型选择

- **开发/个人使用**：Ollama（免费、本地、隐私）
- **生产环境**：OpenAI/Gemini（速度快、效果好）
- **国内用户**：Qwen（访问快、中文好）

### 2. 嵌入策略

- 首次使用：批量生成所有仓库的嵌入
- 日常使用：增量生成新增仓库的嵌入
- 定期维护：每月重新生成一次所有嵌入

### 3. 搜索模式

- **精确查找**：使用关键词搜索
- **模糊查找**：使用语义搜索
- **最佳效果**：使用混合搜索

## 🔮 未来计划

- [ ] AI 对话助手
- [ ] 知识图谱可视化
- [ ] 趋势分析
- [ ] 智能报告生成
- [ ] 多用户协同过滤推荐

## 📞 支持

如有问题，请：
1. 查看 [GitHub Issues](https://github.com/2ue/star-man/issues)
2. 提交新的 Issue
3. 加入讨论组

---

**Made with ❤️ by Star Manager Team**
