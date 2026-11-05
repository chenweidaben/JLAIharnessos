# 2207 round - read-only git hygiene probe; no add/commit/push
$ErrorActionPreference = "Continue"
$root = "C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1"
$log  = Join-Path $root "reports\consult-deepen\patrol-20261104-0907"
Set-Location $root

$headFull = (git rev-parse HEAD).Trim()
$headShort = $headFull.Substring(0, 8)
$branch = (git branch --show-current).Trim()

$lines = git status --short
$modified = @()
$consultModified = @()
$untracked = @()
foreach ($l in $lines) {
  if ($l.Length -lt 3) { continue }
  $code = $l.Substring(0, 2)
  $path = $l.Substring(3)
  if ($code -match '[MARC]') {
    $modified += $l
    if ($path -match 'consult') { $consultModified += $l }
  } elseif ($code -match '\?\?') {
    $untracked += $path
  }
}

$archive = @(); $rebuild = @(); $patrolMd = @(); $other = @()
foreach ($p in $untracked) {
  if ($p -match '^reports/consult-deepen/patrol-2026') { $archive += $p }
  elseif ($p -match '^reports/consult-rebuild/') { $rebuild += $p }
  elseif ($p -match '^reports/patrol/.*\.md$') { $patrolMd += $p }
  else { $other += $p }
}

$statusOut = Join-Path $log "git-status-probe.txt"
$sb = New-Object System.Text.StringBuilder
[void]$sb.AppendLine("HEAD=$headFull")
[void]$sb.AppendLine("HEAD_SHORT=$headShort")
[void]$sb.AppendLine("BRANCH=$branch")
[void]$sb.AppendLine("TRACKED_MODIFIED=" + $modified.Count)
[void]$sb.AppendLine("CONSULT_MODIFIED=" + $consultModified.Count)
[void]$sb.AppendLine("UNTRACKED=" + $untracked.Count)
[void]$sb.AppendLine("UNTRACKED_ARCHIVE=" + $archive.Count)
[void]$sb.AppendLine("UNTRACKED_REBUILD=" + $rebuild.Count)
[void]$sb.AppendLine("UNTRACKED_PATROL_MD=" + $patrolMd.Count)
[void]$sb.AppendLine("UNTRACKED_OTHER=" + $other.Count)
[void]$sb.AppendLine("=== modified ===")
foreach ($m in $modified) { [void]$sb.AppendLine($m) }
[void]$sb.AppendLine("=== consult modified ===")
foreach ($m in $consultModified) { [void]$sb.AppendLine($m) }
[void]$sb.AppendLine("=== untracked other ===")
foreach ($o in $other) { [void]$sb.AppendLine($o) }
[void]$sb.AppendLine("=== isolation ===")
foreach ($iso in @("probe_m416.txt", "web/src/store/cdrQueryV2M636Store.ts", ".env.example")) {
  $isoStatus = git status --short -- $iso
  if ($null -eq $isoStatus) { $isoStatus = @() }
  [void]$sb.AppendLine($iso + " -> [" + ($isoStatus -join ';') + "]")
}
[IO.File]::WriteAllText($statusOut, $sb.ToString(), (New-Object Text.UTF8Encoding($false)))

# commit grouping probe
$commits = @(
  @("2294cee310b5ec997c5d1df25d6e6306732c2603", "feat(consult-agent)"),
  @("91aab672622ff746b8d1586e0502a6da0b644109", "test(consult-agent)"),
  @("f1228ef825a3f2bba3556585e73813eb1255df4a", "docs(consult-agent)"),
  @("7149cd7f41c2f435de8654092e697e26925ef4c5", "chore(consult-agent)"),
  @("285989f9b8508a1999c8f64c737a3c34a585b024", "chore(consult-agent)")
)
$cOut = Join-Path $log "git-commits-probe.txt"
$cb = New-Object System.Text.StringBuilder
foreach ($c in $commits) {
  $sha = $c[0]; $kind = $c[1]
  $names = git show --name-only --format="" $sha
  $names = $names | Where-Object { $_ -ne "" }
  $total = $names.Count
  $consult = ($names | Where-Object { $_ -match 'consult' }).Count
  $subject = (git log -1 --format="%s" $sha).Trim()
  [void]$cb.AppendLine($sha.Substring(0, 8) + " | files=" + $total + " consult=" + $consult + " | " + $subject)
}
[void]$cb.AppendLine("=== other two commits ===")
foreach ($c in @("cadcb1df", "c2b82c3a")) {
  $full = (git rev-parse $c).Trim()
  $names = git show --name-only --format="" $full
  $names = $names | Where-Object { $_ -ne "" }
  $consult = ($names | Where-Object { $_ -match 'consult' }).Count
  $subject = (git log -1 --format="%s" $full).Trim()
  [void]$cb.AppendLine($c + " | files=" + $names.Count + " consult=" + $consult + " | " + $subject)
  foreach ($n in $names) { [void]$cb.AppendLine("    " + $n) }
}
git merge-base --is-ancestor 7149cd7f41c2f435de8654092e697e26925ef4c5 HEAD
$ancExit = $LASTEXITCODE
$ahead = (git rev-list --count 7149cd7f41c2f435de8654092e697e26925ef4c5..HEAD).Trim()
$range = (git rev-list --count d0c2d79756cacd75960bd7563ba8d9b186127270..HEAD).Trim()
[void]$cb.AppendLine("ancestor_exit=" + $ancExit)
[void]$cb.AppendLine("C4..HEAD ahead=" + $ahead)
[void]$cb.AppendLine("d0c2d797..HEAD=" + $range)
[IO.File]::WriteAllText($cOut, $cb.ToString(), (New-Object Text.UTF8Encoding($false)))

Write-Host "modified=" + $modified.Count + " consult=" + $consultModified.Count + " untracked=" + $untracked.Count + " archive=" + $archive.Count + " rebuild=" + $rebuild.Count + " md=" + $patrolMd.Count + " other=" + $other.Count
