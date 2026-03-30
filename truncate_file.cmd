@echo off
cd /d c:\laragon\www\anemo-ai-v3
node -e "const fs = require('fs'); const content = fs.readFileSync('src/components/anemo/MultimodalUploadAnalyzer.tsx', 'utf8'); const lines = content.split('\n'); const newContent = lines.slice(0, 1085).join('\n'); fs.writeFileSync('src/components/anemo/MultimodalUploadAnalyzer.tsx', newContent + '\n'); console.log('Done. Line count:', newContent.split('\n').length);"
