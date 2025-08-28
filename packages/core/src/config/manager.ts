import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { config as dotenvConfig } from 'dotenv';
import { Config } from '../types';

export interface StarManConfig {
  version: string;
  github: {
    token: string;
  };
  database: {
    url: string;
    type: 'sqlite' | 'mysql' | 'postgresql';
  };
  api: {
    port: number;
    host: string;
  };
  web: {
    port: number;
    host: string;
    apiUrl: string;
  };
  sync: {
    batchSize: number;
    concurrency: number;
    platforms: string[];
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    console: boolean;
  };
}

export class ConfigManager {
  private static instance: ConfigManager;
  private config: StarManConfig | null = null;
  private configDir: string;
  private configFile: string;
  private envFile: string;

  private constructor() {
    this.configDir = this.getConfigDir();
    this.configFile = join(this.configDir, 'config.json');
    this.envFile = join(this.configDir, '.env');
  }

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  private getConfigDir(): string {
    // 环境变量优先级最高（用于Docker等场景）
    if (process.env.STARMAN_CONFIG_DIR) {
      return process.env.STARMAN_CONFIG_DIR;
    }
    
    // 构建时注入的配置目录（最优雅的方式）
    if (process.env.STARMAN_BUILD_CONFIG_DIR) {
      return process.env.STARMAN_BUILD_CONFIG_DIR;
    }
    
    // 默认回退到用户目录
    return join(homedir(), '.starman');
  }

  hasUnifiedConfig(): boolean {
    return existsSync(this.configFile);
  }

  async init(options: {
    githubToken: string;
    apiPort?: number;
    webPort?: number;
    force?: boolean;
  }): Promise<void> {
    if (this.hasUnifiedConfig() && !options.force) {
      throw new Error('配置已存在，使用 --force 强制覆盖');
    }

    // 创建目录
    mkdirSync(this.configDir, { recursive: true });
    mkdirSync(join(this.configDir, 'data'), { recursive: true });
    mkdirSync(join(this.configDir, 'logs'), { recursive: true });

    const apiPort = options.apiPort || 3801;
    const webPort = options.webPort || 5173;

    // 创建配置
    const config: StarManConfig = {
      version: '1.0.0',
      github: {
        token: '', // 从环境变量读取
      },
      database: {
        url: `file://${join(this.configDir, 'data', 'star-man.db')}`,
        type: 'sqlite'
      },
      api: {
        port: apiPort,
        host: 'localhost'
      },
      web: {
        port: webPort,
        host: 'localhost',
        apiUrl: `http://localhost:${apiPort}`
      },
      sync: {
        batchSize: 50,
        concurrency: 2,
        platforms: ['github']
      },
      logging: {
        level: 'info',
        console: true
      }
    };

    writeFileSync(this.configFile, JSON.stringify(config, null, 2));

    // 创建环境变量文件  
    const dbPath = join(this.configDir, 'data', 'star-man.db');
    const envContent = `# Star-Man 配置文件
GITHUB_TOKEN=${options.githubToken}
DATABASE_URL=file://${dbPath}
NODE_ENV=development
`;

    writeFileSync(this.envFile, envContent);
    console.log(`✅ 配置已创建: ${this.configDir}`);
  }

  loadUnifiedConfig(): StarManConfig {
    if (this.config) {
      return this.config;
    }

    if (!this.hasUnifiedConfig()) {
      throw new Error('配置不存在，请先运行: starman init');
    }

    // 加载环境变量（需要覆盖已存在的环境变量）
    dotenvConfig({ path: this.envFile, override: true });

    const config: StarManConfig = JSON.parse(
      readFileSync(this.configFile, 'utf8')
    );

    // 从环境变量覆盖敏感信息
    if (process.env.GITHUB_TOKEN) {
      config.github.token = process.env.GITHUB_TOKEN;
    }
    if (process.env.DATABASE_URL) {
      config.database.url = process.env.DATABASE_URL;
    } else {
      // 确保数据库URL格式正确
      if (!config.database.url.startsWith('file:')) {
        config.database.url = `file:${config.database.url}`;
      }
    }

    this.validateConfig(config);
    this.config = config;
    return config;
  }

  toLegacyConfig(unified: StarManConfig): Config {
    return {
      github: {
        token: unified.github.token,
      },
      database: {
        url: unified.database.url,
        type: unified.database.type as any,
      },
      api: {
        port: unified.api.port,
        host: unified.api.host,
      },
    };
  }

  private validateConfig(config: StarManConfig): void {
    const errors: string[] = [];

    if (!config.github.token) {
      errors.push('GitHub Token 不能为空');
    }
    if (!config.database.url) {
      errors.push('数据库 URL 不能为空');
    }

    if (errors.length > 0) {
      throw new Error(`配置验证失败:\n${errors.join('\n')}`);
    }
  }

  displayConfig(): void {
    const config = this.loadUnifiedConfig();
    
    console.log('\n📋 当前配置:');
    console.log(`   环境: ${config.database.type}`);
    console.log(`   GitHub Token: ${config.github.token.substring(0, 7)}...`);
    console.log(`   数据库: ${config.database.url}`);
    console.log(`   API 服务: http://${config.api.host}:${config.api.port}`);
    console.log(`   Web 服务: http://${config.web.host}:${config.web.port}`);
    console.log(`   配置目录: ${this.configDir}\n`);
  }

  getConfigDirectory(): string {
    return this.configDir;
  }
}

// 导出便捷函数
export function getUnifiedConfig(): StarManConfig | null {
  try {
    return ConfigManager.getInstance().loadUnifiedConfig();
  } catch {
    return null;
  }
}

export function initConfig(options: Parameters<ConfigManager['init']>[0]): Promise<void> {
  return ConfigManager.getInstance().init(options);
}