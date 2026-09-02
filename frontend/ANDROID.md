# Gyan Sutra Android guide

The Android app uses Capacitor and the same React source as the website. The native project lives in `frontend/android`. Web deployment remains independent and continues to use the normal Vite build.

## Why this structure

- One shared interface and feature codebase for web and Android
- Native Android packaging, lifecycle, back button, splash screen, system bars, and network state
- No paid framework or build service
- No service worker inside the Android package, which avoids stale PWA cache and startup loops
- Network-first scripture data with an Android-only cache for pages the reader has already opened

Sarathi requires an internet connection because its answers come from the backend. Previously opened read-only API content can be shown from the native cache when the device is offline.

## Requirements

- Node.js 22 or newer
- Android Studio with the Android SDK
- JDK 21 or newer. Android Studio's bundled JDK is recommended
- Android SDK Platform 36
- Android SDK Build Tools 35

Android Studio can install missing SDK components from **Tools > SDK Manager**.

## Daily development workflow

From `frontend`:

```bash
npm install
npm run dev
```

Use the browser for normal interface work. When the shared code is ready to test on Android:

```bash
npm run android:sync
npm run android:open
```

In Android Studio, select an emulator or connected phone and press Run. USB debugging must be enabled for a physical Android device.

`android:sync` builds the Android-specific web bundle, copies it into the native project, and updates Capacitor plugins. Run it after changing React code, dependencies, Capacitor configuration, or native plugins.

Do not edit `android/app/src/main/assets/public`. Capacitor regenerates that directory.

## Validation commands

From `frontend`:

```bash
npm run lint
npm run build
npm run android:check
```

- `npm run build` validates the browser PWA build.
- `npm run android:check` syncs the native bundle, runs Android lint and local tests, then creates debug app and test APKs.
- The debug APK is generated at `android/app/build/outputs/apk/debug/app-debug.apk`.

To run the device test on a connected phone or active emulator:

```bash
cd android
./gradlew connectedDebugAndroidTest
```

## Backend and environment

The Android build uses `VITE_API_BASE_URL` when it is present. Otherwise, the current production Render API is used.

```env
VITE_API_BASE_URL=https://your-api.example.com
```

Capacitor serves bundled content from `https://localhost`. The backend CORS list must keep this origin. Production traffic must use HTTPS because the Android app blocks cleartext HTTP.

The website deployment still uses:

```bash
npm run build
```

The standard web build includes the PWA service worker. The Android build excludes it intentionally.

## Versioning

Before every store release, update these values in `android/app/build.gradle`:

```gradle
versionCode 2
versionName "1.1.0"
```

`versionCode` must increase for every uploaded release. `versionName` is the version shown to users.

## Signed release bundle

1. Open the project with `npm run android:open`.
2. In Android Studio, choose **Build > Generate Signed App Bundle or APK**.
3. Select **Android App Bundle**.
4. Create or select a release keystore.
5. Store the keystore and its passwords in a secure password manager and backup location.
6. Build the release bundle and test it before upload.

Keystores, signing property files, APKs, and app bundles are ignored by Git. Never commit or share signing credentials. Losing the upload key can complicate future releases.

## Release checklist

1. Test the normal web build and deployed website.
2. Confirm the backend health endpoint and main API routes work over HTTPS.
3. Run `npm run android:check`.
4. Test startup, theme switching, back navigation, Sarathi, search, scripture reading, rotation, offline mode, and returning from the background on a physical phone.
5. Test at least one Android 7 device or emulator and one recent Android version.
6. Increase `versionCode` and update `versionName`.
7. Generate a signed Android App Bundle.
8. Keep the mapping and release artifacts from each published version.

## Adding future native features

Prefer an official Capacitor plugin when the web platform cannot provide the feature. Examples include notifications, secure storage, sharing, haptics, camera access, and deep links.

The normal sequence is:

```bash
npm install @capacitor/plugin-name
npm run android:sync
```

Then add the feature behind a native-platform check so browser behavior remains unchanged. Review Android permissions before release and request only what the feature needs.

## Cost expectations

Capacitor, Android Studio, local builds, and the current application code are free. A Google Play developer account has a separate registration cost if the app is published through Google Play. Hosting or AI usage may also need paid plans later if real traffic exceeds the free allowances.
