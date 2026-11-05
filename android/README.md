# KPE Billing — Android app

A small native Android app (≈60 KB) that opens the billing site full screen in a WebView, with:
offline mode (service worker + on-device data), staying logged in, Android print screen
(printer or *Save as PDF*), bill PDFs saved to **Downloads/KPE Bills** and opened, **Share** sends
the PDF to WhatsApp or any app, photo picker for signature/stamp upload, Back button navigation.
External links (WhatsApp, phone, email) open in their own apps.

Published at `download/KPE-Billing.apk` (also linked from the Team page).

## Build (no Android SDK needed)

```
java -jar apktool.jar b android -o kpe-unsigned.apk
java -jar uber-apk-signer.jar -a kpe-unsigned.apk --ks kpe-release.jks --ksAlias kpe --ksPass <password> --ksKeyPass <password>
```

Tools: Apktool 2.10.0 and uber-apk-signer 1.3.0 (GitHub releases). The signing key
`kpe-release.jks` is **not** in this repo — keep it private; updates must be signed with the same key.

The web app detects the Android app through the `KPEAndroid` JavaScript bridge
(`print(title)`, `savePdf(base64, fileName, share)`).
