import { StarManager } from './star-manager';
import { loadConfig, validateConfig } from './config';

let globalStarManager: StarManager | null = null;

export async function getStarManager(): Promise<StarManager> {
  if (!globalStarManager) {
    const config = loadConfig();
    validateConfig(config);
    globalStarManager = new StarManager(config);
    await globalStarManager.initialize();
  }
  return globalStarManager;
}

export async function closeStarManager(): Promise<void> {
  if (globalStarManager) {
    await globalStarManager.close();
    globalStarManager = null;
  }
}

// 优雅关闭处理
process.on('SIGTERM', closeStarManager);
process.on('SIGINT', closeStarManager);