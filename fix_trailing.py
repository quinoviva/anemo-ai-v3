#!/usr/bin/env python3
import sys

filepath = r'C:\laragon\www\anemo-ai-v3\scripts\ml\update_cell5.py'

# Read the file
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove all trailing whitespace and add single newline
fixed_content = content.rstrip() + '\n'

# Write back
with open(filepath, 'w', encoding='utf-8') as f:
    f.write(fixed_content)

# Verify
with open(filepath, 'r') as f:
    lines = f.readlines()

print(f'Success! File now has {len(lines)} lines')
print(f'Last line: {repr(lines[-1])}')
