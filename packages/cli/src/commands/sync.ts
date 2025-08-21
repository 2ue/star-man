import { Command } from 'commander';
import chalk from 'chalk';
import { getStarManager, closeStarManager } from '@star-man/core';

export function createSyncCommand(): Command {
  const command = new Command('sync');

  command
    .description('同步 GitHub star 仓库')
    .option('-f, --full', '执行全量同步（默认为增量同步）')
    .action(async (options) => {
      try {
        const starManager = await getStarManager();

        console.log(chalk.blue('开始同步 GitHub star 仓库...'));

        let lastProgress = '';
        const result = await starManager.syncStarredRepos(!options.full, (progress) => {
          const progressText = `[${progress.current}/${progress.total}] ${progress.action}`;
          const isFinal = progress.current === progress.total && progress.action === '同步完成！';
          if (progressText !== lastProgress) {
            // 清除上一行并打印新的进度
            if (lastProgress) {
              process.stdout.write('\r\x1b[K');
            }
            if (!isFinal) {
              process.stdout.write(chalk.cyan(progressText));
              lastProgress = progressText;
            }
          }
        });

        console.log(chalk.green('\n✅ 同步完成！'));
        console.log(`新增仓库: ${chalk.yellow(result.added)}`);
        console.log(`更新仓库: ${chalk.yellow(result.updated)}`);
        console.log(`标记为取消 star: ${chalk.yellow(result.unstarred)}`);
        console.log(`当前 Star 数（已标记为 Star）: ${chalk.yellow(result.total)}`);
        console.log(`数据库记录总数（含已取消 Star）: ${chalk.yellow(result.dbTotal)}`);

      } catch (error) {
        console.error(chalk.red('同步失败:'), error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  return command;
}
