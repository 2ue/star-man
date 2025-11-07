export * from './types';
export * from './config';
export * from './database';
export * from './github';
export * from './analyzer';
export * from './star-manager';
export * from './manager-factory';
export * from './config/manager';

// AI 服务导出
export * from './services/ai.service';
export * from './services/embedding.service';
export * from './services/llm.service';
export * from './services/recommendation.service';

// 便捷的工厂函数
export { StarManager } from './star-manager';
export { loadConfig, validateConfig, displayConfig, getProjectRoot, checkWorkingDirectory } from './config';
export { getStarManager, closeStarManager } from './manager-factory';
export { ConfigManager, getUnifiedConfig, initConfig } from './config/manager';
export { AIService } from './services/ai.service';
