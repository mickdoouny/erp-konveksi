# Run PowerShell as Administrator
# Opens inbound TCP for ERP Konveksi dev server on LAN (default port 3000)

param(
  [int]$Port = 3000
)

$ErrorActionPreference = "Stop"
$ruleName = "ERP Konveksi Dev $Port"

Write-Host "Removing stale rules (ignore errors if missing)..."
netsh advfirewall firewall delete rule name="ERP Konveksi Dev 3000" 2>$null
netsh advfirewall firewall delete rule name=$ruleName 2>$null

netsh advfirewall firewall add rule name=$ruleName dir=in action=allow protocol=TCP localport=$Port enable=yes profile=any
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$subnetRule = "ERP LAN Subnet In"
netsh advfirewall firewall delete rule name=$subnetRule 2>$null
netsh advfirewall firewall add rule name=$subnetRule dir=in action=allow remoteip=192.168.1.0/24 enable=yes profile=any
netsh advfirewall firewall add rule name="ERP LAN Subnet 100" dir=in action=allow remoteip=192.168.100.0/24 enable=yes profile=any
netsh advfirewall firewall delete rule name="ERP Tailscale In" 2>$null
netsh advfirewall firewall add rule name="ERP Tailscale In" dir=in action=allow remoteip=100.64.0.0/10 enable=yes profile=any

$np = "C:\Program Files\nodejs\node.exe"
if (Test-Path $np) {
  netsh advfirewall firewall delete rule name="Node ERP Inbound" 2>$null
  netsh advfirewall firewall add rule name="Node ERP Inbound" dir=in action=allow program="$np" enable=yes profile=any
}

Write-Host ""
Write-Host "Firewall rules applied for TCP $Port. Bind server with:"
Write-Host "  .env: ERP_LAN_BIND_ALL=true  (listen 0.0.0.0)"
Write-Host "  .env: ERP_LAN_HOST=192.168.100.122  (URL shown to operators)"
Write-Host "  npm run build && npm run start:lan"
Write-Host ""
netsh advfirewall firewall show rule name=$ruleName
