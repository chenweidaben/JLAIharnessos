# 健澜科技杠OS · PostgreSQL 部署

PostgreSQL 16，五个分层 schema，容器首次启动自动初始化并导入权威知识种子。

## 目录

```
deploy/postgres/
├── postgresql.conf            # 生产配置（WAL 归档/PITR、SCRAM、慢查询日志）
├── pg_hba.conf                # 客户端认证参考（自定义镜像/TLS 时挂载）
└── init/                      # 挂载到 /docker-entrypoint-initdb.d，仅空数据目录首次执行
    ├── 01-extensions.sql      # pgcrypto/pg_trgm/... + pgvector 可选
    ├── 02-schemas.sql         # iam/clinical/agent/knowledge/audit + 通用函数
    ├── 10-iam.sql             # 用户/角色/权限/会话（RBAC）
    ├── 20-clinical.sql        # 患者/就诊/病历/处方/医嘱/检验/影像
    ├── 30-agent.sql           # 智能体/版本/工作流实例/节点记录/人工任务/调用日志
    ├── 40-knowledge.sql       # 知识库/文档/分块 + 药品/ICD/检验/检查/路径/指南/中医
    ├── 50-audit.sql           # 审计日志（哈希链防篡改）
    ├── 71-seed-knowledge.sql  # 权威知识种子（由脚本生成，勿手改）
    └── 90-pgvector-optional.sql # pgvector 向量列（存在时自动启用）
```

## 分层 schema（35 张表）

| Schema | 内容 |
|--------|------|
| `iam` | 用户、角色、权限、用户角色、会话 |
| `clinical` | 患者主索引、就诊、病历、处方及明细、医嘱、检验、影像 |
| `agent` | 智能体与版本、工作流实例、节点记录、人工任务、调用日志 |
| `knowledge` | 知识库、文档、分块，药品/ICD-10/检验/检查/临床路径/指南/中医 |
| `audit` | 哈希链审计日志 |

## 隐私与安全

- 患者身份证号仅存 **SHA-256 哈希**（查重），手机号/姓名使用 **AES-GCM 加密列**；
- 审计日志只增不改，`prev_hash` 形成哈希链，`SELECT * FROM audit.verify_chain();` 可检出篡改；
- 密码使用 SCRAM-SHA-256；生产建议开启 TLS（见 `pg_hba.conf` 注释）；
- 建议为应用创建独立角色，仅授予各业务 schema 的 DML，审计表仅 INSERT/SELECT。

## 知识种子

种子单一事实源是 `scripts/knowledge/seed-data/*.ts`，重新生成：

```bash
bun scripts/db/import-seed.ts     # 生成 init/71-seed-knowledge.sql（约 2385 条）
```

已含：药品 452、ICD-10 编码 481 + 类目块 222、检验 222、检查 83、临床路径 77、指南 45、中医病种 95/药材 375/方剂 139/穴位 184。

## 备份与恢复

```bash
# 逻辑备份（宿主机经 compose 执行）
USE_COMPOSE=1 POSTGRES_DB=jianlan_os POSTGRES_USER=jianlan bash scripts/db/backup.sh

# 恢复（需显式确认，避免误覆盖）
USE_COMPOSE=1 CONFIRM=yes bash scripts/db/restore.sh backups/jianlan-YYYYmmdd-HHMMSS.dump
```

`postgresql.conf` 已开启 WAL 归档到 `/wal-archive`，配合基础备份可做**时间点恢复（PITR）**，RPO 约 5 分钟（`archive_timeout=300s`）。

## 向量检索

默认 `knowledge.chunks.embedding` 用 jsonb（应用层余弦），开箱零依赖。
生产切换到 `pgvector/pgvector:pg16` 镜像后，`90-pgvector-optional.sql` 自动创建 `vector(1536)` 列与 ivfflat 索引。

## 静态校验（无需数据库）

```bash
bun scripts/db/check-sql.ts      # 表/序列/触发器/种子行数一致性
bun test tests/unit/db           # DDL 与种子质量回归
```
