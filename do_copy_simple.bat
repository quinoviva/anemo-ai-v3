@echo off
setlocal enabledelayedexpansion

copy "C:\laragon\www\anemo-ai-v3\scripts\ml\update_cell5_fixed.py" "C:\laragon\www\anemo-ai-v3\scripts\ml\update_cell5.py"

echo.
echo Verify with Python:
cd /d "C:\laragon\www\anemo-ai-v3"
python -c "
with open('scripts/ml/update_cell5.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()
    print(f'✓ Total lines: {len(lines)}')
    print(f'✓ Last line correct: {lines[-1] == \"        sys.exit(1)\n\"}')
    if len(lines) == 376 and lines[-1] == '        sys.exit(1)\n':
        print('✓ SUCCESS: File copied and verified correctly!')
        print(f'✓ 376 lines, ends with \"        sys.exit(1)\\n\"')
    else:
        print('✗ FAILED verification')
        print(f'  Lines: {len(lines)}, Expected: 376')
        print(f'  Last line: {repr(lines[-1])}')
"

pause
