#!/usr/bin/env python3
"""Copy the fixed file over the original."""
import shutil
import sys

src = r'C:\laragon\www\anemo-ai-v3\scripts\ml\update_cell5_fixed.py'
dst = r'C:\laragon\www\anemo-ai-v3\scripts\ml\update_cell5.py'

try:
    shutil.copy(src, dst)
    print('Copied successfully')
    
    # Verify
    with open(dst, 'r') as f:
        lines = f.readlines()
    print(f'Lines: {len(lines)} Last: {repr(lines[-1])}')
except Exception as e:
    print(f'Error: {e}', file=sys.stderr)
    sys.exit(1)
