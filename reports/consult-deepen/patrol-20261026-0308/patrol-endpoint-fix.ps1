# 0308 corrected endpoint pairing: method / path / guard by nearest following line (ASCII only)
$root = 'C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1'
$log = Join-Path $root 'reports\consult-deepen\patrol-20261026-0308'
$out = Join-Path $log 'patrol-compliance.log'
$route = Join-Path $root 'src\bff\routes\consultAgentRoutes.ts'

$methods = Select-String -LiteralPath $route -Pattern 'method:'
$paths = Select-String -LiteralPath $route -Pattern "path: '/api"
$guards = Select-String -LiteralPath $route -Pattern 'const denied = requirePermissionCode'

Add-Content -LiteralPath $out -Value '--- EP CORRECTED ---' -Encoding UTF8
Add-Content -LiteralPath $out -Value ('METHOD_LINES=' + $methods.Count + ' PATH_LINES=' + $paths.Count + ' GUARD_COUNT=' + $guards.Count) -Encoding UTF8

foreach ($m in $methods) {
  $mLine = $m.LineNumber
  $mVal = ($m.Line.Trim()) -replace 'method:', '' -replace ',', ''
  $p = $null
  foreach ($cand in $paths) { if ($cand.LineNumber -gt $mLine) { $p = $cand; break } }
  $g = $null
  foreach ($cand in $guards) { if ($cand.LineNumber -gt $mLine) { $g = $cand; break } }
  $pVal = ''
  $pLine = 0
  if ($p) { $pVal = $p.Line.Trim(); $pLine = $p.LineNumber }
  $gVal = ''
  $gLine = 0
  if ($g) {
    $gLine = $g.LineNumber
    if ($g.Line -match 'CONSULT_AGENT_PERMISSIONS\.(WRITE|READ|AUDIT)') { $gVal = $Matches[1] }
  }
  $line = 'EP m' + $mLine + ' p' + $pLine + ' g' + $gLine + ' | ' + $mVal + ' | ' + $pVal + ' | ' + $gVal
  Add-Content -LiteralPath $out -Value $line -Encoding UTF8
  Write-Host $line
}
Write-Host 'endpoint corrected pairing appended'
