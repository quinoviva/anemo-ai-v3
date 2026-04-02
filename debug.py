#!/usr/bin/env python3
"""Debug script to show file structure"""

filepath = r'C:\laragon\www\anemo-ai-v3\scripts\ml\update_cell5.py'

# Read file as text
with open(filepath, 'r') as f:
    lines = f.readlines()

print(f"Total lines: {len(lines)}")
print(f"\nLast 12 lines:")
for i, line in enumerate(lines[-12:], start=len(lines)-11):
    print(f"Line {i}: {repr(line)}")

# Try to fix it
content = open(filepath, 'r').read()
fixed = content.rstrip() + '\n'

# Write fixed version
with open(filepath, 'w') as f:
    f.write(fixed)

# Verify
with open(filepath, 'r') as f:
    new_lines = f.readlines()

print(f"\n\nAFTER FIX:")
print(f"Total lines: {len(new_lines)}")
print(f"Last 3 lines:")
for i, line in enumerate(new_lines[-3:], start=len(new_lines)-2):
    print(f"Line {i}: {repr(line)}")
