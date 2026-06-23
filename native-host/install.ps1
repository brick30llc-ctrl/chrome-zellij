# Installs the chrome_zellij native messaging host for Chrome & Brave on Windows.
# Usage:  .\install.ps1 -ExtensionId <your-extension-id>
#   (find the id at chrome://extensions or brave://extensions after loading unpacked)
param([Parameter(Mandatory = $true)][string]$ExtensionId)
$ErrorActionPreference = "Stop"

$dir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$name = "com.chrome_zellij.host"

Write-Host "Building host binary..."
Push-Location $dir
go build -o chrome_zellij_host.exe .
Pop-Location
$hostPath = Join-Path $dir "chrome_zellij_host.exe"

$manifest = [ordered]@{
  name           = $name
  description    = "chrome_zellij native host"
  path           = $hostPath
  type           = "stdio"
  allowed_origins = @("chrome-extension://$ExtensionId/")
} | ConvertTo-Json -Depth 5

$manifestPath = Join-Path $dir "$name.json"
$manifest | Out-File -Encoding ascii $manifestPath
Write-Host "Wrote manifest -> $manifestPath"

foreach ($base in @(
    "HKCU:\Software\Google\Chrome\NativeMessagingHosts",
    "HKCU:\Software\BraveSoftware\Brave-Browser\NativeMessagingHosts")) {
  $key = Join-Path $base $name
  New-Item -Path $key -Force | Out-Null
  Set-ItemProperty -Path $key -Name "(Default)" -Value $manifestPath
  Write-Host "registered -> $key"
}

Write-Host "Done."
Write-Host "NOTE: the extension must declare the 'nativeMessaging' permission and connectNative('$name') for this to be used (Phase 2 wiring)."
