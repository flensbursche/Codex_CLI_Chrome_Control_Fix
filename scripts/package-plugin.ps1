[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$plugin = Get-Content -Raw -LiteralPath (Join-Path $root 'plugin.json') | ConvertFrom-Json
$dist = Join-Path $root 'dist'
$output = Join-Path $dist "codex-cli-chrome-control-plugin-v$($plugin.version).zip"
$tempRoot = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
$staging = Join-Path $tempRoot "codex-cli-chrome-control-$([guid]::NewGuid().ToString('N'))"

if (-not (Test-Path -LiteralPath $dist)) {
  New-Item -ItemType Directory -Path $dist | Out-Null
}
if (Test-Path -LiteralPath $output) {
  Remove-Item -LiteralPath $output
}

try {
  New-Item -ItemType Directory -Path $staging | Out-Null
  Copy-Item -LiteralPath (Join-Path $root 'plugin.json') -Destination $staging
  Copy-Item -LiteralPath (Join-Path $root 'mcp.json') -Destination $staging
  Copy-Item -LiteralPath (Join-Path $root 'LICENSE') -Destination $staging
  Copy-Item -LiteralPath (Join-Path $root 'skills') -Destination $staging -Recurse
  Compress-Archive -Path (Join-Path $staging '*') -DestinationPath $output -CompressionLevel Optimal
}
finally {
  if (Test-Path -LiteralPath $staging) {
    $resolvedStaging = [System.IO.Path]::GetFullPath((Resolve-Path -LiteralPath $staging).Path)
    if (-not $resolvedStaging.StartsWith($tempRoot, [System.StringComparison]::OrdinalIgnoreCase) -or
        -not (Split-Path -Leaf $resolvedStaging).StartsWith('codex-cli-chrome-control-')) {
      throw "Refusing to remove unexpected staging path '$resolvedStaging'."
    }
    Remove-Item -LiteralPath $resolvedStaging -Recurse -Force
  }
}

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
  version = $plugin.version
  sha256 = $hash
} | ConvertTo-Json
