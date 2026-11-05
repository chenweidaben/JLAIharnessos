# Seed permission grants, weak-secret scan, archive legacy meta-description scan
$ErrorActionPreference = 'Continue'
$root = 'C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1'
Set-Location $root
$out = Join-Path $root 'reports\consult-deepen\patrol-20261026-0458\patrol-compliance-seed.txt'
$L = @()

$L += '=== 380 seed permission codes and role grants ==='
Select-String -LiteralPath 'deploy/postgres/init/380-consult-threads.sql' -Pattern 'consult-agent:|admin|doctor|nurse|audit' | ForEach-Object {
    $L += ("{0}:{1}: {2}" -f '380-consult-threads.sql', $_.LineNumber, $_.Line.Trim())
}

$L += ''
$L += '=== weak secret assignment scan on delivery tree ==='
$delivery = @(
    'src/core/agent/consult',
    'src/bff/routes/consultAgentRoutes.ts',
    'src/db/repositories/consultAgentRepo.ts',
    'web/src/pages/consult-agent',
    'web/src/services/api/consultAgent.ts',
    'tests/unit/consult-agent',
    'tests/security/consult-agent',
    'tests/integration/consult-agent',
    'scripts/consult-agent'
)
$files = @()
foreach ($p in $delivery) {
    if (Test-Path -LiteralPath $p) {
        if ((Get-Item -LiteralPath $p).PSIsContainer) {
            $files += (Get-ChildItem -LiteralPath $p -Recurse -File | Select-Object -ExpandProperty FullName)
        } else {
            $files += (Resolve-Path -LiteralPath $p).Path
        }
    }
}
$weak = '(password|secret|api_key|apikey|token)\s*=\s*["''][^"''\s]{8,}["'']|Authorization\s*:\s*Bearer\s+[A-Za-z0-9_\-\.]{16,}'
$weakHits = @()
foreach ($f in $files) {
    $h = Select-String -LiteralPath $f -Pattern $weak -CaseSensitive:$false
    if ($h) { foreach ($x in $h) { $weakHits += ("{0}:{1}" -f (Split-Path $f -Leaf), $x.LineNumber) } }
}
$L += ("WEAK_SECRET_HITS=" + $weakHits.Count)
$weakHits | ForEach-Object { $L += ("  " + $_) }

$L += ''
$L += '=== legacy names inside reports/consult-deepen archive (meta-description context only) ==='
$legacy = 'gang-os|jianlan-gang-os|gangos|Gang-OS|GangOS|杠OS|健澜科技杠'
if (Test-Path -LiteralPath 'reports/consult-deepen') {
    $af = Get-ChildItem -LiteralPath 'reports/consult-deepen' -Recurse -File -Include *.md,*.txt,*.ps1
    $ah = @()
    foreach ($f in $af) {
        $h = Select-String -LiteralPath $f -Pattern $legacy -CaseSensitive:$false
        if ($h) {
            foreach ($x in $h) {
                $t = $x.Line.Trim()
                if ($t.Length -gt 120) { $t = $t.Substring(0, 120) }
                $ah += ("{0}:{1}: {2}" -f (Split-Path $f -Leaf), $x.LineNumber, $t)
            }
        }
    }
    $L += ("ARCHIVE_LEGACY_HITS=" + $ah.Count)
    $ah | Select-Object -First 20 | ForEach-Object { $L += ("  " + $_) }
}

$L | Set-Content -LiteralPath $out -Encoding UTF8
$L | ForEach-Object { Write-Host $_ }
