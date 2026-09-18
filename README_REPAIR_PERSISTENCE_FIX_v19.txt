SF SMART POS - Repair Record Persistence Fix v19

Fix:
- Newly added repair records are saved immediately to the connected PC data folder.
- On startup/refresh, a stale PC JSON snapshot can no longer overwrite a newly entered repair that is still present in the browser cache.
- Repair records are merged by token during PC restore, using updatedAt/createdAt timestamps when available.
- Existing features are preserved.

Recommended: keep the PC data folder connected and retain the automatic JSON backup.
