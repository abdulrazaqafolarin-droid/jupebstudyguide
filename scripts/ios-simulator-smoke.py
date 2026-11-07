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
PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"


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


def is_valid_png_screenshot(path: Path) -> bool:
    """Reject truncated or non-PNG simulator output before uploading an artifact."""
    try:
        if path.stat().st_size < 10_000:
            return False
        with path.open("rb") as screenshot_file:
            header = screenshot_file.read(24)
    except OSError:
        return False

    return (
        len(header) == 24
        and header[:8] == PNG_SIGNATURE
        and header[12:16] == b"IHDR"
    )


def is_app_installed(udid: str) -> bool:
    """Check whether simctl completed an install before its command timed out."""
    try:
        result = run(
            ["xcrun", "simctl", "get_app_container", udid, BUNDLE_ID, "app"],
            timeout_seconds=30,
            check=False,
            capture_output=True,
        )
        return result.returncode == 0 and bool((result.stdout or "").strip())
    except RuntimeError:
        return False


def install_app_with_retries(udid: str) -> None:
    """Retry slow first-boot installation and verify state after each attempt."""
    errors: list[str] = []
    command = ["xcrun", "simctl", "install", udid, str(APP_PATH)]

    for attempt, timeout_seconds in enumerate((180, 240), start=1):
        try:
            result = run(
                command,
                timeout_seconds=timeout_seconds,
                check=False,
                capture_output=True,
            )
            if result.returncode == 0:
                return
            errors.append(
                f"attempt {attempt} exited {result.returncode}: "
                f"{(result.stderr or result.stdout or '').strip()}"
            )
        except RuntimeError as error:
            errors.append(str(error))

        # simctl install can time out even after it has installed the bundle.
        if is_app_installed(udid):
            print("App bundle is installed despite a slow simctl response.", flush=True)
            return

        if attempt < 2:
            time.sleep(8)

    if is_app_installed(udid):
        print("App bundle is installed after the final install retry.", flush=True)
        return

    raise RuntimeError(
        "Simulator did not confirm app installation after retries. "
        + " | ".join(errors)
    )


def launch_app_with_retries(udid: str) -> None:
    """Give a cold simulator extra time to finish its first app launch."""
    errors: list[str] = []
    command = ["xcrun", "simctl", "launch", udid, BUNDLE_ID]

    for attempt, timeout_seconds in enumerate((90, 120), start=1):
        try:
            result = run(
                command,
                timeout_seconds=timeout_seconds,
                check=False,
                capture_output=True,
            )
            if result.returncode == 0:
                if result.stdout:
                    print(result.stdout.strip(), flush=True)
                return
            errors.append(
                f"attempt {attempt} exited {result.returncode}: "
                f"{(result.stderr or result.stdout or '').strip()}"
            )
        except RuntimeError as error:
            errors.append(str(error))

        # simctl can time out after SpringBoard has already started the app.
        # Check the launchd service list before retrying the same launch.
        try:
            processes = run(
                ["xcrun", "simctl", "spawn", udid, "launchctl", "list"],
                timeout_seconds=25,
                check=False,
                capture_output=True,
            )
            if BUNDLE_ID in (processes.stdout or ""):
                print("App process is active after a slow simulator launch.", flush=True)
                return
        except RuntimeError as error:
            errors.append(f"process check: {error}")

        if attempt < 2:
            time.sleep(5)

    raise RuntimeError(
        "Simulator did not confirm the app launch after retries. "
        + " | ".join(errors)
    )


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
    run(["xcrun", "simctl", "bootstatus", udid, "-b"], timeout_seconds=180)
    install_app_with_retries(udid)
    launch_app_with_retries(udid)

    # Allow the bundled WKWebView to paint before taking a visual checkpoint.
    time.sleep(15)
    SCREENSHOT_PATH.parent.mkdir(parents=True, exist_ok=True)
    screenshot_command = ["xcrun", "simctl", "io", udid, "screenshot", str(SCREENSHOT_PATH)]
    screenshot_errors: list[str] = []
    screenshot_verified = False

    # Fresh simulator boots can spend several minutes migrating CoreSimulator
    # data. A screenshot command may time out even after the simulator has
    # produced the image, so verify the output before treating a timeout as a
    # failed app launch. Retry once with a longer bound if no valid image exists.
    for attempt, timeout_seconds in enumerate((60, 90), start=1):
        try:
            run(screenshot_command, timeout_seconds=timeout_seconds)
        except RuntimeError as error:
            screenshot_errors.append(str(error))
            print(f"Screenshot attempt {attempt} did not return cleanly: {error}", flush=True)

        if is_valid_png_screenshot(SCREENSHOT_PATH):
            screenshot_verified = True
            break

        if attempt < 2:
            time.sleep(3)

    if not screenshot_verified:
        raise RuntimeError(
            "Simulator screenshot was missing, invalid, or unexpectedly small after retries. "
            + " | ".join(screenshot_errors)
        )

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
