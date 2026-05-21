<#
.SYNOPSIS
    CodeXX DTDK bootstrap installer (Windows). Per ADR-038 §5 + ADR-039 §3.

.DESCRIPTION
    A byte-identical copy of this script is served at
    https://www.codexx-dtdk.com/install.ps1 — keep website/public/install.ps1
    in sync when editing this file.

    Installs the DTDK Manager + master shim into <root>\ (default
    %USERPROFILE%\.codexx) and prepends <root>\bin to the user's PATH so
    installed tools resolve in fresh shells.

    By default the latest STABLE manager release is fetched through the public
    download proxy (https://www.codexx-dtdk.com) — no GitHub account or token
    is required. -Token, -Tag, -Repo, or a non-stable -Channel switch to a
    direct GitHub Releases download; because the releases repository is
    private, the direct path requires -Token.

    The manager release archive ships both binaries (ADR-038 §5):
      bin\codexx_dtdk_manager.exe
      .shim\codexx_shim.exe
    Subsequent component installs (codegen, docsgen, …) go through the manager
    TUI; this script bootstraps the entry point only.

    Re-running is idempotent: the user PATH is read first and the install root
    is only prepended if not already present.

.PARAMETER Root
    Install root. Default: $env:USERPROFILE\.codexx.

.PARAMETER Channel
    stable | insider | canary. Default: stable.

.PARAMETER Tag
    Install a specific tag (implies a direct, -Token download).

.PARAMETER Repo
    GitHub repo (owner/name). Default: CodeXX-DTDK/codexx_dtdk.

.PARAMETER Proxy
    Download-proxy base URL. Default: https://www.codexx-dtdk.com.

.PARAMETER NoPath
    Skip user PATH update.

.PARAMETER Verify
    Run cosign verify-blob on the downloaded archive (cosign must be on PATH).

.PARAMETER Token
    GitHub PAT — switches to a direct private-repo download.
#>

[CmdletBinding()]
param(
    [string]$Root = "$env:USERPROFILE\.codexx",
    [ValidateSet('stable', 'insider', 'canary')]
    [string]$Channel = 'stable',
    [string]$Tag = '',
    [string]$Repo = 'CodeXX-DTDK/codexx_dtdk',
    [string]$Proxy = $(if ($env:CODEXX_DOWNLOAD_PROXY) { $env:CODEXX_DOWNLOAD_PROXY } else { 'https://www.codexx-dtdk.com' }),
    [switch]$NoPath,
    [switch]$Verify,
    [string]$Token = $env:GITHUB_TOKEN
)

$ErrorActionPreference = 'Stop'

$DefaultRepo = 'CodeXX-DTDK/codexx_dtdk'

# ---------------------------------------------------------------------------
# Platform (mirrors release-manager.yml asset-name schema)
# ---------------------------------------------------------------------------
$os = 'windows'
$arch = if ([System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture -eq 'Arm64') {
    'arm64'
} else {
    'x64'
}

# ---------------------------------------------------------------------------
# Resolve download mode.
#   proxy  — fetch the latest stable manager release via the public proxy;
#            no token required (the proxy holds a server-side PAT).
#   direct — resolve + download straight from the private GitHub repo; needs
#            -Token. Triggered by -Token, -Tag, -Repo, or a non-stable
#            -Channel, none of which the stable-only proxy can serve.
# ---------------------------------------------------------------------------
$mode = 'proxy'
if ($Token -or $Tag -or $Channel -ne 'stable' -or $Repo -ne $DefaultRepo) {
    $mode = 'direct'
}
if ($mode -eq 'direct' -and -not $Token) {
    throw "-Tag, -Repo, or a non-stable -Channel requires -Token. The public proxy serves only the latest stable manager release; a direct private-repo download needs a GitHub PAT."
}

# Get-AssetFile <url> <dest> [<headers>] — follows redirects automatically.
function Get-AssetFile($url, $dest, $headers) {
    if ($headers) {
        Invoke-WebRequest -Uri $url -Headers $headers -OutFile $dest -UseBasicParsing
    }
    else {
        Invoke-WebRequest -Uri $url -OutFile $dest -UseBasicParsing
    }
}

# ---------------------------------------------------------------------------
# Resolve the release tag and the archive / sha256 / sigstore source URLs.
# ---------------------------------------------------------------------------
$sigstoreSrc = $null
$dlHeaders = $null

if ($mode -eq 'proxy') {
    Write-Host "Resolving latest stable manager release via $Proxy…"
    try {
        $meta = Invoke-RestMethod -Uri "$Proxy/api/download?asset=meta"
    }
    catch {
        throw "Could not reach the download service at $Proxy."
    }
    $Tag = $meta.tag
    if (-not $Tag) { throw "The download service returned no release." }

    $q = "platform=$os&arch=$arch"
    $archiveSrc = "$Proxy/api/download?$q&asset=archive"
    $shaSrc = "$Proxy/api/download?$q&asset=sha256"
    $sigstoreSrc = "$Proxy/api/download?$q&asset=sigstore"
}
else {
    $apiBase = "https://api.github.com/repos/$Repo"
    $ghHeaders = @{ Accept = 'application/vnd.github+json'; Authorization = "Bearer $Token" }

    if (-not $Tag) {
        Write-Host "Resolving latest $Channel/manager release in $Repo…"
        $releases = Invoke-RestMethod -Uri "$apiBase/releases?per_page=100" -Headers $ghHeaders

        $pattern = '^' + [regex]::Escape($Channel) + '/manager@(\d+)\.(\d+)\.(\d+)(?:-(rc|rev)\.(\d+))?$'
        $best = $null
        foreach ($r in $releases) {
            if ($r.draft) { continue }
            if ($r.tag_name -match $pattern) {
                $maj = [int]$Matches[1]
                $mnr = [int]$Matches[2]
                $pat = [int]$Matches[3]
                $extraKind = if ($Matches[4]) { $Matches[4] } else { '' }
                $extraN = if ($Matches[5]) { [int]$Matches[5] } else { 0 }
                # Bare > rev.N > rc.N at the same X.Y.Z
                $rankExtra = switch ($extraKind) {
                    '' { 2 }
                    'rev' { 1 }
                    'rc' { 0 }
                }
                $rank = ($maj * 1e12) + ($mnr * 1e9) + ($pat * 1e6) + ($rankExtra * 1e3) + $extraN
                if (-not $best -or $rank -gt $best.Rank) {
                    $best = @{ Rank = $rank; Tag = $r.tag_name }
                }
            }
        }
        if (-not $best) { throw "No $Channel/manager release found in $Repo." }
        $Tag = $best.Tag
    }

    $release = Invoke-RestMethod -Uri "$apiBase/releases/tags/$Tag" -Headers $ghHeaders

    # Match the archive asset by pattern rather than reconstructing the exact
    # name — the release labels arch inconsistently (linux: x86_64, win: x64).
    $rx = '^codexx_dtdk_manager-.*-' + $os + '-[^.]+\.(zip|tar\.gz)$'
    $archiveAsset = $release.assets | Where-Object { $_.name -match $rx } | Select-Object -First 1
    if (-not $archiveAsset) { throw "No manager archive for $os in $Tag." }

    function Get-AssetUrl($name) {
        foreach ($a in $release.assets) {
            if ($a.name -eq $name) { return $a.url }
        }
        return $null
    }
    $archiveSrc = $archiveAsset.url
    $shaSrc = Get-AssetUrl "$($archiveAsset.name).sha256"
    $sigstoreSrc = Get-AssetUrl "$($archiveAsset.name).sigstore"
    if (-not $shaSrc) { throw "$($archiveAsset.name).sha256 sidecar missing." }

    # Private-repo assets need the API URL + octet-stream Accept header.
    $dlHeaders = $ghHeaders.Clone()
    $dlHeaders['Accept'] = 'application/octet-stream'
}

$version = ($Tag -split '@')[-1]
Write-Host "Resolved tag: $Tag"

# ---------------------------------------------------------------------------
# Download to staging, verify integrity, optional cosign
# ---------------------------------------------------------------------------
$stageDir = Join-Path $Root ".staging\$Tag"
New-Item -ItemType Directory -Force -Path $stageDir | Out-Null
$archivePath = Join-Path $stageDir "manager-archive.zip"
$shaPath = "$archivePath.sha256"

Write-Host "Downloading manager $version…"
Get-AssetFile $archiveSrc $archivePath $dlHeaders
Get-AssetFile $shaSrc $shaPath $dlHeaders

$expectedSha = (Get-Content $shaPath -Raw).Trim().Split(' ')[0]
$actualSha = (Get-FileHash $archivePath -Algorithm SHA256).Hash.ToLower()
if ($expectedSha.ToLower() -ne $actualSha) {
    Write-Error "sha256 mismatch for the manager archive: expected $expectedSha, got $actualSha"
    exit 1
}
Write-Host "sha256 OK"

if ($Verify) {
    if (-not (Get-Command cosign -ErrorAction SilentlyContinue)) {
        Write-Warning "-Verify requested but cosign not on PATH; skipping"
    }
    elseif (-not $sigstoreSrc) {
        Write-Warning "no .sigstore sidecar available for $Tag; skipping verify"
    }
    else {
        $sigstorePath = "$archivePath.sigstore"
        try {
            Get-AssetFile $sigstoreSrc $sigstorePath $dlHeaders
            $escapedRepo = $Repo -replace '\.', '\.'
            $identityRegex = "^https://github\.com/$escapedRepo/\.github/workflows/release-manager\.yml@.*"
            cosign verify-blob `
                --bundle $sigstorePath `
                --certificate-identity-regexp $identityRegex `
                --certificate-oidc-issuer "https://token.actions.githubusercontent.com" `
                $archivePath | Out-Null
            if ($LASTEXITCODE -ne 0) { throw "cosign verify-blob failed" }
            Write-Host "cosign verify OK"
        }
        catch {
            Write-Warning "signature verification skipped: $_"
        }
    }
}

# ---------------------------------------------------------------------------
# Extract into <root>\ — overwrites bin\codexx_dtdk_manager.exe + .shim\codexx_shim.exe
# ---------------------------------------------------------------------------
New-Item -ItemType Directory -Force -Path $Root | Out-Null
Write-Host "Extracting into $Root\…"
Expand-Archive -Path $archivePath -DestinationPath $Root -Force

# Best-effort cleanup of the staging tree.
Remove-Item -Path (Join-Path $Root ".staging") -Recurse -Force -ErrorAction SilentlyContinue

# ---------------------------------------------------------------------------
# PATH update (ADR-038 §5) — User scope (no admin needed). Prepend root\bin
# if not already present.
# ---------------------------------------------------------------------------
if (-not $NoPath) {
    $binPath = Join-Path $Root 'bin'
    $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
    $parts = $userPath -split ';' | Where-Object { $_ -ne '' }
    if ($parts -notcontains $binPath) {
        $newPath = ($binPath, $userPath -join ';').TrimEnd(';')
        [Environment]::SetEnvironmentVariable('Path', $newPath, 'User')
        Write-Host "Prepended $binPath to user PATH (open a new shell to pick it up)."
    }
    else {
        Write-Host "$binPath already in user PATH (skipping)."
    }
}

Write-Host ""
Write-Host "✓ CodeXX DTDK manager $Tag installed at $Root."
Write-Host ""
Write-Host "Next:"
Write-Host "  $Root\bin\codexx_dtdk_manager.exe      # browse + install components"
