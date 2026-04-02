#!/usr/bin/env python3
import shutil
import sys

src = r'C:\laragon\www\anemo-ai-v3\scripts\ml\update_cell5_fixed.py'
dst = r'C:\laragon\www\anemo-ai-v3\scripts\ml\update_cell5.py'

try:
    # Copy the file
    shutil.copy2(src, dst)
    print(f"✓ File copied from:\n  {src}\nto:\n  {dst}")
    
    # Verify
    with open(dst, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        line_count = len(lines)
        last_line = lines[-1] if lines else ""
        
        print(f"\n✓ Total lines: {line_count}")
        print(f"✓ Last line: {repr(last_line)}")
        
        if line_count == 376 and last_line == "        sys.exit(1)\n":
            print("\n✓ SUCCESS: File copied and verified correctly!")
            print(f"✓ Exactly 376 lines")
            print(f'✓ Ends with "        sys.exit(1)\\n"')
            sys.exit(0)
        else:
            print("\n✗ FAILED verification")
            print(f"  Expected 376 lines, got {line_count}")
            print(f"  Expected last line: '        sys.exit(1)\\n'")
            print(f"  Got: {repr(last_line)}")
            sys.exit(1)
            
except Exception as e:
    print(f"✗ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
