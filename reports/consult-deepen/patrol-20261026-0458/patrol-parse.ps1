# Parse bun test per-dir pass/fail by file header; coverage consult source rows
$root = 'C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1'
$logDir = Join-Path $root 'reports\consult-deepen\patrol-20261026-0458'
$out = Join-Path $logDir 'patrol-parsed.txt'
$lines = @()

$testErr = Get-Content -LiteralPath (Join-Path $logDir 'patrol-bun-test-err.log')
$covErr = Get-Content -LiteralPath (Join-Path $logDir 'patrol-coverage-err.log')

$lines += '=== BUN TEST TAIL ==='
$testErr | Select-Object -Last 4 | ForEach-Object { $lines += $_.Trim() }

# ---- per file / per dir pass-fail ----
$dirPass = @{ unit = 0; security = 0; integration = 0 }
$dirFail = @{ unit = 0; security = 0; integration = 0 }
$fileStats = @{}
$current = ''
foreach ($ln in $testErr) {
    if ($ln -match '^\s*(tests[\\/](unit|security|integration)[\\/]consult-agent[\\/][^:]+\.ts)\s*:') {
        $current = $Matches[1]
        if (-not $fileStats.ContainsKey($current)) { $fileStats[$current] = @{ pass = 0; fail = 0 } }
    }
    $pc = [regex]::Matches($ln, '\(pass\)').Count
    if ($pc -gt 0) {
        if ($current) { $fileStats[$current].pass += $pc }
        if ($current -match 'unit') { $dirPass.unit += $pc } elseif ($current -match 'security') { $dirPass.security += $pc } elseif ($current -match 'integration') { $dirPass.integration += $pc }
    }
    $fc = [regex]::Matches($ln, '\(fail\)').Count
    if ($fc -gt 0) {
        if ($current) { $fileStats[$current].fail += $fc }
        if ($current -match 'unit') { $dirFail.unit += $fc } elseif ($current -match 'security') { $dirFail.security += $fc } elseif ($current -match 'integration') { $dirFail.integration += $fc }
    }
}
$lines += ''
$lines += '=== PER DIR (functional test) ==='
foreach ($k in @('unit','security','integration')) {
    $lines += ("tests/{0}/consult-agent pass={1} fail={2}" -f $k, $dirPass[$k], $dirFail[$k])
}
$lines += ("TOTAL pass={0} fail={1} files={2}" -f ($dirPass.unit+$dirPass.security+$dirPass.integration), ($dirFail.unit+$dirFail.security+$dirFail.integration), $fileStats.Count)

$lines += ''
$lines += '=== PER FILE ==='
foreach ($f in ($fileStats.Keys | Sort-Object)) {
    $lines += ("{0} pass={1} fail={2}" -f $f, $fileStats[$f].pass, $fileStats[$f].fail)
}

$lines += ''
$lines += '=== COVERAGE TAIL ==='
$covErr | Select-Object -Last 4 | ForEach-Object { $lines += $_.Trim() }
$all = $covErr | Where-Object { $_ -match 'All files' }
$lines += ''
$lines += '=== ALL FILES ROW ==='
foreach ($a in $all) { $lines += $a.Trim() }
$lines += ''
$lines += '=== CONSULT SRC COVERAGE ROWS ==='
$covErr | Where-Object { $_ -match '^\s*src[\\/](core[\\/]agent[\\/]consult|bff[\\/]routes[\\/]consultAgentRoutes|db[\\/]repositories[\\/]consultAgentRepo)' } | ForEach-Object { $lines += $_.Trim() }

$lines | Set-Content -LiteralPath $out -Encoding UTF8
$lines | ForEach-Object { Write-Host $_ }
