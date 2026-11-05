for ($k = 0; $k -lt 6; $k++) {
  $p = @(Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -like "*new-chat-1*" })
  if ($p.Count -eq 0) { Write-Output "round ${k}: clean"; break }
  foreach ($x in $p) {
    Stop-Process -Id $x.ProcessId -Force -ErrorAction SilentlyContinue
    Write-Output ("round ${k} killed " + $x.ProcessId)
  }
  Start-Sleep -Seconds 2
}
$final = @(Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -like "*new-chat-1*" })
Write-Output ("final_leftover=" + $final.Count)
$final | Select-Object ProcessId, @{N = "Cmd"; E = { $_.CommandLine } } | Format-List
