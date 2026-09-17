#!/usr/bin/env bash
# ============================================================================
# 健澜科技杠OS — PostgreSQL 逻辑恢复脚本（pg_restore，配合 backup.sh）
#
# 支持：从 .dump 恢复到指定数据库（默认先 DROP 重建，--clean）。
# 物理时间点恢复（PITR，基于 WAL 归档）不在本脚本范围，见
# 《04-备份恢复手册》《07-容灾演练手册》，需在隔离的恢复实例上操作。
#
# 用法：
#   PG_CONTAINER=gangos-postgres PGDB=gangos ./restore.sh ./backups/gangos-xxxx.dump
#
# 环境变量：PG_CONTAINER（默认 gangos-postgres）、PGUSER（默认 postgres）、
#           PGDB（默认 gangos）、NO_DROP=1 时不删除既有对象（叠加恢复）。
#
# 警告：恢复会覆盖目标数据库，生产执行前必须二次确认并先做一次当前态备份。
#
# Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
# ============================================================================
set -euo pipefail

PG_CONTAINER="${PG_CONTAINER:-gangos-postgres}"
PGUSER="${PGUSER:-postgres}"
PGDB="${PGDB:-gangos}"
DUMP="${1:?用法: restore.sh <backup.dump>}"

[ -f "${DUMP}" ] || { echo "找不到备份文件: ${DUMP}" >&2; exit 1; }

# 校验 SHA-256（若存在）
if [ -f "${DUMP}.sha256" ]; then
  ( cd "$(dirname "${DUMP}")" && sha256sum -c "$(basename "${DUMP}").sha256" )
fi

echo "[restore] $(date -Is) 从 ${DUMP} 恢复到 ${PGDB}"
read -r -p "将覆盖数据库 ${PGDB}，确认继续？输入 yes: " confirm
[ "${confirm}" = "yes" ] || { echo "已取消"; exit 1; }

CLEAN_ARGS=()
if [ "${NO_DROP:-0}" != "1" ]; then
  CLEAN_ARGS+=(--clean --if-exists)
fi

# 目标库不存在则创建
docker exec -i "${PG_CONTAINER}" psql -U "${PGUSER}" -d postgres -tc \
  "SELECT 1 FROM pg_database WHERE datname='${PGDB}'" | grep -q 1 \
  || docker exec -i "${PG_CONTAINER}" createdb -U "${PGUSER}" "${PGDB}"

docker exec -i "${PG_CONTAINER}" \
  pg_restore -U "${PGUSER}" -d "${PGDB}" --no-owner --no-privileges \
  "${CLEAN_ARGS[@]}" --verbose < "${DUMP}"

echo "[restore] 完成。请运行应用侧校验：bun scripts/db/check-sql.ts 或业务冒烟。"
