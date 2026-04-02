import shutil

# Copy temp file to original
shutil.copy(r'C:\laragon\www\anemo-ai-v3\temp_truncate.txt', r'C:\laragon\www\anemo-ai-v3\scripts\ml\update_cell5.py')
print('File copied successfully')

# Verify line count
with open(r'C:\laragon\www\anemo-ai-v3\scripts\ml\update_cell5.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f'New file has {len(lines)} lines')

# Show last line
if lines:
    last_line = lines[-1].rstrip('\n')
    print(f'Last line: {repr(last_line)}')
    if last_line == '        sys.exit(1)':
        print('✓ Last line is correct')
    else:
        print('✗ Last line is NOT correct')

# Clean up temp file
import os
os.remove(r'C:\laragon\www\anemo-ai-v3\temp_truncate.txt')
print('Temp file cleaned up')
