#!/usr/bin/env python3
"""Fix the update_cell5.py file by keeping only the first 376 lines."""

file_path = r'C:\laragon\www\anemo-ai-v3\scripts\ml\update_cell5.py'

# Read all lines
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Keep only first 376 lines
kept_lines = lines[:376]

# Write back
with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(kept_lines)

# Report
print(f"Done. Kept {len(kept_lines)} lines")
print(f"Last line: {kept_lines[-1].rstrip()!r}")
