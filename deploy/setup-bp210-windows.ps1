param(
  [string]$PrinterName = 'BP210',
  [string]$PortName = 'USB002',
  [switch]$PrintTestReceipt
)

$ErrorActionPreference = 'Stop'
$driverName = 'Generic / Text Only'
$driverInf = Get-ChildItem 'C:\Windows\System32\DriverStore\FileRepository' `
  -Filter 'prnge001.inf' `
  -Recurse `
  -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName

if (-not $driverInf) {
  throw 'The built-in Generic / Text Only printer driver was not found.'
}

if (-not (Get-PrinterPort -Name $PortName -ErrorAction SilentlyContinue)) {
  throw "Printer port '$PortName' was not found. Connect and power on the BP210, then run this script again."
}

if (-not (Get-PrinterDriver -Name $driverName -ErrorAction SilentlyContinue)) {
  Add-PrinterDriver -Name $driverName -InfPath $driverInf
}

$existingPrinter = Get-Printer -Name $PrinterName -ErrorAction SilentlyContinue
if (-not $existingPrinter) {
  Add-Printer -Name $PrinterName -DriverName $driverName -PortName $PortName
} elseif ($existingPrinter.PortName -ne $PortName -or $existingPrinter.DriverName -ne $driverName) {
  Set-Printer -Name $PrinterName -PortName $PortName -DriverName $driverName
}

(New-Object -ComObject WScript.Network).SetDefaultPrinter($PrinterName)

if ($PrintTestReceipt) {
  $receipt = @'
       ICART
   PRINTER TEST
------------------------------
BP210: CONNECTED
Paper: 58mm thermal
Status: READY
------------------------------
Automatic receipt printing
is now configured.



'@
  $receipt | Out-Printer -Name $PrinterName
}

Get-Printer -Name $PrinterName |
  Select-Object Name, DriverName, PortName, PrinterStatus |
  Format-List
