"""Configuration for the offline Raspberry Pi iCart voice service."""
import os


TTS_COMMAND = os.environ.get("ICART_TTS_COMMAND", "espeak-ng")
TTS_VOICE = os.environ.get("ICART_TTS_VOICE", "en")
TTS_RATE = int(os.environ.get("ICART_TTS_RATE", "155"))
TTS_VOLUME = int(os.environ.get("ICART_TTS_VOLUME", "150"))
VOICE_DEBOUNCE_MS = int(os.environ.get("ICART_VOICE_DEBOUNCE_MS", "1500"))
LOG_LEVEL = os.environ.get("ICART_VOICE_LOG_LEVEL", "INFO").upper()
