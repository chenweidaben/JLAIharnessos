# 部署指南（DEPLOYMENT）

> jlmedaios · 健澜科技 AI 原生未来医院操作系统
>
> 本文面向运维 / 实施工程师，描述从一台干净 Linux 服务器到生产可用的完整部署路径。配套日常运维操作见 [OPERATIONS.md](./OPERATIONS.md)。
>
> Copyright © 2026 杭州健澜科技有限公司. All rights reserved.

---

## 1. 环境要求

| 组件 | 最低版本 | 说明 |
|---|---|---|
| 操作系统 | Linux（CentOS 7+ / Ubuntu 20.04+ / 麒麟 V10） | 生产推荐 LTS；开发可 Windows + WSL2 |
| Node.js | **20 LTS+** | 仅构建工具链需要；运行时主体为 Bun |
| Bun | **≥ 1.4.2**（要求 ≥ 1.3.0） | 运行时与包管理器，全路径示例 `~/.bun/bin/bun` |
| PostgreSQL | **16+** | 必装扩展：`pgvector`（可选，向量检索用） |
| Redis | 7+ | 会话 / 缓存 / 限流，可选但生产建议开启 |
| 内存 | ≥ 8 GB（2000 床以下规模） | LLM 网关 + BFF 常驻；GPU 推理服务另算 |
| 磁盘 | ≥ 100 GB 可用 | 数据目录、日志、备份分离挂载更佳 |

> 一键环境自检（部署前执行）：
>
> ```bash
> node -v && ~/.bun/bin/bun -v && psql --version && redis-cli --version
> ```

---

## 2. 获取代码与一键安装

### 2.1 install.sh（首次安装）

将以下内容保存为 `install.sh`，赋予可执行权限后执行：

```bash
#!/usr/bin/env bash
# install.sh — jlmedaios 生产环境首次安装
# Copyright (c) 2026 杭州健澜科技有限公司
set -euo pipefail

APP_DIR="/opt/jlmedaios"            # 按现场实际修改
BUN_BIN="$HOME/.bun/bin/bun"

cd "$APP_DIR"

# 1. 安装后端依赖（lockfile 锁定版本，不新增依赖）
"$BUN_BIN" install --frozen-lockfile

# 2. 安装前端依赖并构建静态资源
cd web
"$BUN_BIN" install --frozen-lockfile
"$BUN_BIN" run build
cd ..

# 3. 准备环境变量
if [ ! -f .env ]; then
  cp .env.example .env
  echo "[install] 已生成 .env，请按现场配置填写密钥后再启动！"
fi

# 4. PostgreSQL 初始化（首次；幂等，重复执行安全）
#    迁移由 BFF 启动时自动执行（autoMigrate），此处仅创建库与扩展
psql -U postgres -c "CREATE DATABASE jlmedaios ENCODING 'UTF8';" || true
psql -U postgres -d jlmedaios -f deploy/postgres/init/01-extensions.sql || true

echo "[install] 安装完成。下一步：填写 .env 后执行 start.sh"
```

执行：

```bash
chmod +x install.sh
./install.sh
```

### 2.2 start.sh（启动服务）

```bash
#!/usr/bin/env bash
# start.sh — jlmedaios BFF 生产启动
# Copyright (c) 2026 杭州健澜科技有限公司
set -euo pipefail

APP_DIR="/opt/jlmedaios"
BUN_BIN="$HOME/.bun/bin/bun"
LOG_DIR="$APP_DIR/logs"
mkdir -p "$LOG_DIR"

cd "$APP_DIR"

# 加载环境变量
set -a; . ./.env; set +a

# 停止旧进程（若存在）
pkill -f "dist/server.js" 2>/dev/null || true
sleep 1

# 启动：启动时自动执行 deploy/postgres/init/*.sql 增量迁移（幂等）
nohup "$BUN_BIN" dist/server.js \
  >> "$LOG_DIR/bff.stdout.log" 2>> "$LOG_DIR/bff.stderr.log" &

echo $! > "$LOG_DIR/bff.pid"
echo "[start] BFF 已启动，PID=$(cat "$LOG_DIR/bff.pid")，端口 ${HTTP_PORT:-8080}"
echo "[start] 健康检查：curl http://127.0.0.1:${HTTP_PORT:-8080}/api/v1/health"
```

执行：

```bash
chmod +x start.sh
./start.sh
```

> 前端静态资源由 `web/dist` 产出后交由 Nginx 托管（配置见 `deploy/nginx/`），无需单独 Node 进程。

---

## 3. 环境变量清单

完整示例见仓库根目录 `.env.example`。生产环境按下表逐项核对，**所有 `placeholder` 必须替换**，密钥类必须通过 KMS / 配置中心下发，禁止明文入库：

### 3.1 运行环境

| 变量 | 示例 | 说明 |
|---|---|---|
| `NODE_ENV` | `production` | 固定 production |
| `APP_ENV` | `prod` | dev / staging / prod |
| `LOG_LEVEL` | `info` | debug / info / warn / error / critical |

### 3.2 应用

| 变量 | 示例 | 说明 |
|---|---|---|
| `APP_NAME` | `jianlan-medical-agent` | 应用名 |
| `APP_VERSION` | `0.2.0` | 版本号，健康检查端点返回 |
| `HTTP_PORT` | `8080` | **BFF 监听端口** |
| `HTTP_TIMEOUT_MS` | `30000` | 接口超时 |
| `DEMO_MODE` | `0` | **生产必须 0**；=1 为内存演示数据、不持久化 |

### 3.3 数据库（PostgreSQL 16，生产必填）

| 变量 | 示例 | 说明 |
|---|---|---|
| `DATABASE_URL` | `postgres://jlmedaios:S3cret@127.0.0.1:5432/jlmedaios` | 连接串 `postgres://user:password@host:port/dbname` |
| `PGSSLMODE` | `require` | 生产启用 SSL；内网 Docker 可 `disable` |
| `PG_POOL_MAX` | `20` | 连接池上限，按规格调整 |

### 3.4 大模型（LLM）

| 变量 | 示例 | 说明 |
|---|---|---|
| `LLM_PROVIDER` | `deepseek` | 默认 DeepSeek（OpenAI 兼容协议），可切 anthropic |
| `LLM_API_KEY` | `sk-xxxxxxxx` | **生产必填密钥**，KMS 下发 |
| `LLM_MODEL` | `deepseek-chat` | 模型名 |
| `LLM_BASE_URL` | `https://api.deepseek.com` | 自建网关时改内网地址 |
| `LLM_MAX_TOKENS` / `LLM_TIMEOUT_MS` | `8192` / `60000` | 生成上限 / 超时 |

### 3.5 院内系统对接（按现场接口开通情况填写）

| 变量 | 说明 |
|---|---|
| `HIS_BASE_URL` / `HIS_API_KEY` | HIS 适配器地址与密钥 |
| `EMR_BASE_URL` / `EMR_API_KEY` | EMR 适配器 |
| `LIS_BASE_URL` / `PACS_BASE_URL` | 检验 / 影像系统 |
| `RADAR_INFERENCE_URL` / `RADAR_INTERNAL_TOKEN` | AI 影像辅诊推理服务地址与内部鉴权 token |

### 3.6 日志与安全（生产红线）

| 变量 | 示例 | 说明 |
|---|---|---|
| `LOG_DIR` | `./logs` | 日志目录 |
| `LOG_MAX_SIZE` | `10485760` | 单文件 10 MB |
| `LOG_MAX_FILES` | `14` | 保留历史文件数 |
| `AUDIT_RETENTION_DAYS` | `180` | 审计日志保留天数（等保三级 ≥ 180） |
| `ENCRYPTION_MASTER_KEY` | （KMS 下发） | 32 字节数据加密主密钥，**生产必须更换** |
| `JWT_SECRET` | （随机长串） | 会话签名密钥，**生产必须更换** |
| `ENABLE_DESENSITIZATION` | `true` | 生产必须 true（16 类敏感数据脱敏） |
| `ENABLE_PROMPT_GUARD` | `true` | Prompt Injection 防护 |

---

## 4. 数据备份策略

### 4.1 备份方案总览

| 层级 | 方式 | 频率 | 保留 | 用途 |
|---|---|---|---|---|
| 逻辑备份 | `pg_dump` custom 格式（`.dump`） | 每日凌晨 02:00 | 14 天 | 常规恢复、误操作回滚 |
| 归档备份 | 每周日全量 + offsite 异机拷贝 | 每周 | 8 周 | 灾难恢复 |
| WAL 归档 | `archive_mode=on` → `/wal-archive` | 持续 | 7 天 | 时间点恢复（PITR） |

### 4.2 备份脚本

仓库已内置 `scripts/db/backup.sh`（容器宿主机模式需 `USE_COMPOSE=1`），核心命令即：

```bash
pg_dump -U jlmedaios -d jlmedaios -Fc --no-owner --no-acl \
  -f /backups/jlmedaios-$(date +%Y%m%d-%H%M%S).dump
```

### 4.3 crontab 定时任务

```cron
# 每天 02:00 逻辑备份；每周日 03:00 异机拷贝
0  2 * * *   /opt/jlmedaios/scripts/db/backup.sh >> /opt/jlmedaios/logs/backup.log 2>&1
0  3 * * 0   rsync -az /backups/ backup@dr-site:/offsite/jlmedaios/ >> /opt/jlmedaios/logs/offsite.log 2>&1
```

备份文件自动清理 14 天前的 `.dump`（脚本内置 `find -mtime +14 -delete`）。

### 4.4 恢复演练（每季度一次）

```bash
# 恢复到干净实例：
createdb jlmedaios_restore
pg_restore -U postgres -d jlmedaios_restore --no-owner --no-acl /backups/jlmedaios-YYYYMMDD-HHMMSS.dump
# 校验关键表行数后，切换 DATABASE_URL 演练
```

恢复脚本另见 `scripts/db/restore.sh` 与 `deploy/postgres/restore.sh`。

---

## 5. 常见问题排查（FAQ）

| 现象 | 可能原因 | 处理 |
|---|---|---|
| 启动即退出，日志 `ECONNREFUSED 127.0.0.1:5432/5433` | PostgreSQL 未启动 / 端口不符 | `systemctl status postgresql`；核对 `DATABASE_URL` 端口 |
| 页面显示「演示模式水印」 | `DEMO_MODE=1` 或 DB 连不上降级 | 确认 `.env` 中 `DEMO_MODE=0` 且 DB 可达 |
| `[db:migrate] 迁移失败: xxx.sql` | 新迁移 SQL 语法错误 / 依赖顺序错 | 看 `bff.stderr.log` 末尾；回滚到上个版本镜像，联系研发 |
| 健康检查 200 但接口全 401 | `JWT_SECRET` 与签发端不一致 | 统一网关 / BFF 的 JWT_SECRET |
| LLM 请求 5xx / 超时 | `LLM_BASE_URL` 不通或 key 过期 | `curl $LLM_BASE_URL`；核对 `LLM_API_KEY`；调大 `LLM_TIMEOUT_MS` |
| 磁盘告警 | 日志 / 备份未轮转 | 核对 `LOG_MAX_FILES`、备份保留策略；见 OPERATIONS.md |
| 前端白屏、接口 404 | Nginx upstream 未指向 BFF:8080 | 检查 `deploy/nginx/conf.d/01-upstreams.conf` |

> 排查入口固定三步：① `curl /api/v1/health`；② 看 `logs/bff.stderr.log` 末尾 100 行；③ 看 PostgreSQL 日志 `pg_log/`。

---

**© 杭州健澜科技有限公司 · 让医疗 AI 更简单、更落地**
