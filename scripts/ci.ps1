# 健澜科技数智医院智能体 - 本地 CI 脚本
# Copyright (c) 2026 健澜科技. All rights reserved.
#
# 在本地完整跑一遍 CI 流水线：类型检查 → Lint → 格式 → 单测 → 构建
# 用法：powershell -ExecutionPolicy Bypass -File scripts/ci.ps1

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Invoke-Step {
    param([string]$Name, [scriptblock]$Action)
    Write-Host "`n[CI] ===> $Name" -ForegroundColor Cyan
    & $Action
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[CI] ✗ 步骤失败：$Name" -ForegroundColor Red
        exit $LASTEXITCODE
    }
}

Write-Host "[CI] 健澜科技数智医院智能体 - 本地 CI 流水线" -ForegroundColor Green

Invoke-Step 'TypeScript 类型检查' { bun run typecheck }
Invoke-Step 'ESLint 检查' { bun run lint:ci }
Invoke-Step 'Prettier 格式检查' { bun run format:check }
Invoke-Step '单元测试' { bun run test:unit }
Invoke-Step '生产构建' { bun run build }

Write-Host "`n[CI] ✓ 全部步骤通过，可以提交并推送。" -ForegroundColor Green
