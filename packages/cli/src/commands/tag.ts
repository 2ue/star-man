import { Command } from 'commander';
import chalk from 'chalk';
import { StarManager, loadConfig } from '@star-man/core';

export function createTagCommand(): Command {
  const command = new Command('tag');
  
  command
    .description('管理仓库标签')
    .argument('<repo-id>', '仓库 ID')
    .option('-a, --add <tags>', '添加标签 (逗号分隔)')
    .option('-r, --remove <tags>', '移除标签 (逗号分隔)')
    .option('-s, --set <tags>', '设置标签 (逗号分隔，会覆盖现有标签)')
    .option('-l, --list', '列出仓库当前标签')
    .action(async (repoId, options) => {
      try {
        const config = loadConfig();
        const starManager = new StarManager(config);
        await starManager.initialize();

        const repo = await starManager.getStarredRepos({ 
          limit: 1, 
          offset: 0 
        });
        
        // 这里简化处理，实际应该根据 repoId 查找具体仓库
        const targetRepo = repo.repos.find(r => r.id.toString() === repoId);
        if (!targetRepo) {
          console.error(chalk.red(`未找到 ID 为 ${repoId} 的仓库`));
          process.exit(1);
        }

        if (options.list) {
          console.log(chalk.bold.blue(`\n📋 仓库 ${targetRepo.fullName} 的标签:\n`));
          const tags = targetRepo.tags || [];
          if (tags.length > 0) {
            tags.forEach((tag: string) => {
              console.log(`  ${chalk.yellow('#' + tag)}`);
            });
          } else {
            console.log(chalk.gray('  暂无标签'));
          }
          console.log();
        } else if (options.add) {
          const newTags = options.add.split(',').map((t: string) => t.trim());
          const currentTags = targetRepo.tags || [];
          const updatedTags = [...new Set([...currentTags, ...newTags])];
          
          await starManager.updateRepoTags(targetRepo.id, updatedTags);
          console.log(chalk.green(`✓ 已为仓库 ${targetRepo.fullName} 添加标签: ${newTags.join(', ')}`));
        } else if (options.remove) {
          const tagsToRemove = options.remove.split(',').map((t: string) => t.trim());
          const currentTags = targetRepo.tags || [];
          const updatedTags = currentTags.filter((tag: string) => !tagsToRemove.includes(tag));
          
          await starManager.updateRepoTags(targetRepo.id, updatedTags);
          console.log(chalk.green(`✓ 已从仓库 ${targetRepo.fullName} 移除标签: ${tagsToRemove.join(', ')}`));
        } else if (options.set) {
          const newTags = options.set.split(',').map((t: string) => t.trim());
          
          await starManager.updateRepoTags(targetRepo.id, newTags);
          console.log(chalk.green(`✓ 已为仓库 ${targetRepo.fullName} 设置标签: ${newTags.join(', ')}`));
        } else {
          console.log(chalk.yellow('请指定操作选项 (--add, --remove, --set, 或 --list)'));
        }

        await starManager.close();
      } catch (error) {
        console.error(chalk.red('标签操作失败:'), error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  // 添加子命令来列出所有标签
  command
    .command('list-all')
    .description('列出所有可用标签')
    .action(async () => {
      try {
        const config = loadConfig();
        const starManager = new StarManager(config);
        await starManager.initialize();

        // 获取所有仓库并统计标签
        const result = await starManager.getStarredRepos({ limit: 1000 });
        const tagCount: Record<string, number> = {};
        
        result.repos.forEach(repo => {
          if (repo.tags) {
            repo.tags.forEach((tag: string) => {
              tagCount[tag] = (tagCount[tag] || 0) + 1;
            });
          }
        });

        console.log(chalk.bold.blue('\n🏷️  所有标签统计:\n'));
        
        const sortedTags = Object.entries(tagCount)
          .sort(([, a], [, b]) => b - a);
          
        if (sortedTags.length > 0) {
          sortedTags.forEach(([tag, count]) => {
            console.log(`  ${chalk.yellow('#' + tag)} ${chalk.gray('(' + count + ')')}`);
          });
        } else {
          console.log(chalk.gray('  暂无标签'));
        }
        
        console.log();
        await starManager.close();
      } catch (error) {
        console.error(chalk.red('获取标签列表失败:'), error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  return command;
}