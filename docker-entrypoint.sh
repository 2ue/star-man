#!/bin/sh
# Star-Man Docker 启动脚本
# 职责：协调 Express API 和 nginx 的启动

set -e

echo "🚀 Star-Man 启动中..."

# 检查必需的环境变量
if [ -n "$GITHUB_TOKEN" ] && [ -n "$DATABASE_URL" ]; then
  echo "✅ 环境变量已加载"
else
  if [ -z "$GITHUB_TOKEN" ]; then
    echo "❌ 错误: 未设置 GITHUB_TOKEN 环境变量"
    echo "   请使用 docker run --env-file .env 或 -e GITHUB_TOKEN=xxx"
    exit 1
  fi

  if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  警告: 未设置 DATABASE_URL，使用默认值"
    export DATABASE_URL="./packages/data/star-man.db"
  fi
fi

# 确保数据目录存在
mkdir -p /app/packages/data

# 自动执行数据库迁移（确保 schema 与数据库同步）
echo "📦 检查数据库 schema..."
cd /app/packages/core && npx prisma db push --accept-data-loss --skip-generate > /dev/null 2>&1 || {
  echo "⚠️  数据库 schema 更新失败，但将继续启动"
}
cd /app

# 后台启动 Express API
echo "📡 启动 API 服务 (端口 3801)..."
cd /app && node packages/api/dist/server.js &
API_PID=$!

# 等待 API 服务启动
echo "⏳ 等待 API 服务就绪..."
max_attempts=30
attempt=0
while [ $attempt -lt $max_attempts ]; do
  if curl -s http://localhost:3801/health > /dev/null 2>&1; then
    echo "✅ API 服务已就绪"
    break
  fi
  attempt=$((attempt + 1))
  if [ $attempt -eq $max_attempts ]; then
    echo "❌ API 服务启动超时"
    kill $API_PID 2>/dev/null || true
    exit 1
  fi
  sleep 1
done

# 信号处理函数 - 优雅关闭
cleanup() {
  echo ""
  echo "📦 收到停止信号，正在优雅关闭..."

  # 停止 nginx
  echo "   停止 nginx..."
  nginx -s quit 2>/dev/null || true

  # 停止 API 服务
  echo "   停止 API 服务..."
  kill -TERM $API_PID 2>/dev/null || true
  wait $API_PID 2>/dev/null || true

  echo "✅ 所有服务已停止"
  exit 0
}

# 注册信号处理
trap cleanup SIGTERM SIGINT SIGQUIT

# 前台启动 nginx
echo "🌐 启动 nginx (端口 3800)..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ Star-Man 已启动"
echo "   Web 界面:  http://localhost:3800"
echo "   API 服务:  http://localhost:3800/api"
echo "   健康检查:  http://localhost:3800/health"
echo "   API 文档:  http://localhost:3800/api-docs"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# nginx 前台运行（daemon off）
exec nginx -g 'daemon off;'
