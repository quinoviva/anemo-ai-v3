#!/usr/bin/env python3
import sys

path = r'c:\laragon\www\anemo-ai-v3\src\components\anemo\MultimodalUploadAnalyzer.tsx'

try:
    with open(path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    print(f'Total lines: {len(lines)}')
    if len(lines) > 1084:
        print(f'Line 1085: {repr(lines[1084][:60])}...')
    if len(lines) > 1085:
        print(f'Line 1086: {repr(lines[1085][:60])}...')
    
    # Truncate to 1085 lines
    with open(path, 'w', encoding='utf-8') as f:
        f.writelines(lines[:1085])
    
    with open(path, 'r', encoding='utf-8') as f:
        new_lines = f.readlines()
    
    print(f'New line count: {len(new_lines)}')
    print(f'Last line: {repr(new_lines[-1])}')
    print('Done!')
except Exception as e:
    print(f'Error: {e}', file=sys.stderr)
    sys.exit(1)
