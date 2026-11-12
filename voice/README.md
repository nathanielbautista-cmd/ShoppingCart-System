# iCart Phase 6: Voice Assistance

The kiosk sends every voice prompt to the local backend, which speaks through
the Raspberry Pi speaker. It prefers a Piper neural model for a natural voice,
falls back to offline `espeak-ng`, and finally uses browser speech when no local
engine is available. Speech runs in a background queue and does not block the
scanner or hardware services.

The service does not modify carts, inventory, prices, or MongoDB.

## Windows laptop kiosk

No additional TTS installation is required on Windows. When the backend runs
on the laptop, it automatically uses Windows Speech (SAPI) and the selected
Windows audio output. Optional settings in `backend/.env` are:

```ini
ICART_TTS_PROVIDER=auto
ICART_SAPI_VOICE=Microsoft David Desktop
ICART_SAPI_OUTPUT=Speakers
ICART_SAPI_RATE=0
ICART_SAPI_VOLUME=100
```

## Install on Raspberry Pi

Connect the speaker, select its output device in Raspberry Pi OS, then install
the offline TTS engine:

```bash
sudo apt update
sudo apt install -y espeak-ng alsa-utils
speaker-test -t wav -c 2
```

Stop `speaker-test` with Ctrl-C after hearing the test audio.

For a more human-sounding voice, install the Piper executable and place a
compatible English voice model at:

```text
/home/icart/icart/voice/en_US-lessac-medium.onnx
/home/icart/icart/voice/en_US-lessac-medium.onnx.json
```

The backend detects it automatically after `sudo systemctl restart
icart-backend`. Check the selected engine with:

```bash
curl http://127.0.0.1/api/hardware/voice/status
```

## Run

Copy the `voice` folder to the Pi and run:

```bash
cd ~/voice
python3 voice_service.py --say "Product added to cart."
python3 voice_service.py --test
```

## DFPlayer voice prompts

For the DFPlayer-only speaker, generate the numbered prompt tracks on a
Windows laptop with Windows Speech and FFmpeg installed:

```powershell
powershell -ExecutionPolicy Bypass -File .\voice\build_dfplayer_prompts.ps1
```

The script uses the installed Microsoft Mark male voice when available, then
falls back to an installed male desktop voice. It creates English-only numbered
tracks in `voice/dfplayer_sdcard/mp3/` and removes inactive language tracks from
that output. Copy the complete `mp3` folder to the root of the microSD card. The
ready-to-copy archive is `voice/dfplayer-sdcard-prompts.zip`. The backend
track assignments are listed in `backend/.env.example`; copy those
`ICART_DFPLAYER_TRACK_*` settings into the kiosk's `backend/.env` and restart
`icart-backend`.

## User-recorded prompts

The user's recordings are converted from `Downloads/Voice assistance` by
running `powershell.exe -ExecutionPolicy Bypass -File
voice/convert_user_voice_recordings.ps1`. The script creates
`voice/recorded_prompts/mp3/0002.mp3` through `0026.mp3` and writes the
track-to-prompt map in `voice/recorded_prompts/prompt-map.json`. Copy the
numbered MP3 files into the card's existing `mp3` folder and overwrite matching
track numbers. Track 25 is the security alarm tone; track 26 is the spoken
instruction to remove the unscanned item.

To make the DFPlayer recordings use the same Piper voice as the kiosk, use
`voice/render_dfplayer_piper_pack.py` with the kiosk's Piper model. The current
Piper-rendered archive is `voice/dfplayer-piper-sdcard-prompts.zip`; copy its
`mp3` folder to the root of the DFPlayer card. The DFPlayer plays these saved
recordings through its speaker, while the backend keeps sending the same
feedback messages used by the kiosk.

These numbered recordings contain customer-facing status messages and alerts;
they do not include spoken operating instructions. Product names, prices, and exact
budget amounts vary at runtime and require a text-to-speech engine; the DFPlayer
cannot synthesize those values from prerecorded tracks. The backend uses its
local Piper voice for dynamic messages and as a fallback when the DFPlayer card
or requested recording is unavailable. Piper audio uses the Pi's normal ALSA
output; only numbered MP3 recordings play through the DFPlayer's speaker.

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
