#!/usr/bin/env bash
set -euo pipefail

PROJECT_FILE="ios/App/App.xcodeproj/project.pbxproj"
INFO_PLIST="ios/App/App/Info.plist"
ENTITLEMENTS="ios/App/App/App.entitlements"

for file in "$PROJECT_FILE" "$INFO_PLIST"; do
  if [[ ! -f "$file" ]]; then
    echo "::error::Expected Capacitor iOS file is missing: $file"
    exit 1
  fi
done

set_plist_string() {
  local key="$1"
  local value="$2"
  if /usr/libexec/PlistBuddy -c "Print :$key" "$INFO_PLIST" >/dev/null 2>&1; then
    /usr/libexec/PlistBuddy -c "Set :$key $value" "$INFO_PLIST"
  else
    /usr/libexec/PlistBuddy -c "Add :$key string $value" "$INFO_PLIST"
  fi
}

set_plist_string "NSCameraUsageDescription" "Rutex Master uses the camera when you choose to capture a question or study image."
set_plist_string "NSPhotoLibraryUsageDescription" "Rutex Master accesses photos you choose to attach to questions, answers and your profile."
set_plist_string "NSPhotoLibraryAddUsageDescription" "Rutex Master saves an image only when you choose to save or export it."
set_plist_string "NSMicrophoneUsageDescription" "Rutex Master uses the microphone when you choose to record a voice note or use voice input."

cat > "$ENTITLEMENTS" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>aps-environment</key>
  <string>$(APS_ENVIRONMENT)</string>
</dict>
</plist>
PLIST

python3 <<'PY'
from pathlib import Path
import re

path = Path("ios/App/App.xcodeproj/project.pbxproj")
text = path.read_text(encoding="utf-8")

# Attach the push entitlement file to every app build configuration and select
# the correct APNs environment for Debug vs Release/Profile.
for config, apns_env in (("Debug", "development"), ("Release", "production"), ("Profile", "production")):
    pattern = re.compile(
        rf"(\/\* {config} \*\/ = \{{.*?PRODUCT_BUNDLE_IDENTIFIER = [^;]+;)",
        re.S,
    )
    text, count = pattern.subn(
        lambda m: m.group(1).replace(
            "PRODUCT_BUNDLE_IDENTIFIER = ",
            "CODE_SIGN_ENTITLEMENTS = App/App.entitlements;\n\t\t\t\tAPS_ENVIRONMENT = " + apns_env + ";\n\t\t\t\tPRODUCT_BUNDLE_IDENTIFIER = ",
            1,
        ),
        text,
    )
    if count == 0:
        # Capacitor template changes are a hard failure, not a silent omission.
        raise SystemExit(f"Could not attach APNs entitlements to {config} build settings")

# Preserve the native app's stable bundle identifier.
if "PRODUCT_BUNDLE_IDENTIFIER = com.jupeb.master;" not in text:
    raise SystemExit("Expected iOS bundle identifier com.jupeb.master was not found")

path.write_text(text, encoding="utf-8")
print("Configured camera, photo-library and microphone usage descriptions.")
print("Configured development/production APNs entitlement build settings.")
PY

/usr/libexec/PlistBuddy -c "Print :NSCameraUsageDescription" "$INFO_PLIST" >/dev/null
/usr/libexec/PlistBuddy -c "Print :NSPhotoLibraryUsageDescription" "$INFO_PLIST" >/dev/null
/usr/libexec/PlistBuddy -c "Print :NSMicrophoneUsageDescription" "$INFO_PLIST" >/dev/null
/usr/libexec/PlistBuddy -c "Print :aps-environment" "$ENTITLEMENTS" >/dev/null 2>&1 || true

echo "iOS privacy and APNs project configuration completed."
