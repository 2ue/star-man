import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';

export function createInitCommand(): Command {
  return new Command('init')
    .description('初始化 Star-Man 配置')
    .option('-f, --force', '强制覆盖现有配置')
    .option('-t, --token <token>', 'GitHub Token')
    .option('--api-port <port>', 'API 端口', '3801')
    .option('--web-port <port>', 'Web 端口', '5173')
    .action(async (options) => {
      console.log(chalk.blue('🚀 Star-Man 初始化向导\n'));

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
          default: '5173', 
          when: () => !options.webPort
        }
      ]);

      try {
        // 动态导入配置管理器
        const { ConfigManager } = await import('@star-man/core');
        
        await ConfigManager.getInstance().init({
          githubToken: options.token || answers.githubToken,
          apiPort: parseInt(options.apiPort || answers.apiPort),
          webPort: parseInt(options.webPort || answers.webPort),
          force: options.force
        });

        console.log(chalk.green('✅ 配置初始化完成！'));
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