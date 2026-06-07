$body = @{
  action = "submit_input_order"
  actorName = "Purwanti"
  actorRole = "cs"
  jenisOrder = "Stelan"
  totalOrder = 1
  hargaStelan = 150000
  hargaAtasan = 0
  hargaBawahan = 0
  dpAmount = 50000
  ongkosKirim = 0
  tanggalDeadline = "2026-06-16"
  jenisProduksi = "REGULER"
  catatanFinishing = ""
  needsKancing = $false
  needsDTF = $false
  buktiDp = "/uploads/ART-00001-bukti-dp.png"
  excelSource = $false
  rosterLines = @(
    @{
      nama = "agueng"
      ukuran = "L"
      nomorPunggung = "7"
      jenisItem = "Stelan"
      jenisKerah = "V Neck"
      lengan = "Lengan Pendek"
      bahan = "Dryfit"
      warna = "Biru"
    }
  )
} | ConvertTo-Json -Depth 5

$id = "9ad98a91-1d97-429e-8b03-c6160dbc7968"
$uri = "http://localhost:3000/api/cs/antrian-desain/$id?role=cs&csId=9da96dc1-f60b-4e50-966b-7af9e8ff8a0a&csNama=Purwanti"

try {
  $resp = Invoke-WebRequest -Uri $uri -Method PATCH -ContentType "application/json" -Body $body -UseBasicParsing
  Write-Output "STATUS: $($resp.StatusCode)"
  Write-Output $resp.Content
} catch {
  if ($_.Exception.Response) {
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $text = $reader.ReadToEnd()
    Write-Output "STATUS: $($_.Exception.Response.StatusCode.value__)"
    Write-Output $text
  } else {
    Write-Output $_.Exception.Message
  }
}
