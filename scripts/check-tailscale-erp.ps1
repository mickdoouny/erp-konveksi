# Verifikasi kesiapan akses ERP lewat Tailscale (jalankan di laptop server ERP)
param([switch]$Verbose)

$ErrorActionPreference = "Continue"
$port = if ($env:ERP_DEV_PORT) { [int]$env:ERP_DEV_PORT } else { 3000 }

function Write-Section($title) {
  Write-Host ""
  Write-Host "=== $title ===" -ForegroundColor Cyan
}

Write-Section "Tailscale CLI"
if (-not (Get-Command tailscale -ErrorAction SilentlyContinue)) {
  Write-Host "FAIL: tailscale.exe tidak ditemukan. Install dari https://tailscale.com/download/windows" -ForegroundColor Red
  exit 1
}
tailscale version

Write-Section "Tailscale status"
$status = tailscale status 2>&1
$status
if ($LASTEXITCODE -ne 0) {
  Write-Host "FAIL: tailscale status error" -ForegroundColor Red
  exit 1
}

$tsIp = ($status | Select-String -Pattern '^\s*(\d+\.\d+\.\d+\.\d+)\s+(\S+)' | ForEach-Object {
  if ($_.Matches[0].Groups[2].Value -match '^(server-erp|SERVER-ERP)$') { $_.Matches[0].Groups[1].Value }
}) | Select-Object -First 1

if (-not $tsIp) {
  $tsIp = (tailscale ip -4 2>$null | Select-Object -First 1)
}

if ($tsIp) {
  Write-Host "Tailscale IPv4 server: $tsIp" -ForegroundColor Green
} else {
  Write-Host "WARN: tidak bisa membaca IP Tailscale" -ForegroundColor Yellow
}

$peerCount = ($status | Select-String -Pattern '^\d+\.\d+\.\d+\.\d+' | Measure-Object).Count
if ($peerCount -le 1) {
  Write-Host "WARN: hanya 1 node di tailnet - PC operator belum join. Lihat docs/TAILSCALE-OPERATOR-ACCESS.md Bagian B." -ForegroundColor Yellow
}

Write-Section "Port $port (ERP dev)"
$listeners = netstat -ano | Select-String ":$port\s+.*LISTENING"
if ($listeners) {
  $listeners | ForEach-Object { Write-Host $_ -ForegroundColor Green }
} else {
  Write-Host "FAIL: tidak ada proses LISTENING di port $port. Jalankan: npm run dev:lan" -ForegroundColor Red
}

Write-Section "HTTP /login (localhost)"
try {
  $r = Invoke-WebRequest -Uri "http://127.0.0.1:$port/login" -UseBasicParsing -TimeoutSec 5
  Write-Host "OK: GET /login -> $($r.StatusCode)" -ForegroundColor Green
} catch {
  Write-Host "FAIL: $($_.Exception.Message)" -ForegroundColor Red
}

if ($tsIp) {
  Write-Section "HTTP /login (Tailscale $tsIp)"
  try {
    $r2 = Invoke-WebRequest -Uri "http://${tsIp}:$port/login" -UseBasicParsing -TimeoutSec 5
    Write-Host "OK: GET http://${tsIp}:$port/login -> $($r2.StatusCode)" -ForegroundColor Green
  } catch {
    Write-Host "FAIL: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Cek ERP_LAN_BIND_ALL=true dan firewall (scripts/allow-lan-port-3000.ps1)" -ForegroundColor Yellow
  }
}

Write-Section "ALLOWED_DEV_ORIGINS (.env)"
$envPath = Join-Path (Split-Path $PSScriptRoot -Parent) ".env"
if (Test-Path $envPath) {
  $null = (Get-Content $envPath -Raw) -match 'ALLOWED_DEV_ORIGINS=(.+)'
  if ($Matches) {
    $line = $Matches[1].Split("`n")[0]
    if ($tsIp -and $line -notmatch [regex]::Escape($tsIp)) {
      Write-Host "WARN: IP Tailscale $tsIp belum ada di ALLOWED_DEV_ORIGINS" -ForegroundColor Yellow
    } else {
      Write-Host "OK: ALLOWED_DEV_ORIGINS terlihat mencakup Tailscale" -ForegroundColor Green
    }
    if ($Verbose) { Write-Host $line }
  }
} else {
  Write-Host "WARN: .env tidak ditemukan" -ForegroundColor Yellow
}

Write-Section "Operator URL"
if ($tsIp) {
  Write-Host "http://${tsIp}:$port/login"
  Write-Host "http://server-erp:${port}/login (MagicDNS - aktifkan di PC operator)"
}

Write-Host ""
