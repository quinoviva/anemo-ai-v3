#!/usr/bin/env python3
import shutil
src = r'C:\laragon\www\anemo-ai-v3\scripts\ml\update_cell5_fixed.py'
dst = r'C:\laragon\www\anemo-ai-v3\scripts\ml\update_cell5.py'
shutil.copy2(src, dst)
print('done')
