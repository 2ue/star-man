# 🚀 AI 功能快速开始

## 📦 Phase 1 已完成

✅ AI 服务基础设施已搭建完成！

## 🎯 立即开始使用

### 1️⃣ 安装依赖

```bash
pnpm install
```

### 2️⃣ 配置 Ollama

确保 Ollama 正在运行：

```bash
# 检查 Ollama 是否运行
curl http://localhost:11434/api/tags

# 如果没有运行，启动它
ollama serve

# 下载必要的模型
ollama pull llama3.2          # LLM 模型（约 2GB）
ollama pull nomic-embed-text  # 嵌入模型（约 274MB）
```

### 3️⃣ 配置环境变量

编辑 `.env` 文件，添加：

```env
# 启用 AI 功能
AI_ENABLED=true

# 使用 Ollama
AI_MODEL=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2

# 嵌入配置
EMBEDDING_MODEL=ollama
EMBEDDING_DIMENSION=768
```

### 4️⃣ 初始化数据库

```bash
# 生成 Prisma Client
pnpm --filter @star-man/core db:generate

# 推送数据库变更
pnpm --filter @star-man/core db:push
```

### 5️⃣ （可选）启动 Qdrant

如果需要语义搜索功能：

```bash
docker run -d -p 6333:6333 -p 6334:6334 \
  --name star-man-qdrant \
  -v $(pwd)/data/qdrant:/qdrant/storage \
  qdrant/qdrant:latest
```

然后在 `.env` 中添加：

```env
QDRANT_URL=http://localhost:6333
QDRANT_COLLECTION=starred_repos
```

### 6️⃣ 启动服务

```bash
pnpm dev
```

## 🧪 测试 AI 功能

### 测试 Ollama 连接

```bash
curl http://localhost:11434/api/tags
```

### 测试嵌入生成（需要先启动服务）

```bash
# 生成所有仓库的嵌入
curl -X POST http://localhost:3800/api/ai/embed \
  -H "Content-Type: application/json" \
  -d '{}'
```

### 测试语义搜索

```bash
curl -X POST http://localhost:3800/api/ai/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "前端组件库",
    "mode": "semantic",
    "limit": 5
  }'
```

## 📚 下一步

### Phase 2: API 路由实现

接下来将实现：
- ✅ AI 搜索 API
- ✅ 推荐 API
- ✅ 嵌入任务 API
- ✅ AI 分类 API

### Phase 3: 前端集成

然后实现：
- ✅ AI 搜索组件
- ✅ 推荐卡片组件
- ✅ 相似仓库展示

### Phase 4: AI 助手

最后实现：
- ✅ 对话界面
- ✅ 流式响应
- ✅ 快捷指令

## 🔧 故障排查

### Ollama 无法连接

```bash
# 检查 Ollama 进程
ps aux | grep ollama

# 重启 Ollama
killall ollama
ollama serve
```

### 模型未下载

```bash
# 查看已下载的模型
ollama list

# 下载缺失的模型
ollama pull llama3.2
ollama pull nomic-embed-text
```

### 数据库错误

```bash
# 重新生成 Prisma Client
pnpm --filter @star-man/core db:generate

# 重置数据库（⚠️ 会删除所有数据）
pnpm --filter @star-man/core db:push --force-reset
```

## 📖 完整文档

- [AI 功能详细文档](./AI_FEATURES.md)
- [Phase 1 完成总结](./PHASE1_SUMMARY.md)

## 💡 提示

1. **首次使用**：建议先同步一些仓库，然后生成嵌入
2. **性能优化**：嵌入生成是异步的，可以在后台运行
3. **模型选择**：Ollama 适合本地开发，OpenAI 适合生产环境
4. **Qdrant 可选**：不启用 Qdrant 也能使用 AI 分类和摘要功能

## 🎉 开始探索

现在您可以：
- 🔍 使用自然语言搜索仓库
- 🤖 让 AI 自动分类和打标签
- 💡 获得智能推荐
- 📊 分析技术栈分布

祝您使用愉快！🚀
