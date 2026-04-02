@echo off
python -c "
with open(r'C:\laragon\www\anemo-ai-v3\scripts\ml\update_cell5.py', 'r') as f:
    content = f.read()
content = content.rstrip() + '\n'
with open(r'C:\laragon\www\anemo-ai-v3\scripts\ml\update_cell5.py', 'w') as f:
    f.write(content)
with open(r'C:\laragon\www\anemo-ai-v3\scripts\ml\update_cell5.py') as f:
    lines = f.readlines()
print(f'Success! {len(lines)} lines')
print(f'Last line: {repr(lines[-1])}')
"
