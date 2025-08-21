import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { StarManager, loadConfig, validateConfig, displayConfig } from '@star-man/core';
import { createReposRouter } from './routes/repos';
import { createSyncRouter } from './routes/sync';
import { createUnstarRoutes } from './routes/unstar';
import statsRouter from './routes/stats';

const app = express();

// 中间件
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger 文档
function createSwaggerDocument(host: string, port: number) {
  return {
    openapi: '3.0.0',
    info: {
      title: 'Star-Man API',
      version: '1.0.0',
      description: 'GitHub Star 管理工具 API',
    },
    servers: [
      {
        url: `http://${host}:${port}`,
        description: '开发服务器',
      },
    ],
    paths: {
      '/api/repos': {
        get: {
          summary: '获取 star 仓库列表',
          parameters: [
            {
              name: 'category',
              in: 'query',
              schema: { type: 'string' },
              description: '按分类筛选',
            },
            {
              name: 'language',
              in: 'query',
              schema: { type: 'string' },
              description: '按语言筛选',
            },
            {
              name: 'tags',
              in: 'query',
              schema: { type: 'string' },
              description: '按标签筛选（逗号分隔）',
            },
            {
              name: 'search',
              in: 'query',
              schema: { type: 'string' },
              description: '搜索关键词',
            },
            {
              name: 'limit',
              in: 'query',
              schema: { type: 'integer', minimum: 1, maximum: 100 },
              description: '限制结果数量',
            },
            {
              name: 'offset',
              in: 'query',
              schema: { type: 'integer', minimum: 0 },
              description: '偏移量',
            },
          ],
        },
      },
      '/api/sync': {
        post: {
          summary: '同步 GitHub star 仓库',
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    incremental: {
                      type: 'boolean',
                      description: '是否增量同步',
                      default: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/stats': {
        get: {
          summary: '获取统计信息',
        },
      },
    },
  };
}

async function startServer() {
  try {
    // 加载配置
    const config = loadConfig();
    validateConfig(config);
    
    // 检查 API 配置
    if (!config.api || !config.api.port) {
      console.error('\n❌ API 服务启动失败:');
      console.error('   缺少 API_PORT 环境变量。');
      console.error('   请在 .env 文件中设置 API_PORT，例如: API_PORT=3000');
      console.error('');
      process.exit(1);
    }
    
    // 显示当前配置
    displayConfig(config);
    
    const PORT = config.api.port;
    const HOST = config.api.host; // 可以为 undefined，这时 Express 会使用默认值

    // 初始化 StarManager
    const starManager = new StarManager(config);
    await starManager.initialize();

    // API 路由
    app.use('/api/repos', createReposRouter(starManager));
    app.use('/api/sync', createSyncRouter(starManager));
    app.use('/api/unstar', createUnstarRoutes(starManager));
    app.use('/api/stats', statsRouter);

    // Swagger 文档
    const swaggerDocument = createSwaggerDocument(HOST || 'localhost', PORT);
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

    // 健康检查
    app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      });
    });

    // 根路径
    app.get('/', (req, res) => {
      res.json({
        message: 'Star-Man API',
        version: '1.0.0',
        docs: '/api-docs',
        health: '/health',
      });
    });

    // 404 处理
    app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: 'Not Found',
        message: `路径 ${req.originalUrl} 不存在`,
      });
    });

    // 错误处理
    app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('服务器错误:', err);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : '服务器内部错误',
      });
    });

    // 启动服务器
    if (HOST) {
      app.listen(PORT, HOST, () => {
        console.log(`🚀 Star-Man API 服务器启动成功`);
        console.log(`📍 服务地址: http://${HOST}:${PORT}`);
        console.log(`📚 API 文档: http://${HOST}:${PORT}/api-docs`);
        console.log(`💚 健康检查: http://${HOST}:${PORT}/health`);
      });
    } else {
      app.listen(PORT, () => {
        console.log(`🚀 Star-Man API 服务器启动成功`);
        console.log(`📍 服务地址: http://localhost:${PORT}`);
        console.log(`📚 API 文档: http://localhost:${PORT}/api-docs`);
        console.log(`💚 健康检查: http://localhost:${PORT}/health`);
      });
    }

    // 优雅关闭
    process.on('SIGTERM', async () => {
      console.log('收到 SIGTERM 信号，正在关闭服务器...');
      await starManager.close();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      console.log('收到 SIGINT 信号，正在关闭服务器...');
      await starManager.close();
      process.exit(0);
    });

  } catch (error) {
    console.error('启动服务器失败:', error);
    process.exit(1);
  }
}

startServer();