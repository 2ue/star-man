import { Command } from 'commander';
import { createInitCommand } from './commands/init.js';
import { createSyncCommand } from './commands/sync.js';
import { createListCommand } from './commands/list.js';
import { createStatsCommand } from './commands/stats.js';
import { createTagCommand } from './commands/tag.js';
import { createUnstarCommand } from './commands/unstar.js';
import { getStarManager } from '@star-man/core';

export function createCLI(): Command {
  const program = new Command();

  program
    .name('star-man')
    .description('GitHub Star 管理工具')
    .version('1.0.0');

  // 添加子命令
  program.addCommand(createInitCommand());
  program.addCommand(createSyncCommand());
  program.addCommand(createListCommand());
  program.addCommand(createStatsCommand());
  program.addCommand(createTagCommand());
  program.addCommand(createUnstarCommand());

  // 添加 config 命令（延迟加载 StarManager）
  const configCommand = new Command('config')
    .description('管理应用配置');

  configCommand
    .command('get <key>')
    .description('获取配置项')
    .action(async (key: string) => {
      const { handleConfigGet } = await import('./commands/config.js');
      const starManager = await getStarManager();
      await starManager.initialize();
      await handleConfigGet(starManager, key);
    });

  configCommand
    .command('set <key> <value>')
    .description('设置配置项')
    .action(async (key: string, value: string) => {
      const { handleConfigSet } = await import('./commands/config.js');
      const starManager = await getStarManager();
      await starManager.initialize();
      await handleConfigSet(starManager, key, value);
    });

  program.addCommand(configCommand);

  return program;
}

export * from './commands/init.js';
export * from './commands/sync.js';
export * from './commands/list.js';
export * from './commands/stats.js';
export * from './commands/tag.js';
export * from './commands/unstar.js';
export * from './commands/config.js';
