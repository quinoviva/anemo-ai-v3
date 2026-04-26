const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'scripts', 'ml', 'AnemoAI_Training_Colab.ipynb');

console.log(`Reading: ${filePath}`);

// Read the file
const content = fs.readFileSync(filePath, 'utf-8');

// Find the first valid complete JSON object by counting braces
let depth = 0;
let endPos = 0;
for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    if (ch === '{') {
        depth++;
    } else if (ch === '}') {
        depth--;
        if (depth === 0) {
            endPos = i + 1;
            break;
        }
    }
}

const validContent = content.substring(0, endPos);

// Verify it's valid JSON
try {
    JSON.parse(validContent);
    console.log('✓ Valid JSON verified');
} catch (e) {
    console.error('✗ Invalid JSON:', e.message);
    process.exit(1);
}

// Write back
fs.writeFileSync(filePath, validContent, 'utf-8');

console.log(`✓ Success: wrote ${validContent.length} chars, original was ${content.length} chars`);
console.log(`✓ Removed ${content.length - validContent.length} chars of garbage`);
console.log(`✓ File: ${filePath}`);
