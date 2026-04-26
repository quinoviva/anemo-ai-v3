#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Fix the split notebook JSON file."""

if __name__ == '__main__':
    import json
    import sys
    import os
    
    file_path = r'C:\laragon\www\anemo-ai-v3\scripts\ml\AnemoAI_Training_Colab.ipynb'
    
    try:
        # Read the file
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Find the first valid complete JSON object by counting braces
        depth = 0
        end_pos = 0
        for i, ch in enumerate(content):
            if ch == '{':
                depth += 1
            elif ch == '}':
                depth -= 1
                if depth == 0:
                    end_pos = i + 1
                    break
        
        valid_content = content[:end_pos]
        
        # Verify it's valid JSON
        try:
            json.loads(valid_content)
            print("✓ Valid JSON verified")
        except json.JSONDecodeError as e:
            print(f"✗ Invalid JSON: {e}")
            sys.exit(1)
        
        # Write back
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(valid_content)
        
        print(f'✓ Success: wrote {len(valid_content)} chars, original was {len(content)} chars')
        print(f'✓ Removed {len(content) - len(valid_content)} chars of garbage')
        print(f'✓ File: {file_path}')
        
    except Exception as e:
        print(f'✗ Error: {e}')
        sys.exit(1)
