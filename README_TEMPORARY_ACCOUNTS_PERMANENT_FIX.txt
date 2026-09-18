SF SMART POS SYSTEM - Temporary Accounts Permanent Save Fix

FIX:
Temporary Accounts transactions are now saved to the browser database immediately and, when a Permanent PC Data Folder is connected, the PC JSON database write is awaited before the save action finishes.

This prevents the newest Temporary Sale/Credit Bill/Credit Payment from being lost when the app is closed immediately after saving.

Temporary Accounts remain inside the main company database and are included in Backup / Restore / Load Old Data.

Recommended:
1. Open Data & Backup.
2. Choose Data Store Location.
3. Select the permanent SF SMART POS SYSTEM data folder.
4. Future Temporary Account changes will be written to SF SMART POS SYSTEM_Data.json before the action completes.
