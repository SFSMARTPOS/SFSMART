RAASITH MOBILE POS v2.7 - BACKUP & LOAD OLD DATA

1. Data Store Location
   Data & Backup -> Choose Data Store Location
   Management password: 1302513025
   Select a folder such as D:\RaasithMobileData.

2. Backup Data
   Data & Backup -> Backup Data
   Enter 1302513025.
   Choose where to save the JSON backup file.
   Keep this file safe for transfer to another PC.

3. Load Old Data on another PC
   Install/extract the app on the new PC.
   Open Data & Backup -> Load Old Data.
   Enter 1302513025.
   Select the old RaasithMobile backup JSON file.
   Confirm replacement of current app data.
   All companies, company stock/sales data and users in the backup are loaded.

4. Restore From Store
   Data & Backup -> Restore From Store
   Enter 1302513025.
   Restores from the connected PC data folder.

IMPORTANT
- The app uses the browser File System Access API for PC-folder access. Chrome/Edge are recommended.
- The management password protects these actions in the app UI.
- Keep at least one backup copy on another drive.


V2.8 CHANGE: Load Old Data now asks you to choose the destination PC folder after selecting the backup file. The restored database is immediately saved to that chosen folder and future changes auto-save there.
