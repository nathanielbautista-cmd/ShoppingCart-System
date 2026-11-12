#!/usr/bin/env python3
"""Play a numbered MP3 from a DFPlayer Mini connected over Raspberry Pi UART.

The default ``mp3`` mode plays ``/mp3/0001.mp3`` for track 1, which is the
most reliable DFPlayer layout.  No third-party Python package is required.
"""
import argparse
import os
import select
import termios
import time


BAUD_RATE = termios.B9600


def frame(command: int, parameter: int = 0, feedback: bool = False) -> bytes:
    """Build one 10-byte DFPlayer serial command frame."""
    parameter = int(parameter)
    if not 0 <= parameter <= 0xFFFF:
        raise ValueError("DFPlayer parameter must be between 0 and 65535")
    body = [0xFF, 0x06, command, 0x01 if feedback else 0x00,
            (parameter >> 8) & 0xFF, parameter & 0xFF]
    checksum = (-sum(body)) & 0xFFFF
    return bytes([0x7E, *body, (checksum >> 8) & 0xFF, checksum & 0xFF, 0xEF])


def open_uart(device: str) -> int:
    descriptor = os.open(device, os.O_RDWR | os.O_NOCTTY | os.O_SYNC)
    attributes = termios.tcgetattr(descriptor)
    attributes[0] = termios.IGNPAR
    attributes[1] = 0
    attributes[2] = termios.CS8 | termios.CREAD | termios.CLOCAL
    attributes[3] = 0
    attributes[4] = BAUD_RATE
    attributes[5] = BAUD_RATE
    attributes[6][termios.VMIN] = 0
    attributes[6][termios.VTIME] = 5
    termios.tcflush(descriptor, termios.TCIOFLUSH)
    termios.tcsetattr(descriptor, termios.TCSANOW, attributes)
    return descriptor


def send(descriptor: int, command: int, parameter: int = 0) -> None:
    os.write(descriptor, frame(command, parameter))
    termios.tcdrain(descriptor)
    # DFPlayer needs a brief gap between commands, particularly immediately
    # after selecting the TF card.
    time.sleep(0.12)


def query(descriptor: int, command: int) -> bytes:
    """Send a query that requests a reply and return its raw serial frame."""
    termios.tcflush(descriptor, termios.TCIFLUSH)
    os.write(descriptor, frame(command, feedback=True))
    termios.tcdrain(descriptor)
    incoming = bytearray()
    observed = bytearray()
    deadline = time.monotonic() + 1.0
    while time.monotonic() < deadline:
        readable, _, _ = select.select([descriptor], [], [], deadline - time.monotonic())
        if not readable:
            break
        chunk = os.read(descriptor, 32)
        incoming.extend(chunk)
        observed.extend(chunk)
        while len(incoming) >= 10:
            start = incoming.find(0x7E)
            if start < 0:
                incoming.clear()
                break
            if start:
                del incoming[:start]
            if len(incoming) < 10:
                break
            candidate = bytes(incoming[:10])
            if candidate[9] == 0xEF and candidate[3] in (command, 0x40):
                return candidate
            del incoming[:10]
    return bytes(observed)


def diagnose(device: str) -> None:
    """Report whether the module replies and whether it sees a TF card/files."""
    descriptor = open_uart(device)
    try:
        send(descriptor, 0x09, 0x0002)  # Select TF / microSD card.
        for label, command in (("status", 0x42), ("volume", 0x43), ("TF file count", 0x47)):
            response = query(descriptor, command)
            if len(response) == 10 and response[0] == 0x7E and response[-1] == 0xEF:
                value = (response[5] << 8) | response[6]
                print(f"{label}: value={value}; frame={response.hex(' ')}")
            else:
                print(f"{label}: no valid reply; raw={response.hex(' ') or '(no data)'}")
    finally:
        os.close(descriptor)


def play_track(device: str, track: int, volume: int, mode: str) -> None:
    if track < 1:
        raise ValueError("Track must be at least 1")
    if not 0 <= volume <= 30:
        raise ValueError("Volume must be between 0 and 30")

    descriptor = open_uart(device)
    try:
        send(descriptor, 0x09, 0x0002)  # Select TF / microSD card.
        response = query(descriptor, 0x47)  # Query the number of files on the TF card.
        if len(response) != 10 or response[0] != 0x7E or response[-1] != 0xEF:
            raise OSError("DFPlayer did not confirm the microSD card.")
        # Some DFPlayer clones report 0 for this query even when numbered
        # tracks inside /mp3 are playable. Do not use the global count to block
        # the MP3-folder command; the module's track playback status is the
        # useful signal for that layout.
        send(descriptor, 0x06, volume)
        # 0x12 plays /mp3/0001.mp3, while 0x03 uses the module's file index.
        send(descriptor, 0x12 if mode == "mp3" else 0x03, track)
    finally:
        os.close(descriptor)


def loop_track(device: str, track: int, volume: int, mode: str, interval: float, initial_delay: float) -> None:
    """Repeat a warning track until the parent service stops this process."""
    if track < 1:
        raise ValueError("Track must be at least 1")
    if not 0 <= volume <= 30:
        raise ValueError("Volume must be between 0 and 30")
    if interval < 1:
        raise ValueError("Loop interval must be at least 1 second")

    descriptor = open_uart(device)
    try:
        send(descriptor, 0x09, 0x0002)  # Select TF / microSD card.
        response = query(descriptor, 0x47)
        if len(response) != 10 or response[0] != 0x7E or response[-1] != 0xEF:
            raise OSError("DFPlayer did not confirm the microSD card.")
        # The global TF count can be 0 on clones with files in /mp3. Let the
        # explicit MP3-folder playback command decide whether a track is usable.
        send(descriptor, 0x06, volume)
        time.sleep(max(0, initial_delay))
        command = 0x12 if mode == "mp3" else 0x03
        while True:
            send(descriptor, command, track)
            time.sleep(interval)
    finally:
        os.close(descriptor)


def stop_playback(device: str) -> None:
    descriptor = open_uart(device)
    try:
        send(descriptor, 0x09, 0x0002)
        send(descriptor, 0x16)  # Stop playback.
    finally:
        os.close(descriptor)


def main() -> int:
    parser = argparse.ArgumentParser(description="Play an iCart DFPlayer Mini track")
    parser.add_argument("--track", type=int, help="Numbered DFPlayer MP3 track")
    parser.add_argument("--device", default=os.environ.get("ICART_DFPLAYER_DEVICE", "/dev/serial0"))
    parser.add_argument("--volume", type=int, default=int(os.environ.get("ICART_DFPLAYER_VOLUME", "22")))
    parser.add_argument("--mode", choices=("mp3", "index"), default=os.environ.get("ICART_DFPLAYER_MODE", "mp3"))
    parser.add_argument("--loop-track", type=int, help="Repeat a track until this process is stopped")
    parser.add_argument("--loop-interval", type=float, default=6.0, help="Seconds between warning announcements")
    parser.add_argument("--initial-delay", type=float, default=5.0, help="Wait before the first repeated announcement")
    parser.add_argument("--stop", action="store_true", help="Stop the currently playing DFPlayer track")
    parser.add_argument("--diagnose", action="store_true", help="Query the module and microSD over UART")
    args = parser.parse_args()
    if args.diagnose:
        diagnose(args.device)
        return 0
    if args.stop:
        stop_playback(args.device)
        return 0
    if args.loop_track is not None:
        loop_track(args.device, args.loop_track, args.volume, args.mode, args.loop_interval, args.initial_delay)
        return 0
    if args.track is None:
        parser.error("--track is required unless --diagnose is used")
    play_track(args.device, args.track, args.volume, args.mode)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError) as error:
        raise SystemExit(f"DFPlayer error: {error}") from error
