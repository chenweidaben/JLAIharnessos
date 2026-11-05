# 0510 round - legacy name scan over 72-file wide set (ASCII regex only)
$root = 'C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1'
$log = Join-Path $root 'reports\consult-deepen\patrol-20261026-0510'
$list = Get-Content -LiteralPath (Join-Path $log 'compliance-filelist.txt') -Encoding UTF8
$pat = 'gang-os|jianlan-gang-os|gangos|Gang-OS|GangOS'
$hits = 0
$hitLines = @()
foreach ($f in $list) {
  if (-not (Test-Path -LiteralPath $f)) { continue }
  $m = Select-String -LiteralPath $f -Pattern $pat -CaseSensitive:$false -ErrorAction SilentlyContinue
  if ($m) {
    foreach ($h in $m) {
      $hits++
      $rel = $f.Substring($root.Length+1)
      $hitLines += ($rel + ':' + $h.LineNumber + ': ' + $h.Line.Trim())
    }
  }
}
$out = Join-Path $log 'patrol-compliance-legacy.txt'
Set-Content -LiteralPath $out -Value ('LEGACY_NAME_TOTAL_HITS=' + $hits) -Encoding UTF8
foreach ($l in $hitLines) { Add-Content -LiteralPath $out -Value $l -Encoding UTF8 }
Write-Host ('LEGACY_NAME_TOTAL_HITS=' + $hits)
