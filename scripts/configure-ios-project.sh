#!/usr/bin/env bash
set -euo pipefail

PROJECT_FILE="ios/App/App.xcodeproj/project.pbxproj"
INFO_PLIST="ios/App/App/Info.plist"
ENTITLEMENTS="ios/App/App/App.entitlements"
PODFILE="ios/App/Podfile"

for file in "$PROJECT_FILE" "$INFO_PLIST"; do
  if [[ ! -f "$file" ]]; then
    echo "::error::Expected Capacitor iOS file is missing: $file"
    exit 1
  fi
done

python3 - "$INFO_PLIST" <<'PY'
from pathlib import Path
import plistlib
import sys

path = Path(sys.argv[1])
with path.open("rb") as source:
    info = plistlib.load(source)

info["CFBundleDisplayName"] = "Rutex Master(Jupeb)"
info["NSCameraUsageDescription"] = "Rutex Master uses the camera when you choose to capture a question or study image."
info["NSPhotoLibraryUsageDescription"] = "Rutex Master accesses photos you choose to attach to questions, answers and your profile."
info["NSPhotoLibraryAddUsageDescription"] = "Rutex Master saves an image only when you choose to save or export it."
info["NSMicrophoneUsageDescription"] = "Rutex Master uses the microphone when you choose to record a voice note or use voice input."

scheme = "com.jupeb.master"
url_types = info.setdefault("CFBundleURLTypes", [])
matching_type = next(
    (item for item in url_types if scheme in item.get("CFBundleURLSchemes", [])),
    None,
)
if matching_type is None:
    url_types.append({
        "CFBundleURLName": scheme,
        "CFBundleURLSchemes": [scheme],
    })

with path.open("wb") as destination:
    plistlib.dump(info, destination, fmt=plistlib.FMT_XML, sort_keys=False)
print("Configured iOS display name, URL callback scheme and privacy descriptions.")
PY

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

python3 - "$PROJECT_FILE" <<'PY'
from pathlib import Path
import re
import sys

path = Path(sys.argv[1])
text = path.read_text(encoding="utf-8")

# Edit only the app target's XCBuildConfiguration blocks. A broad search for
# PRODUCT_BUNDLE_IDENTIFIER could otherwise cross Xcode configuration blocks.
config_starts = list(re.finditer(r"/\\* (Debug|Release|Profile) \\*/ = \\{", text))
updates = {"Debug": 0, "Release": 0, "Profile": 0}
settings = {
    "CODE_SIGN_ENTITLEMENTS": "App/App.entitlements",
    "APS_ENVIRONMENT": None,
    "IPHONEOS_DEPLOYMENT_TARGET": "15.0",
}

for match in reversed(config_starts):
    config = match.group(1)
    start = match.end() - 1
    depth = 0
    end = None
    for index in range(start, len(text)):
        if text[index] == "{":
            depth += 1
        elif text[index] == "}":
            depth -= 1
            if depth == 0:
                end = index + 1
                break
    if end is None:
        raise SystemExit(f"Unclosed Xcode {config} build configuration")

    block = text[match.start():end]
    if "PRODUCT_BUNDLE_IDENTIFIER = com.jupeb.master;" not in block:
        continue
    if updates[config]:
        raise SystemExit(f"Found multiple app {config} configurations; review required")

    build_settings = re.search(r"buildSettings = \\{", block)
    if not build_settings:
        raise SystemExit(f"App {config} configuration has no buildSettings section")

    apns_env = "development" if config == "Debug" else "production"
    settings["APS_ENVIRONMENT"] = apns_env
    block_lines = block.splitlines()
    cleaned_lines = [
        line for line in block_lines
        if not any(re.match(rf"^\\s*{re.escape(key)}\\s*=", line) for key in settings)
    ]
    for index, line in enumerate(cleaned_lines):
        if "buildSettings = {" in line:
            indent = re.match(r"^\\s*", line).group(0) + "    "
            additions = [
                f"{indent}{key} = {value};"
                for key, value in settings.items()
            ]
            cleaned_lines[index + 1:index + 1] = additions
            break
    else:
        raise SystemExit(f"Could not insert settings into app {config} build configuration")

    new_block = "\\n".join(cleaned_lines)
    text = text[:match.start()] + new_block + text[end:]
    updates[config] += 1

for config in ("Debug", "Release"):
    if updates[config] != 1:
        raise SystemExit(f"Expected exactly one Rutex app {config} configuration, found {updates[config]}")
if updates["Profile"] > 1:
    raise SystemExit("Found multiple Rutex app Profile configurations")

if "PRODUCT_BUNDLE_IDENTIFIER = com.jupeb.master;" not in text:
    raise SystemExit("Expected iOS bundle identifier com.jupeb.master was not found")
path.write_text(text, encoding="utf-8")
print("Configured iOS 15 minimum and development/production APNs entitlements.")
PY

if [[ -f "$PODFILE" ]]; then
  python3 - "$PODFILE" <<'PY'
from pathlib import Path
import re
import sys
path = Path(sys.argv[1])
content = path.read_text(encoding="utf-8")
if re.search(r"^platform :ios,", content, flags=re.M):
    content = re.sub(r"^platform :ios,.*$", "platform :ios, '15.0'", content, count=1, flags=re.M)
else:
    content = "platform :ios, '15.0'\n" + content
path.write_text(content, encoding="utf-8")
PY
fi

plutil -lint "$INFO_PLIST"
plutil -lint "$ENTITLEMENTS"
/usr/libexec/PlistBuddy -c "Print :CFBundleDisplayName" "$INFO_PLIST" | grep -Fx "Rutex Master(Jupeb)" >/dev/null
/usr/libexec/PlistBuddy -c "Print :NSCameraUsageDescription" "$INFO_PLIST" >/dev/null
/usr/libexec/PlistBuddy -c "Print :NSPhotoLibraryUsageDescription" "$INFO_PLIST" >/dev/null
/usr/libexec/PlistBuddy -c "Print :NSMicrophoneUsageDescription" "$INFO_PLIST" >/dev/null
/usr/libexec/PlistBuddy -c "Print :CFBundleURLTypes:0:CFBundleURLSchemes:0" "$INFO_PLIST" | grep -Fx "com.jupeb.master" >/dev/null

echo "iOS privacy, deep-link and APNs project configuration completed."
