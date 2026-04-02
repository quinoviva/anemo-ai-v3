#!/usr/bin/env python3
import os

filepath = r'C:\laragon\www\anemo-ai-v3\scripts\ml\update_cell5.py'

with open(filepath, 'r') as f:
    content = f.read()

# Remove all trailing whitespace and add a single newline
content = content.rstrip() + '\n'

with open(filepath, 'w') as f:
    f.write(content)

# Verify the result
with open(filepath, 'r') as f:
    lines = f.readlines()
    
print(f'Success! File now has {len(lines)} lines')
print(f'Last line: {repr(lines[-1])}')
print(f'Second to last line: {repr(lines[-2])}')
