# 0308 轮 · web 本地口径两段复跑（FE_LOCAL ESLint + TSC_WEB），修正 web/web 路径拼接后独立实跑
$ErrorActionPreference = "Continue"
$root = "C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1"
$log  = Join-Path $root "reports\consult-deepen\patrol-20261026-0308"
$webRoot = Join-Path $root "web"
$node = "C:\Users\lenovo\AppData\Local\Doubao\User Data\sandbox_runtime\bases\772984f6fd3a8ae0ae7d2422cd7c2bfa\node\node.exe"
$webEslint = Join-Path $webRoot "node_modules\eslint\bin\eslint.js"
$webTsc = Join-Path $webRoot "node_modules\typescript\lib\tsc.js"
$env:NODE_OPTIONS = "--max-old-space-size=8192"
$env:DEMO_MODE = "1"
$summary = Join-Path $log "patrol-static-summary.log"

function Run-One {
  param([string]$section, [string]$exe, [string]$scriptAbs, [string[]]$aList, [string]$outName, [string]$errName)
  $out = Join-Path $log $outName
  $err = Join-Path $log $errName
  $argList = @($scriptAbs) + $aList
  $proc = Start-Process -FilePath $node -WorkingDirectory $webRoot -ArgumentList $argList -NoNewWindow -Wait -PassThru -RedirectStandardOutput $out -RedirectStandardError $err
  $code = $proc.ExitCode
  if ($null -eq $code) { $code = -1 }
  $health = "ok"
  if ($code -ne 0) { $health = "FAIL" }
  $line = "$section EXIT=$code health=$health args=$($aList.Count) (recheck)"
  Add-Content -LiteralPath $summary -Value $line -Encoding UTF8
  Write-Host $line
  return $code
}

$c5 = Run-One -section "ESLINT_FE_LOCAL" -exe $node -scriptAbs $webEslint -aList @("src/services/api/consultAgent.ts", "src/pages/consult-agent/ConsultAgentChatPage.tsx") -outName "patrol-eslint-fe-local.log" -errName "patrol-eslint-fe-local-err.log"
$c6 = Run-One -section "TSC_WEB" -exe $node -scriptAbs $webTsc -aList @("--noEmit") -outName "patrol-tsc-web.log" -errName "patrol-tsc-web-err.log"

Write-Host "WEB_RECHECK ESLINT_FE_LOCAL=$c5 TSC_WEB=$c6"
