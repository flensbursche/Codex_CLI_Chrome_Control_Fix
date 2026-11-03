[CmdletBinding()]
param(
  [string]$SkillRoot = (Join-Path $env:USERPROFILE '.codex\skills'),
  [switch]$Apply,
  [switch]$Force
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$source = Join-Path $repoRoot 'skills\chrome-devtools-control'
$target = Join-Path $SkillRoot 'chrome-devtools-control'

if (-not (Test-Path -LiteralPath (Join-Path $source 'SKILL.md'))) {
  throw "Skill source is incomplete: '$source'."
}

[pscustomobject]@{
  skill = 'chrome-devtools-control'
  source = $source
  target = $target
  apply = [bool]$Apply
  overwrite = [bool]$Force
} | ConvertTo-Json

if (-not $Apply) {
  Write-Host 'Dry run only. Run again with -Apply to install the skill.'
  exit 0
}

if ((Test-Path -LiteralPath $target) -and -not $Force) {
  throw "The target already exists: '$target'. Review it, then rerun with -Apply -Force to update it."
}

if (-not (Test-Path -LiteralPath $SkillRoot)) {
  New-Item -ItemType Directory -Path $SkillRoot -Force | Out-Null
}

if (Test-Path -LiteralPath $target) {
  Copy-Item -Path (Join-Path $source '*') -Destination $target -Recurse -Force
}
else {
  Copy-Item -LiteralPath $source -Destination $target -Recurse
}

Write-Host "Installed skill at '$target'. Restart Codex CLI to discover it."
