@echo off
copy "C:\laragon\www\anemo-ai-v3\scripts\ml\update_cell5_fixed.py" "C:\laragon\www\anemo-ai-v3\scripts\ml\update_cell5.py"
if %ERRORLEVEL% EQU 0 (
    echo Copied successfully
    python -c "f=open(r'C:\laragon\www\anemo-ai-v3\scripts\ml\update_cell5.py'); lines=f.readlines(); print('Lines:', len(lines), 'Last:', repr(lines[-1]))"
) else (
    echo Copy failed with error %ERRORLEVEL%
    exit /b 1
)
