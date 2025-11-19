# Star-Man AI 语义搜索与智能总结架构设计

> 目标：在 **不改变数据库结构** 的前提下，为 Star-Man 增加基于 langchainjs 的 AI 能力  
> 能力包括：从已 Star 仓库 / 全网仓库进行语义搜索、结果整理与可靠性标注、对单个仓库进行智能分类和总结

---

## 1. 功能目标与边界

1. **语义搜索（核心能力）**
   - 支持用自然语言问题搜索：
     - 仅在「已 Star 仓库」中搜索（个人知识库）
     - 在 GitHub 全网搜索，再标记哪些已经 Star
     - 未来可以支持混合模式（both）
   - 搜索结果由 AI 进行：
     - 相关性排序（score 0–1）
     - 可靠性评估：`high | medium | low`
     - 生成「推荐理由」说明

2. **智能分类与总结（轻量实现）**
   - 对单个仓库生成：
     - `category`：简短的主题分类（例如："LLM 应用"、"前端工程化"）
     - `tags`：3–8 个主题标签
     - `summary`：1–2 句自然语言总结（优先中文）
   - **不写入数据库**，仅作为 API/CLI 返回结果，后续如有需要再考虑持久化。

3. **模型与基础设施要求**
   - 使用 **langchainjs** 作为统一调用层。
   - 支持：
     - OpenAI 官方/兼容 API（包括 DeepSeek 等 OpenAI-compatible 服务）
     - 本地 **Ollama** 模型（如 llama3.x 系列）。
   - 通过环境变量配置，不侵入现有配置结构。

---

## 2. 配置与环境变量设计（已实现）

### 2.1 AI 配置结构（核心库内部）

在 `packages/core/src/ai/config.ts` 中定义：

```ts
export type AIProvider = 'openai' | 'openai-compatible' | 'ollama';

export interface AIConfig {
  provider: AIProvider;
  model: string;
  openaiApiKey?: string;
  openaiBaseUrl?: string;
  ollamaBaseUrl?: string;
}

export function loadAIConfigFromEnv(): AIConfig | null;
```

- 若 `AI_PROVIDER` 未设置或配置不完整，则 `loadAIConfigFromEnv()` 返回 `null`，表示 AI 功能关闭。
- 上层调用（API/CLI）根据返回值决定：要么使用 AI，要么回退到纯规则/排序结果。

### 2.2 环境变量约定

统一在项目根目录 `.env` 中管理：

- `AI_PROVIDER`：`openai` | `openai-compatible` | `ollama`
- `AI_MODEL`：模型名称（如 `gpt-4o-mini`、`gpt-4.1-mini`、`llama3.1:8b`）
- `OPENAI_API_KEY`：当 provider 为 `openai` / `openai-compatible` 时必填
- `OPENAI_BASE_URL`：可选，自定义 OpenAI 兼容服务地址
- `OLLAMA_BASE_URL`：可选，默认 `http://localhost:11434`

行为说明：

- 如果 `AI_PROVIDER` 或 `AI_MODEL` 未设置，或在 `openai/openai-compatible` 模式下缺少 `OPENAI_API_KEY`：
  - `loadAIConfigFromEnv()` 返回 `null`
  - AI 搜索会自动退回到“按 Star 数 + 活跃时间排序”的简单模式，并在 reason 中说明。
- 只要环境变量配置正确，API 和 Web 就会自动启用 AI 功能，无需额外开关。

GitHub 相关仍沿用已有的：

- `GITHUB_TOKEN`
- `DATABASE_URL`
- `API_PORT` 等

更多示例可以参考 `.env.example` 中的 AI 配置注释。

---

## 3. LangChain 模型工厂设计

在 `packages/core/src/ai/llm-factory.ts` 中实现统一工厂：

```ts
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { AIConfig } from './config';

export async function createChatModel(config: AIConfig): Promise<BaseChatModel>;
```

实现要点：

- **OpenAI / 兼容：**
  - 动态导入：`const { ChatOpenAI } = await import('@langchain/openai');`
  - 使用配置：
    - `apiKey: config.openaiApiKey`
    - `model: config.model`
    - `baseURL: config.openaiBaseUrl`（存在时）

- **Ollama：**
  - 动态导入：`const { ChatOllama } = await import('@langchain/ollama');`
  - 使用配置：
    - `model: config.model`
    - `baseUrl: config.ollamaBaseUrl`

- 使用动态 `import()`，避免在 CommonJS 输出中引入静态 ESM 依赖。
- 若配置错误或模型初始化失败，抛出带有友好错误信息的异常。

---

## 4. 语义搜索服务设计（核心逻辑）

在 `packages/core/src/ai/repo-search-service.ts` 中实现 `AIRepoSearchService`：

### 4.1 数据结构

```ts
export type AISearchScope = 'starred' | 'github' | 'both';

export interface AISearchOptions {
  query: string;
  scope?: AISearchScope; // 默认 'starred'
  limit?: number;        // 默认 20
}

export interface AISearchResultItem {
  fullName: string;
  name: string;
  description?: string;
  language?: string;
  stars: number;
  forks: number;
  htmlUrl: string;
  source: 'starred' | 'github';
  isStarred: boolean;
  reliability: 'high' | 'medium' | 'low';
  score: number;   // 0-1 相关性评分
  reason: string;  // 推荐理由 / 简要总结
}
```

内部使用轻量候选结构（不直接暴露 DB 实体），只保留 AI 排序需要的字段。

### 4.2 服务构造与依赖

```ts
export class AIRepoSearchService {
  constructor(
    private readonly starManager: StarManager,
    private readonly githubToken?: string
  ) {}

  async search(options: AISearchOptions): Promise<{ results: AISearchResultItem[] }>;
}
```

- `starManager`：用于访问本地数据库已有的 `getStarredRepos` 等能力。
- `githubToken`：可选，用于创建内部 `GitHubService` 实例做全网搜索。

### 4.3 候选集生成

1. **Starred 仓库候选（scope 包含 `starred`）：**
   - 使用现有的：
     - `starManager.getStarredRepos({ search: query, nameSearch: query, limit: X })`
   - 提取：
     - `fullName / name / description / language / stargazersCount / forksCount / htmlUrl / pushedAt`
   - 标记：
     - `source: 'starred'`
     - `isStarred: true`

2. **GitHub 全网候选（scope 包含 `github`）：**
   - 在 `GitHubService` 中新增：
     - `searchRepos(query: string, perPage?: number)` → 使用 `octokit.rest.search.repos`
   - 从 Search API 返回结果中提取同样字段。
   - 使用 StarManager 新增方法：
     - `getStarredStatusByFullNames(fullNames: string[]): Promise<Record<string, boolean>>`
   - 为每个候选打上 `isStarred` 标记。

3. **合并与截断：**
   - 合并来自不同 source 的候选，去重（按 `fullName`）。
   - 限制总候选数（例如最多 30 个）以控制上下文长度。

### 4.4 使用 LLM 进行语义排序与打分

1. 从 `loadAIConfigFromEnv()` 读取配置，若 `null`：
   - 直接按 stars / pushedAt 等简单规则排序并返回（无 AI）。

2. 若配置存在：
   - `const model = await createChatModel(config);`
   - 构造 Prompt（纯文本形式，便于在 CJS 环境中调用）：

     - 说明角色与任务：根据用户问题和仓库列表进行相关性排序。
     - 提供 JSON 序列化后的候选数组。
     - 要求输出严格的 JSON，结构类似：

       ```json
       {
         "results": [
           {
             "fullName": "owner/repo",
             "score": 0.92,
             "reliability": "high",
             "reason": "..."
           }
         ]
       }
       ```

   - 调用：

     ```ts
     const response = await model.invoke(promptString);
     // 从 response.content 中提取字符串并 JSON.parse
     ```

   - 若 JSON 解析失败：
     - 尝试提取第一个 `{`/`[` 到最后一个 `}`/`]` 的子串再次解析；
     - 若仍失败，退回到简单排序逻辑。

3. 将 AI 返回的结果与候选映射合并，形成 `AISearchResultItem[]`：
   - 若 AI 没有覆盖的仓库，可按较低 score 附加在末尾。

---

## 5. 智能分类与总结服务设计

在 `packages/core/src/ai/repo-analyzer-ai.ts` 中新增 `AIRepoAnalyzerService`（仅运行时分析，不持久化）：

### 5.1 接口设计

```ts
export interface AIRepoAnalysisResult {
  category: string;
  tags: string[];
  summary: string;
}

export class AIRepoAnalyzerService {
  constructor(private readonly starManager: StarManager) {}

  async analyzeRepoById(repoId: number): Promise<AIRepoAnalysisResult>;
}
```

### 5.2 实现要点

1. 通过 `starManager` 新增方法获取单仓库详情：

   ```ts
   async getRepoById(id: number): Promise<any | null>;
   ```

   - 返回值中解析 `topics` / `tags` JSON。

2. 构造 Prompt：
   - 输入：
     - 仓库基本信息：`fullName / name / description / language / topics / stars / forks / createdAt / pushedAt / category / tags`
   - 任务：
     - 生成：
       - `category`：简短高层主题（可中英文）
       - `tags`：3–8 个关键词标签
       - `summary`：1–2 句简洁中文总结
   - 输出要求：
     - 只输出 JSON：

     ```json
     {
       "category": "LLM 应用",
       "tags": ["chatbot", "langchain", "openai"],
       "summary": "..."
     }
     ```

3. 同样通过 `loadAIConfigFromEnv()` + `createChatModel()` 调用模型；若未配置 AI，则返回错误或提示。

---

## 6. API 层集成设计

在 `packages/api/src/routes/ai.ts` 中新增 AI 路由：

### 6.1 路由接口

1. `POST /api/ai/search`

   - Request Body：

     ```json
     {
       "query": "想学 Rust 系统编程",
       "scope": "starred | github | both",
       "limit": 20
     }
     ```

   - Response Body：

     ```json
     {
       "success": true,
       "data": {
         "results": [ /* AISearchResultItem[] */ ]
       }
     }
     ```

2. `POST /api/ai/classify`

   - Request Body：

     ```json
     { "repoId": 123456 }
     ```

   - Response Body：

     ```json
     {
       "success": true,
       "data": {
         "category": "...",
         "tags": ["...", "..."],
         "summary": "..."
       }
     }
     ```

### 6.2 server.ts 中的集成

在 `startServer()` 中：

```ts
const config = loadConfig();
validateConfig(config);
const starManager = new StarManager(config);
await starManager.initialize();

// 新增 AI 服务路由
app.use('/api/ai', createAIRouter(starManager, config.github.token));
```

`createAIRouter` 内部负责创建 `AIRepoSearchService` 与 `AIRepoAnalyzerService` 实例。

---

## 7. CLI/Web 后续扩展方向（非本次实现范围）

1. **CLI：**
   - 新增命令：
     - `star-man ai search` → 调用 `/api/ai/search` 或直接使用 `AIRepoSearchService`。
     - `star-man ai classify` → 对指定 repo 或最近 Star 仓库做一次性总结输出。

2. **Web：**
   - 新增「AI 搜索」页面：
     - 左侧：输入问题 + 选择 scope + 过滤条件。
     - 右侧：展示 `AISearchResultItem` 列表（标记已 Star、显示可靠性与推荐理由）。
   - 仓库详情面板中展示「AI 摘要」区域，通过 `/api/ai/classify` 实时获取。

---

## 8. 实现状态小结

截至当前版本，AI 相关能力的实现状态如下：

1. `@star-man/core` 已实现：
   - `ai/config.ts`：AIConfig + 环境变量解析。
   - `ai/llm-factory.ts`：统一 ChatOpenAI / ChatOllama 工厂。
   - `ai/repo-search-service.ts`：语义搜索服务（starred/github/both）。
   - `ai/repo-analyzer-ai.ts`：单仓库智能分类与总结服务。
   - `star-manager.ts` / `github.ts`：扩展搜索能力与辅助查询（`searchRepos`、`getRepoById`、`getStarredStatusByFullNames`）。

2. `@star-man/api` 已实现：
   - `routes/ai.ts`：
     - `POST /api/ai/search`：语义搜索入口。
     - `POST /api/ai/classify`：单仓库 AI 分析入口（不自动持久化）。
   - `routes/repos.ts`：
     - `GET /api/repos/:id`：单仓库详情（供 Web 详情页和 AI 分析使用）。

3. `@star-man/web` 已实现：
   - 页面：
     - `/ai`：AI 语义搜索页面（AI 搜索 + 结果展示）。
     - `/repos/$repoId`：仓库详情页面（基础信息 + 当前标签/分类 + AI 总结与一键应用）。
   - API 封装：
     - `aiSearch` / `aiClassifyRepo` / `fetchRepoById` 等方法。

4. 仍在 TODO 中（见 `todo/AI-REPO-DETAIL.md`）：
   - 批量 AI 标签/分类（针对多仓库的自动化处理）。
   - CLI 层 AI 集成（例如 `star-man ai search` / `star-man ai classify` 命令）。
   - 一些前端交互/可视化优化（AI 状态提示、已应用 AI 标签的标记等）。

数据库结构依旧保持不变，AI 结果只在你点击“应用”为标签/分类时写回，未做自动持久化或批量改写。
