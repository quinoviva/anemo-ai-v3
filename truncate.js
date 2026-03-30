const fs = require('fs');
const path = 'c:\\laragon\\www\\anemo-ai-v3\\src\\components\\anemo\\MultimodalUploadAnalyzer.tsx';

const content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');

console.log('Total lines:', lines.length);
if (lines.length > 1084) {
  console.log('Line 1085:', JSON.stringify(lines[1084].substring(0, 50)));
}
if (lines.length > 1085) {
  console.log('Line 1086:', JSON.stringify(lines[1085].substring(0, 50)));
}

// Keep first 1085 lines
const newLines = lines.slice(0, 1085);
const newContent = newLines.join('\n') + '\n';

fs.writeFileSync(path, newContent, 'utf8');
console.log('Done. New line count:', newContent.split('\n').length);

// Verify
const verify = fs.readFileSync(path, 'utf8');
const verifyLines = verify.split('\n');
console.log('Verified new line count:', verifyLines.length);
console.log('Last line:', JSON.stringify(verifyLines[verifyLines.length - 2]));
