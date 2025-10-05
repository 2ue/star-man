#!/usr/bin/env node

import { createCLI } from './index.js';
import { checkWorkingDirectory } from '@star-man/core';

// 检查工作目录（仅在非 CI 环境）
if (!process.env.CI) {
  checkWorkingDirectory();
}

const program = createCLI();

program.parse();