@echo off
REM Check line count
echo === Counting lines in committed version ===
git -C "C:\laragon\www\anemo-ai-v3" show HEAD:scripts/ml/update_cell5.py | find /c /v ""
set /a linecount=%ERRORLEVEL%

REM Check last lines
echo.
echo === Last lines of committed version (from line 372) ===
git -C "C:\laragon\www\anemo-ai-v3" show HEAD:scripts/ml/update_cell5.py | more +372

REM Count lines again with different method
echo.
echo === Verifying line count ===
for /f %%A in ('git -C "C:\laragon\www\anemo-ai-v3" show HEAD:scripts/ml/update_cell5.py ^| find /c /v ""') do set LINECOUNT=%%A
echo Total lines: %LINECOUNT%

REM Verify current file
echo.
echo === Current working file line count ===
for /f %%A in ('find /c /v "" ^< "C:\laragon\www\anemo-ai-v3\scripts\ml\update_cell5.py"') do set CURCOUNT=%%A
echo Current lines: %CURCOUNT%
