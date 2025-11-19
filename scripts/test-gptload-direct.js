// 直接用 Node 原生 http/https 模块，按照你给的 curl 示例发请求
// 不依赖 langchain，不依赖 openai SDK，用来验证 GPT-Load 端点行为。
//
// 使用方式（在项目根目录执行）：
//   node scripts/test-gptload-direct.js
//
// 依赖环境变量：
//   OPENAI_BASE_URL  基础 URL，例如：
//     http://localhost:3001/proxy/gemini/v1beta/openai/
//     或  http://43.156.131.208:8071/proxy/gemini-fufei/v1beta/openai/
//   OPENAI_API_KEY   GPT-Load 分发给你的 proxy key
//   AI_MODEL         （可选）默认 gemini-2.5-flash

/* eslint-disable @typescript-eslint/no-var-requires */

const http = require('http');
const https = require('https');

// 加载项目根目录的 .env，确保使用和服务进程相同的配置
try {
  require('dotenv').config({ path: '.env', override: true });
} catch (e) {
  // 忽略 dotenv 加载失败，继续使用进程现有的环境变量
}

function main() {
  const baseURL = process.env.OPENAI_BASE_URL || 'http://localhost:3001/proxy/gemini/v1beta/openai/';
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.AI_MODEL || 'gemini-2.5-flash';

  console.log('测试 GPT-Load Gemini 端点：');
  console.log('  OPENAI_BASE_URL =', baseURL);
  console.log('  AI_MODEL        =', model);

  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY 未设置');
    process.exit(1);
  }

  const url = new URL(baseURL);
  // 确保基础 URL 以 / 结尾，然后拼接 chat/completions
  const basePath = url.pathname.endsWith('/') ? url.pathname.slice(0, -1) : url.pathname;
  const path = `${basePath}/chat/completions`;

  const payload = JSON.stringify({
    model,
    messages: [
      { role: 'user', content: 'hi from Node test script' },
    ],
  });

  const isHttps = url.protocol === 'https:';
  const client = isHttps ? https : http;

  const options = {
    hostname: url.hostname,
    port: url.port || (isHttps ? 443 : 80),
    path,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
    },
  };

  console.log('\n➡️  请求配置:');
  console.log(`  ${options.method} ${url.protocol}//${options.hostname}:${options.port}${options.path}`);

  const req = client.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', () => {
      console.log('\n⬅️  响应:');
      console.log('  status =', res.statusCode);
      console.log('  headers =', res.headers);

      if (!data) {
        console.log('\n  body 为空');
      } else {
        console.log('\n  body:');
        try {
          const json = JSON.parse(data);
          console.dir(json, { depth: null });
        } catch {
          console.log(data);
        }
      }
    });
  });

  req.on('error', (err) => {
    console.error('\n❌ 请求异常:', err);
  });

  req.write(payload);
  req.end();
}

main();
