# Closing-review compliance grep: legacy names zero-hit, brand present, evidence rows
$root = 'C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1'
Set-Location $root
$out = Join-Path $root 'reports\consult-deepen\patrol-20261026-0458\patrol-compliance.txt'
$L = @()

$deliveryPaths = @(
    'src/core/agent/consult',
    'src/bff/routes/consultAgentRoutes.ts',
    'src/db/repositories/consultAgentRepo.ts',
    'web/src/pages/consult-agent',
    'web/src/services/api/consultAgent.ts',
    'docs/consult-agent',
    'tests/unit/consult-agent',
    'tests/security/consult-agent',
    'tests/integration/consult-agent',
    'scripts/consult-agent'
)

# resolve existing files
$files = @()
foreach ($p in $deliveryPaths) {
    if (Test-Path -LiteralPath $p) {
        if ((Get-Item -LiteralPath $p).PSIsContainer) {
            $files += (Get-ChildItem -LiteralPath $p -Recurse -File | Select-Object -ExpandProperty FullName)
        } else {
            $files += (Resolve-Path -LiteralPath $p).Path
        }
    } else {
        $L += "[MISSING PATH] $p"
    }
}
$files = $files | Sort-Object -Unique
$L += ("DELIVERY_FILES_SCANNED=" + $files.Count)

# legacy names (case-insensitive)
$legacy = 'gang-os|jianlan-gang-os|gangos|Gang-OS|GangOS|杠OS|健澜科技杠'
$legacyHits = @()
foreach ($f in $files) {
    $h = Select-String -LiteralPath $f -Pattern $legacy -CaseSensitive:$false -AllMatches
    if ($h) { foreach ($x in $h) { $legacyHits += ("{0}:{1}: {2}" -f (Split-Path $f -Leaf), $x.LineNumber, $x.Line.Trim()) } }
}
$L += ("LEGACY_NAME_TOTAL_HITS=" + $legacyHits.Count)
$legacyHits | ForEach-Object { $L += ("  " + $_) }

# brand name
$brand = '健澜AI原生医院操作系统OS'
$brandHits = @()
foreach ($f in $files) {
    $h = Select-String -LiteralPath $f -Pattern $brand -AllMatches
    if ($h) { foreach ($x in $h) { $brandHits += ("{0}:{1}" -f (Split-Path $f -Leaf), $x.LineNumber) } }
}
$L += ("BRAND_TOTAL_HITS=" + $brandHits.Count)
$brandHits | Select-Object -First 40 | ForEach-Object { $L += ("  " + $_) }

# secret scan on delivery files
$secretPatterns = @(
    'ghp_[A-Za-z0-9]{20,}', 'gho_[A-Za-z0-9]{20,}', 'AKIA[0-9A-Z]{16}',
    'eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+',
    'Bearer\s+[A-Za-z0-9_\-\.]{20,}', 'sk-[A-Za-z0-9]{20,}'
)
$secretHits = @()
foreach ($f in $files) {
    foreach ($pat in $secretPatterns) {
        $h = Select-String -LiteralPath $f -Pattern $pat
        if ($h) { foreach ($x in $h) { $secretHits += ("{0}:{1}: {2}" -f (Split-Path $f -Leaf), $x.LineNumber, $pat) } }
    }
}
$L += ("REAL_TOKEN_HITS=" + $secretHits.Count)
$secretHits | ForEach-Object { $L += ("  " + $_) }

$L | Set-Content -LiteralPath $out -Encoding UTF8
$L | ForEach-Object { Write-Host $_ }
