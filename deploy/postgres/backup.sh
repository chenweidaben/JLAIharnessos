#!/usr/bin/env bash
# ============================================================================
# 健澜科技杠OS — PostgreSQL 逻辑备份脚本（pg_dump 自定义格式）
#
# 适用：每日全量逻辑备份、按保留期清理。物理备份 + WAL 归档（PITR）见
#       deploy/postgres/README.md 与《04-备份恢复手册》《07-容灾演练手册》。
#
# 用法（在部署了 postgres 容器的主机上，由 cron 每日低峰调用）：
#   PG_CONTAINER=gangos-postgres PGDB=gangos ./backup.sh
#
# 环境变量：
#   PG_CONTAINER  postgres 容器名（默认 gangos-postgres）
#   PGUSER        备份账号（默认 postgres）
#   PGDB          数据库名（默认 gangos）
#   BACKUP_DIR    宿主机备份目录（默认 ./backups；建议挂载到容器外/对象存储）
#   RETENTION_DAYS 保留天数（默认 14）
#
# Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
# ============================================================================
set -euo pipefail

PG_CONTAINER="${PG_CONTAINER:-gangos-postgres}"
PGUSER="${PGUSER:-postgres}"
PGDB="${PGDB:-gangos}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

TS="$(date +%Y%m%d-%H%M%S)"
OUT="${BACKUP_DIR}/${PGDB}-${TS}.dump"
mkdir -p "${BACKUP_DIR}"

echo "[backup] $(date -Is) start → ${OUT}"

# 1) 一致性逻辑备份（自定义格式，支持并行恢复与选择性还原）
docker exec -i "${PG_CONTAINER}" \
  pg_dump -U "${PGUSER}" -d "${PGDB}" -Fc --no-owner --no-privileges > "${OUT}"

# 2) 备份后校验（可读、含有效归档头）
if ! docker exec -i "${PG_CONTAINER}" pg_restore -l >/dev/null 2>&1 < "${OUT}"; then
  # pg_restore -l 从 stdin 读取，校验失败即报错
  echo "[backup] ERROR: 备份文件校验失败: ${OUT}" >&2
  rm -f "${OUT}"
  exit 1
fi

SIZE="$(du -h "${OUT}" | cut -f1)"
echo "[backup] OK size=${SIZE}"

# 3) 生成 SHA-256，供完整性核验
( cd "${BACKUP_DIR}" && sha256sum "$(basename "${OUT}")" > "$(basename "${OUT}").sha256" )

# 4) 保留期清理
find "${BACKUP_DIR}" -name "${PGDB}-*.dump" -mtime "+${RETENTION_DAYS}" -delete
find "${BACKUP_DIR}" -name "${PGDB}-*.dump.sha256" -mtime "+${RETENTION_DAYS}" -delete
echo "[backup] retention=${RETENTION_DAYS}d done"

# 5) 提示：异地/对象存储上传请在此后接入（rclone/aws cli），并验证可下载恢复
