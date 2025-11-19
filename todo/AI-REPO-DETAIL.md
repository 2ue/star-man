# TODO: 仓库详情页 & 单仓库 AI 总结 / 智能标签

> 目标：在 Web 端实现仓库详情页面，并在该页面接入单仓库的 AI 总结、智能分类与标签应用能力。

## 任务拆分

- [x] 后端：提供 AI 单仓库分析接口（`POST /api/ai/classify`），返回 `category/tags/summary`（已完成）
- [x] 后端：提供获取单个仓库详情的接口（`GET /api/repos/:id`），包含 tags/category 等基础信息（已完成）
- [x] Web API：封装 `aiClassifyRepo(repoId)` 与 `fetchRepoById(id)`（部分完成）
- [x] Web 路由：增加仓库详情页路由（如 `/repos/$repoId`）并在侧边或列表中可跳转（已完成）
- [x] Web 页面：实现仓库详情页面，展示基础信息 + tags/category + GitHub 链接（已完成）
- [x] Web 页面：在仓库详情中增加「生成 AI 总结」按钮，调用 `/api/ai/classify` 展示 AI 推荐的 `category/tags/summary`（已完成）
- [x] Web 页面：增加「应用为仓库标签/分类」按钮，将 AI 推荐结果通过 `PUT /api/repos/:id/tags` 与 `PUT /api/repos/:id/category` 写回数据库（已完成）
- [ ] 交互优化：为 AI 调用和保存过程增加更明显的状态提示（loading、成功、失败）
- [ ] 体验优化：在列表页中标记已经应用过 AI 标签/分类的仓库（例如通过小图标或角标）
- [ ] 后续扩展：支持批量对多个仓库进行 AI 标签/分类（可能作为 CLI 或后台任务）

## 备注

- 当前 AI 结果不会自动持久化，只有在用户点击「应用」按钮时才会写回数据库，避免误操作。
- 后端 AI 能力基于 langchainjs + 可配置模型（OpenAI / OpenAI 兼容 / Ollama），通过环境变量控制。

