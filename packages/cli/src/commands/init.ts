import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { getProjectRoot } from '@star-man/core';

export function createInitCommand(): Command {
  return new Command('init')
    .description('初始化 Star-Man 配置')
    .option('-f, --force', '强制覆盖现有配置')
    .option('-t, --token <token>', 'GitHub Token')
    .option('--api-port <port>', 'API 端口', '3801')
    .option('--web-port <port>', 'Web 端口', '3800')
    .action(async (options) => {
      console.log(chalk.blue('🚀 Star-Man 初始化向导\n'));

      const projectRoot = getProjectRoot();
      const envPath = path.join(projectRoot, '.env');

      // 检查 .env 是否已存在
      if (fs.existsSync(envPath) && !options.force) {
        console.log(chalk.yellow('⚠️  配置文件已存在。使用 --force 选项来覆盖。'));
        return;
      }

      const answers = await inquirer.prompt([
        {
          type: 'password',
          name: 'githubToken',
          message: 'GitHub Personal Access Token:',
          when: () => !options.token,
          validate: (input: string) => input.length > 10 || 'Token 至少10个字符'
        },
        {
          type: 'input',
          name: 'apiPort',
          message: 'API 服务端口:',
          default: '3801',
          when: () => !options.apiPort
        },
        {
          type: 'input',
          name: 'webPort',
          message: 'Web 服务端口:',
          default: '3800',
          when: () => !options.webPort
        }
      ]);

      try {
        const githubToken = options.token || answers.githubToken;
        const apiPort = options.apiPort || answers.apiPort;
        const webPort = options.webPort || answers.webPort;

        // 写入 .env 文件
        const envContent = `# Star-Man Configuration
GITHUB_TOKEN=${githubToken}
API_PORT=${apiPort}
WEB_PORT=${webPort}
DATABASE_URL=file:./data/starman.db
`;

        fs.writeFileSync(envPath, envContent, 'utf-8');

        console.log(chalk.green('\n✅ 配置初始化完成！'));
        console.log(chalk.gray(`   配置文件: ${envPath}`));
        console.log(chalk.blue('\n下一步:'));
        console.log(`  ${chalk.yellow('starman sync')}     同步仓库`);
        console.log(`  ${chalk.yellow('starman list')}     查看仓库列表`);
        console.log(`  ${chalk.yellow('starman stats')}    查看统计信息`);

      } catch (error) {
        console.error(chalk.red('❌ 初始化失败:'), (error as Error).message);
        process.exit(1);
      }
    });
}