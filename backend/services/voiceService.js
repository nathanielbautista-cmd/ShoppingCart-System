const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const MAX_MESSAGE_LENGTH = 320;
const MAX_QUEUE_LENGTH = 20;
const DUPLICATE_WINDOW_MS = Number(process.env.ICART_VOICE_DEBOUNCE_MS) || 1200;

const firstExisting = (candidates) => candidates.find((candidate) => candidate && fs.existsSync(candidate)) || null;

const piperExecutable = firstExisting([
  process.env.ICART_PIPER_EXECUTABLE,
  '/usr/local/bin/piper',
  '/usr/bin/piper',
]);
const piperModel = firstExisting([
  process.env.ICART_PIPER_MODEL,
  path.join(__dirname, '..', '..', 'voice', 'en_US-lessac-medium.onnx'),
  '/home/icart/icart/voice/en_US-lessac-medium.onnx',
]);
const piperModelConfig = piperModel && fs.existsSync(`${piperModel}.json`) ? `${piperModel}.json` : null;
const audioPlayer = firstExisting([
  process.env.ICART_AUDIO_PLAYER,
  '/usr/bin/aplay',
  '/bin/aplay',
]);
const audioDevice = String(process.env.ICART_AUDIO_DEVICE || '').trim();
const espeakExecutable = firstExisting([
  process.env.ICART_ESPEAK_EXECUTABLE,
  '/usr/bin/espeak-ng',
  '/bin/espeak-ng',
  '/usr/bin/espeak',
]);
const windowsSpeechExecutable = process.platform === 'win32' ? firstExisting([
  process.env.ICART_POWERSHELL_EXECUTABLE,
  path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'),
]) : null;

const configuredProvider = String(process.env.ICART_TTS_PROVIDER || 'auto').toLowerCase();
const configuredPiperNice = Number.parseInt(process.env.ICART_PIPER_NICE || '15', 10);
const piperNice = Number.isInteger(configuredPiperNice)
  ? Math.max(-20, Math.min(19, configuredPiperNice))
  : 15;
const configuredSapiRate = Number.parseInt(process.env.ICART_SAPI_RATE || '0', 10);
const sapiRate = Number.isInteger(configuredSapiRate)
  ? Math.max(-10, Math.min(10, configuredSapiRate))
  : 0;
const configuredSapiVolume = Number.parseInt(process.env.ICART_SAPI_VOLUME || '100', 10);
const sapiVolume = Number.isInteger(configuredSapiVolume)
  ? Math.max(0, Math.min(100, configuredSapiVolume))
  : 100;
const sapiOutput = String(process.env.ICART_SAPI_OUTPUT || 'Speakers').trim();
const sapiVoice = String(process.env.ICART_SAPI_VOICE || 'Microsoft David Desktop').trim();
const dfPlayerEnabled = ['1', 'true', 'yes', 'on'].includes(
  String(process.env.ICART_DFPLAYER_ENABLED || '').trim().toLowerCase()
);
const dfPlayerPython = firstExisting([
  process.env.ICART_DFPLAYER_PYTHON,
  process.platform === 'win32' ? null : '/usr/bin/python3',
  process.platform === 'win32' ? null : '/usr/local/bin/python3',
]);
const dfPlayerScript = firstExisting([
  process.env.ICART_DFPLAYER_SCRIPT,
  path.join(__dirname, '..', '..', 'hardware', 'dfplayer_player.py'),
  '/home/icart/icart/hardware/dfplayer_player.py',
]);
const dfPlayerDevice = String(process.env.ICART_DFPLAYER_DEVICE || '/dev/serial0').trim();
const dfPlayerMode = String(process.env.ICART_DFPLAYER_MODE || 'mp3').trim().toLowerCase() === 'index'
  ? 'index'
  : 'mp3';
const parsedDfPlayerVolume = Number.parseInt(process.env.ICART_DFPLAYER_VOLUME || '18', 10);
const dfPlayerVolume = Number.isInteger(parsedDfPlayerVolume)
  ? Math.max(0, Math.min(30, parsedDfPlayerVolume))
  : 18;

const readTrack = (name) => {
  const value = Number.parseInt(process.env[`ICART_DFPLAYER_TRACK_${name}`] || '', 10);
  if (Number.isInteger(value) && value > 0) return value;
  if (name === 'ALARM_TONE') return 25;
  if (name === 'ALARM_INSTRUCTION') return 26;
  return null;
};

const dfPlayerTrackFor = (message) => {
  const text = String(message).toLowerCase();
  let category = 'DEFAULT';
  if (/security alert/.test(text)) category = 'ALARM';
  else if (/remove the unscanned item to stop the alarm/.test(text)) category = 'ALARM_INSTRUCTION';
  else if (/unscanned item|removed weight does not uniquely match/.test(text)) category = 'UNSCANNED';
  else if (/payment verified|payment successful|thank you for shopping/.test(text)) category = 'PAYMENT_SUCCESS';
  else if (/qr (ph )?payment (is )?ready/.test(text)) category = 'PAYMENT_READY';
  else if (/payment cancelled|payment was cancelled/.test(text)) category = 'PAYMENT_CANCELLED';
  else if (/payment needs review/.test(text)) category = 'PAYMENT_FAILED';
  else if (/payment failed|payment could not be|unable to check payment/.test(text)) category = 'PAYMENT_FAILED';
  else if (/budget could not be saved|budget was not saved/.test(text)) category = 'BUDGET_ERROR';
  else if (/approaching your budget|nearly at your spending limit/.test(text)) category = 'BUDGET_WARNING';
  else if (/budget exceeded\. remove an item or adjust your budget/.test(text)) category = 'BUDGET_EXCEEDED';
  else if (/budget limit reached\. you have used your full budget/.test(text)) category = 'BUDGET_REACHED';
  else if (/no matching weight change was detected/.test(text)) category = 'WEIGHT_CHANGE_NOT_DETECTED';
  else if (/weight verification failed/.test(text)) category = 'WEIGHT_VERIFICATION_FAILED';
  else if (/unable to start shopping|could not start session|shopping session could not start/.test(text)) category = 'SESSION_ERROR';
  else if (/no active cart/.test(text)) category = 'CART_ERROR';
  else if (/scan cancelled/.test(text)) category = 'SCAN_CANCELLED';
  else if (/product not found|barcode/.test(text)) category = 'SCAN_ERROR';
  else if (/item removal could not be verified|removed weight does not match|removed item does not match|item could not be removed/.test(text)) category = 'REMOVE_ERROR';
  else if (/item removal cancelled/.test(text)) category = 'REMOVE_CANCELLED';
  else if (/automatically removed|removed from your cart|item successfully removed|product was removed/.test(text)) category = 'ITEM_REMOVED';
  else if (/remove.*basket|take one scanned item|no item selected for removal/.test(text)) category = 'REMOVE_ITEM';
  else if (/^(?:item added to your cart|added to your cart|item confirmed successfully)\.?$/.test(text)) category = 'ITEM_ADDED';
  else if (/verification failed|could not verify|no matching weight|weight mismatch|could not be verified/.test(text)) category = 'VERIFICATION_FAILED';
  else if (/product scanned|scanned /.test(text)) category = 'SCANNED';
  else if (/welcome to icart/.test(text)) category = 'WELCOME';
  else if (/budget saved|budget set|budget updated|set your shopping budget|please review your budget/.test(text)) category = 'BUDGET';

  return category === 'DEFAULT' ? null : readTrack(category);
};

const resolveProvider = () => {
  if ((configuredProvider === 'auto' || configuredProvider === 'dfplayer')
      && dfPlayerEnabled && dfPlayerPython && dfPlayerScript) return 'dfplayer';
  if ((configuredProvider === 'auto' || configuredProvider === 'piper')
      && piperExecutable && piperModel && piperModelConfig && audioPlayer) return 'piper';
  if ((configuredProvider === 'auto' || configuredProvider === 'sapi')
      && windowsSpeechExecutable) return 'sapi';
  if ((configuredProvider === 'auto' || configuredProvider === 'espeak') && espeakExecutable) return 'espeak';
  return null;
};

let queue = [];
let speaking = false;
let lastMessage = '';
let lastQueuedAt = 0;
let lastSpokenAt = null;
let lastError = null;
let dfPlayerAlarmProcess = null;

const runProcess = (executable, args, input, onDone, options = {}) => {
  let finished = false;
  const finish = (error) => {
    if (finished) return;
    finished = true;
    onDone(error);
  };

  const child = spawn(executable, args, {
    stdio: [input === undefined ? 'ignore' : 'pipe', 'ignore', 'pipe'],
    env: options.env || process.env,
  });
  if (Number.isInteger(options.nice) && child.pid) {
    try {
      os.setPriority(child.pid, options.nice);
    } catch (error) {
      console.warn(`[Voice] Unable to set process priority: ${error.message}`);
    }
  }
  let stderr = '';
  child.stderr?.on('data', (chunk) => { stderr = `${stderr}${chunk}`.slice(-1000); });
  child.once('error', finish);
  child.once('close', (code) => finish(code === 0 ? null : new Error(stderr.trim() || `Voice process exited with code ${code}`)));
  if (input !== undefined) child.stdin.end(input);
};

const speakWithEspeak = (message, done) => {
  const voice = process.env.ICART_ESPEAK_VOICE || 'en-us+m3';
  const rate = process.env.ICART_TTS_RATE || '150';
  const volume = process.env.ICART_TTS_VOLUME || '180';
  runProcess(espeakExecutable, ['-v', voice, '-s', rate, '-a', volume, message], undefined, done);
};

const speakWithPiper = (message, done) => {
  const wavPath = path.join(os.tmpdir(), `icart-voice-${process.pid}-${Date.now()}.wav`);
  const cleanup = () => fs.unlink(wavPath, () => {});

  runProcess(piperExecutable, ['--model', piperModel, '--output_file', wavPath], `${message}\n`, (piperError) => {
    if (piperError) {
      cleanup();
      done(piperError);
      return;
    }
    const playerArgs = ['-q'];
    if (audioDevice) playerArgs.push('-D', audioDevice);
    playerArgs.push(wavPath);
    runProcess(audioPlayer, playerArgs, undefined, (playerError) => {
      cleanup();
      done(playerError);
    });
  }, { nice: piperNice });
};

const speakWithWindowsSapi = (message, done) => {
  // The message is sent through stdin, not embedded in the command, so cart
  // and product text cannot be interpreted as PowerShell code.
  const script = [
    "$ErrorActionPreference = 'Stop'",
    '$message = [Console]::In.ReadToEnd()',
    "$wavPath = [IO.Path]::Combine([IO.Path]::GetTempPath(), ('icart-voice-' + [Guid]::NewGuid().ToString('N') + '.wav'))",
    'try { Add-Type -AssemblyName System.Speech; $voice = New-Object System.Speech.Synthesis.SpeechSynthesizer',
    `$voice.Rate = ${sapiRate}`,
    `$voice.Volume = ${sapiVolume}`,
    "if ($env:ICART_SAPI_VOICE) { $match = @($voice.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Name -like ('*' + $env:ICART_SAPI_VOICE + '*') })[0]; if ($match) { $voice.SelectVoice($match.VoiceInfo.Name) } }",
    '$voice.SetOutputToWaveFile($wavPath)',
    '$voice.Speak($message)',
    '$voice.Dispose()',
    '$player = New-Object System.Media.SoundPlayer $wavPath',
    '$player.PlaySync()',
    '$player.Dispose() } finally { if ($voice) { $voice.Dispose() }; Remove-Item -LiteralPath $wavPath -Force -ErrorAction SilentlyContinue }',
  ].join('; ');
  runProcess(
    windowsSpeechExecutable,
    ['-NoProfile', '-NonInteractive', '-Command', script],
    message,
    done,
    { env: { ...process.env, ICART_SAPI_OUTPUT: sapiOutput, ICART_SAPI_VOICE: sapiVoice } },
  );
};

const speakWithDfPlayer = (message, done) => {
  const track = dfPlayerTrackFor(message);
  if (!track) {
    done(new Error('No DFPlayer track is mapped for this iCart message.'));
    return;
  }
  runProcess(
    dfPlayerPython,
    [dfPlayerScript, '--device', dfPlayerDevice, '--volume', String(dfPlayerVolume), '--mode', dfPlayerMode, '--track', String(track)],
    undefined,
    done
  );
};

const stopDfPlayerAlarm = () => {
  if (dfPlayerAlarmProcess) {
    dfPlayerAlarmProcess.kill('SIGTERM');
    dfPlayerAlarmProcess = null;
  }
  if (!dfPlayerPython || !dfPlayerScript) return;
  runProcess(
    dfPlayerPython,
    [dfPlayerScript, '--device', dfPlayerDevice, '--stop'],
    undefined,
    (error) => {
      if (error) console.warn(`[Voice] Unable to stop DFPlayer alarm: ${error.message}`);
    }
  );
};

const setDfPlayerAlarm = (active) => {
  if (resolveProvider() !== 'dfplayer') return;
  if (!active) {
    stopDfPlayerAlarm();
    return;
  }
  if (dfPlayerAlarmProcess) return;

  // Track 8 is the existing English security warning on the kiosk SD card.
  // The first replay is delayed so the one-time spoken warning can finish.
  const track = readTrack('ALARM_TONE') || 25;
  const child = spawn(dfPlayerPython, [
    dfPlayerScript,
    '--device', dfPlayerDevice,
    '--volume', String(dfPlayerVolume),
    '--mode', dfPlayerMode,
    '--loop-track', String(track),
    '--loop-interval', '6',
    '--initial-delay', '5',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  dfPlayerAlarmProcess = child;
  let stderr = '';
  child.stderr?.on('data', (chunk) => { stderr = `${stderr}${chunk}`.slice(-1000); });
  child.once('error', (error) => {
    if (dfPlayerAlarmProcess === child) dfPlayerAlarmProcess = null;
    console.error(`[Voice] DFPlayer alarm failed: ${error.message}`);
  });
  child.once('close', (code) => {
    if (dfPlayerAlarmProcess === child) dfPlayerAlarmProcess = null;
    if (code !== 0 && code !== null) {
      console.error(`[Voice] DFPlayer alarm exited with code ${code}: ${stderr.trim()}`);
    }
  });
};

const processQueue = () => {
  if (speaking || queue.length === 0) return;
  const activeProvider = resolveProvider();
  if (!activeProvider) {
    queue = [];
    return;
  }

  speaking = true;
  const item = queue.shift();
  const provider = item.provider || activeProvider;
  const message = item.message;
  const finish = (error) => {
    if (error) {
      lastError = error.message;
      console.error(`[Voice] ${provider} failed: ${error.message}`);
    } else {
      lastError = null;
      lastSpokenAt = new Date().toISOString();
    }
    speaking = false;
    processQueue();
  };
  const done = (error) => {
    if (error && provider === 'dfplayer' && piperExecutable && piperModel && piperModelConfig && audioPlayer) {
      console.warn(`[Voice] DFPlayer unavailable; using the kiosk TTS fallback: ${error.message}`);
      speakWithPiper(message, finish);
      return;
    }
    finish(error);
  };

  if (provider === 'dfplayer') speakWithDfPlayer(message, done);
  else if (provider === 'piper') speakWithPiper(message, done);
  else if (provider === 'sapi') speakWithWindowsSapi(message, done);
  else speakWithEspeak(message, done);
};

const getVoiceStatus = () => {
  const provider = resolveProvider();
  return {
    available: Boolean(provider),
    provider,
    naturalVoice: provider === 'piper',
    audioDevice: provider === 'dfplayer' ? dfPlayerDevice : provider === 'sapi' ? sapiOutput : audioDevice || 'default',
    speaking,
    queuedMessages: queue.length,
    lastSpokenAt,
    lastError,
    message: provider === 'dfplayer'
      ? `DFPlayer Mini is ready on ${dfPlayerDevice}; MP3 folder mode is ${dfPlayerMode}.`
      : provider === 'piper'
      ? 'Piper neural voice is ready.'
      : provider === 'sapi'
        ? 'Windows Speech voice is ready.'
      : provider === 'espeak'
        ? 'Offline eSpeak voice is ready. Add a Piper model for a more natural voice.'
        : 'No local speech engine is available; the kiosk will use browser speech instead.',
  };
};

const queueSpeech = (rawMessage) => {
  const message = String(rawMessage || '').replace(/\s+/g, ' ').trim().slice(0, MAX_MESSAGE_LENGTH);
  if (!message) return { accepted: false, reason: 'empty' };
  const provider = resolveProvider();
  if (!provider) return { accepted: false, reason: 'unavailable' };
  const hasDfPlayerTrack = provider === 'dfplayer' && Boolean(dfPlayerTrackFor(message));
  const hasPiperFallback = Boolean(piperExecutable && piperModel && piperModelConfig && audioPlayer);
  if (provider === 'dfplayer' && !hasDfPlayerTrack && !hasPiperFallback) {
    return { accepted: false, reason: 'unmapped' };
  }
  const messageProvider = provider === 'dfplayer' && !hasDfPlayerTrack ? 'piper' : provider;

  const now = Date.now();
  if (message === lastMessage && now - lastQueuedAt < DUPLICATE_WINDOW_MS) {
    return { accepted: true, duplicate: true };
  }
  if (queue.length >= MAX_QUEUE_LENGTH) queue.shift();
  queue.push({ message, provider: messageProvider });
  lastMessage = message;
  lastQueuedAt = now;
  processQueue();
  return { accepted: true, duplicate: false };
};

module.exports = { getVoiceStatus, queueSpeech, setDfPlayerAlarm, MAX_MESSAGE_LENGTH };
