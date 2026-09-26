#!/bin/sh
# Fetches the brand typefaces from Fontshare into assets/fonts.
#
# The .ttf files are deliberately NOT committed: this repo is public, and the
# ITF Free Font License permits embedding the fonts in an app but forbids
# redistributing the font files themselves via publicly accessible servers.
# Downloading the official release here keeps us inside the license while still
# shipping the real faces in the binary.
#
# Runs automatically via postinstall, so EAS builds and fresh clones both get
# the fonts before anything tries to bundle them. Idempotent and quiet.

set -e

DIR="$(cd "$(dirname "$0")/.." && pwd)/assets/fonts"
mkdir -p "$DIR"

NEEDED="CabinetGrotesk-Regular CabinetGrotesk-Medium CabinetGrotesk-Bold CabinetGrotesk-Extrabold Satoshi-Regular Satoshi-Medium Satoshi-Bold"

missing=0
for f in $NEEDED; do
  [ -f "$DIR/$f.ttf" ] || missing=1
done

if [ "$missing" -eq 0 ]; then
  exit 0
fi

echo "fetch-fonts: downloading brand typefaces from Fontshare..."
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

for family in satoshi cabinet-grotesk; do
  if ! curl -sfL -o "$TMP/$family.zip" "https://api.fontshare.com/v2/fonts/download/$family"; then
    echo "fetch-fonts: WARNING could not download $family — the app will fall back to system fonts." >&2
    exit 0
  fi
  unzip -qo "$TMP/$family.zip" -d "$TMP/$family"
done

for f in $NEEDED; do
  src="$(find "$TMP" -name "$f.ttf" -print -quit 2>/dev/null || true)"
  if [ -n "$src" ]; then
    cp "$src" "$DIR/$f.ttf"
  else
    echo "fetch-fonts: WARNING $f.ttf not found in the Fontshare archive." >&2
  fi
done

# The license text travels with the fonts.
lic="$(find "$TMP" -name "FFL.txt" -print -quit 2>/dev/null || true)"
[ -n "$lic" ] && cp "$lic" "$DIR/LICENSE-FFL.txt"

echo "fetch-fonts: done."
