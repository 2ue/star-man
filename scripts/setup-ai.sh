#!/bin/bash

# AI 功能初始化脚本
# 用于快速设置和启动 AI 功能

set -e

echo "🤖 Star Manager AI 功能初始化"
echo "================================"
echo ""

# 检查 Ollama 是否安装
check_ollama() {
  if command -v ollama &> /dev/null; then
    echo "✅ Ollama 已安装"
    return 0
  else
    echo "❌ Ollama 未安装"
    echo ""
    echo "请先安装 Ollama:"
    echo "  macOS:   brew install ollama"
    echo "  Linux:   curl -fsSL https://ollama.com/install.sh | sh"
    echo "  Windows: https://ollama.com/download"
    echo ""
    return 1
  fi
}

# 检查 Ollama 服务是否运行
check_ollama_service() {
  if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "✅ Ollama 服务正在运行"
    return 0
  else
    echo "⚠️  Ollama 服务未运行"
    echo ""
    read -p "是否启动 Ollama 服务? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      echo "🚀 启动 Ollama 服务..."
      ollama serve &
      sleep 3
      return 0
    else
      echo "请手动启动 Ollama: ollama serve"
      return 1
    fi
  fi
}

# 下载必要的模型
download_models() {
  echo ""
  echo "📦 检查模型..."

  # 检查 LLM 模型
  if ollama list | grep -q "llama3.2"; then
    echo "✅ llama3.2 已下载"
  else
    echo "⬇️  下载 llama3.2 模型（约 2GB）..."
    ollama pull llama3.2
  fi

  # 检查嵌入模型
  if ollama list | grep -q "nomic-embed-text"; then
    echo "✅ nomic-embed-text 已下载"
  else
    echo "⬇️  下载 nomic-embed-text 模型（约 274MB）..."
    ollama pull nomic-embed-text
  fi
}

# 检查 Qdrant
check_qdrant() {
  echo ""
  echo "🔍 检查 Qdrant..."

  if curl -s http://localhost:6333/collections > /dev/null 2>&1; then
    echo "✅ Qdrant 正在运行"
    return 0
  else
    echo "⚠️  Qdrant 未运行"
    echo ""
    read -p "是否启动 Qdrant (需要 Docker)? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      echo "🚀 启动 Qdrant..."
      docker run -d -p 6333:6333 -p 6334:6334 \
        --name star-man-qdrant \
        -v $(pwd)/data/qdrant:/qdrant/storage \
        qdrant/qdrant:latest
      sleep 3
      echo "✅ Qdrant 已启动"
      return 0
    else
      echo "⚠️  跳过 Qdrant（语义搜索功能将不可用）"
      return 1
    fi
  fi
}

# 更新 .env 配置
update_env() {
  echo ""
  echo "⚙️  更新 .env 配置..."

  if [ ! -f .env ]; then
    echo "❌ .env 文件不存在"
    echo "请先复制 .env.example 到 .env"
    return 1
  fi

  # 启用 AI 功能
  if grep -q "^AI_ENABLED=" .env; then
    sed -i.bak 's/^AI_ENABLED=.*/AI_ENABLED=true/' .env
  else
    echo "AI_ENABLED=true" >> .env
  fi

  # 设置 Ollama 配置
  if ! grep -q "^OLLAMA_BASE_URL=" .env; then
    echo "OLLAMA_BASE_URL=http://localhost:11434" >> .env
  fi

  if ! grep -q "^OLLAMA_MODEL=" .env; then
    echo "OLLAMA_MODEL=llama3.2" >> .env
  fi

  # 设置 Qdrant 配置
  if ! grep -q "^QDRANT_URL=" .env; then
    echo "QDRANT_URL=http://localhost:6333" >> .env
  fi

  echo "✅ .env 配置已更新"
}

# 安装依赖
install_deps() {
  echo ""
  echo "📦 安装依赖..."
  pnpm install
}

# 生成 Prisma Client
generate_prisma() {
  echo ""
  echo "🔧 生成 Prisma Client..."
  pnpm --filter @star-man/core db:generate
}

# 推送数据库变更
push_db() {
  echo ""
  echo "🗄️  推送数据库变更..."
  pnpm --filter @star-man/core db:push
}

# 主流程
main() {
  # 检查 Ollama
  if ! check_ollama; then
    exit 1
  fi

  # 检查 Ollama 服务
  if ! check_ollama_service; then
    exit 1
  fi

  # 下载模型
  download_models

  # 检查 Qdrant（可选）
  check_qdrant || true

  # 更新配置
  update_env

  # 安装依赖
  install_deps

  # 生成 Prisma Client
  generate_prisma

  # 推送数据库变更
  push_db

  echo ""
  echo "================================"
  echo "✅ AI 功能初始化完成！"
  echo ""
  echo "下一步："
  echo "  1. 启动服务: pnpm dev"
  echo "  2. 访问: http://localhost:3800"
  echo "  3. 生成嵌入: curl -X POST http://localhost:3800/api/ai/embed"
  echo ""
  echo "查看文档: docs/AI_FEATURES.md"
  echo "================================"
}

# 运行主流程
main
