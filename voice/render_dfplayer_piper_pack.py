#!/usr/bin/env python3
"""Render the numbered iCart prompts with the kiosk's installed Piper voice."""
from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import tempfile
import zipfile
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--piper", default="/opt/piper/piper")
    parser.add_argument("--model", required=True)
    parser.add_argument("--map", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--ffmpeg", default="/usr/bin/ffmpeg")
    args = parser.parse_args()

    piper = shutil.which(args.piper) or args.piper
    ffmpeg = shutil.which(args.ffmpeg) or args.ffmpeg
    if not Path(piper).is_file():
        parser.error(f"Piper executable not found: {piper}")
    if not Path(ffmpeg).is_file():
        parser.error(f"FFmpeg executable not found: {ffmpeg}")

    prompt_rows = json.loads(Path(args.map).read_text(encoding="utf-8-sig"))
    output_zip = Path(args.output).resolve()
    output_zip.parent.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory(prefix="icart-piper-prompts-") as work:
        work_dir = Path(work)
        mp3_dir = work_dir / "mp3"
        mp3_dir.mkdir()
        for row in prompt_rows:
            track = int(row["track"])
            message = str(row["message"])
            wav_path = work_dir / f"{track:04d}.wav"
            mp3_path = mp3_dir / f"{track:04d}.mp3"
            subprocess.run(
                [piper, "--model", args.model, "--output_file", str(wav_path)],
                input=f"{message}\n", text=True, check=True,
            )
            subprocess.run(
                [ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-i", str(wav_path),
                 "-codec:a", "libmp3lame", "-b:a", "96k", "-ar", "44100", "-ac", "1", str(mp3_path)],
                check=True,
            )

        with zipfile.ZipFile(output_zip, "w", compression=zipfile.ZIP_DEFLATED) as archive:
            for mp3_path in sorted(mp3_dir.glob("*.mp3")):
                archive.write(mp3_path, f"mp3/{mp3_path.name}")
            archive.write(Path(args.map), "prompt-map.json")

    print(f"Created {output_zip} with {len(prompt_rows)} Piper prompts.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
