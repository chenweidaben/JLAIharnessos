# 0308 backend compliance evidence (ASCII only; Chinese brand/legacy scan done inline in block A)
$root = 'C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1'
$log = Join-Path $root 'reports\consult-deepen\patrol-20261026-0308'
$out = Join-Path $log 'patrol-compliance.log'

$route = Join-Path $root 'src\bff\routes\consultAgentRoutes.ts'
$methods = Select-String -LiteralPath $route -Pattern 'method:'
$paths = Select-String -LiteralPath $route -Pattern 'path: /api'
$guards = Select-String -LiteralPath $route -Pattern 'requirePermissionCode'

Add-Content -LiteralPath $out -Value ('METHOD_LINES=' + $methods.Count) -Encoding UTF8
Add-Content -LiteralPath $out -Value ('PATH_LINES=' + $paths.Count) -Encoding UTF8
Add-Content -LiteralPath $out -Value ('GUARD_COUNT=' + $guards.Count) -Encoding UTF8

for ($i = 0; $i -lt $methods.Count; $i++) {
  $mLine = $methods[$i].LineNumber
  $mVal = $methods[$i].Line.Trim()
  $pVal = ''
  if ($i -lt $paths.Count) { $pVal = $paths[$i].Line.Trim() }
  $gVal = ''
  if ($i -lt $guards.Count) { $gVal = $guards[$i].Line.Trim() }
  $line = 'EP ' + $mLine + ' | ' + $mVal + ' | ' + $pVal + ' | ' + $gVal
  Add-Content -LiteralPath $out -Value $line -Encoding UTF8
  Write-Host $line
}

$orch = Join-Path $root 'src\core\agent\consult\consultOrchestrator.ts'
Add-Content -LiteralPath $out -Value '--- ORCH ACUTE/DISCLAIMER ---' -Encoding UTF8
Select-String -LiteralPath $orch -Pattern 'escalated','acute_bypass','ACUTE_GUIDANCE','disclaimer','safety:acute' | ForEach-Object {
  Add-Content -LiteralPath $out -Value ('ORCH ' + $_.LineNumber + ': ' + $_.Line.Trim()) -Encoding UTF8
}

$server = Join-Path $root 'src\bff\server.ts'
Add-Content -LiteralPath $out -Value '--- SERVER IDEMPOTENCY/AUDIT ---' -Encoding UTF8
Select-String -LiteralPath $server -Pattern 'withIdempotency','auditOperation' | ForEach-Object {
  Add-Content -LiteralPath $out -Value ('SERVER ' + $_.LineNumber + ': ' + $_.Line.Trim()) -Encoding UTF8
}

$types = Join-Path $root 'src\core\agent\consult\types.ts'
Add-Content -LiteralPath $out -Value '--- TYPES DRAFT REDLINE ---' -Encoding UTF8
Select-String -LiteralPath $types -Pattern 'needsPhysicianReview','isOutOfHospitalPrescription','pending_review','z.literal' | ForEach-Object {
  Add-Content -LiteralPath $out -Value ('TYPES ' + $_.LineNumber + ': ' + $_.Line.Trim()) -Encoding UTF8
}

$draftSql = Join-Path $root 'deploy\postgres\init\383-consult-drafts.sql'
Add-Content -LiteralPath $out -Value '--- DDL383 CHECK ---' -Encoding UTF8
Select-String -LiteralPath $draftSql -Pattern 'needs_physician_review','is_out_of_hospital_prescription','status','kind' | ForEach-Object {
  Add-Content -LiteralPath $out -Value ('DDL383 ' + $_.LineNumber + ': ' + $_.Line.Trim()) -Encoding UTF8
}

Write-Host 'backend compliance evidence appended'
