# Star-Man Docker 部署指南

## 概述

Star-Man 使用单容器 Docker 部署方案，集成了 API 服务和前端 Web 界面。

**架构特点：**
- 单容器运行，简化部署
- Express 同时服务 API 和静态文件
- SQLite 数据库，支持数据持久化
- 环境变量配置，支持灵活部署

## 快速开始

### 1. 获取代码

```bash
git clone https://github.com/your-repo/star-man.git
cd star-man
```

### 2. 配置环境

```bash
# 复制配置模板
cp .env.production.example .env.production

# 编辑配置文件
vim .env.production
```

**必需配置：**
```bash
GITHUB_TOKEN=ghp_your_github_token_here
```

**可选配置：**
```bash
HOST_PORT=3801  # 宿主机端口，默认 3801
```

### 3. 构建并启动

```bash
# 使用 docker-compose（推荐）
docker-compose up -d

# 或直接构建
docker build -t star-man:latest .
docker run -d \
  --name star-man \
  --env-file .env.production \
  -p 3801:3801 \
  -v star-man-data:/app/data \
  star-man:latest
```

### 4. 验证部署

```bash
# 检查容器状态
docker ps

# 检查健康状态
curl http://localhost:3801/api/health

# 访问 Web 界面
open http://localhost:3801
```

## 详细配置

### 环境变量

| 变量名 | 必需 | 默认值 | 说明 |
|--------|------|--------|------|
| `GITHUB_TOKEN` | ✅ | - | GitHub Personal Access Token |
| `NODE_ENV` | ❌ | production | 运行环境 |
| `DATABASE_URL` | ❌ | file:///app/data/star-man.db | 数据库连接 URL |
| `API_PORT` | ❌ | 3801 | API 服务端口（容器内） |
| `API_HOST` | ❌ | 0.0.0.0 | API 监听地址 |
| `HOST_PORT` | ❌ | 3801 | 宿主机映射端口 |

### 端口配置

**修改宿主机端口：**

```bash
# 方式 1：修改 .env.production
echo "HOST_PORT=8080" >> .env.production
docker-compose up -d

# 方式 2：直接指定端口
docker run -p 8080:3801 star-man:latest
```

### 数据库配置

#### SQLite（默认，推荐）

```bash
DATABASE_URL=file:///app/data/star-man.db
```

**数据持久化：**
- 数据文件存储在 `/app/data/` 目录
- 通过 Docker Volume 持久化到宿主机

**数据备份：**
```bash
# 备份数据库
docker cp star-man:/app/data/star-man.db ./backup/star-man.db

# 恢复数据库
docker cp ./backup/star-man.db star-man:/app/data/star-man.db
```

#### MySQL（可选）

```yaml
# docker-compose.yml
services:
  mysql:
    image: mysql:8
    environment:
      MYSQL_ROOT_PASSWORD: your_password
      MYSQL_DATABASE: star_man
    volumes:
      - mysql-data:/var/lib/mysql
    ports:
      - "3306:3306"

  star-man:
    environment:
      DATABASE_URL: mysql://root:your_password@mysql:3306/star_man
    depends_on:
      - mysql
```

## 运维管理

### 查看日志

```bash
# 查看所有日志
docker-compose logs

# 查看特定服务日志
docker-compose logs star-man

# 实时跟踪日志
docker-compose logs -f star-man
```

### 更新部署

```bash
# 拉取最新代码
git pull

# 重新构建镜像
docker-compose build

# 重启服务
docker-compose up -d
```

### 扩展配置

#### 使用自定义数据目录

```yaml
# docker-compose.yml
services:
  star-man:
    volumes:
      - /var/lib/star-man/data:/app/data
```

#### 使用 Bind Mount

```bash
docker run -d \
  --name star-man \
  -v /var/lib/star-man/data:/app/data \
  -p 3801:3801 \
  star-man:latest
```

#### 限制资源使用

```yaml
# docker-compose.yml
services:
  star-man:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

### 健康检查

容器内置健康检查：

```bash
# 检查健康状态
docker inspect --format='{{.State.Health.Status}}' star-man

# 查看健康检查日志
docker inspect --format='{{range .State.Health.Log}}{{.Output}}{{end}}' star-man
```

## 故障排除

### 常见问题

#### 1. 端口被占用

```bash
# 检查端口占用
lsof -i :3801

# 使用其他端口
echo "HOST_PORT=8080" >> .env.production
docker-compose up -d
```

#### 2. GitHub Token 无效

```bash
# 检查 Token 权限
curl -H "Authorization: token YOUR_TOKEN" https://api.github.com/user

# 更新 Token
echo "GITHUB_TOKEN=ghp_new_token" >> .env.production
docker-compose restart star-man
```

#### 3. 数据库连接失败

```bash
# 检查数据目录权限
docker exec star-man ls -la /app/data

# 重新初始化数据库
docker exec star-man rm /app/data/star-man.db
docker-compose restart star-man
```

#### 4. 容器无法启动

```bash
# 查看详细错误信息
docker-compose logs star-man

# 进入容器调试
docker exec -it star-man sh
```

### 性能监控

#### 监控容器资源

```bash
# 查看资源使用情况
docker stats star-man

# 查看磁盘使用
docker exec star-man du -sh /app/data
```

#### 监控应用性能

```bash
# 查看内存使用
docker exec star-man node -e "console.log(JSON.stringify(process.memoryUsage(), null, 2))"

# 查看进程信息
docker exec star-man ps aux
```

## 安全建议

### 1. 使用非 root 用户

Dockerfile 中已配置非 root 用户：
```dockerfile
USER starman
```

### 2. 定期更新

```bash
# 更新基础镜像
docker pull node:20-alpine

# 重新构建
docker-compose build --no-cache
```

### 3. 网络隔离

```yaml
# docker-compose.yml
networks:
  star-man-net:
    driver: bridge

services:
  star-man:
    networks:
      - star-man-net
```

### 4. 限制容器权限

```yaml
services:
  star-man:
    security_opt:
      - no-new-privileges:true
    read_only: true
    tmpfs:
      - /tmp
```

## 生产部署最佳实践

### 1. 使用反向代理

```nginx
# /etc/nginx/sites-available/star-man
server {
    listen 80;
    server_name star-man.example.com;

    location / {
        proxy_pass http://localhost:3801;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 2. HTTPS 配置

```bash
# 使用 Let's Encrypt
sudo certbot --nginx -d star-man.example.com
```

### 3. 日志管理

```yaml
# docker-compose.yml
services:
  star-man:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### 4. 自动重启

```yaml
services:
  star-man:
    restart: unless-stopped
```

## 开发环境

如果要在本地开发环境使用 Docker：

```bash
# 使用开发配置
cp .env.example .env
docker-compose -f docker-compose.dev.yml up
```

## 支持与反馈

- 📖 [GitHub Issues](https://github.com/your-repo/star-man/issues)
- 📖 [项目文档](https://github.com/your-repo/star-man/wiki)
- 💬 [Discussions](https://github.com/your-repo/star-man/discussions)