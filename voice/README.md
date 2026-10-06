# iCart Phase 6: Voice Assistance

The touchscreen keeps its existing browser speech-synthesis fallback. This
module is the Raspberry Pi speaker service for offline TTS. It uses `espeak-ng`
and runs speech in a background queue, so it does not block scanner or hardware
services.

The service does not modify carts, inventory, prices, or MongoDB.

## Install on Raspberry Pi

Connect the speaker, select its output device in Raspberry Pi OS, then install
the offline TTS engine:

```bash
sudo apt update
sudo apt install -y espeak-ng alsa-utils
speaker-test -t wav -c 2
```

Stop `speaker-test` with Ctrl-C after hearing the test audio.

## Run

Copy the `voice` folder to the Pi and run:

```bash
cd ~/voice
python3 voice_service.py --say "Product added to cart."
python3 voice_service.py --test
```

Expected terminal output:

```text
[Voice] Queued: Product added to cart.
```

## Debounce

The same message received within 1.5 seconds is ignored. Different messages are
queued and spoken in order. Configure the behavior without code changes:

```bash
export ICART_VOICE_DEBOUNCE_MS=2000
export ICART_TTS_RATE=145
export ICART_TTS_VOLUME=180
```
