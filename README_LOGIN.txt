RASITH MOBILE POS - LOGIN ON EVERY APP REOPEN

This version changes the login session from localStorage to sessionStorage.

Behavior:
- Login is required when the app is opened for a new browser/app session.
- Closing the Rasith Mobile app window clears the login session.
- Opening the desktop shortcut again shows the login screen.
- Refreshing the current page keeps the login session active.
- The existing 1-minute inactivity auto-logout still works.
- User accounts, company data, stock, sales and other business data remain saved locally.

Default login (unless changed/removed):
Username: admin
Password: admin123
