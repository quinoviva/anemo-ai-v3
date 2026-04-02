import shutil
import os

src = r'C:\laragon\www\anemo-ai-v3\scripts\ml\update_cell5_fixed.py'
dst = r'C:\laragon\www\anemo-ai-v3\scripts\ml\update_cell5.py'

# Copy the file
shutil.copy2(src, dst)

# Verify
with open(dst, 'r', encoding='utf-8') as f:
    lines = f.readlines()
    print(f'✓ Total lines: {len(lines)}')
    print(f'✓ Last line correct: {lines[-1] == "        sys.exit(1)\n"}')
    if len(lines) == 376 and lines[-1] == '        sys.exit(1)\n':
        print('✓ SUCCESS: File copied and verified correctly!')
        print(f'✓ 376 lines, ends with "        sys.exit(1)\\n"')
    else:
        print('✗ FAILED verification')
        print(f'  Lines: {len(lines)}, Expected: 376')
        print(f'  Last line: {repr(lines[-1])}')
