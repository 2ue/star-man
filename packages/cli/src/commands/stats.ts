import { Command } from 'commander';
import chalk from 'chalk';
import { StarManager, loadConfig } from '@star-man/core';

export function createStatsCommand(): Command {
  const command = new Command('stats');

  command
    .description('显示仓库统计信息')
    .option('-d, --detailed', '显示详细统计信息')
    .action(async (options) => {
      let starManager: StarManager | null = null;

      try {
        const config = loadConfig();
        starManager = new StarManager(config);
        await starManager.initialize();

        console.log(chalk.bold.blue('\n📊 Star 仓库统计\n'));

        const stats = await starManager.getStats();

        console.log('📈 基础统计:');
        console.log('  ' + '─'.repeat(40));
        console.log(`  总仓库数: ${chalk.cyan(stats.totalRepos)}`);
        console.log(`  当前 Star: ${chalk.green(stats.currentlyStarred)}`);
        console.log(`  已取消 Star: ${chalk.red(stats.unstarred)}`);

        if (stats.lastSyncAt) {
          const lastSync = new Date(stats.lastSyncAt);
          console.log(`  最后同步: ${chalk.gray(lastSync.toLocaleString())}`);
        }

        if (options.detailed) {
          // 获取分类统计
          const categoryStats = await starManager.getCategoryStats();
          if (categoryStats.length > 0) {
            console.log('\n📊 分类统计:');
            console.log('  ' + '─'.repeat(40));

            categoryStats.forEach((cat) => {
              const bar = '█'.repeat(Math.ceil(cat.count / 5));
              console.log(`  ${cat.category.padEnd(15)} ${chalk.blue(bar)} ${cat.count}`);
            });
          }

          // 获取语言统计
          const languageStats = await starManager.getLanguageStats();
          if (languageStats.length > 0) {
            console.log('\n🔤 语言统计 (Top 10):');
            console.log('  ' + '─'.repeat(40));

            languageStats.slice(0, 10).forEach((lang) => {
              const bar = '█'.repeat(Math.ceil(lang.count / 5));
              console.log(`  ${lang.language.padEnd(15)} ${chalk.green(bar)} ${lang.count}`);
            });
          }

          // 获取同步历史
          const syncHistory = await starManager.getSyncHistory(5);
          if (syncHistory.length > 0) {
            console.log('\n📅 最近同步记录:');
            console.log('  ' + '─'.repeat(40));

            syncHistory.forEach((sync) => {
              const status = sync.success ? chalk.green('✓') : chalk.red('✗');
              const date = new Date(sync.syncAt).toLocaleString();
              console.log(`  ${status} ${date} - 新增: ${sync.added}, 更新: ${sync.updated}`);
            });
          }
        }

        console.log();
      } catch (error) {
        console.error(chalk.red('获取统计信息失败:'), error instanceof Error ? error.message : error);
        process.exit(1);
      } finally {
        if (starManager) {
          await starManager.close();
        }
      }
    });

  return command;
}
