# 0407 endpoint pairing, service exports, page evidence, credential scan (ASCII only)
$root = 'C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1'
$log = Join-Path $root 'reports\consult-deepen\patrol-20261026-0407'
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
  $pVal = ''; $pLine = 0
  if ($p) { $pVal = $p.Line.Trim(); $pLine = $p.LineNumber }
  $gVal = ''; $gLine = 0
  if ($g) {
    $gLine = $g.LineNumber
    if ($g.Line -match 'CONSULT_AGENT_PERMISSIONS\.(WRITE|READ|AUDIT)') { $gVal = $Matches[1] }
  }
  $line = 'EP m' + $mLine + ' p' + $pLine + ' g' + $gLine + ' | ' + $mVal + ' | ' + $pVal + ' | ' + $gVal
  Add-Content -LiteralPath $out -Value $line -Encoding UTF8
  Write-Host $line
}

$svc = Join-Path $root 'web\src\services\api\consultAgent.ts'
Add-Content -LiteralPath $out -Value '--- SERVICE EXPORTS ---' -Encoding UTF8
$svcExports = Select-String -LiteralPath $svc -Pattern 'export (async )?(function|const) (\w+)'
Add-Content -LiteralPath $out -Value ('SERVICE_EXPORT_COUNT=' + $svcExports.Count) -Encoding UTF8
foreach ($e in $svcExports) {
  if ($e.Line -match 'export (?:async )?(?:function|const) (\w+)') {
    Add-Content -LiteralPath $out -Value ('SVC ' + $e.LineNumber + ': ' + $Matches[1]) -Encoding UTF8
  }
}
$svcLines = (Get-Content -LiteralPath $svc -Encoding UTF8).Count
Add-Content -LiteralPath $out -Value ('SERVICE_LINES=' + $svcLines) -Encoding UTF8

$page = Join-Path $root 'web\src\pages\consult-agent\ConsultAgentChatPage.tsx'
$pageLines = (Get-Content -LiteralPath $page -Encoding UTF8).Count
Add-Content -LiteralPath $out -Value '--- PAGE EVIDENCE ---' -Encoding UTF8
Add-Content -LiteralPath $out -Value ('PAGE_LINES=' + $pageLines) -Encoding UTF8
Select-String -LiteralPath $page -Pattern 'DISCLAIMER','ACUTE_GUIDANCE','acute','confidence','Idempotency' | ForEach-Object {
  Add-Content -LiteralPath $out -Value ('PAGE ' + $_.LineNumber + ': ' + $_.Line.Trim()) -Encoding UTF8
}

# wide file set for credential scan
$files = @()
$coreDir = Join-Path $root 'src\core\agent\consult'
$files += Get-ChildItem -LiteralPath $coreDir -Recurse -File -Include '*.ts','*.tsx' | ForEach-Object { $_.FullName }
$files += @((Join-Path $root 'src\bff\routes\consultAgentRoutes.ts'), (Join-Path $root 'src\db\repositories\consultAgentRepo.ts'), $svc, $page)
foreach ($d in @('tests\unit\consult-agent','tests\security\consult-agent','tests\integration\consult-agent')) {
  $dd = Join-Path $root $d
  if (Test-Path -LiteralPath $dd) { $files += Get-ChildItem -LiteralPath $dd -Recurse -File -Filter '*.ts' | ForEach-Object { $_.FullName } }
}
$docsDir = Join-Path $root 'docs\consult-agent'
$files += Get-ChildItem -LiteralPath $docsDir -Recurse -File | ForEach-Object { $_.FullName }
$openapi = Join-Path $root 'docs\api\consult-agent-openapi.yaml'
if (Test-Path -LiteralPath $openapi) { $files += $openapi }

Add-Content -LiteralPath $out -Value '--- CREDENTIAL SCAN ---' -Encoding UTF8
Add-Content -LiteralPath $out -Value ('WIDE_FILE_COUNT=' + $files.Count) -Encoding UTF8
$credPat = 'ghp_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{12,}|xox[baprs]-|eyJ[A-Za-z0-9_-]{10,}\.|oauth2:'
$credHits = 0
foreach ($f in $files) {
  $hits = Select-String -LiteralPath $f -Pattern $credPat -ErrorAction SilentlyContinue
  if ($hits) {
    foreach ($h in $hits) {
      $credHits++
      Add-Content -LiteralPath $out -Value ('CRED ' + $f.Substring($root.Length+1) + ':' + $h.LineNumber) -Encoding UTF8
    }
  }
}
Add-Content -LiteralPath $out -Value ('REAL_TOKEN_HITS=' + $credHits) -Encoding UTF8
Write-Host ('credential hits=' + $credHits + ' files=' + $files.Count)
