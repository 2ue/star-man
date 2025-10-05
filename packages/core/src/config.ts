import { config } from 'dotenv';
import { Config } from './types';
import { join, isAbsolute, dirname } from 'path';
import { existsSync, readFileSync } from 'fs';

/**
 * 查找项目根目录（monorepo 的根目录）
 * 策略：从当前模块位置向上查找，直到找到包含 workspaces 字段的 package.json
 */
function findProjectRoot(): string {
  // 从当前模块文件所在目录开始
  let dir = __dirname;

  while (dir !== '/' && dir !== '.') {
    const pkgPath = join(dir, 'package.json');

    if (existsSync(pkgPath)) {
      try {
        const pkgContent = readFileSync(pkgPath, 'utf-8');
        const pkg = JSON.parse(pkgContent);

        // 如果有 workspaces 字段或 pnpm-workspace.yaml，说明是 monorepo 根目录
        if (pkg.workspaces || existsSync(join(dir, 'pnpm-workspace.yaml'))) {
          return dir;
        }
      } catch (err) {
        // 忽略 JSON 解析错误，继续向上查找
      }
    }

    // 检查 .git 目录（备用策略）
    if (existsSync(join(dir, '.git'))) {
      return dir;
    }

    const parentDir = dirname(dir);
    if (parentDir === dir) break; // 已到达文件系统根目录
    dir = parentDir;
  }

  // 兜底：使用当前工作目录
  return process.cwd();
}

// 全局项目根目录（在模块加载时确定，不会改变）
const PROJECT_ROOT = findProjectRoot();

/**
 * 查找项目根目录的 .env 文件
 * 简化版：直接从项目根目录查找
 */
function findEnvFile(): string | undefined {
  const envPath = join(PROJECT_ROOT, '.env');
  if (existsSync(envPath)) {
    return envPath;
  }

  // 兜底：尝试当前工作目录
  const cwdEnvPath = join(process.cwd(), '.env');
  if (existsSync(cwdEnvPath)) {
    return cwdEnvPath;
  }

  return undefined;
}

// 加载项目根目录的 .env 文件
const envPath = findEnvFile();
if (envPath) {
  config({ path: envPath });
  // 调试信息（开发环境）
  if (process.env.DEBUG) {
    console.log(`📁 项目根目录: ${PROJECT_ROOT}`);
    console.log(`📄 .env 文件: ${envPath}`);
  }
} else {
  console.warn('⚠️  未找到 .env 文件，将使用环境变量');
}

/**
 * 将简洁的路径转换为 Prisma 需要的 file: URL 格式
 * 重要：所有相对路径都基于项目根目录解析，而非 process.cwd()
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

  // ✅ 关键修复：相对路径基于项目根目录，而非 process.cwd()
  if (!isAbsolute(filePath)) {
    filePath = join(PROJECT_ROOT, filePath);
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

/**
 * 导出项目根目录路径，供其他模块使用
 */
export function getProjectRoot(): string {
  return PROJECT_ROOT;
}

/**
 * 检查当前是否从项目根目录运行
 * 用于运行时警告
 */
export function checkWorkingDirectory(): void {
  const cwd = process.cwd();

  // 如果不在项目根目录或其子目录运行，发出警告
  if (!cwd.startsWith(PROJECT_ROOT)) {
    console.warn('\n⚠️  警告: 当前工作目录可能不在项目内');
    console.warn(`   当前目录: ${cwd}`);
    console.warn(`   项目根目录: ${PROJECT_ROOT}`);
    console.warn('   这可能导致路径解析错误\n');
  }

  // 检查是否缺少关键标记文件
  if (!existsSync(join(PROJECT_ROOT, 'pnpm-workspace.yaml')) &&
      !existsSync(join(PROJECT_ROOT, '.git'))) {
    console.warn('\n⚠️  警告: 项目根目录检测可能不准确');
    console.warn(`   检测到的根目录: ${PROJECT_ROOT}`);
    console.warn('   未找到 pnpm-workspace.yaml 或 .git 目录\n');
  }
}
