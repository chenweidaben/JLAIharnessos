# 0308 轮 consult 合规自检（Grep 实测，计数与行号证据落日志）
$root = 'C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1'
$log  = Join-Path $root 'reports\consult-deepen\patrol-20261026-0308'
$out  = Join-Path $log 'patrol-compliance.log'
Set-Content -LiteralPath $out -Value ('=== consult compliance ' + (Get-Date -Format 'HH:mm:ss') + ' ===') -Encoding UTF8

function W([string]$s) {
  Add-Content -LiteralPath $out -Value $s -Encoding UTF8
  Write-Host $s
}

$files = @()
$dirs = @('src\core\agent\consult', 'tests\unit\consult-agent', 'tests\security\consult-agent', 'tests\integration\consult-agent', 'docs\consult-agent')
foreach ($d in $dirs) {
  $abs = Join-Path $root $d
  if (Test-Path -LiteralPath $abs) {
    Get-ChildItem -LiteralPath $abs -Recurse -File -Include *.ts,*.md,*.yaml,*.yml -ErrorAction SilentlyContinue | ForEach-Object { $files += $_.FullName }
  }
}
foreach ($f in @('src\bff\routes\consultAgentRoutes.ts', 'src\db\repositories\consultAgentRepo.ts', 'web\src\services\api\consultAgent.ts', 'web\src\pages\consult-agent\ConsultAgentChatPage.tsx', 'docs\api\consult-agent-openapi.yaml')) {
  $abs = Join-Path $root $f
  if (Test-Path -LiteralPath $abs) { $files += $abs }
}
W ('SCOPED_FILE_COUNT=' + $files.Count)

# 1 旧称
$legacy = 'gang-os|jianlan-gang-os|gangos|Gang-OS|GangOS|杠OS|健澜科技杠'
$legacyHits = 0
foreach ($f in $files) {
  $m = Select-String -LiteralPath $f -Pattern $legacy -CaseSensitive:$false -ErrorAction SilentlyContinue
  if ($m) { $legacyHits += $m.Count; W ('LEGACY HIT: ' + $f.Substring($root.Length+1) + ' x' + $m.Count) }
}
W ('LEGACY_NAME_TOTAL_HITS=' + $legacyHits)

# 2 产品名
$brand = '健澜AI原生医院操作系统OS'
$brandTotal = 0
foreach ($f in $files) {
  $m = Select-String -LiteralPath $f -Pattern $brand -ErrorAction SilentlyContinue
  if ($m) { $brandTotal += $m.Count; W ('BRAND ' + $m.Count + '  ' + $f.Substring($root.Length+1)) }
}
W ('BRAND_TOTAL=' + $brandTotal)

# 3 权限三码
$perm = Join-Path $root 'src\bff\permissions.ts'
Select-String -LiteralPath $perm -Pattern 'consult-agent:(read|write|audit)' | ForEach-Object { W ('PERM ' + $_.LineNumber + ': ' + $_.Line.Trim()) }

# 4 12 守卫
$route = Join-Path $root 'src\bff\routes\consultAgentRoutes.ts'
$guards = Select-String -LiteralPath $route -Pattern 'requirePermissionCode\('
W ('GUARD_COUNT=' + $guards.Count)
$guards | ForEach-Object { W ('GUARD ' + $_.LineNumber + ': ' + $_.Line.Trim()) }

# 5 端点 method 行
$ep = Select-String -LiteralPath $route -Pattern '\.(get|post)\('
W ('ENDPOINT_METHOD_LINES=' + $ep.Count)
$ep | ForEach-Object { W ('EP ' + $_.LineNumber + ': ' + $_.Line.Trim()) }

# 6 急症旁路 / 免责（后端编排器）
$orch = Join-Path $root 'src\core\agent\consult\consultOrchestrator.ts'
Select-String -LiteralPath $orch -Pattern 'escalated|acute_bypass|ACUTE_GUIDANCE|disclaimer|safety:acute' | ForEach-Object { W ('ORCH ' + $_.LineNumber + ': ' + $_.Line.Trim()) }

# 7 前端急症 / 免责
$page = Join-Path $root 'web\src\pages\consult-agent\ConsultAgentChatPage.tsx'
Select-String -LiteralPath $page -Pattern 'DISCLAIMER|ACUTE_GUIDANCE|急症旁路|escalated|acute' | Select-Object -First 18 | ForEach-Object { W ('PAGE ' + $_.LineNumber + ': ' + $_.Line.Trim()) }

# 8 三件套 server.ts
$server = Join-Path $root 'src\bff\server.ts'
Select-String -LiteralPath $server -Pattern 'withIdempotency|auditOperation' | ForEach-Object { W ('SERVER ' + $_.LineNumber + ': ' + $_.Line.Trim()) }

# 9 草稿红线 types
$types = Join-Path $root 'src\core\agent\consult\types.ts'
Select-String -LiteralPath $types -Pattern 'needsPhysicianReview|isOutOfHospitalPrescription|pending_review|z\.literal' | ForEach-Object { W ('TYPES ' + $_.LineNumber + ': ' + $_.Line.Trim()) }

# 10 DDL 草稿 CHECK
$draftSql = Join-Path $root 'deploy\postgres\init\383-consult-drafts.sql'
if (Test-Path -LiteralPath $draftSql) { Select-String -LiteralPath $draftSql -Pattern 'needs_physician_review|is_out_of_hospital_prescription|status|kind' | ForEach-Object { W ('DDL383 ' + $_.LineNumber + ': ' + $_.Line.Trim()) } }

# 11 service 导出方法
$svc = Join-Path $root 'web\src\services\api\consultAgent.ts'
$svcMethods = Select-String -LiteralPath $svc -Pattern 'export (async )?function|export const'
W ('SERVICE_EXPORT_COUNT=' + $svcMethods.Count)
$svcMethods | ForEach-Object { W ('SVC ' + $_.LineNumber + ': ' + $_.Line.Trim()) }

# 12 凭据扫描（单引号正则）
$cred = 'ghp_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{12,}|xox[baprs]-|eyJ[A-Za-z0-9_-]{10,}\.|oauth2:'
$credHits = 0
foreach ($f in $files) {
  $m = Select-String -LiteralPath $f -Pattern $cred -ErrorAction SilentlyContinue
  if ($m) { $credHits += $m.Count; W ('CRED HIT: ' + $f.Substring($root.Length+1) + ' x' + $m.Count) }
}
W ('REAL_TOKEN_HITS=' + $credHits)
W '=== compliance done ==='
