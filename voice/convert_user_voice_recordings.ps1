$ErrorActionPreference = 'Stop'

$sourceDirectory = Join-Path $env:USERPROFILE 'Downloads\Voice assistance'
$outputDirectory = Join-Path $PSScriptRoot 'recorded_prompts\mp3'
New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null

$recordings = @(
  @{ File = 'Welcome to my cart set your shopping budget.m4a'; Track = 2; Key = 'WELCOME'; Message = 'Welcome to iCart. Set your shopping budget.' }
  @{ File = 'budget saved.m4a'; Track = 3; Key = 'BUDGET'; Message = 'Budget saved.' }
  @{ File = 'Product scanned.m4a'; Track = 4; Key = 'SCANNED'; Message = 'Product scanned.' }
  @{ File = 'product name added to your cart.m4a'; Track = 5; Key = 'ITEM_ADDED'; Message = 'Item added to your cart.' }
  @{ File = 'Weight verification failed.m4a'; Track = 6; Key = 'WEIGHT_VERIFICATION_FAILED'; Message = 'Weight verification failed.' }
  @{ File = 'Unscanned item detected.m4a'; Track = 7; Key = 'UNSCANNED'; Message = 'Unscanned item detected.' }
  @{ File = 'Alarm unscanned item after countdown 10s.m4a'; Track = 8; Key = 'ALARM'; Message = 'Security alert detected. Remove the unscanned item to stop the alarm.' }
  @{ File = 'No item selected for removal.m4a'; Track = 9; Key = 'REMOVE_ITEM'; Message = 'No item selected for removal.' }
  @{ File = 'Product was removed.m4a'; Track = 10; Key = 'ITEM_REMOVED'; Message = 'Product was removed.' }
  @{ File = 'Qr payment is ready.m4a'; Track = 11; Key = 'PAYMENT_READY'; Message = 'QR payment is ready.' }
  @{ File = 'payment successfully your receipt is printing.m4a'; Track = 12; Key = 'PAYMENT_SUCCESS'; Message = 'Payment successful. Your receipt is printing. Thank you for shopping with iCart.' }
  @{ File = 'You are nealy at your spending limit.m4a'; Track = 13; Key = 'BUDGET_WARNING'; Message = 'You are nearly at your spending limit.' }
  @{ File = 'Budget exceeded remove an item or adjust your budget.m4a'; Track = 14; Key = 'BUDGET_EXCEEDED'; Message = 'Budget exceeded. Remove an item or adjust your budget.' }
  @{ File = 'Your budget was not saved.m4a'; Track = 15; Key = 'BUDGET_ERROR'; Message = 'Your budget was not saved.' }
  @{ File = 'Product not found.m4a'; Track = 16; Key = 'SCAN_ERROR'; Message = 'Product not found.' }
  @{ File = 'Shopping session could not start.m4a'; Track = 17; Key = 'SESSION_ERROR'; Message = 'Shopping session could not start.' }
  @{ File = 'removed item does not match.m4a'; Track = 18; Key = 'REMOVE_ERROR'; Message = 'Removed item does not match.' }
  @{ File = 'No matching weight change was detected.m4a'; Track = 19; Key = 'WEIGHT_CHANGE_NOT_DETECTED'; Message = 'No matching weight change was detected.' }
  @{ File = 'payment cancelled.m4a'; Track = 20; Key = 'PAYMENT_CANCELLED'; Message = 'Payment cancelled.' }
  @{ File = 'Budget limit reached Review your cart.m4a'; Track = 21; Key = 'BUDGET_REACHED'; Message = 'Budget limit reached. You have used your full budget. Review your cart before adding another item.' }
  @{ File = 'payment failed.m4a'; Track = 22; Key = 'PAYMENT_FAILED'; Message = 'Payment failed.' }
  @{ File = 'Scan canlled.m4a'; Track = 23; Key = 'SCAN_CANCELLED'; Message = 'Scan cancelled.' }
  @{ File = 'No active cart found.m4a'; Track = 24; Key = 'CART_ERROR'; Message = 'No active cart found.' }
  @{ File = 'freesound_community-security-alarm-63578.mp3'; Track = 25; Key = 'ALARM_TONE'; Message = 'Security alarm tone.' }
  @{ File = 'Remove the unscanned item to stop the alarm.m4a'; Track = 26; Key = 'ALARM_INSTRUCTION'; Message = 'Remove the unscanned item to stop the alarm.' }
)

$missing = @($recordings | Where-Object { -not (Test-Path -LiteralPath (Join-Path $sourceDirectory $_.File)) })
if ($missing.Count -gt 0) {
  throw "Missing recording(s) in '$sourceDirectory': $($missing.File -join ', ')"
}

$ffmpegCommand = Get-Command ffmpeg -ErrorAction SilentlyContinue
$ffmpegPath = if ($ffmpegCommand) { $ffmpegCommand.Source } else {
  Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Packages\Gyan.FFmpeg.Essentials_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.1-essentials_build\bin\ffmpeg.exe'
}
if (-not (Test-Path -LiteralPath $ffmpegPath)) {
  throw "FFmpeg is required to convert the M4A recordings. Expected it at '$ffmpegPath'."
}

foreach ($recording in $recordings) {
  $sourcePath = Join-Path $sourceDirectory $recording.File
  $outputName = '{0:D4}.mp3' -f $recording.Track
  $outputPath = Join-Path $outputDirectory $outputName
  if ([IO.Path]::GetExtension($recording.File) -ieq '.mp3') {
    Copy-Item -LiteralPath $sourcePath -Destination $outputPath -Force
  } else {
    & $ffmpegPath -hide_banner -loglevel error -y -i $sourcePath -codec:a libmp3lame -b:a 96k -ar 44100 -ac 1 $outputPath
    if ($LASTEXITCODE -ne 0) {
      throw "FFmpeg could not convert '$($recording.File)' to MP3."
    }
  }
  Write-Output "Created $outputName from $($recording.File)"
}

$recordings |
  ForEach-Object {
    [PSCustomObject]@{
      track = $_.Track
      key = $_.Key
      language = 'en-US'
      message = $_.Message
      source = $_.File
    }
  } |
  ConvertTo-Json -Depth 3 |
  Set-Content -LiteralPath (Join-Path $PSScriptRoot 'recorded_prompts\prompt-map.json') -Encoding UTF8

Write-Output "Ready to copy '$outputDirectory' to the root of the DFPlayer microSD card."
