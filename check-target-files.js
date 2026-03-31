const { execSync } = require('child_process');

try {
  const output = execSync('node node_modules/typescript/lib/tsc.js --noEmit --skipLibCheck 2>&1', {
    cwd: 'C:\\laragon\\www\\anemo-ai-v3',
    encoding: 'utf8',
    maxBuffer: 50 * 1024 * 1024,
    stdio: 'pipe'
  });
  
  // Filter for target files
  const lines = output.split('\n');
  const targetLines = lines.filter(line => 
    line.includes('ImageAnalysisReport.tsx') || 
    line.includes('AnalysisHistory.tsx')
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
  if (!error.stdout && !error.stderr) {
    allOutput += error.message;
  }
  
  // Filter for target files
  const lines = allOutput.split('\n');
  const targetLines = lines.filter(line => 
    line.includes('ImageAnalysisReport.tsx') || 
    line.includes('AnalysisHistory.tsx')
  );
  
  if (targetLines.length === 0) {
    console.log('No errors in target files');
  } else {
    console.log('TypeScript Errors in Target Files:');
    console.log('=====================================');
    targetLines.forEach(line => console.log(line));
  }
  process.exit(0);
}
