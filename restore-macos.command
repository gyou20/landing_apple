#!/bin/sh
set -eu
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 22.13.0 or newer is required. See docs/BACKUP-RESTORE.md." >&2
  exit 1
fi

node ./scripts/restore-project.mjs