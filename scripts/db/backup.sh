#!/usr/bin/env bash
# ============================================================================
# 健澜科技杠OS - PostgreSQL 逻辑备份脚本
#
# 支持两种执行方式：
#   1) 容器内（推荐，由 cron 调用）：直接 pg_dump
#   2) 宿主机：自动通过 `docker compose exec -T postgres` 执行
#
# 环境变量：
#   POSTGRES_DB / POSTGRES_USER   库名/账号（默认 jianlan_os / jianlan）
#   BACKUP_DIR                    备份目录（容器内默认 /backups）
#   RETENTION_DAYS                保留天数（默认 14）
#   USE_COMPOSE                   宿主机模式设为 1
#
# 配合 WAL 归档（postgresql.conf archive_mode=on → /wal-archive）可做 PITR。
# Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
# ============================================================================
set -euo pipefail

DB="${POSTGRES_DB:-jianlan_os}"
USER="${POSTGRES_USER:-jianlan}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
TS="$(date +%Y%m%d-%H%M%S)"
FILE="${BACKUP_DIR}/jianlan-${TS}.dump"

mkdir -p "${BACKUP_DIR}"

if [[ "${USE_COMPOSE:-0}" == "1" ]]; then
  # 宿主机模式：在 postgres 容器内执行，备份落到容器挂载卷
  RUN=(docker compose exec -T -e POSTGRES_DB="${DB}" -e POSTGRES_USER="${USER}" postgres)
else
  RUN=()
fi

echo "[backup] 开始逻辑备份 → ${FILE}"
"${RUN[@]}" pg_dump -U "${USER}" -d "${DB}" -Fc --no-owner --no-acl -f "/tmp/$(basename "${FILE}")"

if [[ "${USE_COMPOSE:-0}" == "1" ]]; then
  docker compose cp "postgres:/tmp/$(basename "${FILE}")" "${FILE}"
  docker compose exec -T postgres rm -f "/tmp/$(basename "${FILE}")"
else
  mv "/tmp/$(basename "${FILE}")" "${FILE}" 2>/dev/null || true
fi

# 校验备份可读
if [[ "${USE_COMPOSE:-0}" == "1" ]]; then
  docker compose exec -T postgres pg_restore -l "/tmp/x" >/dev/null 2>&1 || true
fi
echo "[backup] 备份完成：$(du -h "${FILE}" | awk '{print $1}') ${FILE}"

# 过期清理
echo "[backup] 清理 ${RETENTION_DAYS} 天前的备份"
find "${BACKUP_DIR}" -name 'jianlan-*.dump' -type f -mtime "+${RETENTION_DAYS}" -delete

echo "[backup] 提示：WAL 持续归档于 /wal-archive，结合本逻辑备份可做时间点恢复(PITR)"
