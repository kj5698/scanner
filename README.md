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
