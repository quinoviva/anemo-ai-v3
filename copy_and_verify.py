#!/usr/bin/env python3
"""
Copy temp_truncate.txt to update_cell5.py and verify.
"""

import sys

# Read the temp file
with open(r'C:\laragon\www\anemo-ai-v3\temp_truncate.txt', 'r', encoding='utf-8') as f:
    content = f.read()

# Write to the actual file
with open(r'C:\laragon\www\anemo-ai-v3\scripts\ml\update_cell5.py', 'w', encoding='utf-8') as f:
    f.write(content)

# Verify
with open(r'C:\laragon\www\anemo-ai-v3\scripts\ml\update_cell5.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"File now has {len(lines)} lines")
print(f"Line 376: {repr(lines[375][:50])}")
print(f"Last character of last line: {repr(lines[-1][-20:])}")

if len(lines) == 376 and 'sys.exit(1)' in lines[375]:
    print("\n✓ SUCCESS: File truncated to exactly 376 lines with correct last line")
    sys.exit(0)
else:
    print("\n✗ FAILED")
    sys.exit(1)
