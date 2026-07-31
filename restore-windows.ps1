$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $PSScriptRoot

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Error "Node.js 22.13.0 or newer is required. See docs/BACKUP-RESTORE.md."
}

node .\scripts\restore-project.mjs
exit $LASTEXITCODE