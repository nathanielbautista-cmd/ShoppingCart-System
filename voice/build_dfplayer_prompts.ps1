$ErrorActionPreference = 'Stop'

$promptRows = @(
  @{ Track = 2; Key = 'WELCOME'; Messages = @{ 'en-US' = 'Welcome to iCart. Set your shopping budget.'; 'fil-PH' = 'Maligayang pagdating sa iCart. Itakda ang iyong badyet.'; 'es-ES' = 'Te damos la bienvenida a iCart. Establece tu presupuesto.' } }
  @{ Track = 3; Key = 'BUDGET'; Messages = @{ 'en-US' = 'Budget saved.'; 'fil-PH' = 'Na-save ang badyet.'; 'es-ES' = 'Presupuesto guardado.' } }
  @{ Track = 4; Key = 'SCANNED'; Messages = @{ 'en-US' = 'Product scanned.'; 'fil-PH' = 'Na-scan ang produkto.'; 'es-ES' = 'Producto escaneado.' } }
  @{ Track = 5; Key = 'ITEM_ADDED'; Messages = @{ 'en-US' = 'Item added to your cart.'; 'fil-PH' = 'Naidagdag ang produkto sa iyong cart.'; 'es-ES' = 'Producto añadido al carrito.' } }
  @{ Track = 6; Key = 'WEIGHT_VERIFICATION_FAILED'; Messages = @{ 'en-US' = 'Weight verification failed.'; 'fil-PH' = 'Hindi na-verify ang bigat.'; 'es-ES' = 'No se pudo verificar el peso.' } }
  @{ Track = 7; Key = 'UNSCANNED'; Messages = @{ 'en-US' = 'Unscanned item detected.'; 'fil-PH' = 'May natukoy na hindi na-scan na item.'; 'es-ES' = 'Se ha detectado un producto sin escanear.' } }
  @{ Track = 8; Key = 'ALARM'; Messages = @{ 'en-US' = 'Security alert detected. Remove the unscanned item to stop the alarm.'; 'fil-PH' = 'May natukoy na alerto sa seguridad.'; 'es-ES' = 'Se ha detectado una alerta de seguridad.' } }
  @{ Track = 9; Key = 'REMOVE_ITEM'; Messages = @{ 'en-US' = 'No item selected for removal.'; 'fil-PH' = 'Walang napiling item na aalisin.'; 'es-ES' = 'No hay ningún producto seleccionado para retirar.' } }
  @{ Track = 10; Key = 'ITEM_REMOVED'; Messages = @{ 'en-US' = 'Product was removed.'; 'fil-PH' = 'Naalis ang produkto.'; 'es-ES' = 'Se ha retirado el producto.' } }
  @{ Track = 11; Key = 'PAYMENT_READY'; Messages = @{ 'en-US' = 'QR payment is ready.'; 'fil-PH' = 'Handa na ang QR payment.'; 'es-ES' = 'El pago QR está listo.' } }
  @{ Track = 12; Key = 'PAYMENT_SUCCESS'; Messages = @{ 'en-US' = 'Payment successful. Your receipt is printing. Thank you for shopping with iCart.'; 'fil-PH' = 'Matagumpay ang bayad. Ini-print na ang iyong resibo. Salamat sa pamimili sa iCart.'; 'es-ES' = 'Pago realizado. Se está imprimiendo el recibo. Gracias por comprar en iCart.' } }
  @{ Track = 13; Key = 'BUDGET_WARNING'; Messages = @{ 'en-US' = 'You are nearly at your spending limit.'; 'fil-PH' = 'Malapit ka na sa itinakda mong limitasyon sa paggastos.'; 'es-ES' = 'Estás cerca de tu límite de gasto.' } }
  @{ Track = 14; Key = 'BUDGET_EXCEEDED'; Messages = @{ 'en-US' = 'Budget exceeded. Remove an item or adjust your budget.'; 'fil-PH' = 'Lumampas ka na sa itinakda mong badyet.'; 'es-ES' = 'Has superado tu límite de presupuesto.' } }
  @{ Track = 15; Key = 'BUDGET_ERROR'; Messages = @{ 'en-US' = 'Your budget was not saved.'; 'fil-PH' = 'Hindi na-save ang iyong badyet.'; 'es-ES' = 'No se ha guardado tu presupuesto.' } }
  @{ Track = 16; Key = 'SCAN_ERROR'; Messages = @{ 'en-US' = 'Product not found.'; 'fil-PH' = 'Hindi nakita ang produkto.'; 'es-ES' = 'No se ha encontrado el producto.' } }
  @{ Track = 17; Key = 'SESSION_ERROR'; Messages = @{ 'en-US' = 'Shopping session could not start.'; 'fil-PH' = 'Hindi masimulan ang shopping session.'; 'es-ES' = 'No se ha podido iniciar la compra.' } }
  @{ Track = 18; Key = 'REMOVE_ERROR'; Messages = @{ 'en-US' = 'Removed item does not match.'; 'fil-PH' = 'Hindi tugma ang inalis na produkto.'; 'es-ES' = 'El producto retirado no coincide.' } }
  @{ Track = 19; Key = 'WEIGHT_CHANGE_NOT_DETECTED'; Messages = @{ 'en-US' = 'No matching weight change was detected.'; 'fil-PH' = 'Walang natukoy na tugmang pagbabago sa bigat.'; 'es-ES' = 'No se detectó un cambio de peso coincidente.' } }
  @{ Track = 20; Key = 'PAYMENT_CANCELLED'; Messages = @{ 'en-US' = 'Payment cancelled.'; 'fil-PH' = 'Nakansela ang bayad.'; 'es-ES' = 'Pago cancelado.' } }
  @{ Track = 21; Key = 'BUDGET_REACHED'; Messages = @{ 'en-US' = 'Budget limit reached. You have used your full budget. Review your cart before adding another item.'; 'fil-PH' = 'Naabot mo na ang limitasyon ng badyet.'; 'es-ES' = 'Has alcanzado el límite de tu presupuesto.' } }
  @{ Track = 22; Key = 'PAYMENT_FAILED'; Messages = @{ 'en-US' = 'Payment failed.'; 'fil-PH' = 'Hindi nagtagumpay ang bayad.'; 'es-ES' = 'Pago fallido.' } }
  @{ Track = 23; Key = 'SCAN_CANCELLED'; Messages = @{ 'en-US' = 'Scan cancelled.'; 'fil-PH' = 'Nakansela ang pag-scan ng produkto.'; 'es-ES' = 'Se ha cancelado el escaneo del producto.' } }
  @{ Track = 24; Key = 'CART_ERROR'; Messages = @{ 'en-US' = 'No active cart found.'; 'fil-PH' = 'Walang aktibong cart.'; 'es-ES' = 'No hay ningún carrito activo.' } }
)

$languagePacks = @(
  @{ Code = 'en-US'; Offset = 0; Label = 'English' }
)

$voiceRoot = Join-Path $PSScriptRoot 'dfplayer_sdcard'
$mp3Directory = Join-Path $voiceRoot 'mp3'
New-Item -ItemType Directory -Path $mp3Directory -Force | Out-Null
$activeTracks = @(
  foreach ($row in $promptRows) {
    foreach ($language in $languagePacks) { '{0:D4}.mp3' -f ($row.Track + $language.Offset) }
  }
)
Get-ChildItem -LiteralPath $mp3Directory -Filter '*.mp3' -File |
  Where-Object { $_.Name -notin $activeTracks } |
  Remove-Item -Force

$ffmpegCommand = Get-Command ffmpeg -ErrorAction SilentlyContinue
$ffmpegPath = if ($ffmpegCommand) { $ffmpegCommand.Source } else {
  Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Packages\Gyan.FFmpeg.Essentials_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.1-essentials_build\bin\ffmpeg.exe'
}
if (-not (Test-Path -LiteralPath $ffmpegPath)) {
  throw 'FFmpeg is required to create DFPlayer MP3 files. Install FFmpeg or add it to PATH, then run this script again.'
}

function Wait-WinRtOperation {
  param(
    [Parameter(Mandatory = $true)]$Operation,
    [Parameter(Mandatory = $true)][Type]$ResultType
  )
  $asTaskMethod = [System.WindowsRuntimeSystemExtensions].GetMethods() |
    Where-Object {
      $_.Name -eq 'AsTask' -and $_.IsGenericMethod -and
      $_.GetGenericArguments().Count -eq 1 -and
      $_.GetParameters().Count -eq 1 -and
      $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
    } |
    Select-Object -First 1
  $task = $asTaskMethod.MakeGenericMethod($ResultType).Invoke($null, [object[]]@($Operation))
  $task.Wait()
  return $task.Result
}

$maleVoice = $null
$oneCoreSynthesizer = $null
$availableOneCoreVoices = @()
try {
  Add-Type -AssemblyName System.Runtime.WindowsRuntime
  $null = [Windows.Media.SpeechSynthesis.SpeechSynthesizer,Windows.Media.SpeechSynthesis,ContentType=WindowsRuntime]
  $availableOneCoreVoices = @([Windows.Media.SpeechSynthesis.SpeechSynthesizer]::AllVoices)
  $maleVoice = $availableOneCoreVoices |
    Where-Object { $_.DisplayName -eq 'Microsoft Mark' -and $_.Language -eq 'en-US' } |
    Select-Object -First 1
  if (-not $maleVoice) {
    $maleVoice = $availableOneCoreVoices |
      Where-Object { $_.DisplayName -eq 'Microsoft David' -and $_.Language -eq 'en-US' } |
      Select-Object -First 1
  }
  if ($maleVoice) {
    $oneCoreSynthesizer = New-Object Windows.Media.SpeechSynthesis.SpeechSynthesizer
    $oneCoreSynthesizer.Voice = $maleVoice
    Write-Output ("Using male Windows voice: {0}" -f $maleVoice.DisplayName)
  }
} catch {
  Write-Warning "Natural Windows male voice is unavailable; using the installed male desktop voice. $($_.Exception.Message)"
}

$sapiSynthesizer = $null
if (-not $oneCoreSynthesizer) {
  Add-Type -AssemblyName System.Speech
  $sapiSynthesizer = New-Object System.Speech.Synthesis.SpeechSynthesizer
  $sapiMaleVoice = $sapiSynthesizer.GetInstalledVoices() |
    Where-Object { $_.VoiceInfo.Gender -eq [System.Speech.Synthesis.VoiceGender]::Male } |
    Select-Object -First 1
  if ($sapiMaleVoice) { $sapiSynthesizer.SelectVoice($sapiMaleVoice.VoiceInfo.Name) }
  $sapiSynthesizer.Rate = -1
  $sapiSynthesizer.Volume = 90
  Write-Output ("Using male desktop voice: {0}" -f $sapiSynthesizer.Voice.Name)
}

try {
  foreach ($row in $promptRows) {
    foreach ($language in $languagePacks) {
      $track = $row.Track + $language.Offset
      $fileStem = '{0:D4}' -f $track
      $wavPath = Join-Path $mp3Directory "$fileStem.wav"
      $mp3Path = Join-Path $mp3Directory "$fileStem.mp3"
      $message = $row.Messages[$language.Code]
      if ($oneCoreSynthesizer) {
        $languageVoice = $availableOneCoreVoices |
          Where-Object { $_.Language -eq $language.Code -and $_.Gender -eq [Windows.Media.SpeechSynthesis.VoiceGender]::Male } |
          Select-Object -First 1
        if (-not $languageVoice) { $languageVoice = $maleVoice }
        $oneCoreSynthesizer.Voice = $languageVoice
        $speechStream = Wait-WinRtOperation `
          -Operation ($oneCoreSynthesizer.SynthesizeTextToStreamAsync($message)) `
          -ResultType ([Windows.Media.SpeechSynthesis.SpeechSynthesisStream])
        $reader = New-Object Windows.Storage.Streams.DataReader($speechStream.GetInputStreamAt(0))
        $null = Wait-WinRtOperation `
          -Operation ($reader.LoadAsync([uint32]$speechStream.Size)) `
          -ResultType ([uint32])
        $audioBytes = New-Object byte[] ([int]$speechStream.Size)
        $reader.ReadBytes($audioBytes)
        [System.IO.File]::WriteAllBytes($wavPath, $audioBytes)
        $reader.Dispose()
        $speechStream.Dispose()
      } else {
        $sapiSynthesizer.SetOutputToWaveFile($wavPath)
        $sapiSynthesizer.Speak($message)
        $sapiSynthesizer.SetOutputToNull()
      }
      & $ffmpegPath -hide_banner -loglevel error -y -i $wavPath -codec:a libmp3lame -b:a 96k -ar 44100 -ac 1 $mp3Path
      if ($LASTEXITCODE -ne 0) { throw "FFmpeg failed for track $fileStem." }
      Remove-Item -LiteralPath $wavPath -Force
      Write-Output ("Created {0} ({1}, {2})" -f $mp3Path, $row.Key, $language.Label)
    }
  }
} finally {
  if ($oneCoreSynthesizer) { $oneCoreSynthesizer.Dispose() }
  if ($sapiSynthesizer) { $sapiSynthesizer.Dispose() }
}

$promptRows |
  ForEach-Object {
    $row = $_
    foreach ($language in $languagePacks) {
      [PSCustomObject]@{
        track = $row.Track + $language.Offset
        baseTrack = $row.Track
        key = $row.Key
        language = $language.Code
        message = $row.Messages[$language.Code]
      }
    }
  } |
  ConvertTo-Json -Depth 3 |
  Set-Content -LiteralPath (Join-Path $voiceRoot 'prompt-map.json') -Encoding UTF8

Write-Output "Ready to copy '$mp3Directory' to the root of the DFPlayer microSD card."
