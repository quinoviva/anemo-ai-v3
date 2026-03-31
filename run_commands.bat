@echo off
cd C:\laragon\www\anemo-ai-v3

echo ===== TypeScript Compiler Check =====
node node_modules\typescript\lib\tsc.js --noEmit
if errorlevel 1 (
    echo TypeScript compiler failed, trying fallback...
    node_modules\.bin\tsc.cmd --noEmit
)

echo.
echo ===== Git Diff Output =====
git diff HEAD~3..HEAD --name-only

pause
