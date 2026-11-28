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


def runtime_version_key(runtime: str) -> tuple[int, ...]:
    """Return the numeric iOS runtime version for deterministic newest-first selection."""
    marker = ".iOS-"
    if marker not in runtime:
        return (0,)
    parts = runtime.split(marker, 1)[1].split("-")
    try:
        return tuple(int(part) for part in parts)
    except ValueError:
        return (0,)


def capture_runtime_logs(udid: str, window: str = "3m") -> None:
    """Persist simulator diagnostics on both successful and failed launches."""
    RUNTIME_LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    command = [
        "xcrun", "simctl", "spawn", udid, "log", "show",
        "--last", window, "--style", "compact",
        "--predicate",
        'process == "App" OR process == "WebContent" OR process == "SpringBoard" '
        'OR subsystem CONTAINS[c] "WebKit" OR subsystem CONTAINS[c] "CoreSimulator"',
    ]
    try:
        result = run(
            command,
            timeout_seconds=30,
            check=False,
            capture_output=True,
        )
        RUNTIME_LOG_PATH.write_text(result.stdout or "", encoding="utf-8")
    except RuntimeError as error:
        RUNTIME_LOG_PATH.write_text(
            f"Runtime log capture skipped: {error}\n",
            encoding="utf-8",
        )
        print("Runtime log capture timed out; diagnostic note was saved.", flush=True)


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
        {
            "runtime": runtime,
            "runtime_version": runtime_version_key(runtime),
            "device": device,
        }
        for runtime, devices in devices_data.get("devices", {}).items()
        if runtime.startswith("com.apple.CoreSimulator.SimRuntime.iOS-")
        for device in devices
        if device.get("isAvailable") and device.get("name", "").startswith("iPhone")
    ]
    if not candidates:
        raise SystemExit("No available iPhone simulator was found")

    # Prefer the newest installed iOS runtime, then a standard iPhone 17 Pro.
    # The former name-only sort selected iPhone Air on an older runtime.
    candidates.sort(
        key=lambda candidate: (
            candidate["runtime_version"],
            candidate["device"].get("name") == "iPhone 17 Pro",
            candidate["device"].get("name") == "iPhone 17",
        ),
        reverse=True,
    )
    selected = candidates[0]
    device = selected["device"]
    udid = device["udid"]
    print(
        f"Using {device['name']} on {selected['runtime']} ({udid}), "
        f"current state: {device.get('state')}",
        flush=True,
    )

    if device.get("state") != "Booted":
        run(["xcrun", "simctl", "boot", udid], timeout_seconds=45)
    run(["xcrun", "simctl", "bootstatus", udid, "-b"], timeout_seconds=180)

    try:
        run(["xcrun", "simctl", "install", udid, str(APP_PATH)], timeout_seconds=120)
        run(["xcrun", "simctl", "launch", udid, BUNDLE_ID], timeout_seconds=120)
    except (RuntimeError, subprocess.CalledProcessError) as error:
        capture_runtime_logs(udid)
        raise RuntimeError(
            f"{error}. Simulator diagnostics saved to {RUNTIME_LOG_PATH}"
        ) from error

    # Allow the bundled WKWebView to paint before taking a visual checkpoint.
    time.sleep(15)
    SCREENSHOT_PATH.parent.mkdir(parents=True, exist_ok=True)
    screenshot_command = ["xcrun", "simctl", "io", udid, "screenshot", str(SCREENSHOT_PATH)]
    screenshot_error: Exception | None = None
    for attempt in range(1, 3):
        try:
            if SCREENSHOT_PATH.exists():
                SCREENSHOT_PATH.unlink()
            run(screenshot_command, timeout_seconds=90)
            if SCREENSHOT_PATH.is_file() and SCREENSHOT_PATH.stat().st_size >= 10_000:
                screenshot_error = None
                break
            screenshot_error = RuntimeError("Simulator screenshot was missing or unexpectedly small")
        except (RuntimeError, subprocess.CalledProcessError) as error:
            screenshot_error = error
        if attempt < 2:
            print(f"Screenshot attempt {attempt} failed: {screenshot_error}; retrying once.", flush=True)
            time.sleep(5)
    if screenshot_error is not None:
        capture_runtime_logs(udid)
        raise RuntimeError(
            f"Simulator screenshot failed after two attempts: {screenshot_error}"
        ) from screenshot_error

    capture_runtime_logs(udid, window="1m")

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
