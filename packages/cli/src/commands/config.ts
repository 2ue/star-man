import { StarManager } from '@star-man/core';
import * as cron from 'node-cron';

/**
 * 处理 config get 命令
 */
export async function handleConfigGet(starManager: StarManager, key: string): Promise<void> {
  try {
    const configService = starManager.getConfigService();

    if (key === 'autoSync') {
      const autoSyncConfig = await configService.getAutoSyncConfig();
      const cronExprs = autoSyncConfig.cronExpr
        .split(',')
        .map(expr => expr.trim())
        .filter(expr => expr.length > 0);

      console.log('\n📋 自动同步配置:');
      console.log(`   启用: ${autoSyncConfig.enabled ? '✅ 是' : '❌ 否'}`);

      if (cronExprs.length === 1) {
        console.log(`   规则: ${cronExprs[0]}`);
      } else {
        console.log(`   规则数量: ${cronExprs.length}`);
        cronExprs.forEach((expr, index) => {
          console.log(`   规则 ${index + 1}: ${expr}`);
        });
      }

      console.log(`   时区: ${autoSyncConfig.timezone}`);
      console.log('');
    } else {
      const value = await configService.getConfig(key);
      console.log(`${key}: ${value}`);
    }
  } catch (error) {
    console.error('❌ 获取配置失败:', error);
    process.exit(1);
  }
}

/**
 * 处理 config set 命令
 */
export async function handleConfigSet(starManager: StarManager, key: string, value: string): Promise<void> {
  try {
    const configService = starManager.getConfigService();

    if (key === 'autoSync.enabled') {
      const boolValue = value === 'true';
      await configService.setConfig(key, boolValue, 'boolean');
      console.log(`\n✅ 已设置 ${key} = ${boolValue}`);
    } else if (key === 'autoSync.cronExpr') {
      // 验证 cron 表达式（支持逗号分隔的多个表达式）
      const cronExprs = value
        .split(',')
        .map(expr => expr.trim())
        .filter(expr => expr.length > 0);

      if (cronExprs.length === 0) {
        throw new Error('未提供有效的 cron 表达式');
      }

      const invalidExprs = cronExprs.filter(expr => !cron.validate(expr));
      if (invalidExprs.length > 0) {
        throw new Error(`无效的 cron 表达式: ${invalidExprs.join(', ')}`);
      }

      await configService.setConfig(key, value, 'string');
      console.log(`\n✅ 已设置 ${key} = ${value}`);
      if (cronExprs.length > 1) {
        console.log(`   共配置 ${cronExprs.length} 个定时规则`);
      }
    } else if (key === 'autoSync.timezone') {
      await configService.setConfig(key, value, 'string');
      console.log(`\n✅ 已设置 ${key} = ${value}`);
    } else {
      await configService.setConfig(key, value, 'string');
      console.log(`\n✅ 已设置 ${key} = ${value}`);
    }

    console.log('⚠️  注意: 需要重启 API 服务才能生效\n');
  } catch (error) {
    console.error('❌ 设置配置失败:', error);
    process.exit(1);
  }
}
