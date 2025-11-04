# ================================
# Stage 1: 构建阶段
# ================================
FROM node:20-alpine AS builder

# 安装 pnpm 和 OpenSSL（确保 Prisma 生成时能正确检测）
RUN apk add --no-cache openssl openssl-dev && \
    corepack enable && corepack prepare pnpm@7.33.7 --activate

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
# Stage 2: 生产运行镜像（nginx + Node.js）
# ================================
FROM node:20-alpine

# 安装 nginx、curl 和 OpenSSL 开发包
# openssl-dev: 提供 OpenSSL 版本检测所需的头文件和库
RUN apk add --no-cache nginx curl openssl openssl-dev

# 安装 pnpm（corepack 已内置在 Node.js 中）
RUN corepack enable && corepack prepare pnpm@7.33.7 --activate

# 复制 nginx 配置
COPY nginx.conf /etc/nginx/nginx.conf

# 复制前端静态文件到 nginx 默认目录
COPY --from=builder /app/packages/web/dist /usr/share/nginx/html

# 设置后端应用工作目录
WORKDIR /app

# 第一步：复制 package.json 和 lockfile
COPY --from=builder /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml ./
COPY --from=builder /app/packages/core/package.json ./packages/core/
COPY --from=builder /app/packages/api/package.json ./packages/api/

# 第二步：只安装生产依赖（不包括 devDependencies）
# 这样可以减小镜像大小并且避免 pnpm 符号链接问题
RUN pnpm install --prod --frozen-lockfile

# 第三步：复制构建产物
COPY --from=builder /app/packages/core/dist ./packages/core/dist
COPY --from=builder /app/packages/core/prisma ./packages/core/prisma
COPY --from=builder /app/packages/api/dist ./packages/api/dist

# 第四步：重新生成 Prisma Client（针对生产环境的 Node 版本）
# 这一步很重要，因为 Prisma Client 包含原生模块，必须与运行时环境匹配
RUN cd packages/core && pnpm db:generate

# 创建数据目录
RUN mkdir -p /app/packages/data

# 复制启动脚本
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# 设置环境变量
ENV NODE_ENV=production \
    API_PORT=3801 \
    API_HOST=0.0.0.0

# 暴露端口（nginx 3800，API 3801）
EXPOSE 3800 3801

# 健康检查（通过 nginx）
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3800/health || exit 1

# 使用自定义启动脚本
ENTRYPOINT ["/docker-entrypoint.sh"]
