import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table';
import { StarManager, loadConfig } from '@star-man/core';

export function createListCommand(): Command {
  const command = new Command('list');

  command
    .description('列出 star 仓库')
    .option('-c, --category <category>', '按分类筛选')
    .option('-l, --language <language>', '按语言筛选')
    .option('-t, --tags <tags>', '按标签筛选（逗号分隔）')
    .option('-s, --search <query>', '搜索仓库')
    .option('--limit <number>', '限制结果数量', '20')
    .option('--offset <number>', '偏移量', '0')
    .action(async (options) => {
      let starManager: StarManager | null = null;

      try {
        const config = loadConfig();
        starManager = new StarManager(config);
        await starManager.initialize();

        const { repos, total } = await starManager.getStarredRepos({
          category: options.category,
          language: options.language,
          tags: options.tags ? options.tags.split(',').map((t: string) => t.trim()) : undefined,
          search: options.search,
          limit: parseInt(options.limit),
          offset: parseInt(options.offset),
          includeUnstarred: false
        });

        if (repos.length === 0) {
          console.log(chalk.yellow('未找到匹配的仓库'));
          return;
        }

        const table = new Table({
          head: ['仓库', '描述', '语言', '分类', '标签', 'Stars']
        });

        repos.forEach(repo => {
          table.push([
            chalk.blue(repo.fullName),
            repo.description ? repo.description.substring(0, 47) + '...' : '',
            repo.language || '',
            repo.category || '',
            Array.isArray(repo.tags) ? repo.tags.join(',') : '',
            repo.stargazersCount?.toString() || '0'
          ]);
        });

        console.log(table.toString());
        console.log(chalk.gray(`显示 ${repos.length} 个仓库，共 ${total} 个`));

      } catch (error) {
        console.error(chalk.red('错误:'), error instanceof Error ? error.message : error);
        process.exit(1);
      } finally {
        if (starManager) {
          await starManager.close();
        }
      }
    });

  return command;
}
