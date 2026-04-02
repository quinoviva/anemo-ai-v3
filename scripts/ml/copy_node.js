const fs = require('fs');
const path = require('path');

const src = path.normalize('C:\\laragon\\www\\anemo-ai-v3\\scripts\\ml\\update_cell5_fixed.py');
const dst = path.normalize('C:\\laragon\\www\\anemo-ai-v3\\scripts\\ml\\update_cell5.py');

try {
    // Copy file
    fs.copyFileSync(src, dst);
    console.log('✓ File copied');
    
    // Verify
    const content = fs.readFileSync(dst, 'utf8');
    const lines = content.split('\n');
    // Note: split('\ n') doesn't preserve newlines, so we need to read with readlines equivalent
    const allLines = content.split(/\r?\n/);
    
    console.log(`Total lines: ${allLines.length}`);
    console.log(`Last line: ${JSON.stringify(allLines[allLines.length - 1])}`);
    
    // Better verification - read file as buffer and analyze
    const buf = fs.readFileSync(dst);
    const text = buf.toString('utf8');
    let lineCount = 0;
    for (let i = 0; i < text.length; i++) {
        if (text[i] === '\n') lineCount++;
    }
    // Add 1 if file doesn't end with newline
    if (text.length > 0 && text[text.length - 1] !== '\n') {
        lineCount++;
    }
    
    console.log(`Actual line count (counting newlines): ${lineCount}`);
    const endsWith = text.endsWith('        sys.exit(1)\n');
    console.log(`Ends with "        sys.exit(1)\\n": ${endsWith}`);
    
    if (lineCount === 376 && endsWith) {
        console.log('✓ File matches expected format!');
        process.exit(0);
    } else {
        console.log('✗ File does not match expected format');
        process.exit(1);
    }
} catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
}
