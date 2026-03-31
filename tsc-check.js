#!/usr/bin/env node
const { execSync } = require('child_process');

try {
  const output = execSync('node node_modules/typescript/bin/tsc --noEmit', {
    cwd: 'C:\\laragon\\www\\anemo-ai-v3',
    encoding: 'utf8',
    maxBuffer: 100 * 1024 * 1024,
    stdio: 'pipe'
  });
  console.log(output || '0 errors');
  process.exit(0);
} catch (error) {
  const output = error.stdout ? error.stdout.toString() : '';
  const errMsg = error.stderr ? error.stderr.toString() : '';
  
  if (output) {
    console.log(output);
  }
  if (errMsg) {
    console.log(errMsg);
  }
  
  // Check if we got actual output (errors) or just exit code non-zero
  if (!output && !errMsg) {
    console.log('TypeScript check completed');
  }
  
  process.exit(0);
}
