<#
.SYNOPSIS
    CodeXX DTDK uninstaller (Windows). Per ADR-038 §5.

.DESCRIPTION
    A byte-identical copy of this script is served at
    https://www.codexx-dtdk.com/uninstall.ps1 — keep website/public/uninstall.ps1
    in sync when editing this file.

    Removes the DTDK install tree (default %USERPROFILE%\.codexx), the
    %USERPROFILE%\.codexx\bin entry from the user PATH, and — unless asked
    otherwise — the per-user config and cache directories that hold the shared
    active map and per-component license tokens.

    Layout removed (per ADR-038 §2 and storage::configRoot/cacheRoot):
      <root>\                                ← install tree
      %APPDATA%\CodeXX\                      ← license tokens
      %LOCALAPPDATA%\CodeXX\Cache\           ← shared active map + per-tool cache
      <root>\bin entry in HKCU\Environment\Path

    Re-running is safe: each path is removed best-effort, missing paths are not
    an error.

.PARAMETER Root
    Install root to remove. Default: $env:USERPROFILE\.codexx.

.PARAMETER KeepConfig
    Preserve %APPDATA%\CodeXX — keeps license tokens for a later reinstall.

.PARAMETER KeepCache
    Preserve %LOCALAPPDATA%\CodeXX\Cache — keeps the shared active map.

.PARAMETER NoPath
    Skip user PATH cleanup.

.PARAMETER DryRun
    Print what would be removed; touch nothing.

.PARAMETER Yes
    Skip the confirmation prompt.
#>

[CmdletBinding()]
param(
    [string]$Root = "$env:USERPROFILE\.codexx",
    [switch]$KeepConfig,
    [switch]$KeepCache,
    [switch]$NoPath,
    [switch]$DryRun,
    [Alias('y')]
    [switch]$Yes
)

$ErrorActionPreference = 'Stop'

# ---------------------------------------------------------------------------
# Platform-specific config + cache locations (mirrors libs/storage).
# ---------------------------------------------------------------------------
$configDir = Join-Path $env:APPDATA      'CodeXX'
$cacheDir  = Join-Path $env:LOCALAPPDATA 'CodeXX\Cache'

# ---------------------------------------------------------------------------
# Plan: list of (label, path) tuples the user will actually see removed.
# ---------------------------------------------------------------------------
$plan = @()
function Add-Plan($label, $path) {
    if (Test-Path -LiteralPath $path) {
        $script:plan += [pscustomobject]@{ Label = $label; Path = $path }
    }
}

Add-Plan 'install root'           $Root
if (-not $KeepConfig) { Add-Plan 'config (license tokens)' $configDir }
if (-not $KeepCache ) { Add-Plan 'cache (active map)'      $cacheDir  }

# PATH cleanup target — only relevant if the entry is actually present.
$binPath = Join-Path $Root 'bin'
$userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
$pathParts = if ($userPath) { $userPath -split ';' } else { @() }
$pathHasBin = $pathParts -contains $binPath

if ($plan.Count -eq 0 -and -not ($pathHasBin -and -not $NoPath)) {
    Write-Host "Nothing to remove — no install tree, config, cache, or PATH entry found."
    return
}

# ---------------------------------------------------------------------------
# Show the plan + confirm
# ---------------------------------------------------------------------------
Write-Host "The following will be removed:"
foreach ($entry in $plan) {
    Write-Host ("  - {0,-28} {1}" -f $entry.Label, $entry.Path)
}
if ($pathHasBin -and -not $NoPath) {
    Write-Host ("  - {0,-28} {1}" -f 'user PATH entry', $binPath)
}
Write-Host ''

if ($DryRun) {
    Write-Host "(-DryRun: nothing was touched.)"
    return
}

if (-not $Yes) {
    if (-not [Environment]::UserInteractive -or [Console]::IsInputRedirected) {
        Write-Error "Refusing to uninstall non-interactively without -Yes. Re-run with -Yes to confirm, or -DryRun to preview."
        exit 2
    }
    $reply = Read-Host "Proceed? [y/N]"
    if ($reply -notmatch '^(y|Y|yes|YES)$') {
        Write-Host "Aborted."
        exit 1
    }
}

# ---------------------------------------------------------------------------
# Remove paths
# ---------------------------------------------------------------------------
foreach ($entry in $plan) {
    try {
        Remove-Item -LiteralPath $entry.Path -Recurse -Force -ErrorAction Stop
        Write-Host ("Removed {0}: {1}" -f $entry.Label, $entry.Path)
    }
    catch {
        Write-Warning ("failed to remove {0}: {1}" -f $entry.Path, $_)
    }
}

# ---------------------------------------------------------------------------
# Strip <root>\bin from the User-scope Path.
# ---------------------------------------------------------------------------
if ($pathHasBin -and -not $NoPath) {
    $newParts = $pathParts | Where-Object { $_ -ne $binPath -and $_ -ne '' }
    $newPath = ($newParts -join ';').TrimEnd(';')
    [Environment]::SetEnvironmentVariable('Path', $newPath, 'User')
    Write-Host "Removed $binPath from user PATH (open a new shell to pick it up)."
}

Write-Host ''
Write-Host '✓ CodeXX DTDK uninstalled.'
Write-Host ''
Write-Host '  Open a new shell so the PATH change takes effect.'

if ($KeepConfig -or $KeepCache) {
    Write-Host '  Preserved on disk (will be picked up by a future reinstall):'
    if ($KeepConfig -and (Test-Path -LiteralPath $configDir)) { Write-Host "    $configDir" }
    if ($KeepCache  -and (Test-Path -LiteralPath $cacheDir )) { Write-Host "    $cacheDir"  }
}
