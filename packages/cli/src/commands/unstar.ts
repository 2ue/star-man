import { Command } from 'commander';
import chalk from 'chalk';
import { StarManager, loadConfig } from '@star-man/core';
import * as readline from 'readline';

export function createUnstarCommand(): Command {
  const command = new Command('unstar');

  command
    .description('取消 star 仓库')
    .option('-i, --ids <ids>', '仓库 ID 列表，用逗号分隔')
    .option('-n, --names <names>', '仓库全名列表，用逗号分隔 (格式: owner/repo)')
    .option('-b, --batch', '批量模式，从标准输入读取仓库列表')
    .action(async (options) => {
      try {
        const config = loadConfig();
        const starManager = new StarManager(config);
        await starManager.initialize();

        if (options.batch) {
          // 批量模式：从标准输入读取
          console.log(chalk.blue('批量取消 star 模式，请输入仓库 ID 或全名，每行一个，输入完成后按 Ctrl+D:'));

          const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
          });

          const inputs: string[] = [];
          rl.on('line', (line: string) => {
            const trimmed = line.trim();
            if (trimmed) {
              inputs.push(trimmed);
            }
          });

          rl.on('close', async () => {
            if (inputs.length === 0) {
              console.log(chalk.yellow('没有输入任何仓库'));
              await starManager.close();
              return;
            }

            await processBatchUnstar(starManager, inputs);
            await starManager.close();
          });

        } else if (options.ids) {
          // 通过 ID 取消 star
          const ids = options.ids.split(',').map((id: string) => parseInt(id.trim())).filter((id: number) => !isNaN(id));
          if (ids.length === 0) {
            console.error(chalk.red('无效的仓库 ID'));
            process.exit(1);
          }

          console.log(chalk.blue(`开始取消 ${ids.length} 个仓库的 star...`));
          const result = await starManager.unstarRepos(ids);

          console.log(chalk.green(`✅ 成功取消 ${result.success} 个仓库的 star`));
          if (result.failed.length > 0) {
            console.log(chalk.red(`❌ 失败 ${result.failed.length} 个:`));
            result.failed.forEach(({ id, error }) => {
              console.log(chalk.red(`  - ID ${id}: ${error}`));
            });
          }

        } else if (options.names) {
          // 通过全名取消 star
          const names = options.names.split(',').map((name: string) => name.trim()).filter((name: string) => name.includes('/'));
          if (names.length === 0) {
            console.error(chalk.red('无效的仓库全名，格式应为 owner/repo'));
            process.exit(1);
          }

          console.log(chalk.blue(`开始取消 ${names.length} 个仓库的 star...`));
          let success = 0;
          const failed: Array<{ name: string; error: string }> = [];

          for (const name of names) {
            try {
              await starManager.unstarRepoByFullName(name);
              success++;
              console.log(chalk.gray(`  ✓ ${name}`));
            } catch (error) {
              failed.push({
                name,
                error: error instanceof Error ? error.message : 'Unknown error'
              });
              console.log(chalk.red(`  ✗ ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`));
            }
          }

          console.log(chalk.green(`✅ 成功取消 ${success} 个仓库的 star`));
          if (failed.length > 0) {
            console.log(chalk.red(`❌ 失败 ${failed.length} 个`));
          }

        } else {
          console.error(chalk.red('请指定要取消 star 的仓库：'));
          console.log('  使用 --ids 指定仓库 ID');
          console.log('  使用 --names 指定仓库全名');
          console.log('  使用 --batch 进入批量模式');
          process.exit(1);
        }

        await starManager.close();
      } catch (error) {
        console.error(chalk.red('取消 star 失败:'), error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  return command;
}

async function processBatchUnstar(starManager: StarManager, inputs: string[]) {
  const ids: number[] = [];
  const names: string[] = [];

  // 分类输入：数字为 ID，包含 / 的为全名
  for (const input of inputs) {
    if (/^\d+$/.test(input)) {
      ids.push(parseInt(input));
    } else if (input.includes('/')) {
      names.push(input);
    } else {
      console.log(chalk.yellow(`跳过无效输入: ${input}`));
    }
  }

  let totalSuccess = 0;
  let totalFailed = 0;

  // 处理 ID 列表
  if (ids.length > 0) {
    console.log(chalk.blue(`\n通过 ID 取消 ${ids.length} 个仓库的 star...`));
    const result = await starManager.unstarRepos(ids);
    totalSuccess += result.success;
    totalFailed += result.failed.length;

    if (result.failed.length > 0) {
      result.failed.forEach(({ id, error }) => {
        console.log(chalk.red(`  ✗ ID ${id}: ${error}`));
      });
    }
  }

  // 处理全名列表
  if (names.length > 0) {
    console.log(chalk.blue(`\n通过全名取消 ${names.length} 个仓库的 star...`));
    for (const name of names) {
      try {
        await starManager.unstarRepoByFullName(name);
        totalSuccess++;
        console.log(chalk.gray(`  ✓ ${name}`));
      } catch (error) {
        totalFailed++;
        console.log(chalk.red(`  ✗ ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    }
  }

  console.log(chalk.green(`\n✅ 总计成功取消 ${totalSuccess} 个仓库的 star`));
  if (totalFailed > 0) {
    console.log(chalk.red(`❌ 总计失败 ${totalFailed} 个`));
  }
}