# 0407 backend compliance evidence (ASCII only; Chinese brand/legacy scan done inline)
$root = 'C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1'
$log = Join-Path $root 'reports\consult-deepen\patrol-20261026-0407'
$out = Join-Path $log 'patrol-compliance.log'
Set-Content -LiteralPath $out -Value '=== 0407 backend compliance evidence ===' -Encoding UTF8

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

$threadsSql = Join-Path $root 'deploy\postgres\init\380-consult-threads.sql'
Add-Content -LiteralPath $out -Value '--- DDL380 PERMISSION SEED AND GRANTS ---' -Encoding UTF8
Select-String -LiteralPath $threadsSql -Pattern 'consult-agent:read','consult-agent:write','consult-agent:audit','GRANT' | ForEach-Object {
  Add-Content -LiteralPath $out -Value ('DDL380 ' + $_.LineNumber + ': ' + $_.Line.Trim()) -Encoding UTF8
}

$perm = Join-Path $root 'src\bff\permissions.ts'
Add-Content -LiteralPath $out -Value '--- PERMISSIONS THREE CODES ---' -Encoding UTF8
Select-String -LiteralPath $perm -Pattern 'consult-agent:read','consult-agent:write','consult-agent:audit' | ForEach-Object {
  Add-Content -LiteralPath $out -Value ('PERM ' + $_.LineNumber + ': ' + $_.Line.Trim()) -Encoding UTF8
}

Write-Host 'backend compliance evidence appended'
