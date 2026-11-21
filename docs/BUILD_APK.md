# Building the Android APK

Low Poly Studio is a plain HTML app with **no build step and no network requests**. The Android
package is produced with [Capacitor](https://capacitorjs.com/), which wraps the static app in a
WebView and serves it from `https://localhost` inside the app.

There are three ways to get an APK:

| Route | Best for | Needs |
| --- | --- | --- |
| GitHub Actions (included) | getting an APK without installing anything | a GitHub account |
| `npm run apk` locally | iterating on the app | Node 22+, JDK 21, Android SDK |
| Android Studio | debugging / publishing | Android Studio + SDK |

---

## 1. GitHub Actions — zero local setup

The repository ships `.github/workflows/android.yml`.

1. Push to `main` (or open **Actions → Build Android APK → Run workflow**).
2. Wait for the **Assemble debug APK** job.
3. Download the **lowpoly-studio-debug-apk** artifact at the bottom of the run.
4. Unzip it and install `lowpoly-studio-debug.apk` on the phone
   (allow “Install unknown apps” for your file manager / browser).

The workflow runs the headless tests first, then:

```
npm ci → npm run www → npx cap add android → npx cap sync android → ./gradlew assembleDebug
```

---

## 2. Local APK build

### Prerequisites

- **Node.js 22+**
- **JDK 21** (`java -version` should say 21)
- **Android SDK** with platform 35 and build-tools 35.0.0
  - Easiest: install [Android Studio](https://developer.android.com/studio) and let it install the SDK.
  - Then export `ANDROID_HOME` (or `ANDROID_SDK_ROOT`) and add `platform-tools` to `PATH`.

### Build

```bash
npm install
npm run apk
```

What that does:

1. `scripts/prepare-www.mjs` copies `index.html`, `css/` and `src/` into `www/`
   (the app is fully self-contained — three.js is vendored in `src/vendor/`).
2. `npx cap add android` creates `android/` the first time only.
3. `npx cap sync android` copies `www/` and plugin metadata into the native project.
4. Gradle builds the debug APK and it is copied to **`dist/lowpoly-studio-debug.apk`**.

Install it:

```bash
adb install -r dist/lowpoly-studio-debug.apk
```

### Useful commands

```bash
npm run dev        # local web preview at http://localhost:5173
npm run www        # rebuild www/ only
npm run cap:sync   # www/ + cap sync
npm run android    # open the native project in Android Studio
npm run apk:release
```

> On Windows use Git Bash / PowerShell with `JAVA_HOME` and `ANDROID_HOME` set; the build script
> automatically uses `gradlew.bat`.

---

## 3. Android Studio

```bash
npm run www
npx cap add android     # first time
npx cap sync android
npx cap open android
```

Then **Run ▶** on a device or emulator. The emulator needs hardware GL enabled
(`-gpu host` or `-gpu angle_indirect`) for Three.js to render.

---

## Release (signed) build

A debug APK is fine for personal use and screen recording, but it is signed with a debug key.
For a proper release:

1. Create a keystore (keep it safe, never commit it):
   ```bash
   keytool -genkey -v -keystore lowpoly-release.keystore -alias lowpoly \
     -keyalg RSA -keysize 2048 -validity 10000
   ```
2. Sync once (`npm run cap:sync`) so `android/` exists.
3. Add `android/keystore.properties` (git-ignored by `android/` being ignored):
   ```properties
   storeFile=../../lowpoly-release.keystore
   storePassword=********
   keyAlias=lowpoly
   keyPassword=********
   ```
4. In `android/app/build.gradle` add above `android { … }`:
   ```gradle
   def keystoreProperties = new Properties()
   def keystorePropertiesFile = rootProject.file('keystore.properties')
   if (keystorePropertiesFile.exists()) {
       keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
   }
   ```
   and inside `android { … }`:
   ```gradle
   signingConfigs {
       release {
           if (keystorePropertiesFile.exists()) {
               keyAlias keystoreProperties['keyAlias']
               keyPassword keystoreProperties['keyPassword']
               storeFile file(keystoreProperties['storeFile'])
               storePassword keystoreProperties['storePassword']
           }
       }
   }
   buildTypes {
       release {
           signingConfig signingConfigs.release
           minifyEnabled false
       }
   }
   ```
5. Build:
   ```bash
   npm run apk:release
   ```
   Output: `dist/lowpoly-studio-release.apk`. Because `android/` is generated, re-apply these
   edits after deleting the folder.

For CI-signed releases, add the keystore as a base64 secret, decode it in a workflow step, write
`keystore.properties`, then run `./gradlew assembleRelease`. The workflow included here intentionally
only builds an unsigned/debug APK.

---

## Saving files on Android

The web build downloads projects, screenshots and dialogue as normal browser downloads. Inside the
APK those go through Capacitor's **Filesystem + Share** plugins (`@capacitor/filesystem`,
`@capacitor/share`), so Android shows its native share/save sheet and the file lands wherever you
choose. `cap sync` registers the plugins automatically — no extra steps.

## App configuration

`capacitor.config.json`:

- `appId` — `app.lowpoly.studio` (change before publishing)
- `appName` — shown under the launcher icon
- `webDir` — `www`
- `server.androidScheme` — `https`, so ES modules and import maps behave exactly like the browser

### Icons & splash

Capacitor’s generated project uses its default icon. Replace:

- `android/app/src/main/res/mipmap-*/ic_launcher*.png`
- `android/app/src/main/res/drawable*/splash.png`

with your artwork (or use [`@capacitor/assets`](https://github.com/ionic-team/capacitor-assets):
`npx capacitor-assets generate --android`).

### Orientation

The editor is responsive and works in both orientations, so the manifest is left on `sensor`.
If you always record in landscape, add to
`android/app/src/main/AndroidManifest.xml` inside `<activity>`:

```xml
android:screenOrientation="sensorLandscape"
```

### Status bar / immersive recording

The app has its own **Clean UI** mode (button or <kbd>H</kbd>), which hides every panel and overlay;
<kbd>P</kbd> plays the visual novel and <kbd>C</kbd> plays the camera sequence while it is hidden.
For a full immersive view, add the
[`@capacitor/status-bar`](https://capacitorjs.com/docs/apis/status-bar) plugin and call
`StatusBar.hide()` on start, or set `android:theme` to a fullscreen theme in
`android/app/src/main/res/values/styles.xml`.

---

## Troubleshooting

| Problem | Fix |
| --- | --- |
| `JAVA_HOME is not set` / unsupported class file | Install JDK 21 and point `JAVA_HOME` at it. Capacitor 7 requires Java 21. |
| `SDK location not found` | Set `ANDROID_HOME` and create `android/local.properties` with `sdk.dir=/path/to/sdk`, or open the project in Android Studio once. |
| Gradle can’t download dependencies | First build needs internet; subsequent builds are offline. |
| Black screen in the app | The device WebView is too old. Update **Android System WebView** from the Play Store (Chromium 89+ is required for import maps/ES modules). |
| 3D is dark / broken on emulator | Enable hardware GPU acceleration for the emulator. |
| Changes don’t show up in the APK | Run `npm run cap:sync` before rebuilding; `www/` is what gets bundled. |
| `cap add android` says the directory already exists | It is already generated — just run `npm run cap:sync`. |
| Build works locally but not in CI | Check that `package-lock.json` is committed so `npm ci` can resolve Capacitor. |
