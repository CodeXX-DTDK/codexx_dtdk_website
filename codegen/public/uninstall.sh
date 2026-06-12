#!/usr/bin/env bash
# CodeXX DTDK uninstaller (POSIX). Per ADR-038 §5.
#
# A byte-identical copy of this script is served at
# https://www.codexx-dtdk.com/uninstall.sh — keep website/public/uninstall.sh in
# sync when editing this file.
#
# Removes the DTDK install tree (default $HOME/.codexx), the shell-profile PATH
# marker block written by install.sh, and — unless asked otherwise — the
# per-user config and cache directories that hold the shared active map and
# per-component license tokens.
#
# Layout removed (per ADR-038 §2 and storage::configRoot/cacheRoot):
#   <root>/                                ← install tree (bin/, .shim/, <component>/<channel>/<version>/, …)
#   ~/.config/codexx/                      ← license tokens (Linux)
#   ~/Library/Application Support/CodeXX/  ← license tokens (macOS)
#   ~/.cache/codexx/                       ← shared active map + per-tool cache (Linux)
#   ~/Library/Caches/CodeXX/               ← shared active map + per-tool cache (macOS)
#   PATH marker block in ~/.bashrc, ~/.zshrc, ~/.profile
#
# Re-running is safe: each path is removed best-effort, missing paths are not
# an error.
#
# Usage:
#   uninstall.sh [--root <dir>] [--keep-config] [--keep-cache] [--no-path]
#                [--dry-run] [-y|--yes]

set -euo pipefail

readonly DEFAULT_ROOT="${HOME}/.codexx"
readonly MARKER_BEGIN="# >>> codexx-dtdk install begin >>>"
readonly MARKER_END="# <<< codexx-dtdk install end <<<"

usage() {
    cat <<EOF
CodeXX DTDK uninstaller.

  --root <dir>      Install root to remove (default: ${DEFAULT_ROOT})
  --keep-config     Preserve ~/.config/codexx (or macOS equivalent) — keeps
                    license tokens for a later reinstall
  --keep-cache      Preserve ~/.cache/codexx (or macOS equivalent) — keeps the
                    shared active map
  --no-path         Skip shell-profile PATH-marker cleanup
  --dry-run         Print what would be removed; touch nothing
  -y, --yes         Skip the confirmation prompt
  -h, --help        Show this help

By default this removes <root>, the PATH marker block from your shell rc
files, and the per-user config and cache directories. Use --keep-config and
--keep-cache if you plan to reinstall and want to keep licences / state.
EOF
}

root="${DEFAULT_ROOT}"
keep_config=0
keep_cache=0
patch_path=1
dry_run=0
assume_yes=0

while [[ $# -gt 0 ]]; do
    case "$1" in
        --root) root="$2"; shift 2 ;;
        --keep-config) keep_config=1; shift ;;
        --keep-cache) keep_cache=1; shift ;;
        --no-path) patch_path=0; shift ;;
        --dry-run) dry_run=1; shift ;;
        -y|--yes) assume_yes=1; shift ;;
        -h|--help) usage; exit 0 ;;
        *) echo "Unknown arg: $1" >&2; usage; exit 2 ;;
    esac
done

# ---------------------------------------------------------------------------
# Platform-specific config + cache locations (mirrors libs/storage).
# ---------------------------------------------------------------------------
uname_s="$(uname -s)"
case "$uname_s" in
    Linux)
        config_dir="${XDG_CONFIG_HOME:-${HOME}/.config}/codexx"
        cache_dir="${XDG_CACHE_HOME:-${HOME}/.cache}/codexx"
        ;;
    Darwin)
        config_dir="${HOME}/Library/Application Support/CodeXX"
        cache_dir="${HOME}/Library/Caches/CodeXX"
        ;;
    *)
        echo "Unsupported OS: $uname_s" >&2
        exit 1
        ;;
esac

# ---------------------------------------------------------------------------
# Plan: build a list of (label, path) entries the user will actually remove.
# ---------------------------------------------------------------------------
declare -a plan_labels=()
declare -a plan_paths=()

add_plan() {
    local label="$1" path="$2"
    if [[ -e "$path" || -L "$path" ]]; then
        plan_labels+=("$label")
        plan_paths+=("$path")
    fi
}

add_plan "install root" "$root"
[[ "$keep_config" -eq 0 ]] && add_plan "config (license tokens)" "$config_dir"
[[ "$keep_cache" -eq 0 ]] && add_plan "cache (active map)" "$cache_dir"

# Profile cleanup is reported separately — we don't delete the file, we strip
# the marker block from it.
declare -a profile_files=()
if [[ "$patch_path" -eq 1 ]]; then
    for rc in "${HOME}/.bashrc" "${HOME}/.zshrc" "${HOME}/.profile"; do
        if [[ -f "$rc" ]] && grep -qF "$MARKER_BEGIN" "$rc" 2>/dev/null; then
            profile_files+=("$rc")
        fi
    done
fi

# ---------------------------------------------------------------------------
# Show the plan + confirm
# ---------------------------------------------------------------------------
if [[ "${#plan_paths[@]}" -eq 0 && "${#profile_files[@]}" -eq 0 ]]; then
    echo "Nothing to remove — no install tree, config, cache, or PATH marker found."
    exit 0
fi

echo "The following will be removed:"
for i in "${!plan_paths[@]}"; do
    printf '  • %-28s %s\n' "${plan_labels[$i]}" "${plan_paths[$i]}"
done
for rc in "${profile_files[@]}"; do
    printf '  • %-28s %s\n' "PATH marker block in" "$rc"
done
echo

if [[ "$dry_run" -eq 1 ]]; then
    echo "(--dry-run: nothing was touched.)"
    exit 0
fi

if [[ "$assume_yes" -ne 1 ]]; then
    if [[ ! -t 0 ]]; then
        echo "Refusing to uninstall non-interactively without -y/--yes." >&2
        echo "Re-run with --yes to confirm, or --dry-run to preview." >&2
        exit 2
    fi
    read -r -p "Proceed? [y/N] " reply
    case "$reply" in
        y|Y|yes|YES) ;;
        *) echo "Aborted."; exit 1 ;;
    esac
fi

# ---------------------------------------------------------------------------
# Remove paths
# ---------------------------------------------------------------------------
for i in "${!plan_paths[@]}"; do
    p="${plan_paths[$i]}"
    if rm -rf -- "$p"; then
        echo "Removed ${plan_labels[$i]}: $p"
    else
        echo "::warning:: failed to remove $p" >&2
    fi
done

# ---------------------------------------------------------------------------
# Strip the marker block from each shell rc file. We never delete the rc
# itself; just the block bounded by the two install.sh markers.
# ---------------------------------------------------------------------------
strip_marker_block() {
    local profile="$1"
    local tmp
    tmp="$(mktemp)"
    awk -v b="$MARKER_BEGIN" -v e="$MARKER_END" '
        $0 == b { skip = 1; next }
        skip && $0 == e { skip = 0; next }
        !skip
    ' "$profile" >"$tmp"
    # Trim a trailing blank line we may have left behind.
    sed -i.bak -e '${/^$/d;}' "$tmp" 2>/dev/null || true
    rm -f "${tmp}.bak" 2>/dev/null || true
    mv "$tmp" "$profile"
    echo "Removed PATH marker block from $profile"
}

for rc in "${profile_files[@]}"; do
    strip_marker_block "$rc"
done

cat <<EOF

✓ CodeXX DTDK uninstalled.

  Open a new shell so the PATH change takes effect.
EOF
if [[ "$keep_config" -eq 1 || "$keep_cache" -eq 1 ]]; then
    cat <<EOF
  Preserved on disk (will be picked up by a future reinstall):
EOF
    [[ "$keep_config" -eq 1 && -d "$config_dir" ]] && echo "    $config_dir"
    [[ "$keep_cache"  -eq 1 && -d "$cache_dir"  ]] && echo "    $cache_dir"
fi
