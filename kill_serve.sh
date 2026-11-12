#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")"

if [[ ! -f .jekyll.pid ]]; then
  echo "No tracked Jekyll server is running."
  exit 0
fi

pid="$(cat .jekyll.pid)"
if kill -0 "$pid" 2>/dev/null; then
  kill "$pid"
  echo "Stopped Jekyll server (PID $pid)."
else
  echo "Tracked Jekyll process is no longer running."
fi

rm -f .jekyll.pid
