#!/bin/bash

# Star-Man 项目初始化脚本
# 用于首次运行或重置开发环境

set -e  # 遇到错误立即退出

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 打印标题
echo ""
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   🚀 Star-Man 项目初始化向导          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# 1. 检查 pnpm
print_info "检查 pnpm..."
if ! command -v pnpm &> /dev/null; then
    print_error "未安装 pnpm"
    echo "请运行: npm install -g pnpm"
    exit 1
fi
print_success "pnpm 已安装 ($(pnpm --version))"

# 2. 检查 .env 文件
print_info "检查环境配置..."
if [ ! -f ".env" ]; then
    print_warning ".env 文件不存在，从模板创建..."
    cp .env.example .env
    print_success "已创建 .env 文件"
    echo ""
    print_warning "请编辑 .env 文件，设置以下变量："
    echo "  - GITHUB_TOKEN: 你的 GitHub Personal Access Token"
    echo "  - DATABASE_URL: 数据库路径（默认已配置）"
    echo ""
    read -p "按回车键继续（确认已配置 GITHUB_TOKEN）..."
else
    print_success ".env 文件已存在"
fi

# 检查 GITHUB_TOKEN
if ! grep -q "GITHUB_TOKEN=ghp_" .env 2>/dev/null; then
    print_warning "GITHUB_TOKEN 未配置或格式不正确"
    echo "请确保 .env 中设置了有效的 GitHub Token"
fi

# 3. 安装依赖
print_info "安装项目依赖..."
pnpm install
print_success "依赖安装完成"

# 4. 生成 Prisma Client
print_info "生成 Prisma Client..."
# 从项目根目录运行，使用本地 Prisma，通过 --schema 指定位置
pnpm exec prisma generate --schema=./packages/core/prisma/schema.prisma
print_success "Prisma Client 生成完成"

# 5. 初始化数据库
print_info "初始化数据库..."

# 检查数据库文件是否存在
DB_PATH="./packages/data/test.db"
if [ -f "$DB_PATH" ]; then
    print_warning "数据库文件已存在"
    read -p "是否重新初始化数据库？这将清空所有数据 (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -f "$DB_PATH"
        print_info "已删除旧数据库"
    else
        print_info "跳过数据库初始化"
    fi
fi

# 创建数据库目录
mkdir -p packages/data

# 执行数据库推送
if [ ! -f "$DB_PATH" ]; then
    # 从项目根目录运行，使用本地 Prisma
    pnpm exec prisma db push --schema=./packages/core/prisma/schema.prisma
    print_success "数据库初始化完成"
else
    print_info "使用现有数据库"
fi

# 6. 完成
echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✨ 初始化完成！                     ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
print_info "下一步操作："
echo "  1. 启动开发服务器："
echo -e "     ${BLUE}pnpm dev${NC}"
echo ""
echo "  2. 访问 Web 界面："
echo -e "     ${BLUE}http://localhost:5143${NC}"
echo ""
echo "  3. 查看 API 文档："
echo -e "     ${BLUE}http://localhost:3801/api-docs${NC}"
echo ""
print_info "其他命令："
echo "  - 同步 GitHub Stars:  pnpm cli sync"
echo "  - 查看统计信息:       pnpm cli stats"
echo "  - 列出仓库:           pnpm cli list"
echo ""
