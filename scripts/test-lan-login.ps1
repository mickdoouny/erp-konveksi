param(
  [string]$BaseUrl = "http://127.0.0.1:3000"
)

$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
try {
  $login = Invoke-WebRequest -Uri "$BaseUrl/api/login" -Method POST `
    -Body "username=cs1&password=12345" `
    -ContentType "application/x-www-form-urlencoded" `
    -WebSession $session -MaximumRedirection 0 -ErrorAction Stop
} catch {
  $login = $_.Exception.Response
}

Write-Host "Login status:" $login.StatusCode
if ($login.Headers.Location) { Write-Host "Location:" $login.Headers.Location }

$page = Invoke-WebRequest -Uri "$BaseUrl/cs/antrian-desain" -WebSession $session -UseBasicParsing
Write-Host "Page status:" $page.StatusCode
Write-Host "Has Memuat:" ($page.Content -match "Memuat")
Write-Host "Has _next/static:" ($page.Content -match "_next/static")
Write-Host "Has __next_f:" ($page.Content -match "__next_f")

# Test dev chunk with Host header simulating LAN
$chunkMatch = [regex]::Match($page.Content, '/_next/static/[^"'' ]+')
if ($chunkMatch.Success) {
  $chunkUrl = "$BaseUrl$($chunkMatch.Value)"
  Write-Host "Testing chunk:" $chunkUrl
  try {
    $chunk = Invoke-WebRequest -Uri $chunkUrl -Headers @{ Host = "192.168.100.122:3000" } -UseBasicParsing
    Write-Host "Chunk status:" $chunk.StatusCode
  } catch {
    Write-Host "Chunk failed:" $_.Exception.Message
  }
}
