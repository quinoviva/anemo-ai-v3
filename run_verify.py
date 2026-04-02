#!/usr/bin/env python3
import shutil
import os

# Copy temp_truncate.txt to update_cell5.py
src = r'C:\laragon\www\anemo-ai-v3\temp_truncate.txt'
dst = r'C:\laragon\www\anemo-ai-v3\scripts\ml\update_cell5.py'

# Read source
with open(src, 'r', encoding='utf-8') as f:
    content = f.read()

# Write destination
with open(dst, 'w', encoding='utf-8') as f:
    f.write(content)

# Verify
with open(dst, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"File now has {len(lines)} lines")
if len(lines) > 0:
    print(f"Last line: {repr(lines[-1])}")
    print(f"Last line contains sys.exit(1): {'sys.exit(1)' in lines[-1]}")

success = len(lines) == 376 and 'sys.exit(1)' in lines[-1]
if success:
    print("\n✓ SUCCESS: File has exactly 376 lines and last line contains sys.exit(1)")
else:
    print("\n✗ FAILED")
    if len(lines) != 376:
        print(f"  - Expected 376 lines, got {len(lines)}")
    if 'sys.exit(1)' not in lines[-1]:
        print(f"  - Last line does not contain sys.exit(1)")
