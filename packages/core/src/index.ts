export * from './types';
export * from './config';
export * from './database';
export * from './github';
export * from './analyzer';
export * from './star-manager';
export * from './manager-factory';

// 便捷的工厂函数
export { StarManager } from './star-manager';
export { loadConfig, validateConfig, displayConfig } from './config';
export { getStarManager, closeStarManager } from './manager-factory';
