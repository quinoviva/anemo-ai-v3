const cp = require('child_process');
const fs = require('fs');
const path = require('path');

// Run TypeScript compiler
const result = cp.spawnSync('node', ['node_modules/typescript/lib/tsc.js', '--noEmit', '--skipLibCheck'], {
  cwd: process.cwd(),
  encoding: 'utf-8',
  stdio: ['pipe', 'pipe', 'pipe']
});

const output = result.stdout + result.stderr;
const lines = output.split('\n');

// Filter for target files
const targetFiles = [
  'src/components/anemo/ImageAnalysisReport.tsx',
  'src/components/anemo/AnalysisHistory.tsx'
];

const filteredLines = lines.filter(line => {
  return targetFiles.some(file => line.includes(file));
});

if (filteredLines.length === 0) {
  console.log('No errors in target files');
} else {
  console.log(filteredLines.join('\n'));
}
