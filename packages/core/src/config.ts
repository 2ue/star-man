import { config } from 'dotenv';
import { Config } from './types';
import { join, resolve, isAbsolute } from 'path';

// 加载项目根目录的 .env 文件
config({ path: join(process.cwd(), '.env') });

/**
 * 将简洁的路径转换为 Prisma 需要的 file: URL 格式
 */
function convertToFileUrl(path: string): string {
  // 如果已经是 file: URL，直接返回
  if (path.startsWith('file:')) {
    return path;
  }

  // 如果是其他协议（mysql, postgresql 等），直接返回
  if (path.includes('://')) {
    return path;
  }

  // 处理本地文件路径（SQLite）
  let filePath = path;

  // 如果是相对路径，从项目根目录计算
  if (!isAbsolute(filePath)) {
    filePath = resolve(process.cwd(), filePath);
  }

  return `file:${filePath}`;
}

/**
 * 获取必需的环境变量，如果不存在则抛出错误
 */
function getRequiredEnv(key: string, description: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`缺少必需的环境变量: ${key}\n描述: ${description}\n请在 .env 文件中设置此变量`);
  }
  return value;
}

/**
 * 获取环境变量并进行类型转换，如果不存在则返回 undefined
 */
function getEnvWithTransform<T>(key: string, transformer: (value: string) => T): T | undefined {
  const value = process.env[key];
  if (!value) {
    return undefined;
  }

  try {
    return transformer(value);
  } catch (error) {
    throw new Error(`环境变量 ${key} 的值 "${value}" 无法转换: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

export function loadConfig(): Config {
  try {
    // 必需配置
    const githubToken = getRequiredEnv(
      'GITHUB_TOKEN',
      'GitHub Personal Access Token，用于访问 GitHub API。需要至少 public_repo 权限。'
    );

    const databasePath = getRequiredEnv(
      'DATABASE_URL',
      '数据库连接路径。SQLite 示例: ./data/star-man.db 或 /absolute/path/to/db.sqlite'
    );

    // API 配置（如果启动 API 服务则需要）
    const apiPort = getEnvWithTransform('API_PORT', (value) => {
      const port = parseInt(value, 10);
      if (isNaN(port) || port < 1 || port > 65535) {
        throw new Error(`无效的端口号: ${value}。端口号必须在 1-65535 之间`);
      }
      return port;
    });

    const apiHost = process.env.API_HOST; // 可以为空

    // 转换数据库路径为 Prisma 需要的格式
    const databaseUrl = convertToFileUrl(databasePath);

    const config: Config = {
      github: {
        token: githubToken,
      },
      database: {
        url: databaseUrl,
        type: databaseUrl.startsWith('file:') ? 'sqlite' : undefined,
      },
    };

    // 只有提供了 API 配置时才添加
    if (apiPort !== undefined) {
      config.api = {
        port: apiPort,
        host: apiHost, // 可以为 undefined
      };
    }

    return config;
  } catch (error) {
    console.error('\n❌ 配置错误:');
    if (error instanceof Error) {
      console.error(`   ${error.message}`);
    }
    console.error('\n请检查您的 .env 文件配置。参考 .env.example 文件了解所需的配置项。\n');
    process.exit(1);
  }
}

export function validateConfig(config: Config): void {
  const errors: string[] = [];

  // 验证 GitHub token 基本格式（放宽检查）
  if (!config.github.token || config.github.token.length < 10) {
    errors.push('GitHub token 格式不正确或过短。');
  }

  // 验证数据库配置
  if (!config.database.url) {
    errors.push('数据库 URL 不能为空。');
  }

  // 验证 API 配置（如果提供）
  if (config.api) {
    if (config.api.port < 1 || config.api.port > 65535) {
      errors.push(`API 端口号无效: ${config.api.port}。端口号必须在 1-65535 之间。`);
    }
  }

  if (errors.length > 0) {
    console.error('\n❌ 配置验证失败:');
    errors.forEach(error => console.error(`   • ${error}`));
    console.error('\n请修正配置后重试。\n');
    throw new Error('配置验证失败');
  }
}

/**
 * 显示当前配置信息（隐藏敏感信息）
 */
export function displayConfig(config: Config): void {
  console.log('\n📋 当前配置:');
  console.log(`   GitHub Token: ${config.github.token.substring(0, 7)}...`);
  console.log(`   数据库: ${config.database.url}`);
  if (config.api) {
    const host = config.api.host || '(未设置)';
    console.log(`   API 服务: ${host}:${config.api.port}`);
  } else {
    console.log('   API 服务: 未配置');
  }
  console.log('');
}
