#!/bin/bash

echo "🚀 Star-Man 项目设置脚本"

# 检查 Node.js 版本
if ! command -v node &> /dev/null; then
    echo "❌ 未找到 Node.js，请先安装 Node.js >= 18"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 版本过低，需要 >= 18，当前版本: $(node -v)"
    exit 1
fi

# 检查 pnpm
if ! command -v pnpm &> /dev/null; then
    echo "📦 安装 pnpm..."
    npm install -g pnpm
fi

# 安装依赖
echo "📦 安装项目依赖..."
pnpm install

# 构建项目
echo "🔨 构建项目..."
pnpm build

# 检查环境变量文件
if [ ! -f ".env" ]; then
    echo "⚙️  创建环境变量文件..."
    cp .env.example .env
    echo "📝 请编辑 .env 文件，设置你的 GITHUB_TOKEN"
    echo "   获取 token: https://github.com/settings/tokens"
fi

echo "✅ 设置完成！"
echo ""
echo "📖 使用方法:"
echo "   1. 编辑 .env 文件，设置 GITHUB_TOKEN"
echo "   2. 运行 CLI: pnpm cli sync"
echo "   3. 启动 API: pnpm api"
echo ""
echo "📚 更多信息请查看 README.md"