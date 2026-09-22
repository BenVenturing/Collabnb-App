#!/bin/sh
set -eu

cleanup() {
  if [ -n "${MOBILE_PID:-}" ]; then
    kill "$MOBILE_PID" 2>/dev/null || true
  fi
  if [ -n "${WEB_PID:-}" ]; then
    kill "$WEB_PID" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

npm run --prefix apps/mobile start &
MOBILE_PID=$!

npm run --prefix apps/web dev &
WEB_PID=$!

wait "$MOBILE_PID" "$WEB_PID"
