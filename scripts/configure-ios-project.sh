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

# Replace the Capacitor template icon with the app's real Rutex logo.
ICON_SET="ios/App/App/Assets.xcassets/AppIcon.appiconset"
ICON_SOURCE="$(find dist/assets -maxdepth 1 -type f -name 'rutex-logo-*.jpg' -print -quit)"
if [[ ! -d "$ICON_SET" || -z "$ICON_SOURCE" ]]; then
  echo "::error::The generated iOS AppIcon set or the built Rutex logo asset is missing."
  exit 1
fi
ICON_FILENAME="$(python3 - "$ICON_SET/Contents.json" <<'PY'
import json, sys
with open(sys.argv[1], encoding="utf-8") as source:
    data = json.load(source)
images = data.get("images", [])
if len(images) != 1 or images[0].get("idiom") != "universal":
    raise SystemExit("Unexpected iOS AppIcon catalog structure; refusing to replace it blindly")
print(images[0].get("filename", ""))
PY
)"
if [[ -z "$ICON_FILENAME" ]]; then
  echo "::error::The iOS AppIcon catalog has no universal image filename."
  exit 1
fi
ICON_TARGET="$ICON_SET/$ICON_FILENAME"
sips -s format png "$ICON_SOURCE" --out "$ICON_TARGET" >/dev/null
ICON_WIDTH="$(sips -g pixelWidth "$ICON_TARGET" | awk '/pixelWidth/ { print $2 }')"
ICON_HEIGHT="$(sips -g pixelHeight "$ICON_TARGET" | awk '/pixelHeight/ { print $2 }')"
if [[ "$ICON_WIDTH" != "1024" || "$ICON_HEIGHT" != "1024" ]]; then
  sips -z 1024 1024 "$ICON_TARGET" >/dev/null
fi
echo "Installed the 1024x1024 Rutex logo as the native iOS home-screen icon."

# Replace the generic Capacitor launch artwork with the same Rutex source.
SPLASH_SET="ios/App/App/Assets.xcassets/Splash.imageset"
if [[ ! -d "$SPLASH_SET" ]]; then
  echo "::error::The generated iOS Splash imageset is missing."
  exit 1
fi
python3 - "$SPLASH_SET/Contents.json" "$SPLASH_SET" "$ICON_SOURCE" <<'PY'
import json
import subprocess
import sys
from pathlib import Path

contents_path = Path(sys.argv[1])
asset_dir = Path(sys.argv[2])
source = Path(sys.argv[3])
with contents_path.open(encoding="utf-8") as handle:
    catalog = json.load(handle)
images = [
    image for image in catalog.get("images", [])
    if image.get("idiom") == "universal" and image.get("filename")
]
if len(images) < 1:
    raise SystemExit("The iOS Splash imageset has no universal image entries")

for image in images:
    target = asset_dir / image["filename"]
    subprocess.run(
        ["sips", "-s", "format", "png", str(source), "--out", str(target)],
        check=True,
        stdout=subprocess.DEVNULL,
    )
    subprocess.run(
        ["sips", "-z", "2732", "2732", str(target)],
        check=True,
        stdout=subprocess.DEVNULL,
    )
    dimensions = subprocess.check_output(
        ["sips", "-g", "pixelWidth", "-g", "pixelHeight", str(target)],
        text=True,
    )
    if "pixelWidth: 2732" not in dimensions or "pixelHeight: 2732" not in dimensions:
        raise SystemExit(f"Unexpected splash image dimensions: {target}")
print(f"Installed Rutex splash artwork in {len(images)} iOS image slots.")
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
config_starts = list(re.finditer(r"/\* (Debug|Release|Profile) \*/ = \{", text))
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

    build_settings = re.search(r"buildSettings = \{", block)
    if not build_settings:
        raise SystemExit(f"App {config} configuration has no buildSettings section")

    settings["APS_ENVIRONMENT"] = "development" if config == "Debug" else "production"
    block_lines = block.splitlines()
    cleaned_lines = [
        line for line in block_lines
        if not any(re.match(rf"^\s*{re.escape(key)}\s*=", line) for key in settings)
    ]
    for index, line in enumerate(cleaned_lines):
        if "buildSettings = {" in line:
            indent = re.match(r"^\s*", line).group(0) + "    "
            additions = [
                f"{indent}{key} = {value};"
                for key, value in settings.items()
            ]
            cleaned_lines[index + 1:index + 1] = additions
            break
    else:
        raise SystemExit(f"Could not insert settings into app {config} build configuration")

    new_block = "\n".join(cleaned_lines)
    text = text[:match.start()] + new_block + text[end:]
    updates[config] += 1

for config in ("Debug", "Release"):
    if updates[config] != 1:
        raise SystemExit(f"Expected exactly one Rutex app {config} configuration, found {updates[config]}")
if updates["Profile"] > 1:
    raise SystemExit("Found multiple Rutex app Profile configurations")

if "PRODUCT_BUNDLE_IDENTIFIER = com.jupeb.master;" not in text:
    raise SystemExit("Expected iOS bundle identifier com.jupeb.master was not found")

# Advertise the Push Notifications capability on the app target as well as
# supplying aps-environment in App.entitlements. The capability belongs to
# the native app target, not the project or a test target.
def matching_brace_end(source: str, opening: int) -> int:
    depth = 0
    for offset in range(opening, len(source)):
        if source[offset] == "{":
            depth += 1
        elif source[offset] == "}":
            depth -= 1
            if depth == 0:
                return offset + 1
    raise SystemExit("Unclosed Xcode project block while enabling Push Notifications")

native_start = text.find("/* Begin PBXNativeTarget section */")
native_end = text.find("/* End PBXNativeTarget section */", native_start)
if native_start < 0 or native_end < 0:
    raise SystemExit("Could not locate Xcode native targets")
native_section = text[native_start:native_end]
app_target_id = None
for line in native_section.splitlines():
    if "/* App */ =" in line and line.strip().endswith("= {"):
        app_target_id = line.strip().split(" ", 1)[0]
        break
if not app_target_id or len(app_target_id) != 24:
    raise SystemExit("Could not locate the Capacitor App target")

target_attributes_marker = "TargetAttributes = {"
attributes_start = text.find(target_attributes_marker)
if attributes_start < 0:
    raise SystemExit("Could not locate Xcode TargetAttributes")
attributes_opening = attributes_start + len(target_attributes_marker) - 1
attributes_end = matching_brace_end(text, attributes_opening)
attributes_block = text[attributes_start:attributes_end]
app_target_marker = app_target_id + " = {"
app_target_offset = attributes_block.find(app_target_marker)
if app_target_offset < 0:
    raise SystemExit("Could not locate App target attributes")
app_block_opening = attributes_start + app_target_offset + len(app_target_id + " = ")
app_block_end = matching_brace_end(text, app_block_opening)
app_block = text[app_block_opening:app_block_end]

if "com.apple.Push" not in app_block:
    capabilities_marker = "SystemCapabilities = {"
    capabilities_offset = app_block.find(capabilities_marker)
    if capabilities_offset >= 0:
        capabilities_opening = capabilities_offset + len(capabilities_marker) - 1
        capabilities_end = matching_brace_end(app_block, capabilities_opening)
        line_start = app_block.rfind("\n", 0, capabilities_offset) + 1
        indent = app_block[line_start:capabilities_offset]
        insertion = (
            f"\n{indent}\tcom.apple.Push = {{\n"
            f"{indent}\t\tenabled = 1;\n"
            f"{indent}\t}};\n{indent}"
        )
        app_block = (
            app_block[:capabilities_end - 1]
            + insertion
            + app_block[capabilities_end - 1:]
        )
    else:
        provisioning_marker = "ProvisioningStyle = Automatic;"
        provisioning_offset = app_block.find(provisioning_marker)
        if provisioning_offset < 0:
            raise SystemExit("Could not locate App target provisioning style")
        line_start = app_block.rfind("\n", 0, provisioning_offset) + 1
        indent = app_block[line_start:provisioning_offset]
        insertion = (
            f"\n{indent}SystemCapabilities = {{\n"
            f"{indent}\tcom.apple.Push = {{\n"
            f"{indent}\t\tenabled = 1;\n"
            f"{indent}\t}};\n"
            f"{indent}}};"
        )
        insert_at = provisioning_offset + len(provisioning_marker)
        app_block = app_block[:insert_at] + insertion + app_block[insert_at:]

    text = (
        text[:app_block_opening]
        + app_block
        + text[app_block_end:]
    )

if "com.apple.Push = {" not in app_block:
    raise SystemExit("Failed to enable Push Notifications on the App target")

path.write_text(text, encoding="utf-8")
print("Configured iOS 15 minimum, APNs entitlements and the Xcode Push Notifications capability.")
PY

if [[ -f "$PODFILE" ]]; then
  python3 - "$PODFILE" <<'PY'
from pathlib import Path
import re
import sys

path = Path(sys.argv[1])
content = path.read_text(encoding="utf-8")
if re.search(r"^platform :ios,", content, flags=re.M):
    content = re.sub(
        r"^platform :ios,.*$",
        "platform :ios, '15.0'",
        content,
        count=1,
        flags=re.M,
    )
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
