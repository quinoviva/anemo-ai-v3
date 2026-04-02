#!/usr/bin/env python3
import sys

file_path = r'C:\laragon\www\anemo-ai-v3\scripts\ml\update_cell5.py'

# Read all lines
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f'Current total lines: {len(lines)}')

# Show lines around line 376
if len(lines) >= 376:
    print(f'Line 376 content: {repr(lines[375])}')
if len(lines) >= 375:
    print(f'Line 375 content: {repr(lines[374])}')
if len(lines) >= 377:
    print(f'Line 377 content: {repr(lines[376])}')

# Truncate to 376 lines
if len(lines) > 376:
    truncated_lines = lines[:376]
    
    # Write back
    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(truncated_lines)
    
    print(f'\nTruncated to 376 lines.')
    
    # Verify
    with open(file_path, 'r', encoding='utf-8') as f:
        verify_lines = f.readlines()
    
    print(f'Verified: File now has {len(verify_lines)} lines')
    print(f'Last line (376): {repr(verify_lines[-1])}')
    
    # Check if last line contains sys.exit(1)
    if 'sys.exit(1)' in verify_lines[-1]:
        print('✓ Last line contains sys.exit(1)')
    else:
        print('✗ WARNING: Last line does NOT contain sys.exit(1)')
        sys.exit(1)
else:
    print(f'File already has {len(lines)} lines (need to be <= 376)')
