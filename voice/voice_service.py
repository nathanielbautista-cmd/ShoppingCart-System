#!/usr/bin/env python3
"""Non-blocking, offline text-to-speech service for the iCart speaker."""
import argparse
import logging
import queue
import shutil
import subprocess
import threading
import time

from voice_config import (
    LOG_LEVEL,
    TTS_COMMAND,
    TTS_RATE,
    TTS_VOICE,
    TTS_VOLUME,
    VOICE_DEBOUNCE_MS,
)


logging.basicConfig(level=LOG_LEVEL, format="[Voice] %(message)s")
logger = logging.getLogger("icart.voice")


class VoiceService:
    """Queue speech so a TTS process never blocks scanner or hardware work."""

    def __init__(self):
        self._messages: queue.Queue[str | None] = queue.Queue()
        self._last_message = ""
        self._last_message_time = 0.0
        self._stopped = threading.Event()
        self._worker = threading.Thread(target=self._run, name="icart-voice", daemon=True)
        self._worker.start()

    def speak(self, message: str) -> bool:
        """Queue one message. Returns False only when it is an immediate duplicate."""
        clean_message = " ".join(message.split())
        if not clean_message:
            return False

        now = time.monotonic()
        elapsed_ms = (now - self._last_message_time) * 1000
        if clean_message == self._last_message and elapsed_ms < VOICE_DEBOUNCE_MS:
            logger.info("Duplicate ignored: %s", clean_message)
            return False

        self._last_message = clean_message
        self._last_message_time = now
        self._messages.put(clean_message)
        logger.info("Queued: %s", clean_message)
        return True

    def stop(self) -> None:
        if not self._stopped.is_set():
            self._stopped.set()
            self._messages.put(None)
            self._worker.join(timeout=3)

    def _run(self) -> None:
        while True:
            message = self._messages.get()
            try:
                if message is None:
                    return
                self._speak_now(message)
            finally:
                self._messages.task_done()

    @staticmethod
    def _speak_now(message: str) -> None:
        executable = shutil.which(TTS_COMMAND)
        if executable is None:
            logger.error("%s is not installed or not on PATH", TTS_COMMAND)
            return

        command = [
            executable,
            "-v", TTS_VOICE,
            "-s", str(TTS_RATE),
            "-a", str(TTS_VOLUME),
            message,
        ]
        try:
            subprocess.run(command, check=True, timeout=30)
        except subprocess.TimeoutExpired:
            logger.error("Speech timed out")
        except subprocess.CalledProcessError as error:
            logger.error("TTS failed with exit code %s", error.returncode)
        except OSError as error:
            logger.error("Unable to start TTS: %s", error)


def main() -> None:
    parser = argparse.ArgumentParser(description="iCart offline voice service")
    parser.add_argument("--say", help="Speak one message and exit")
    parser.add_argument("--test", action="store_true", help="Queue the standard capstone demo prompts")
    args = parser.parse_args()

    service = VoiceService()
    try:
        if args.say:
            service.speak(args.say)
        elif args.test:
            for message in (
                "Product added to cart.",
                "Please place the item in the cart.",
                "You are approaching your budget.",
                "Checkout is ready. Please proceed to the cashier.",
            ):
                service.speak(message)
        else:
            parser.print_help()
            return
        service._messages.join()
    except KeyboardInterrupt:
        logger.info("Stopped")
    finally:
        service.stop()


if __name__ == "__main__":
    main()
