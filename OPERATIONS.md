# 运维手册（OPERATIONS）

> jlmedaios · 健澜科技 AI 原生未来医院操作系统 —— 日常值守、巡检、升级与回滚操作手册。
>
> 部署安装见 [DEPLOYMENT.md](./DEPLOYMENT.md)。
>
> Copyright © 2026 杭州健澜科技有限公司. All rights reserved.

---

## 1. 健康检查

BFF 默认监听 `HTTP_PORT`（默认 **8080**），提供三个层级的探活端点：

| 端点 | 鉴权 | 用途 | 响应要点 |
|---|---|---|---|
| `GET /health` | 公开 | 负载均衡 / K8s liveness 探针 | 进程存活即 200，不泄露内部信息 |
| `GET /api/v1/health` | 公开 | 就绪探针 / 值班巡检 | `{status, uptime, db, version}`；`db` 为 `connected` 或 `demo` |
| `GET /api/v1/health/detailed` | **需登录 + 权限码 `system:view`** | 深度巡检（管理端） | 错误率、慢查询条数、学习闭环健康度与降级结论 |

> 注：`/api/v1/health/detailed` 仅暴露聚合后的计数与比率，不含密钥、SQL 文本、请求参数或任何患者数据；未登录返回 401，无权限返回 403。

**每日巡检命令：**

```bash
# 1. 存活探针（期望 200）
curl -s http://127.0.0.1:8080/api/v1/health

# 2. 详细健康（带管理员 token）
curl -s http://127.0.0.1:8080/api/v1/health/detailed \
  -H "Authorization: Bearer <ADMIN_TOKEN>" | jq .

# 3. 依赖连通性
psql "$DATABASE_URL" -c 'SELECT 1;' && redis-cli ping
```

判读标准：`status=ok`、`db=connected`、`version` 与本次发布版本一致；detailed 报告中错误率 > 1% 或存在降级结论时，按第 4 节排查。

---

## 2. 日志位置与查询

### 2.1 日志目录

| 路径 | 内容 |
|---|---|
| `./logs/bff.stdout.log` | BFF 标准输出（含 `[db:migrate]` 迁移日志、启动横幅） |
| `./logs/bff.stderr.log` | BFF 错误输出（异常栈，**排障第一入口**） |
| `./logs/`（业务日志，`LOG_DIR`） | 按 `LOG_MAX_SIZE`（默认 10 MB）轮转，保留 `LOG_MAX_FILES`（默认 14）份 |
| PostgreSQL 日志 | 见 PG 数据目录 `pg_log/`（容器内 `/var/lib/postgresql/data/pg_log/`） |
| Nginx 日志 | `/var/log/nginx/access.log`、`error.log` |
| 审计日志 | 业务库 `audit_*` 表（哈希链防篡改），保留 `AUDIT_RETENTION_DAYS=180` 天 |

### 2.2 常用查询

```bash
# 最近错误（含栈）
tail -n 200 logs/bff.stderr.log

# 实时跟踪
tail -f logs/bff.stdout.log

# 按 traceId 串一次请求（日志内均打印 traceId）
grep '<TRACE_ID>' logs/bff.*.log

# 迁移记录（本次启动应用了哪些 SQL）
grep '\[db:migrate\]' logs/bff.stdout.log

# PostgreSQL 慢查询 / 锁等待
psql "$DATABASE_URL" -c "SELECT pid, now()-query_start AS dur, state, query
  FROM pg_stat_activity WHERE state <> 'idle' ORDER BY dur DESC LIMIT 10;"
```

---

## 3. 升级步骤（pull → migrate → restart）

> 原则：**先备份、后升级；先灰度一台、后全量**。迁移由 BFF 启动时自动执行（`autoMigrate`，幂等、断点可重入，记录于 `public.schema_migrations`）。

```bash
cd /opt/jlmedaios

# 0) 升级前强制备份（必做）
./scripts/db/backup.sh

# 1) 拉取新版本（按现场发布方式替换：git pull / 解压 release 包 / 拉新镜像）
git fetch --tags && git checkout <新版本标签>

# 2) 安装依赖（锁定版本，不新增依赖）
~/.bun/bin/bun install --frozen-lockfile
cd web && ~/.bun/bin/bun install --frozen-lockfile && ~/.bun/bin/bun run build && cd ..

# 3) 构建后端
~/.bun/bin/bun run build

# 4) 先跑一次迁移（dry-run 预检查；正常情况下随服务启动自动执行）
#    迁移失败必须中止升级，禁止强行重启
~/.bun/bin/bun -e 'import {runMigrations} from "./src/db/migrate.ts"; const r = await runMigrations(); console.log(r);'

# 5) 重启 BFF（旧 PID 优雅停止 → 新进程启动 → 启动日志中可见 [db:migrate] 已应用 N 个迁移）
./start.sh

# 6) 冒烟验收
sleep 3
curl -s http://127.0.0.1:8080/api/v1/health    # 期望 db=connected, version=新版本
tail -n 50 logs/bff.stderr.log                   # 无 ERROR
```

滚动发布时按实例逐台执行第 5–6 步；容器 / K8s 环境等价操作：更新镜像 tag → `kubectl rollout restart deploy/bff` → `kubectl rollout status`。

---

## 4. 回滚步骤

### 4.1 应用层回滚（代码 / 镜像回退）

```bash
cd /opt/jlmedaios

# 1) 停止当前进程
pkill -f "dist/server.js"

# 2) 回退到上一个稳定版本标签（或重新拉取上一镜像 tag）
git checkout <上一稳定版本标签>
~/.bun/bin/bun install --frozen-lockfile
~/.bun/bin/bun run build
cd web && ~/.bun/bin/bun run build && cd ..

# 3) 重启（迁移向前兼容设计：旧版本不会重放新迁移，schema_migrations 记录保留）
./start.sh
```

### 4.2 数据层回滚（迁移导致故障时）

> 本项目迁移脚本只增不改、不做破坏性 DDL；仅当升级后出现严重数据问题时执行：

```bash
# 1) 停服
pkill -f "dist/server.js"

# 2) 恢复升级前备份（恢复前再次确认备份文件可读）
createdb jlmedaios_rollback
pg_restore -U postgres -d jlmedaios_rollback --no-owner --no-acl \
  /backups/jlmedaios-<升级前时间戳>.dump

# 3) 切换 DATABASE_URL 指向恢复库，或按 scripts/db/restore.sh 流程原地替换
# 4) 回退代码到升级前版本后 ./start.sh
```

### 4.3 回滚后验收

`/api/v1/health` 返回 `version` = 回退版本号；抽查挂号 / 收费 / 病历三个核心链路各一笔；确认审计日志连续无断点。

---

## 5. 值班速查

| 告警 | 立即动作 |
|---|---|
| `/api/v1/health` 不通 | `ps -ef | grep server.js` 看进程；看 stderr 末尾；必要时执行 4.1 回滚 |
| DB 连接池打满 | 查 `pg_stat_activity` 长事务；评估 `PG_POOL_MAX`；临时扩容实例 |
| 磁盘 > 80% | 清理过期备份与日志轮转；检查 `data/vectors` 向量目录 |
| 备份失败 | 看 `logs/backup.log`；确认 `pg_dump` 版本与库版本兼容；手动补做一次 |

---

**© 杭州健澜科技有限公司 · 让医疗 AI 更简单、更落地**
