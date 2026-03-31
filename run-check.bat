@echo off
cd C:\laragon\www\anemo-ai-v3
node node_modules\typescript\lib\tsc.js --noEmit --skipLibCheck > tsc-output.txt 2>&1
node check-ts.js
