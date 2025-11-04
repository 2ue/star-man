# ================================
# Stage 1: 构建阶段
# ================================
FROM node:20 AS builder

# 安装 pnpm
RUN corepack enable && corepack prepare pnpm@7.33.7 --activate

WORKDIR /app

# 复制所有 package.json 文件
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/core/package.json ./packages/core/
COPY packages/api/package.json ./packages/api/
COPY packages/web/package.json ./packages/web/

# 安装所有依赖（包括 devDependencies，用于构建和生成 Prisma Client）
RUN pnpm install --frozen-lockfile

# 复制所有源代码
COPY packages/ ./packages/
COPY tsconfig.json ./

# 生成 Prisma Client（生成到 node_modules/.pnpm 中）
RUN cd packages/core && pnpm db:generate

# 构建所有需要的包
RUN pnpm --filter @star-man/core build
RUN pnpm --filter @star-man/web build
RUN pnpm --filter @star-man/api build

# ================================
# Stage 2: 生产运行镜像
# ================================
FROM node:20

# 安装 pnpm
RUN corepack enable && corepack prepare pnpm@7.33.7 --activate

WORKDIR /app

# 从构建阶段复制整个应用（包括完整的 node_modules）
# 这样可以保留 pnpm 的符号链接结构和生成的 Prisma Client
COPY --from=builder /app ./

# 移除不需要的开发文件（可选，减小镜像大小）
RUN rm -rf packages/*/src packages/*/test packages/*/tests

# 创建数据目录和非 root 用户
RUN mkdir -p /app/data && \
    groupadd -r -g 1001 nodejs && \
    useradd -r -u 1001 -g nodejs starman && \
    chown -R starman:nodejs /app

USER starman

# 设置环境变量
ENV NODE_ENV=production

# 暴露端口
EXPOSE 3801

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3801/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# 启动 API 服务（同时服务静态前端文件）
CMD ["node", "packages/api/dist/server.js"]
