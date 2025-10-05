export * from './types';
export * from './config';
export * from './database';
export * from './github';
export * from './analyzer';
export * from './star-manager';
export * from './manager-factory';
export * from './config/manager';

// 便捷的工厂函数
export { StarManager } from './star-manager';
export { loadConfig, validateConfig, displayConfig, getProjectRoot, checkWorkingDirectory } from './config';
export { getStarManager, closeStarManager } from './manager-factory';
export { ConfigManager, getUnifiedConfig, initConfig } from './config/manager';
