const { execSync } = require('child_process');

try {
  const output = execSync('node node_modules/typescript/bin/tsc --noEmit 2>&1', {
    cwd: 'C:\\laragon\\www\\anemo-ai-v3',
    encoding: 'utf8',
    maxBuffer: 50 * 1024 * 1024,
    stdio: 'pipe'
  });
  console.log(output);
  process.exit(0);
} catch (error) {
  if (error.stdout) {
    console.log(error.stdout.toString());
  }
  if (error.stderr) {
    console.log(error.stderr.toString());
  }
  if (!error.stdout && !error.stderr) {
    console.log(error.message);
  }
  process.exit(0);
}
