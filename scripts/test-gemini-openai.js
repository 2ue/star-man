// 简单测试脚本：用与项目中相同的方式调用你的 GPT-Load Gemini 代理
// 用法：
//   node scripts/test-gemini-openai.js
//
// 依赖环境变量：
//   OPENAI_BASE_URL  - 例如: http://43.156.131.208:8071/proxy/gemini-fufei/v1beta/openai/
//   OPENAI_API_KEY   - GPT-Load 分发的代理 key
//   AI_MODEL         - 例如: gemini-2.5-flash

/* eslint-disable @typescript-eslint/no-var-requires */

// 加载根目录 .env
try {
  require('dotenv').config();
} catch (e) {
  console.warn('未能加载 dotenv，确保在项目根目录执行该脚本');
}

// 在 pnpm + workspace 环境下，直接通过 require.resolve 显式指定搜索路径
let ChatOpenAI;
try {
  // eslint-disable-next-line global-require
  const modPath = require.resolve('@langchain/openai', {
    paths: ['./packages/core/node_modules', './node_modules'],
  });
  ChatOpenAI = require(modPath).ChatOpenAI;
} catch (e) {
  console.error('无法加载 @langchain/openai，请确认依赖已安装。');
  console.error('原始错误:', e);
  process.exit(1);
}

async function main() {
  const baseURL = process.env.OPENAI_BASE_URL;
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.AI_MODEL || 'gemini-2.5-flash';

  console.log('测试 Gemini 代理配置:');
  console.log('  OPENAI_BASE_URL =', baseURL);
  console.log('  AI_MODEL        =', model);

  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY 未设置');
    process.exit(1);
  }

  if (!baseURL) {
    console.error('❌ OPENAI_BASE_URL 未设置');
    process.exit(1);
  }

  const options = {
    apiKey,
    model,
  };

  // 按项目中相同方式设置 baseURL
  options.configuration = { baseURL };

  const llm = new ChatOpenAI(options);

  try {
    console.log('\n➡️  发送测试请求...');
    const res = await llm.invoke('用一句中文简单介绍一下你自己。');
    console.log('\n✅ 调用成功，返回内容：');
    console.log(res);
  } catch (err) {
    console.error('\n❌ 调用失败，错误信息如下：');
    console.error('Error name:', err.constructor?.name);
    console.error('status:', err.status);
    console.error('code:', err.code);

    // 对 openai 错误，通常会有 response.data
    const data = err.response?.data || err.error || err.message;
    console.error('raw error data:\n', data);
  }
}

main().catch((e) => {
  console.error('脚本异常退出:', e);
  process.exit(1);
});
