# count pass cases per consult test directory from bun err log
$root = "C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1"
$log  = Join-Path $root "reports\consult-deepen\patrol-20261026-0407"
$err  = Join-Path $log "patrol-bun-test-err.log"
$all  = Get-Content -LiteralPath $err -Encoding UTF8
$cur = ""
$dirPass = @{ unit = 0; security = 0; integration = 0 }
$dirFail = @{ unit = 0; security = 0; integration = 0 }
foreach ($l in $all) {
  if ($l -match '^tests[\\/]unit[\\/]') { $cur = 'unit' }
  elseif ($l -match '^tests[\\/]security[\\/]') { $cur = 'security' }
  elseif ($l -match '^tests[\\/]integration[\\/]') { $cur = 'integration' }
  if ($cur -ne '') {
    if ($l -match '\(pass\)') { $dirPass[$cur]++ }
    if ($l -match '\(fail\)') { $dirFail[$cur]++ }
  }
}
foreach ($k in @('unit','security','integration')) {
  Write-Host "$k pass=$($dirPass[$k]) fail=$($dirFail[$k])"
}
Write-Host ("TOTAL pass={0} fail={1}" -f ($dirPass.unit+$dirPass.security+$dirPass.integration), ($dirFail.unit+$dirFail.security+$dirFail.integration))
