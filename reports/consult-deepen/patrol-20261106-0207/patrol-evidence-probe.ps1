# 2207 round evidence probe - backend structural line numbers, ASCII only
$ErrorActionPreference = "Continue"
$root = "C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1"
$log  = Join-Path $root "reports\consult-deepen\patrol-20261106-0207"
$ev = Join-Path $log "patrol-compliance-evidence.txt"
$L = New-Object System.Collections.Generic.List[string]
function Add-Line($s){ $L.Add($s) }

# permissions three codes
$perm = Join-Path $root "src\bff\permissions.ts"
$pl = [IO.File]::ReadAllLines($perm,[Text.Encoding]::UTF8)
for($i=0;$i -lt $pl.Count;$i++){
  if($pl[$i] -match "consult-agent:(read|write|audit)"){ Add-Line ("[permissions] permissions.ts:" + ($i+1) + " " + $pl[$i].Trim()) }
}

# route 12 endpoints
$route = Join-Path $root "src\bff\routes\consultAgentRoutes.ts"
$rl = [IO.File]::ReadAllLines($route,[Text.Encoding]::UTF8)
Add-Line ("[route] consultAgentRoutes.ts lines=" + $rl.Count)
for($i=0;$i -lt $rl.Count;$i++){
  if($rl[$i] -match "method:\s*'(GET|POST|PUT|DELETE)'"){
    $m=$Matches[1]; $path=""; $guard="";
    for($j=$i+1;$j -lt [Math]::Min($i+5,$rl.Count);$j++){
      if($rl[$j] -match "path:\s*'([^']+)'"){ $path=$Matches[1] }
      if($rl[$j] -match "requirePermissionCode\(c,\s*CONSULT_AGENT_PERMISSIONS\.(WRITE|READ|AUDIT)\)"){ $guard=$Matches[1] }
    }
    Add-Line ("[endpoint] " + $m + " " + ($i+1) + " path=" + $path + " guard=" + $guard)
  }
}

# orchestrator acute / disclaimer
$orch = Join-Path $root "src\core\agent\consult\consultOrchestrator.ts"
$ol = [IO.File]::ReadAllLines($orch,[Text.Encoding]::UTF8)
for($i=0;$i -lt $ol.Count;$i++){
  if($ol[$i] -match "ACUTE_GUIDANCE|DISCLAIMER|evaluateSafety|classifyIntent|escalated|acute_bypass|safety:acute|disclaimer"){
    Add-Line ("[orchestrator] consultOrchestrator.ts:" + ($i+1) + " " + $ol[$i].Trim())
  }
}

# types dual lock
$types = Join-Path $root "src\core\agent\consult\types.ts"
$tl = [IO.File]::ReadAllLines($types,[Text.Encoding]::UTF8)
for($i=0;$i -lt $tl.Count;$i++){
  if($tl[$i] -match "needsPhysicianReview|isOutOfHospitalPrescription|pending_review|z\.literal"){
    Add-Line ("[types] types.ts:" + ($i+1) + " " + $tl[$i].Trim())
  }
}

# 383 DDL
$ddl383 = Join-Path $root "deploy\postgres\init\383-consult-drafts.sql"
$d3 = [IO.File]::ReadAllLines($ddl383,[Text.Encoding]::UTF8)
for($i=0;$i -lt $d3.Count;$i++){
  if($d3[$i] -match "CHECK|kind|needs_physician_review|is_out_of_hospital_prescription|status"){
    Add-Line ("[383] 383-consult-drafts.sql:" + ($i+1) + " " + $d3[$i].Trim())
  }
}

# 380 seed codes
$ddl380 = Join-Path $root "deploy\postgres\init\380-consult-threads.sql"
$d0 = [IO.File]::ReadAllLines($ddl380,[Text.Encoding]::UTF8)
for($i=0;$i -lt $d0.Count;$i++){
  if($d0[$i] -match "consult-agent:"){ Add-Line ("[380] 380-consult-threads.sql:" + ($i+1) + " " + $d0[$i].Trim()) }
}

# idempotency middleware
$idem = Join-Path $root "src\bff\middleware\idempotency.ts"
$il = [IO.File]::ReadAllLines($idem,[Text.Encoding]::UTF8)
for($i=0;$i -lt $il.Count;$i++){
  if($il[$i] -match "withIdempotency|idempotency-key|BAD_REQUEST|CONFLICT|Idempotency"){
    Add-Line ("[idempotency] idempotency.ts:" + ($i+1) + " " + $il[$i].Trim())
  }
}

# audit middleware
$audit = Join-Path $root "src\bff\middleware\audit.ts"
$al = [IO.File]::ReadAllLines($audit,[Text.Encoding]::UTF8)
for($i=0;$i -lt $al.Count;$i++){
  if($al[$i] -match "auditOperation"){ Add-Line ("[audit] audit.ts:" + ($i+1) + " " + $al[$i].Trim()) }
}

# OpenAPI method sequence
$oa = Join-Path $root "docs\api\consult-agent-openapi.yaml"
$ol2 = [IO.File]::ReadAllLines($oa,[Text.Encoding]::UTF8)
for($i=0;$i -lt $ol2.Count;$i++){
  if($ol2[$i] -match "^\s+(get|post|put|delete):\s*$"){ Add-Line ("[OpenAPI] line " + ($i+1) + " " + $ol2[$i].Trim()) }
}

# D1 gap route 518-523
for($i=516;$i -lt 524 -and $i -lt $rl.Count;$i++){
  if($rl[$i] -match "????????????|BAD_REQUEST|400|kind"){ Add-Line ("[D1] route:" + ($i+1) + " " + $rl[$i].Trim()) }
}

# service line count + function names
$svc = Join-Path $root "web\src\services\api\consultAgent.ts"
$sl = [IO.File]::ReadAllLines($svc,[Text.Encoding]::UTF8)
Add-Line ("[service] consultAgent.ts lines=" + $sl.Count)
for($i=0;$i -lt $sl.Count;$i++){
  if($sl[$i] -match "export (async )?function (createThread|listThreads|sendMessage|listMessages|transcribe|listAudit|getRulesSnapshot|getDraft|getProfile|exitThread|streamReply|replayEvents)"){
    Add-Line ("[service-fn] consultAgent.ts:" + ($i+1) + " " + $Matches[1] + " " + $Matches[2])
  }
}

# weak fixture
$fx = Join-Path $root "tests\unit\consult-agent\safeLlm.test.ts"
$fl = [IO.File]::ReadAllLines($fx,[Text.Encoding]::UTF8)
for($i=0;$i -lt $fl.Count;$i++){
  if($fl[$i] -match "demo-credential|OPENAI_API_KEY|process.env|delete |stub"){
    Add-Line ("[fixture] safeLlm.test.ts:" + ($i+1) + " " + $fl[$i].Trim())
  }
}

[IO.File]::WriteAllLines($ev,$L,[Text.UTF8Encoding]::new($false))
Write-Host ("evidence lines=" + $L.Count)
$L | ForEach-Object { Write-Host $_ }
