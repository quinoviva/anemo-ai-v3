const { execSync } = require('child_process');
const path = require('path');

try {
  const output = execSync('node node_modules/typescript/bin/tsc --noEmit 2>&1', {
    cwd: 'C:\\laragon\\www\\anemo-ai-v3',
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024
  });
  console.log(output);
} catch (error) {
  console.log(error.stdout || error.message);
}
