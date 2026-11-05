# 0510 round - parse bun test segment counts and coverage consult rows; ASCII only
$ErrorActionPreference = "Continue"
$root = "C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1"
$log  = Join-Path $root "reports\consult-deepen\patrol-20261026-0510"
$testErr = Join-Path $log "patrol-bun-test-err.log"
$covErr  = Join-Path $log "patrol-coverage-err.log"
$out     = Join-Path $log "patrol-parsed.txt"

$seg = [ordered]@{ unit = @{pass=0; fail=0}; security = @{pass=0; fail=0}; integration = @{pass=0; fail=0} }
$current = ""
$titleRx = [regex]'^tests\\(unit|security|integration)\\consult-agent\\'
foreach ($line in [IO.File]::ReadAllLines($testErr, [Text.Encoding]::UTF8)) {
  $m = $titleRx.Match($line)
  if ($m.Success) { $current = $m.Groups[1].Value; continue }
  if ($current -ne "") {
    if ($line.Contains("(pass)")) { $seg[$current].pass++ }
    if ($line.Contains("(fail)")) { $seg[$current].fail++ }
  }
}

$lines = [IO.File]::ReadAllLines($covErr, [Text.Encoding]::UTF8)
$allRow = ($lines | Where-Object { $_.TrimStart().StartsWith("All files") } | Select-Object -First 1)
$covRows = @()
foreach ($line in $lines) {
  if ($line -match 'core\\agent\\consult|consultAgentRoutes|consultAgentRepo|tests\\unit\\consult-agent\\helpers') {
    $covRows += $line.Trim()
  }
}

$sb = New-Object System.Text.StringBuilder
[void]$sb.AppendLine("=== segment test counts ===")
foreach ($k in $seg.Keys) {
  [void]$sb.AppendLine("$k pass=$($seg[$k].pass) fail=$($seg[$k].fail)")
}
$totPass = ($seg.Values | ForEach-Object { $_.pass } | Measure-Object -Sum).Sum
$totFail = ($seg.Values | ForEach-Object { $_.fail } | Measure-Object -Sum).Sum
[void]$sb.AppendLine("TOTAL pass=$totPass fail=$totFail")
[void]$sb.AppendLine("")
[void]$sb.AppendLine("=== coverage All files ===")
[void]$sb.AppendLine($allRow)
[void]$sb.AppendLine("")
[void]$sb.AppendLine("=== consult coverage rows ===")
foreach ($r in $covRows) { [void]$sb.AppendLine($r) }

[IO.File]::WriteAllText($out, $sb.ToString(), (New-Object Text.UTF8Encoding($false)))
Write-Host "parsed -> $out"
Write-Host $allRow
foreach ($k in $seg.Keys) { Write-Host "$k pass=$($seg[$k].pass) fail=$($seg[$k].fail)" }
