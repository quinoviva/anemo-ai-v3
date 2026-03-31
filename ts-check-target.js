#!/usr/bin/env node
const { execSync } = require('child_process');
const path = require('path');

const projectRoot = 'C:\\laragon\\www\\anemo-ai-v3';
const targetFiles = [
  'src/components/anemo/ImageAnalysisReport.tsx',
  'src/components/anemo/AnalysisHistory.tsx'
];

try {
  const output = execSync('node node_modules/typescript/lib/tsc.js --noEmit --skipLibCheck', {
    cwd: projectRoot,
    encoding: 'utf8',
    maxBuffer: 100 * 1024 * 1024,
    stdio: 'pipe'
  });
  
  // Filter for target files
  const lines = output.split('\n');
  const targetLines = lines.filter(line => 
    targetFiles.some(f => line.includes(f.replace(/\//g, '\\')))
  );
  
  if (targetLines.length === 0) {
    console.log('No errors in target files');
  } else {
    console.log('TypeScript Errors in Target Files:');
    console.log('=====================================');
    targetLines.forEach(line => console.log(line));
  }
  process.exit(0);
} catch (error) {
  let allOutput = '';
  if (error.stdout) {
    allOutput += error.stdout.toString();
  }
  if (error.stderr) {
    allOutput += error.stderr.toString();
  }
  
  // Filter for target files
  const lines = allOutput.split('\n');
  const targetLines = lines.filter(line => 
    targetFiles.some(f => {
      const normalized = f.replace(/\//g, '\\');
      return line.includes(normalized);
    })
  );
  
  if (targetLines.length === 0) {
    console.log('No errors in target files');
  } else {
    console.log('TypeScript Errors in Target Files:');
    console.log('=====================================');
    targetLines.forEach(line => console.log(line));
  }
  
  // Print first 20 lines of total output for context
  const allLines = allOutput.split('\n').filter(l => l.trim());
  if (allLines.length > 0) {
    console.log('\n(Total TS errors found: ' + allLines.length + ' lines)');
  }
  
  process.exit(0);
}
