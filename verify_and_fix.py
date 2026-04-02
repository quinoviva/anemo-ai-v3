#!/usr/bin/env python3
"""Verify and fix file"""
import shutil
from pathlib import Path

src = Path(r'C:\laragon\www\anemo-ai-v3\scripts\ml\update_cell5_fixed.py')
dst = Path(r'C:\laragon\www\anemo-ai-v3\scripts\ml\update_cell5.py')

# Read source
with open(src, 'r', encoding='utf-8') as f:
    src_content = f.read()
    src_lines = src_content.split('\n')

# Read destination
with open(dst, 'r', encoding='utf-8') as f:
    dst_content = f.read()
    dst_lines = dst_content.split('\n')

print(f'Source file: {len(src_lines)} lines (split by \\n)')
print(f'Dest file: {len(dst_lines)} lines (split by \\n)')

# Check with readlines
with open(src, 'r', encoding='utf-8') as f:
    src_readlines = f.readlines()
with open(dst, 'r', encoding='utf-8') as f:
    dst_readlines = f.readlines()

print(f'Source file: {len(src_readlines)} lines (readlines)')
print(f'Dest file: {len(dst_readlines)} lines (readlines)')

# Check last line of source
print(f'Source last line: {repr(src_readlines[-1])}')
print(f'Dest last line: {repr(dst_readlines[-1])}')

# Match check
if len(src_readlines) == len(dst_readlines):
    if src_readlines == dst_readlines:
        print('\n✓ Files match exactly!')
    else:
        print('\n✗ Line counts match but content differs')
        for i, (s, d) in enumerate(zip(src_readlines, dst_readlines)):
            if s != d:
                print(f'  Line {i+1} differs')
                print(f'    Source: {repr(s[:60])}')
                print(f'    Dest:   {repr(d[:60])}')
                if i > 5:
                    break
else:
    print(f'\n✗ Line counts differ by {abs(len(src_readlines) - len(dst_readlines))}')
