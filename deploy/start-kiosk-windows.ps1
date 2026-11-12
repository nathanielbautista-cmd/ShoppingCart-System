param(
  [string]$PrinterName = 'BP210',
  [string]$KioskUrl = 'http://127.0.0.1:3000',
  [string]$ApiTarget = 'http://127.0.0.1:5000',
  [switch]$CheckOnly
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$backendUrl = 'http://127.0.0.1:5000/api/health'

function Test-IcartUrl {
  param([Parameter(Mandatory = $true)][string]$Url)

  try {
    $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2
    return $response.StatusCode -ge 200 -and $response.StatusCode -lt 500
  } catch {
    return $false
  }
}

function Wait-IcartUrl {
  param(
    [Parameter(Mandatory = $true)][string]$Url,
    [Parameter(Mandatory = $true)][string]$ServiceName,
    [int]$TimeoutSeconds = 45
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    if (Test-IcartUrl -Url $Url) {
      return
    }
    Start-Sleep -Seconds 1
  }

  throw "$ServiceName did not become ready within $TimeoutSeconds seconds."
}

$printer = Get-Printer -Name $PrinterName -ErrorAction SilentlyContinue
if (-not $printer) {
  throw "Printer '$PrinterName' is not installed. Run deploy/setup-bp210-windows.ps1 as Administrator first."
}

if ($printer.PrinterStatus -in @('Offline', 'Error', 'NotAvailable', 'NoToner', 'PaperJam', 'PaperOut')) {
  throw "Printer '$PrinterName' is not ready. Current status: $($printer.PrinterStatus)."
}

(New-Object -ComObject WScript.Network).SetDefaultPrinter($PrinterName)

if ($CheckOnly) {
  Write-Host "Printer ready: $($printer.Name) on $($printer.PortName)"
  Write-Host "Default printer set to: $PrinterName"
  exit 0
}

if (-not (Test-IcartUrl -Url $backendUrl)) {
  Start-Process -FilePath 'npm.cmd' `
    -ArgumentList @('start') `
    -WorkingDirectory (Join-Path $repoRoot 'backend') `
    -WindowStyle Hidden
  Wait-IcartUrl -Url $backendUrl -ServiceName 'iCart backend'
}

if (-not (Test-IcartUrl -Url $KioskUrl)) {
  # Keep the Windows kiosk self-contained by default. Callers can pass
  # -ApiTarget when they intentionally want the frontend to use the Pi.
  $env:VITE_DEV_API_TARGET = $ApiTarget
  Start-Process -FilePath 'npm.cmd' `
    -ArgumentList @('run', 'dev') `
    -WorkingDirectory $repoRoot `
    -WindowStyle Hidden
  Wait-IcartUrl -Url $KioskUrl -ServiceName 'iCart frontend'
}

$chromeCandidates = @(
  'C:\Program Files\Google\Chrome\Application\chrome.exe',
  'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe'
)
$chromePath = $chromeCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (-not $chromePath) {
  throw 'Google Chrome was not found. Install Chrome or update deploy/start-kiosk-windows.ps1.'
}

$chromeProfile = Join-Path $env:LOCALAPPDATA 'iCart\ChromeKiosk'
$chromeArguments = @(
  '--kiosk',
  '--kiosk-printing',
  '--start-maximized',
  '--noerrdialogs',
  '--disable-infobars',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-session-crashed-bubble',
  '--disable-pinch',
  '--touch-events=enabled',
  '--overscroll-history-navigation=0',
  '--disable-features=Translate',
  "--user-data-dir=$chromeProfile",
  $KioskUrl
)

Start-Process -FilePath $chromePath -ArgumentList $chromeArguments
