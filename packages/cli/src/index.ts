import { Command } from 'commander';
import { createSyncCommand } from './commands/sync.js';
import { createListCommand } from './commands/list.js';
import { createStatsCommand } from './commands/stats.js';
import { createTagCommand } from './commands/tag.js';
import { createUnstarCommand } from './commands/unstar.js';

export function createCLI(): Command {
  const program = new Command();
  
  program
    .name('star-man')
    .description('GitHub Star 管理工具')
    .version('1.0.0');
  
  // 添加子命令
  program.addCommand(createSyncCommand());
  program.addCommand(createListCommand());
  program.addCommand(createStatsCommand());
  program.addCommand(createTagCommand());
  program.addCommand(createUnstarCommand());
  
  return program;
}

export * from './commands/sync.js';
export * from './commands/list.js';
export * from './commands/stats.js';
export * from './commands/tag.js';
export * from './commands/unstar.js';
