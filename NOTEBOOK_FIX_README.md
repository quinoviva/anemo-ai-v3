# Jupyter Notebook Fix Instructions

## Problem

The file `scripts/ml/AnemoAI_Training_Colab.ipynb` has **two JSON structures concatenated together**:

- **Lines 1-715**: Valid, clean Jupyter notebook JSON (the new one)
- **Lines 716-1201**: Old garbage data that should have been removed

This causes the notebook to be corrupted and unable to open properly.

## Solution

I've created helper scripts to automatically fix this. Choose one of the options below:

### Option 1: Command Prompt (Windows) - **RECOMMENDED**

1. Open **Command Prompt** or **PowerShell**
2. Navigate to the project:
   ```cmd
   cd C:\laragon\www\anemo-ai-v3\scripts\ml
   ```
3. Run the fix script:
   ```cmd
   python fix_notebook_final.py
   ```

### Option 2: Batch File (Windows)

1. Double-click: `C:\laragon\www\anemo-ai-v3\scripts\ml\fix_notebook.bat`
2. It will automatically run and report success

### Option 3: PowerShell

```powershell
cd C:\laragon\www\anemo-ai-v3\scripts\ml
python fix_notebook_final.py
```

### Option 4: Manual Check First

To see what will be fixed without making changes:

```cmd
cd C:\laragon\www\anemo-ai-v3\scripts\ml
python check_notebook.py
```

This will show:
- Current file size
- Size of garbage data to remove
- Validation of the JSON structure

## What the Fix Does

The `fix_notebook_final.py` script:

1. ✓ Reads the entire corrupted notebook
2. ✓ Counts opening `{` and closing `}` braces to find the first complete JSON object
3. ✓ Extracts only the valid JSON (lines 1-715)
4. ✓ Verifies the JSON is valid and well-formed
5. ✓ Overwrites the file with only the clean JSON
6. ✓ Reports success with size information

## Expected Output

```
============================================================
SUCCESS: Jupyter notebook fixed!
============================================================
Original size:  567,890 bytes
Cleaned size:   312,456 bytes
Removed:        255,434 bytes
File:           C:\laragon\www\anemo-ai-v3\scripts\ml\AnemoAI_Training_Colab.ipynb

Valid JSON structure confirmed!
```

## Files Created

- `fix_notebook_final.py` - Main fix script (runs on any OS with Python)
- `check_notebook.py` - Verification script (shows what will be removed)
- `fix_notebook.bat` - Windows batch wrapper (double-click to run)
- `fix_notebook.ps1` - PowerShell wrapper
- `NOTEBOOK_FIX_README.md` - This file

## After Fixing

Once the notebook is fixed:

1. ✓ It should open correctly in Google Colab
2. ✓ All cells will be properly formatted
3. ✓ The notebook will be ready to use for training
4. ✓ You can push it to GitHub and Colab will recognize it

## Troubleshooting

If the script fails:

- **"Python not found"** → Install Python from [python.org](https://www.python.org) or use Laragon's built-in Python
- **"Permission denied"** → Run Command Prompt as Administrator
- **File still corrupted** → Manually edit to line 715 and delete everything after

## Technical Details

The notebook was corrupted by concatenating two separate notebook JSON files:

```
{...complete notebook 1...}  ← Valid (ends line 715)
{...complete notebook 2...}  ← Garbage (lines 716-1201)
```

Jupyter notebooks must contain a single JSON object. By finding where the first object closes (when brace count reaches 0), we can safely remove the garbage and restore functionality.
