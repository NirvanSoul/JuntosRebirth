#!/bin/sh

set -eu

if ! command -v pod >/dev/null 2>&1; then
  juntoss_gem_bin="$(ruby -e 'puts Gem.user_dir' 2>/dev/null)/bin"

  if [ -x "$juntoss_gem_bin/pod" ]; then
    PATH="$juntoss_gem_bin:$PATH"
    export PATH
  fi
fi

if ! command -v pod >/dev/null 2>&1; then
  echo "CocoaPods no está disponible. Instálalo y vuelve a ejecutar este comando." >&2
  exit 1
fi

case "${1:-}" in
  prebuild)
    npx expo prebuild --platform ios
    cd ios
    exec pod install
    ;;
  simulator)
    exec npx expo run:ios
    ;;
  device)
    exec npx expo run:ios --device
    ;;
  *)
    echo "Uso: $0 {prebuild|simulator|device}" >&2
    exit 64
    ;;
esac
