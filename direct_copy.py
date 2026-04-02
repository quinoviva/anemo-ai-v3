#!/usr/bin/env python3
"""Direct file copy using pathlib"""
from pathlib import Path

src_path = Path(r'C:\laragon\www\anemo-ai-v3\scripts\ml\update_cell5_fixed.py')
dst_path = Path(r'C:\laragon\www\anemo-ai-v3\scripts\ml\update_cell5.py')

# Read source file
with open(src_path, 'rb') as f:
    content = f.read()

# Write to destination
with open(dst_path, 'wb') as f:
    f.write(content)

# Verify using text mode with readlines
with open(dst_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f'Total lines: {len(lines)}')
print(f'Last line: {repr(lines[-1])}')
print(f'Last line matches: {lines[-1] == "        sys.exit(1)\\n"}')

if len(lines) == 376 and lines[-1] == '        sys.exit(1)\n':
    print('✓ SUCCESS')
else:
    print('✗ FAILED')
    print(f'  Expected 376 lines, got {len(lines)}')
