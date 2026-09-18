# SF SMART POS — Firebase Central Database Setup

This build keeps the existing SF SMART POS v19 interface/business logic and adds a Firebase Cloud Firestore central-data bridge. Browser localStorage is retained only as a local cache/compatibility layer.

## Firebase project
- Project ID: `smart-ce68a`
- Firestore database: `(default)`
- Web app is already registered.

## Before first use
1. Open Firebase Console for `smart-ce68a`.
2. Go to **Build -> Authentication -> Sign-in method**.
3. Enable **Anonymous** sign-in.
4. Go to **Firestore Database -> Rules**.
5. Replace the rules with the contents of `firestore.rules` in this ZIP and publish.

The application uses Anonymous Authentication only as a basic database access gate. The existing SF SMART POS username/password + role/permission system remains in the app. For production-grade per-user security, migrate those accounts to Firebase Authentication and enforce roles in Firestore Security Rules.

## Deploy to GitHub + Vercel
1. Unzip this project.
2. Create/push the files to a GitHub repository.
3. Import that repository into Vercel.
4. Framework preset: **Other** (static site) is sufficient.
5. Build command: leave empty.
6. Output directory: `.`
7. Deploy.

The Firebase browser SDK is loaded from the Firebase CDN, so no npm install is required for this static build.

## How central storage works
The bridge syncs these application keys to Firestore collection `sfCentralData`:
- `sf_smart_pos_*`
- `rasith_mobile_*`
- `sf_theme_mode`

Each localStorage key becomes one Firestore document. Existing local browser data is used to initialize Firebase only when the central collection is empty. Once central data exists, Firebase is the source of truth.

## Existing data migration
Do NOT clear Chrome data before the first deployment. On the first browser used after this build is deployed, if Firestore is empty, the existing browser data is uploaded to Firebase. Other browsers then download the central data.

The old PC-folder JSON backup system remains in the application as an additional backup/restore option.

## Important
The Firebase web configuration is client-side configuration and is expected to be present in a web application. Firestore Security Rules are what control database access.
