#!/usr/bin/env bash
# ============================================================================
# 健澜科技杠OS - PostgreSQL 恢复脚本
#
# 用法：
#   restore.sh <备份文件.dump>            逻辑恢复（pg_restore，自定义格式）
#   restore.sh --pitr <基础备份目录>       时间点恢复（见部署文档，需 WAL 归档）
#
# 安全：逻辑恢复默认要求显式 CONFIRM=yes，避免误覆盖生产库。
# 环境变量：POSTGRES_DB / POSTGRES_USER / USE_COMPOSE
# Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
# ============================================================================
set -euo pipefail

DB="${POSTGRES_DB:-jianlan_os}"
USER="${POSTGRES_USER:-jianlan}"
MODE="${USE_COMPOSE:-0}"

run_in_pg() {
  if [[ "${MODE}" == "1" ]]; then
    docker compose exec -T postgres "$@"
  else
    "$@"
  fi
}

if [[ $# -lt 1 ]]; then
  echo "用法: $0 <备份文件.dump>   （逻辑恢复需 CONFIRM=yes）" >&2
  exit 2
fi

FILE="$1"
if [[ ! -f "${FILE}" && "${MODE}" != "1" ]]; then
  echo "找不到备份文件：${FILE}" >&2
  exit 2
fi

if [[ "${CONFIRM:-no}" != "yes" ]]; then
  echo "⚠️  将覆盖/写入库 [${DB}]。如确认，请以 CONFIRM=yes 重新执行。" >&2
  exit 1
fi

echo "[restore] 先终止到该库的其他连接"
run_in_pg psql -U "${USER}" -d postgres -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='${DB}' AND pid<>pg_backend_pid();" || true

echo "[restore] 恢复 ${FILE} → ${DB}"
if [[ "${MODE}" == "1" ]]; then
  docker compose cp "${FILE}" "postgres:/tmp/restore.dump"
  docker compose exec -T postgres pg_restore -U "${USER}" -d "${DB}" --clean --if-exists --no-owner --no-acl -j 4 /tmp/restore.dump
  docker compose exec -T postgres rm -f /tmp/restore.dump
else
  pg_restore -U "${USER}" -d "${DB}" --clean --if-exists --no-owner --no-acl -j 4 "${FILE}"
fi

echo "[restore] 校验审计哈希链"
run_in_pg psql -U "${USER}" -d "${DB}" -c "SELECT * FROM audit.verify_chain();"

echo "[restore] 完成。如返回 0 行断裂记录，则审计链完整。"
