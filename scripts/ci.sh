#!/usr/bin/env bash
# 健澜科技数智医院智能体 - 本地 CI 脚本
# Copyright (c) 2026 健澜科技. All rights reserved.
#
# 在本地完整跑一遍 CI 流水线：类型检查 → Lint → 格式 → 单测 → 构建
# 用法：bash scripts/ci.sh

set -euo pipefail
cd "$(dirname "$0")/.."

step() {
  echo
  echo "[CI] ===> $1"
}

echo "[CI] 健澜科技数智医院智能体 - 本地 CI 流水线"

step 'TypeScript 类型检查' && bun run typecheck
step 'ESLint 检查' && bun run lint:ci
step 'Prettier 格式检查' && bun run format:check
step '单元测试' && bun run test:unit
step '生产构建' && bun run build

echo
echo "[CI] ✓ 全部步骤通过，可以提交并推送。"
