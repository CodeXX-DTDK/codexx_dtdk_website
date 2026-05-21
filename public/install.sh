#!/usr/bin/env bash
# CodeXX DTDK bootstrap installer (POSIX). Per ADR-038 §5 + ADR-039 §3.
#
# A byte-identical copy of this script is served at
# https://www.codexx-dtdk.com/install.sh — keep website/public/install.sh in
# sync when editing this file.
#
# Installs the DTDK Manager + master shim into <root>/ (default $HOME/.codexx)
# and appends <root>/bin to the user's shell profile so installed tools resolve
# in fresh shells.
#
# By default the latest STABLE manager release is fetched through the public
# download proxy (https://www.codexx-dtdk.com) — no GitHub account or token is
# required. Passing --token, --tag, --repo, or a non-stable --channel switches
# to a direct GitHub Releases API download; because the releases repository is
# private, the direct path requires --token.
#
# The manager release archive ships both binaries (ADR-038 §5):
#   bin/codexx_dtdk_manager
#   .shim/codexx_shim
# Subsequent component installs (codegen, docsgen, …) go through the manager
# TUI; this script bootstraps the entry point only.
#
# Usage:
#   install.sh [--root <dir>] [--channel <stable|insider|canary>]
#              [--tag <full-tag>] [--repo <owner/name>] [--proxy <url>]
#              [--no-path] [--path-only] [--verify] [--token <ghp_…>]
#
# Re-running is safe and idempotent: an existing PATH-append marker block is
# detected and skipped; the manager binary is replaced atomically.
#
# --path-only skips the GitHub download/extract entirely and only patches the
# user's shell profile. Useful for dev builds where the manager already lives
# at <root>/bin/codexx_dtdk_manager and you just need PATH wired up.

set -euo pipefail

readonly DEFAULT_REPO="CodeXX-DTDK/codexx_dtdk"
readonly DEFAULT_ROOT="${HOME}/.codexx"
readonly DEFAULT_CHANNEL="stable"
readonly DEFAULT_PROXY="https://www.codexx-dtdk.com"
readonly MARKER_BEGIN="# >>> codexx-dtdk install begin >>>"
readonly MARKER_END="# <<< codexx-dtdk install end <<<"

usage() {
    cat <<EOF
CodeXX DTDK bootstrap installer.

  --root <dir>      Install root (default: ${DEFAULT_ROOT})
  --channel <ch>    stable | insider | canary (default: ${DEFAULT_CHANNEL})
  --tag <tag>       Install a specific tag (implies a direct, --token download)
  --repo <o/n>      GitHub repo (default: ${DEFAULT_REPO}; implies --token)
  --proxy <url>     Download-proxy base URL (default: ${DEFAULT_PROXY})
  --no-path         Skip shell-profile PATH append
  --path-only       Only patch the shell profile — skip download/extract.
                    For dev builds where the manager is already in place.
  --verify          cosign verify-blob the downloaded archive (cosign on PATH)
  --token <pat>     GitHub PAT — switches to a direct private-repo download
  -h, --help        Show this help

With no --token/--tag/--repo and on the stable channel, the latest stable
manager release is downloaded through the public proxy — no token needed.
Component installs (codegen, docsgen, …) go through the manager TUI:
codexx_dtdk_manager.
EOF
}

# ---------------------------------------------------------------------------
# Arg parsing
# ---------------------------------------------------------------------------
root="${DEFAULT_ROOT}"
channel="${DEFAULT_CHANNEL}"
repo="${DEFAULT_REPO}"
proxy="${CODEXX_DOWNLOAD_PROXY:-${DEFAULT_PROXY}}"
tag=""
patch_path=1
path_only=0
verify=0
token="${GITHUB_TOKEN:-}"

while [[ $# -gt 0 ]]; do
    case "$1" in
        --root) root="$2"; shift 2 ;;
        --channel) channel="$2"; shift 2 ;;
        --tag) tag="$2"; shift 2 ;;
        --repo) repo="$2"; shift 2 ;;
        --proxy) proxy="$2"; shift 2 ;;
        --no-path) patch_path=0; shift ;;
        --path-only) path_only=1; shift ;;
        --verify) verify=1; shift ;;
        --token) token="$2"; shift 2 ;;
        -h|--help) usage; exit 0 ;;
        *) echo "Unknown arg: $1" >&2; usage; exit 2 ;;
    esac
done

if [[ "$path_only" -eq 1 && "$patch_path" -eq 0 ]]; then
    echo "--path-only and --no-path are mutually exclusive." >&2
    exit 2
fi

case "$channel" in
    stable|insider|canary) ;;
    *) echo "Invalid --channel: $channel (expected stable|insider|canary)" >&2; exit 2 ;;
esac

# ---------------------------------------------------------------------------
# PATH-patch function (used by --path-only and by the full install)
# ---------------------------------------------------------------------------
maybe_append_path() {
    local profile="$1"
    if [[ ! -f "$profile" ]]; then
        return 0
    fi
    if grep -qF "$MARKER_BEGIN" "$profile" 2>/dev/null; then
        echo "PATH already configured in $profile (skipping)"
        return 0
    fi
    {
        printf '\n%s\n' "$MARKER_BEGIN"
        printf 'export PATH="%s/bin:$PATH"\n' "$root"
        printf '%s\n' "$MARKER_END"
    } >>"$profile"
    echo "Appended PATH to $profile"
}

patch_user_path() {
    # Pick the user's interactive shell rc files. Touch the ones that exist;
    # if none exist, fall back to ~/.profile (created if missing).
    local patched=0
    local rc
    for rc in "${HOME}/.bashrc" "${HOME}/.zshrc" "${HOME}/.profile"; do
        if [[ -f "$rc" ]]; then
            maybe_append_path "$rc"
            patched=1
        fi
    done
    if [[ "$patched" -eq 0 ]]; then
        touch "${HOME}/.profile"
        maybe_append_path "${HOME}/.profile"
    fi
    echo
    echo "Open a new shell, or run:  export PATH=\"${root}/bin:\$PATH\""
}

# ---------------------------------------------------------------------------
# --path-only fast path: patch shell rc and exit.
# ---------------------------------------------------------------------------
if [[ "$path_only" -eq 1 ]]; then
    if [[ ! -d "${root}/bin" ]]; then
        echo "::warning:: ${root}/bin does not exist — PATH entry will be inert until the manager is installed there." >&2
    fi
    patch_user_path
    echo
    echo "✓ PATH patched. (--path-only: no download performed.)"
    exit 0
fi

# ---------------------------------------------------------------------------
# Platform detection (mirrors release-manager.yml asset name schema)
# ---------------------------------------------------------------------------
uname_s="$(uname -s)"
uname_m="$(uname -m)"
case "$uname_s" in
    Linux) os="linux" ;;
    Darwin) os="macos" ;;
    *) echo "Unsupported OS: $uname_s" >&2; exit 1 ;;
esac
case "$uname_m" in
    x86_64|amd64) arch="x64" ;;
    aarch64|arm64) arch="arm64" ;;
    *) echo "Unsupported arch: $uname_m" >&2; exit 1 ;;
esac

# ---------------------------------------------------------------------------
# Tooling probe
# ---------------------------------------------------------------------------
for cmd in curl tar python3; do
    command -v "$cmd" >/dev/null 2>&1 || {
        echo "Required tool '$cmd' not found on PATH." >&2
        exit 1
    }
done
sha_cmd=""
if command -v sha256sum >/dev/null 2>&1; then
    sha_cmd="sha256sum"
elif command -v shasum >/dev/null 2>&1; then
    sha_cmd="shasum -a 256"
else
    echo "Neither sha256sum nor shasum found." >&2
    exit 1
fi

# ---------------------------------------------------------------------------
# Resolve download mode.
#   proxy  — fetch the latest stable manager release via the public proxy;
#            no token required (the proxy holds a server-side PAT).
#   direct — resolve + download straight from the private GitHub repo; needs
#            --token. Triggered by --token, --tag, --repo, or a non-stable
#            --channel, none of which the stable-only proxy can serve.
# ---------------------------------------------------------------------------
mode="proxy"
if [[ -n "$token" || -n "$tag" || "$channel" != "$DEFAULT_CHANNEL" || "$repo" != "$DEFAULT_REPO" ]]; then
    mode="direct"
fi
if [[ "$mode" == "direct" && -z "$token" ]]; then
    echo "::error:: --tag, --repo, or a non-stable --channel requires --token." >&2
    echo "          The public proxy serves only the latest stable manager release;" >&2
    echo "          a direct private-repo download needs a GitHub PAT." >&2
    exit 2
fi

# download <src-url> <dest-path> — mode-aware asset fetch.
download() {
    if [[ "$mode" == "proxy" ]]; then
        curl -fSL "$1" -o "$2"
    else
        # browser_download_url 404s on private repos with fine-grained PATs;
        # the assets API URL works with Accept: application/octet-stream.
        curl -fSL \
            -H "Authorization: Bearer $token" \
            -H "Accept: application/octet-stream" \
            "$1" -o "$2"
    fi
}

# ---------------------------------------------------------------------------
# Resolve the release tag and the archive / sha256 / sigstore source URLs.
# ---------------------------------------------------------------------------
sigstore_src=""

if [[ "$mode" == "proxy" ]]; then
    echo "Resolving latest ${DEFAULT_CHANNEL} manager release via ${proxy}…"
    meta_json="$(curl -fsSL "${proxy}/api/download?asset=meta")" || {
        echo "Could not reach the download service at ${proxy}." >&2
        exit 1
    }
    tag="$(printf '%s' "$meta_json" | python3 -c '
import json, sys
try:
    print(json.loads(sys.stdin.read()).get("tag", ""))
except Exception:
    print("")
')"
    [[ -n "$tag" ]] || { echo "The download service returned no release." >&2; exit 1; }

    q="platform=${os}&arch=${arch}"
    archive_src="${proxy}/api/download?${q}&asset=archive"
    sha_src="${proxy}/api/download?${q}&asset=sha256"
    sigstore_src="${proxy}/api/download?${q}&asset=sigstore"
else
    api_auth=(-H "Authorization: Bearer $token")
    api_base="https://api.github.com/repos/${repo}"

    if [[ -z "$tag" ]]; then
        echo "Resolving latest ${channel}/manager release in ${repo}…"
        releases_json="$(curl -fsSL "${api_auth[@]}" \
            -H "Accept: application/vnd.github+json" \
            "${api_base}/releases?per_page=100")"
        tag="$(printf '%s' "$releases_json" | python3 -c '
import json, re, sys
channel = sys.argv[1]
data = json.loads(sys.stdin.read())
pattern = re.compile(r"^" + re.escape(channel) + r"/manager@(\d+)\.(\d+)\.(\d+)(?:-(rc|rev)\.(\d+))?$")
best = None
for r in data:
    if r.get("draft"):
        continue
    m = pattern.match(r.get("tag_name", ""))
    if not m:
        continue
    maj, minr, pat = int(m.group(1)), int(m.group(2)), int(m.group(3))
    kind = m.group(4) or ""
    n = int(m.group(5)) if m.group(5) else 0
    # rank: bare (no extra) > rev.N > rc.N at the same X.Y.Z
    extra = 2 if kind == "" else (1 if kind == "rev" else 0)
    key = (maj, minr, pat, extra, n)
    if best is None or key > best[0]:
        best = (key, r["tag_name"])
print(best[1] if best else "")
' "$channel")"
        [[ -n "$tag" ]] || { echo "No ${channel}/manager release found in ${repo}." >&2; exit 1; }
    fi

    release_json="$(curl -fsSL "${api_auth[@]}" \
        -H "Accept: application/vnd.github+json" \
        "${api_base}/releases/tags/${tag}")"

    # Match the archive asset by pattern rather than reconstructing the exact
    # name — the release labels arch inconsistently (linux: x86_64, win: x64).
    archive_name="$(printf '%s' "$release_json" | python3 -c '
import json, re, sys
os_ = sys.argv[1]
data = json.loads(sys.stdin.read())
rx = re.compile(r"^codexx_dtdk_manager-.*-" + re.escape(os_) + r"-[^.]+\.(tar\.gz|zip)$")
for a in data.get("assets", []):
    if rx.match(a.get("name", "")):
        print(a.get("name", ""))
        break
' "$os")"
    [[ -n "$archive_name" ]] || { echo "No manager archive for ${os} in ${tag}." >&2; exit 1; }

    asset_url() {
        printf '%s' "$release_json" | python3 -c '
import json, sys
want = sys.argv[1]
data = json.loads(sys.stdin.read())
for a in data.get("assets", []):
    if a.get("name") == want:
        print(a.get("url", ""))
        break
' "$1"
    }
    archive_src="$(asset_url "${archive_name}")"
    sha_src="$(asset_url "${archive_name}.sha256")"
    sigstore_src="$(asset_url "${archive_name}.sigstore")"

    [[ -n "$archive_src" ]] || { echo "Archive asset URL missing in ${tag}." >&2; exit 1; }
    [[ -n "$sha_src" ]] || { echo "${archive_name}.sha256 sidecar missing." >&2; exit 1; }
fi

version="${tag##*@}"
echo "Resolved tag: ${tag}"

# ---------------------------------------------------------------------------
# Download to staging, verify integrity, optional cosign
# ---------------------------------------------------------------------------
stage_dir="${root}/.staging/${tag}"
mkdir -p "$stage_dir"
archive_path="${stage_dir}/manager-archive.tar.gz"
sha_path="${archive_path}.sha256"

echo "Downloading manager ${version}…"
download "$archive_src" "$archive_path"
download "$sha_src" "$sha_path"

expected_sha="$(awk '{print $1}' "$sha_path")"
actual_sha="$($sha_cmd "$archive_path" | awk '{print $1}')"
if [[ "$expected_sha" != "$actual_sha" ]]; then
    echo "::error:: sha256 mismatch for the manager archive" >&2
    echo "  expected: $expected_sha" >&2
    echo "  actual:   $actual_sha" >&2
    exit 1
fi
echo "sha256 OK"

if [[ "$verify" -eq 1 ]]; then
    if ! command -v cosign >/dev/null 2>&1; then
        echo "::warning:: --verify requested but cosign not on PATH; skipping" >&2
    elif [[ -z "$sigstore_src" ]]; then
        echo "::warning:: no .sigstore sidecar available for ${tag}; skipping verify" >&2
    elif ! download "$sigstore_src" "${archive_path}.sigstore"; then
        echo "::warning:: .sigstore sidecar download failed; skipping verify" >&2
    else
        identity_regex="^https://github\\.com/${repo//./\\.}/\\.github/workflows/release-manager\\.yml@.*"
        cosign verify-blob \
            --bundle "${archive_path}.sigstore" \
            --certificate-identity-regexp "$identity_regex" \
            --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
            "$archive_path" \
            >/dev/null
        echo "cosign verify OK"
    fi
fi

# ---------------------------------------------------------------------------
# Extract into <root>/ — overwrites bin/codexx_dtdk_manager + .shim/codexx_shim
# ---------------------------------------------------------------------------
mkdir -p "$root"
echo "Extracting into ${root}/…"
tar -xzf "$archive_path" -C "$root"
chmod +x "${root}/bin/codexx_dtdk_manager" "${root}/.shim/codexx_shim"

# Best-effort cleanup of the staging tree.
rm -rf "${root}/.staging" 2>/dev/null || true

# ---------------------------------------------------------------------------
# PATH append (ADR-038 §5)
# ---------------------------------------------------------------------------
if [[ "$patch_path" -eq 1 ]]; then
    patch_user_path
fi

cat <<EOF

✓ CodeXX DTDK manager ${tag} installed at ${root}.

Next:
  ${root}/bin/codexx_dtdk_manager      # browse + install components
EOF
