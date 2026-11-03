[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$manifestPath = Join-Path $root 'extension\manifest.json'
$manifest = Get-Content -Raw -LiteralPath $manifestPath | ConvertFrom-Json
$version = $manifest.version
$dist = Join-Path $root 'dist'
$output = Join-Path $dist "codex-cli-controlled-tab-grouper-v$version.zip"

if (-not (Test-Path -LiteralPath $dist)) {
  New-Item -ItemType Directory -Path $dist | Out-Null
}
if (Test-Path -LiteralPath $output) {
  Remove-Item -LiteralPath $output
}

Compress-Archive -Path (Join-Path $root 'extension\*') -DestinationPath $output -CompressionLevel Optimal
$sha256 = [System.Security.Cryptography.SHA256]::Create()
$stream = [System.IO.File]::OpenRead($output)
try {
  $hashBytes = $sha256.ComputeHash($stream)
  $hash = ([System.BitConverter]::ToString($hashBytes) -replace '-', '').ToLowerInvariant()
}
finally {
  $stream.Dispose()
  $sha256.Dispose()
}

[pscustomobject]@{
  status = 'pass'
  artifact = $output
  version = $version
  sha256 = $hash
} | ConvertTo-Json
