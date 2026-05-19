#!/bin/bash
# Build JUPEB Master APK from Termux (Android phone)
# Run this script from the project root on your Android phone via Termux

set -e

echo "=== JUPEB Master APK Builder ==="
echo ""

# 1. Install dependencies if needed
echo "[1/6] Checking dependencies..."
if ! command -v node &> /dev/null; then
  pkg install -y nodejs-lts
fi
if ! command -v java &> /dev/null; then
  pkg install -y openjdk-17
fi
if [ ! -d "$PREFIX/opt/android-sdk" ]; then
  echo "Installing Android SDK..."
  pkg install -y android-sdk-34
fi

export ANDROID_HOME=$PREFIX/opt/android-sdk
export JAVA_HOME=$PREFIX/lib/jvm/openjdk-17

# 2. Install npm dependencies
echo "[2/6] Installing npm dependencies..."
npm install

# 3. Build the web app
echo "[3/6] Building web app..."
npm run build

# 4. Sync Capacitor
echo "[4/6] Syncing Capacitor..."
npx cap sync android

# 5. Build debug APK
echo "[5/6] Building debug APK..."
cd android
./gradlew assembleDebug
cd ..

# 6. Output APK location
echo ""
echo "=== BUILD COMPLETE ==="
echo "APK located at:"
echo "  android/app/build/outputs/apk/debug/app-debug.apk"
echo ""
echo "Install via:"
echo "  cp android/app/build/outputs/apk/debug/app-debug.apk /sdcard/Download/"
echo "  Then open the APK from your Downloads folder"
