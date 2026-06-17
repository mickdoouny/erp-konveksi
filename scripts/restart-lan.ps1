# Stop stale next start on port 3000, then start production LAN server.
param([int]$Port = 3000)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host "Stopping listeners on port $Port..."
$lines = netstat -ano | Select-String ":$Port\s+.*LISTENING"
$pids = @()
foreach ($line in $lines) {
  $processId = ($line -split "\s+")[-1]
  if ($processId -and $processId -ne "0") { $pids += [int]$processId }
}
$pids = $pids | Sort-Object -Unique
foreach ($processId in $pids) {
  Write-Host "  Stop-Process -Id $processId -Force"
  Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
}

if (-not (Test-Path ".next\BUILD_ID")) {
  Write-Host "Build missing. Running npm run build..."
  npm run build
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Host "Applying pending database migrations..."
npx prisma migrate deploy
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Starting npm run start:lan..."
npm run start:lan
