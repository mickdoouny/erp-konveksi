netsh advfirewall firewall add rule name="ERP Konveksi Dev 3000" dir=in action=allow protocol=TCP localport=3000 profile=any enable=yes
Set-NetConnectionProfile -InterfaceAlias "Wi-Fi" -NetworkCategory Private
netsh advfirewall firewall show rule name="ERP Konveksi Dev 3000" > C:\Users\Jazzy\erp-konveksi\.firewall-result.txt 2>&1
Get-NetConnectionProfile | Out-File C:\Users\Jazzy\erp-konveksi\.network-profile.txt
