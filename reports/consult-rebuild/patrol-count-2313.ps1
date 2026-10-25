$r = "C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1"
Set-Location $r
$base = "3f0190788ce05fd7231bbefb68618cecccbc470e"
$diff = git diff "$base..HEAD"

$patterns = @(
  "ghp_[A-Za-z0-9]{20,}",
  "AKIA[A-Z0-9]{12,}",
  "xox[baprs]-[A-Za-z0-9-]{10,}",
  "oauth2:[^@\s]+@",
  "Bearer [A-Za-z0-9._-]{20,}",
  "Bearer eyJ[A-Za-z0-9_-]{10,}"
)
$real = @()
foreach ($pat in $patterns) {
  $m = @($diff | Select-String -Pattern $pat)
  if ($m.Count -gt 0) { $real += $m }
}
"REAL_TOKEN_HITS=" + @($real).Count
if ($real.Count -gt 0) { $real | ForEach-Object { $_.Line.Trim() } }

"=== narrative-only ghp/AKIA/Bearer classification ==="
"ghp_narrative=" + @($diff | Select-String -Pattern "ghp_").Count
"AKIA_narrative=" + @($diff | Select-String -Pattern "AKIA").Count
"xox_prefix=" + @($diff | Select-String -Pattern "xox").Count
"oauth2=" + @($diff | Select-String -Pattern "oauth2:").Count
"Bearer_total=" + @($diff | Select-String -Pattern "Bearer").Count

"=== report file scan ==="
$rep = "docs\verification\consult-agent-m86-report.md"
"report_legacy=" + @(Select-String -LiteralPath $rep -Pattern "gang-os|jianlan-gang-os|gangos|杠OS|健澜科技杠|Gang-OS" -AllMatches).Count
"report_product=" + @(Select-String -LiteralPath $rep -Pattern "健澜AI原生医院操作系统OS").Count
$repReal = @()
foreach ($pat in $patterns) {
  $m = @(Select-String -LiteralPath $rep -Pattern $pat)
  if ($m.Count -gt 0) { $repReal += $m }
}
"report_real_token=" + @($repReal).Count
$repBearer = @(Select-String -LiteralPath $rep -Pattern "Bearer")
"report_Bearer_mentions=" + @($repBearer).Count
$repBearer | ForEach-Object { "$($_.LineNumber): $($_.Line.Trim())" }
