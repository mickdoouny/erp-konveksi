param(
  [string]$BaseUrl = "http://192.168.100.122:3000"
)

function Test-DevOrigin {
  param([string]$OriginHost)
  $uri = "$BaseUrl/_next/static/chunks/webpack.js"
  try {
    $resp = Invoke-WebRequest -Uri $uri -Headers @{ Origin = "http://${OriginHost}:3000" } -UseBasicParsing -ErrorAction Stop
    return "ALLOW $OriginHost -> $($resp.StatusCode)"
  } catch {
    $status = $_.Exception.Response.StatusCode.value__
    if ($status -eq 403) { return "BLOCK $OriginHost -> 403" }
    return "ERR  $OriginHost -> $($_.Exception.Message)"
  }
}

Write-Host "Testing allowedDevOrigins via Origin header on $BaseUrl"
@(
  "192.168.100.122",
  "192.168.1.23",
  "192.168.1.50",
  "100.92.73.115",
  "server-erp",
  "server-erp.tailc9a455.ts.net"
) | ForEach-Object { Test-DevOrigin $_ }
