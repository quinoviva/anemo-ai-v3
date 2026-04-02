#!/usr/bin/env python
"""Truncate update_cell5.py to exactly 376 lines."""

file_path = r'C:\laragon\www\anemo-ai-v3\scripts\ml\update_cell5.py'

# Read the file
with open(file_path, 'r', encoding='utf8') as f:
    lines = f.readlines()

print(f'Lines before: {len(lines)}')

# Keep only first 376 lines
kept = lines[:376]

# Write back
with open(file_path, 'w', encoding='utf8') as f:
    f.writelines(kept)

print(f'Done. Lines kept: {len(kept)}')
if kept:
    print(f'Last line: {repr(kept[-1])}')
