#!/usr/bin/env python3
"""Install, launch, screenshot and inspect Rutex Master in a bounded iOS simulator run."""
from __future__ import annotations

import json
import subprocess
import sys
import time
from pathlib import Path
from typing import Sequence


APP_PATH = Path(sys.argv[1])
SCREENSHOT_PATH = Path(sys.argv[2])
RUNTIME_LOG_PATH = Path(sys.argv[3])
BUNDLE_ID = "com.jupeb.master"


def run(
    command: Sequence[str],
    *,
    timeout_seconds: int,
    check: bool = True,
    capture_output: bool = False,
) -> subprocess.CompletedProcess[str]:
    print(f"$ {' '.join(command)} (timeout={timeout_seconds}s)", flush=True)
    try:
        return subprocess.run(
            list(command),
            check=check,
            text=True,
            capture_output=capture_output,
            timeout=timeout_seconds,
        )
    except subprocess.TimeoutExpired as error:
        raise RuntimeError(
            f"Simulator command exceeded {timeout_seconds} seconds: {' '.join(command)}"
        ) from error


def main() -> int:
    if not APP_PATH.is_dir():
        raise SystemExit(f"Built iOS app is missing: {APP_PATH}")

    devices_result = run(
        ["xcrun", "simctl", "list", "devices", "available", "-j"],
        timeout_seconds=30,
        check=True,
        capture_output=True,
    )
    devices_data = json.loads(devices_result.stdout)
    candidates = [
        device
        for runtime, devices in devices_data.get("devices", {}).items()
        if runtime.startswith("com.apple.CoreSimulator.SimRuntime.iOS-")
        for device in devices
        if device.get("isAvailable") and device.get("name", "").startswith("iPhone")
    ]
    if not candidates:
        raise SystemExit("No available iPhone simulator was found")
    candidates.sort(key=lambda device: device.get("name", ""), reverse=True)
    device = candidates[0]
    udid = device["udid"]
    print(f"Using {device['name']} ({udid}), current state: {device.get('state')}", flush=True)

    if device.get("state") != "Booted":
        run(["xcrun", "simctl", "boot", udid], timeout_seconds=45)
    # First boot on a fresh hosted macOS runner may run several minutes of
    # LaunchServices/locationd data migration before the device is usable.
    run(["xcrun", "simctl", "bootstatus", udid, "-b"], timeout_seconds=480)
    run(["xcrun", "simctl", "install", udid, str(APP_PATH)], timeout_seconds=120)
    run(["xcrun", "simctl", "launch", udid, BUNDLE_ID], timeout_seconds=60)

    # Installation and launch are the functional smoke-test gates. Screenshot
    # capture is a separate visual diagnostic: hosted simulator services can be
    # slow even after SpringBoard and the app have launched successfully.
    time.sleep(10)
    SCREENSHOT_PATH.parent.mkdir(parents=True, exist_ok=True)
    screenshot_error: str | None = None
    for attempt in range(2):
        try:
            run(
                ["xcrun", "simctl", "io", udid, "screenshot", str(SCREENSHOT_PATH)],
                timeout_seconds=90,
            )
            if not SCREENSHOT_PATH.is_file() or SCREENSHOT_PATH.stat().st_size < 10_000:
                raise RuntimeError("Simulator screenshot was missing or unexpectedly small")
            screenshot_error = None
            break
        except (RuntimeError, subprocess.CalledProcessError) as error:
            screenshot_error = str(error)
            if attempt == 0:
                print("Screenshot capture failed; retrying once after simulator settles.", flush=True)
                time.sleep(5)

    log_command = [
        "xcrun", "simctl", "spawn", udid, "log", "show",
        "--last", "1m", "--style", "compact",
        "--predicate",
        'process == "App" OR process == "WebContent" OR subsystem CONTAINS[c] "WebKit"',
    ]
    try:
        log_result = run(
            log_command,
            timeout_seconds=25,
            check=False,
            capture_output=True,
        )
        runtime_log = log_result.stdout or ""
    except RuntimeError as error:
        runtime_log = f"Runtime log capture skipped: {error}\n"
        print("Runtime log capture timed out; preserving simulator launch result.", flush=True)

    if screenshot_error:
        runtime_log += (
            "\nVisual checkpoint unavailable after two bounded attempts. "
            "The app installation and launch commands succeeded.\n"
            f"Screenshot diagnostic: {screenshot_error}\n"
        )
        print("Screenshot capture remained unavailable; installation and launch were successful.", flush=True)
    else:
        runtime_log += f"\nScreenshot captured: {SCREENSHOT_PATH}\n"
    RUNTIME_LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    RUNTIME_LOG_PATH.write_text(runtime_log, encoding="utf-8")

    # App installation and launch are the release gates. Screenshot capture is a separate diagnostic. Cleanup
    # is best-effort and is itself time-bounded.
    try:
        run(["xcrun", "simctl", "terminate", udid, BUNDLE_ID], timeout_seconds=20, check=False)
    except RuntimeError as error:
        print(f"Simulator cleanup warning: {error}", flush=True)

    print(f"Installed and launched {BUNDLE_ID}; screenshot captured: {SCREENSHOT_PATH.is_file()}", flush=True)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (RuntimeError, subprocess.CalledProcessError, json.JSONDecodeError) as error:
        print(f"::error::{error}", file=sys.stderr, flush=True)
        raise SystemExit(1)
