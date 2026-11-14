# Invoice Scan-Check

Phone app for loading and delivering invoices: scan UPCs against invoices, proof of delivery
(photo + signature, or skip), routes with EV charge stops, driver team view, and an admin
Sales view (paid/unpaid, daily, weekly and monthly totals). Data lives in Google Sheets.

## Files
- `index.html` – the app
- `setup-guide.html` – step-by-step Google Sheets connection guide
- `support.js` – page runtime (keep next to index.html)
- `apps-script/Code.gs` – paste into your Google Sheet's Apps Script
- `manifest.json`, `sw.js`, `icon-*.png` – lets phones install it as an app

## Hosting on GitHub Pages
Settings → Pages → Source: "Deploy from a branch" → Branch: `main`, folder `/ (root)` → Save.
The app will be at `https://<your-username>.github.io/<repo-name>/`.

## Privacy
Don't commit your Apps Script `/exec` link. Enter it in the app under Settings instead,
or share the driver link from the app (Settings → Copy).

## Android app (APK)
GitHub builds an installable APK with the **Build Android APK** workflow (Actions tab) and publishes it at:
https://github.com/kj5698/scanner/releases/download/apk-latest/scan-check.apk

- Open that link on the Android phone, download, then open the file and allow "Install unknown apps".
- The app loads the live version from GitHub Pages, so app updates arrive without reinstalling.
- Camera, location and photo permissions are requested the first time they are used.
- `android/debug.keystore` is a fixed signing key so a rebuilt APK installs over the old one.

## Firebase (live updates, works offline) — app v2.0
The app runs on Google Sheets until a Firebase project is connected, then switches to Firebase.

One-time setup (about 15 minutes, on a computer):
1. Go to https://console.firebase.google.com → **Add project** (Google Analytics not needed).
2. **Build → Authentication → Get started → Email/Password → Enable → Save.**
3. **Build → Firestore Database → Create database** → pick a US location → *Start in production mode*.
4. **Firestore → Rules:** replace everything with the contents of `firestore.rules` from this repo → **Publish**.
5. **Project settings (gear) → Your apps → Web (</>)** → register "Scan-Check" (no hosting) → copy the `firebaseConfig` block.
6. Send that block to Claude to build it into the app (then no phone needs any setup), or paste it in the app under **Settings → Switch to Firebase** to try it on one phone first.
7. In the app: **Set up the admin account** (your name + PIN) → **Settings → Copy from Google Sheets** → **Team → Drivers & PINs** to add each driver.

Notes:
- The firebaseConfig values are not secret; access is controlled by sign-in and `firestore.rules`.
- Delivery photos and signatures are stored in Firestore (`proofs`), so the free Spark plan is enough; no Cloud Storage needed.
- Drivers sign in with name + PIN; accounts are Firebase Email/Password users named `driver-<name>@scancheck.app`.
