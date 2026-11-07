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
        (tuple(int(part) for part in runtime.split("iOS-", 1)[1].split("-")), device)
        for runtime, devices in devices_data.get("devices", {}).items()
        if runtime.startswith("com.apple.CoreSimulator.SimRuntime.iOS-")
        for device in devices
        if device.get("isAvailable") and device.get("name", "").startswith("iPhone")
    ]
    if not candidates:
        raise SystemExit("No available iPhone simulator was found")
    # Prefer the newest installed iOS runtime, then a mainstream iPhone model.
    candidates.sort(
        key=lambda item: (item[0], item[1].get("name") == "iPhone 17 Pro"),
        reverse=True,
    )
    device = candidates[0][1]
    udid = device["udid"]
    print(f"Using {device['name']} ({udid}), current state: {device.get('state')}", flush=True)

    if device.get("state") != "Booted":
        run(["xcrun", "simctl", "boot", udid], timeout_seconds=45)
    run(["xcrun", "simctl", "bootstatus", udid, "-b"], timeout_seconds=180)
    run(["xcrun", "simctl", "install", udid, str(APP_PATH)], timeout_seconds=120)
    run(["xcrun", "simctl", "launch", udid, BUNDLE_ID], timeout_seconds=60)

    # Allow the bundled WKWebView to paint before taking a visual checkpoint.
    time.sleep(15)
    SCREENSHOT_PATH.parent.mkdir(parents=True, exist_ok=True)
    screenshot_command = ["xcrun", "simctl", "io", udid, "screenshot", str(SCREENSHOT_PATH)]
    screenshot_error: RuntimeError | None = None
    for attempt in range(2):
        try:
            run(screenshot_command, timeout_seconds=120)
            screenshot_error = None
            break
        except RuntimeError as error:
            screenshot_error = error
            if attempt == 0:
                print(
                    "First simulator screenshot attempt timed out; relaunching the app "
                    "and retrying once.",
                    flush=True,
                )
                run(
                    ["xcrun", "simctl", "terminate", udid, BUNDLE_ID],
                    timeout_seconds=30,
                    check=False,
                )
                run(["xcrun", "simctl", "launch", udid, BUNDLE_ID], timeout_seconds=90)
                time.sleep(15)
    if screenshot_error is not None:
        raise screenshot_error
    if not SCREENSHOT_PATH.is_file() or SCREENSHOT_PATH.stat().st_size < 10_000:
        raise RuntimeError("Simulator screenshot was missing or unexpectedly small")

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
        RUNTIME_LOG_PATH.write_text(log_result.stdout or "", encoding="utf-8")
    except RuntimeError as error:
        RUNTIME_LOG_PATH.write_text(
            f"Runtime log capture skipped: {error}\n",
            encoding="utf-8",
        )
        print("Runtime log capture timed out; keeping the verified screenshot.", flush=True)

    # App installation, launch and screenshot are the release gate. Cleanup
    # is best-effort and is itself time-bounded.
    try:
        run(["xcrun", "simctl", "terminate", udid, BUNDLE_ID], timeout_seconds=20, check=False)
    except RuntimeError as error:
        print(f"Simulator cleanup warning: {error}", flush=True)

    print(f"Installed and launched {BUNDLE_ID}; screenshot: {SCREENSHOT_PATH}", flush=True)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (RuntimeError, subprocess.CalledProcessError, json.JSONDecodeError) as error:
        print(f"::error::{error}", file=sys.stderr, flush=True)
        raise SystemExit(1)
