# KPE Billing — Windows desktop app

**Recommended: the small installer** (`build/installer-lite.nsi`, 170 KB, published at
`download/KPE-Billing-Setup.exe`). It uses Microsoft Edge — built into Windows 10/11 — to open the
app in its own full-screen window with its own profile (stays logged in). Falls back to Chrome, then
to the default browser. Build: `cd build && makensis installer-lite.nsi`.

The full Electron app below is optional (≈112 MB).

## Electron app

A small Windows app that opens the live billing site (https://kp-enter.github.io/KP-ENTERPRISES/)
full screen, without browser bars. All data stays in Supabase, so the desktop app, phones and
browsers all see the same bills. The app updates itself whenever the website is updated.

- Starts full screen · **F11** toggles full screen · **Ctrl+R** reloads · **Ctrl+P** prints · **Ctrl +/−** zoom
- Downloaded bill PDFs are saved to `Downloads\KPE Bills` and opened automatically
- WhatsApp and other outside links open in the normal browser
- Shows a "No internet" screen and reconnects automatically
- Stays logged in between launches

## Build the installer (Linux or Windows)

```
npm install
npx electron-builder --win dir --x64            # app in dist/win-unpacked
npx resedit --in "dist/win-unpacked/KPE Billing.exe" --out "dist/win-unpacked/KPE Billing.exe" \
  --icon IDR_MAINFRAME,build/icon.ico --icon 1,build/icon.ico --company-name "K.P. Enterprises" \
  --product-name "KPE Billing" --file-description "KPE Billing" --product-version 1.0.0.0 --file-version 1.0.0.0
cd build && makensis installer.nsi                # -> dist/KPE-Billing-Setup-1.0.0.exe
```

The installer is per-user (no admin needed), adds Desktop and Start-menu shortcuts and an
uninstaller (Settings → Apps). It is not code-signed, so Windows SmartScreen may ask
"More info → Run anyway" the first time.
