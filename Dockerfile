# ================================
# Stage 1: 构建阶段 - 构建前端和后端
# ================================
FROM node:20-alpine AS builder

# 安装 pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /build

# 复制依赖文件（必须先复制 package.json 才能利用 Docker 层缓存）
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/core/package.json ./packages/core/
COPY packages/api/package.json ./packages/api/
COPY packages/web/package.json ./packages/web/

# 安装所有依赖（包含 devDependencies，用于构建）
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY packages/ ./packages/
COPY tsconfig.json ./

# 生成 Prisma Client
RUN cd packages/core && pnpm db:generate

# 构建所有包
RUN pnpm build

# ================================
# Stage 2: 生产镜像 - 只包含运行时
# ================================
FROM node:20-alpine

# 安装 pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# 创建应用目录
WORKDIR /app

# 复制依赖文件
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/core/package.json ./packages/core/
COPY packages/api/package.json ./packages/api/

# 只安装生产依赖
RUN pnpm install --prod --frozen-lockfile

# 复制构建产物
COPY --from=builder /build/packages/core/dist ./packages/core/dist
COPY --from=builder /build/packages/core/prisma ./packages/core/prisma
COPY --from=builder /build/packages/api/dist ./packages/api/dist
COPY --from=builder /build/packages/web/dist ./packages/web/dist

# 复制 Prisma Client（生成的代码，在 node_modules 中）
COPY --from=builder /build/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /build/node_modules/@prisma ./node_modules/@prisma

# 创建数据目录
RUN mkdir -p /app/data

# 创建非 root 用户（安全最佳实践）
RUN addgroup -g 1001 -S nodejs
RUN adduser -S starman -u 1001
RUN chown -R starman:nodejs /app
USER starman

# 设置环境变量
ENV NODE_ENV=production

# 暴露端口
EXPOSE 3801

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3801/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# 启动命令
CMD ["node", "packages/api/dist/server.js"]