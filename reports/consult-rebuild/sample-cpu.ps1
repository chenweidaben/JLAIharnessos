$p = Get-Process -Id 16580 -ErrorAction SilentlyContinue
if (-not $p) { Write-Output "eslint 16580 gone"; exit }
$c1 = $p.CPU; $m1 = [math]::Round($p.WorkingSet64/1MB)
Start-Sleep -Seconds 20
$p2 = Get-Process -Id 16580 -ErrorAction SilentlyContinue
if (-not $p2) { Write-Output "eslint exited during sample"; exit }
$c2 = $p2.CPU; $m2 = [math]::Round($p2.WorkingSet64/1MB)
Write-Output ("CPU before=" + [math]::Round($c1,2) + " after=" + [math]::Round($c2,2) + " delta=" + [math]::Round($c2-$c1,2))
Write-Output ("MemMB before=" + $m1 + " after=" + $m2)
Write-Output ("CPU-minutes=" + [math]::Round($c2/60,2))
