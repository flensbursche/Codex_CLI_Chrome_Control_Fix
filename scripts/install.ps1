[CmdletBinding()]
param(
  [string]$McpVersion = '1.12.0',
  [string]$ChromePath,
  [switch]$Apply
)

$ErrorActionPreference = 'Stop'

function Require-Command([string]$Name) {
  $command = Get-Command $Name -ErrorAction SilentlyContinue
  if (-not $command) {
    throw "Required command '$Name' was not found in PATH."
  }
  return $command.Source
}

$codex = Require-Command 'codex'
$node = Require-Command 'node'
$npx = Require-Command 'npx'
if (-not $ChromePath) {
  $chromeCandidates = @(
    if ($env:ProgramFiles) { Join-Path $env:ProgramFiles 'Google\Chrome\Application\chrome.exe' }
    if (${env:ProgramFiles(x86)}) { Join-Path ${env:ProgramFiles(x86)} 'Google\Chrome\Application\chrome.exe' }
    if ($env:LOCALAPPDATA) { Join-Path $env:LOCALAPPDATA 'Google\Chrome\Application\chrome.exe' }
  )
  $ChromePath = $chromeCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
}
if (-not $ChromePath -or -not (Test-Path -LiteralPath $ChromePath)) {
  throw 'Chrome Stable was not found in the machine-wide or user-local default locations. Pass -ChromePath explicitly for a custom installation.'
}

$ChromePath = (Resolve-Path -LiteralPath $ChromePath).Path
$chromeVersion = (Get-Item -LiteralPath $ChromePath).VersionInfo.ProductVersion
$chromeMajor = [int]($chromeVersion.Split('.')[0])
if ($chromeMajor -lt 144) {
  throw "Chrome 144 or newer is required for auto-connect. Found $chromeVersion."
}

$policyPath = 'HKLM:\SOFTWARE\Policies\Google\Chrome'
$policy = (Get-ItemProperty -Path $policyPath -ErrorAction SilentlyContinue).RemoteDebuggingAllowed
if ($policy -eq 0) {
  throw "RemoteDebuggingAllowed is disabled by machine policy. Ask the responsible administrator to enable it; this script will not bypass policy."
}

Write-Host "Codex: $codex"
Write-Host "Node:  $node"
Write-Host "npx:   $npx"
Write-Host "Chrome: $chromeVersion"
Write-Host "RemoteDebuggingAllowed: $(if ($null -eq $policy) { 'not configured (allowed by default)' } else { $policy })"

$arguments = @(
  'mcp', 'add', 'chrome-devtools', '--',
  'npx', '-y', "chrome-devtools-mcp@$McpVersion",
  '--autoConnect',
  '--no-usage-statistics',
  '--no-performance-crux',
  '--no-javascript-evaluation'
)

if (-not $Apply) {
  Write-Host ''
  Write-Host 'Dry run only. The command that would be executed is:'
  Write-Host "codex $($arguments -join ' ')"
  Write-Host 'Run again with -Apply to add the MCP server.'
  exit 0
}

$existing = & codex mcp get chrome-devtools 2>$null
if ($LASTEXITCODE -eq 0) {
  Write-Host 'The chrome-devtools MCP entry already exists. It was not overwritten.'
  Write-Host $existing
  Write-Host 'Remove it explicitly with `codex mcp remove chrome-devtools` before changing the pinned configuration.'
  exit 0
}

& codex @arguments
if ($LASTEXITCODE -ne 0) {
  throw "codex mcp add failed with exit code $LASTEXITCODE."
}

Write-Host ''
Write-Host 'MCP server added. Next steps:'
Write-Host '1. Open chrome://inspect/#remote-debugging and enable Remote Debugging.'
Write-Host '2. Restart Codex CLI so it discovers the new MCP tools.'
Write-Host '3. Immediate path: select the target with list_pages/select_page, then group the active tab once in Chrome.'
Write-Host '4. Automatic path: load extension/ only when local or enterprise policy permits it.'
Write-Host 'See docs/IMMEDIATE-MANUAL-GROUPING.md and docs/ENTERPRISE-DEPLOYMENT.md.'
