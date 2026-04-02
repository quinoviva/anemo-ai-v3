#!/usr/bin/env python3
"""Copy and verify the file"""
import shutil
import sys
from pathlib import Path

src = Path(r'C:\laragon\www\anemo-ai-v3\scripts\ml\update_cell5_fixed.py')
dst = Path(r'C:\laragon\www\anemo-ai-v3\scripts\ml\update_cell5.py')

try:
    # Copy the file
    shutil.copy2(str(src), str(dst))
    print('✓ File copied')
    
    # Verify the file
    with open(dst, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        print(f'✓ Verification:')
        print(f'  - Total lines: {len(lines)}')
        if len(lines) > 0:
            last_line = lines[-1]
            print(f'  - Last line: {repr(last_line)}')
            if len(lines) == 376 and last_line == '        sys.exit(1)\n':
                print('✓ File matches expected format!')
                sys.exit(0)
            else:
                if len(lines) != 376:
                    print(f'  ⚠ Expected 376 lines, got {len(lines)}')
                if last_line != '        sys.exit(1)\n':
                    print(f'  ⚠ Expected last line to be "        sys.exit(1)\\n"')
                sys.exit(1)
except Exception as e:
    print(f'✗ Error: {e}')
    sys.exit(1)
