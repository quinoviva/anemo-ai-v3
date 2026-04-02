from pathlib import Path
import shutil

src = Path(r'C:\laragon\www\anemo-ai-v3\scripts\ml\update_cell5_fixed.py')
dst = Path(r'C:\laragon\www\anemo-ai-v3\scripts\ml\update_cell5.py')

try:
    shutil.copy2(str(src), str(dst))
    with open(dst, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    with open(r'C:\laragon\www\anemo-ai-v3\copy_result.txt', 'w') as f:
        f.write(f'✓ File copied\n')
        f.write(f'✓ Total lines: {len(lines)}\n')
        f.write(f'✓ Last line: {repr(lines[-1])}\n')
        if len(lines) == 376 and lines[-1] == '        sys.exit(1)\n':
            f.write('✓ SUCCESS: File matches expected format!\n')
            f.write(f'✓ 376 lines, ends with "        sys.exit(1)\\n"\n')
        else:
            f.write(f'✗ FAILED: Expected 376 lines, got {len(lines)}\n')
except Exception as e:
    with open(r'C:\laragon\www\anemo-ai-v3\copy_result.txt', 'w') as f:
        f.write(f'✗ Error: {e}\n')
