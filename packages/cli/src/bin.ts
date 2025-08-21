#!/usr/bin/env node

import { createCLI } from './index.js';

const program = createCLI();

program.parse();