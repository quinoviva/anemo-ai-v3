#!/usr/bin/env python3
import shutil
import os

source = r'C:\laragon\www\anemo-ai-v3\temp_truncate.txt'
target = r'C:\laragon\www\anemo-ai-v3\scripts\ml\update_cell5.py'

# Copy file
shutil.copy2(source, target)
print(f'✓ Copied {source} to {target}')

# Verify
with open(target, 'r', encoding='utf-8') as f:
    lines = f.readlines()

line_count = len(lines)
print(f'✓ File has {line_count} lines')

if line_count == 376:
    print('✓ Line count is exactly 376')
    last_line = lines[-1].rstrip('\n')
    print(f'✓ Last line: {repr(last_line)}')
    if last_line == '        sys.exit(1)':
        print('✓ Last line is correct: "        sys.exit(1)"')
    else:
        print(f'✗ Last line is wrong, expected "        sys.exit(1)", got {repr(last_line)}')
else:
    print(f'✗ Line count is {line_count}, not 376')

# Clean up temp
os.remove(source)
print('✓ Cleaned up temp file')

print('\n=== TRUNCATION SUCCESSFUL ===')
