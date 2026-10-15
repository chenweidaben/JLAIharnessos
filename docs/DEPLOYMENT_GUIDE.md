# 健澜科技 Gang-OS（jlmedaios）部署运维指南

> 版本：v1.0　|　适用对象：首次接手本系统的运维工程师
> 配套清单：`src/bff/aggregators/deploymentDocAggregator.ts`（`generateDeploymentChecklist()`）
>
> 本指南按「从零到上线」顺序编排，照做即可完成部署。文中所有命令均经过仓库核实，
> 对应聚合器 `VERIFIED_COMMANDS` 白名单；不涉及 WebSocket 升级配置（该路径由既有边缘网关托管）。

Copyright (c) 2026 杭州健澜科技有限公司. All rights reserved.

---

## 目录

1. [环境要求](#1-环境要求)
2. [获取发布包与安装依赖](#2-获取发布包与安装依赖)
3. [数据库初始化](#3-数据库初始化)
4. [.env 配置说明](#4-env-配置说明)
5. [构建与启动命令](#5-构建与启动命令)
6. [Nginx 反向代理](#6-nginx-反向代理)
7. [HTTPS 配置](#7-https-配置)
8. [上线验证](#8-上线验证)
9. [常见问题（FAQ）](#9-常见问题faq)
10. [附录：容器化一键部署](#10-附录容器化一键部署)

---

## 1. 环境要求

| 组件 | 版本要求 | 说明 |
| --- | --- | --- |
| 操作系统 | Linux x86_64（Ubuntu 22.04 LTS / CentOS Stream 9+） | 生产服务器不支持 Windows 直接托管 |
| CPU / 内存 | 最低 4C8G，推荐 8C16G | AI 聚合接口内存消耗较大 |
| 磁盘 | 系统盘 100G+，数据盘独立挂载 | PostgreSQL 数据盘预留 3 年增长 |
| **Bun** | **>= 1.3.0**（packageManager 锁定 bun@1.4.2） | 本系统一等运行时 |
| **Node.js** | >= 18 | Bun 已内嵌兼容，仅本地工具链需要 |
| **PostgreSQL** | **16**（16.4 验证） | 业务主库 |
| Redis | 7.x | 缓存 / 分布式锁 / 限流 / 会话黑名单 |
| Nginx | 1.20+ | 边缘反向代理，唯一对外入口 |

运行时自检（安装 Bun 后执行）：

```bash
bun --version
# 输出须 >= 1.3.0，否则禁止进入下一步
```

> Bun 安装（Ubuntu）：`curl -fsSL https://bun.sh/install | bash`，随后把 `~/.bun/bin` 加入 PATH。

---

## 2. 获取发布包与安装依赖

```bash
# 方式一：按发布 tag 获取源码（示例，按实际交付渠道替换）
# git clone -b v0.1.0 <仓库地址> jlmedaios && cd jlmedaios

# 方式二：解压官方发布包后进入目录
cd jlmedaios

# 安装依赖（按 bun.lock 锁定版本，不新增、不升级）
bun install
```

---

## 3. 数据库初始化

### 3.1 创建数据库与专用账号

```bash
# 以 postgres 管理员登录后执行（禁止用 superuser 跑应用）
sudo -u postgres psql
```

```sql
CREATE USER jlmedaios_app WITH PASSWORD '换成高强度随机口令';
CREATE DATABASE jlmedaios OWNER jlmedaios_app;
GRANT ALL PRIVILEGES ON DATABASE jlmedaios TO jlmedaios_app;
\q
```

### 3.2 自动建表迁移

BFF **首次启动时自动执行**迁移：按文件名顺序运行 `deploy/postgres/init/*.sql`，
版本记录在 `public.schema_migrations` 表，幂等可重入；迁移失败会明确报错，不会静默跳过。
**无需手动执行任何建表 SQL。**

### 3.3 迁移脚本与连接校验

启动 BFF 之前，先静态校验迁移脚本并复核库连通性：

```bash
bun scripts/db/check-sql.ts
# 等价 npm script：bun run db:check
```

### 3.4 基础/演示数据（可选，仅联调环境）

```bash
bun scripts/db/import-seed.ts
# 等价 npm script：bun run db:seed
# 生产环境默认不导入演示数据
```

---

## 4. .env 配置说明

```bash
cp .env.example .env
```

按下表逐项填写。**`.env*` 已被 .gitignore 排除，严禁把含真实口令的 .env 提交版本库。**

### 4.1 生产必配项（缺失即不可上线）

| 变量 | 生产取值 | 说明 |
| --- | --- | --- |
| `NODE_ENV` | `production` | 运行环境 |
| `APP_ENV` | `prod` | 环境分层（dev/staging/prod） |
| `LOG_LEVEL` | `info` | 生产建议 info，排障临时调 debug |
| `HTTP_PORT` | `8080` | BFF 监听端口（仅绑 127.0.0.1） |
| `DATABASE_URL` | `postgres://jlmedaios_app:口令@127.0.0.1:5432/jlmedaios` | PostgreSQL 连接串 |
| `PGSSLMODE` | `prefer` | 生产禁用 `disable`；内网明文链路用 prefer |
| `DEMO_MODE` | `0` | 必须关闭演示内存数据模式 |
| `LLM_PROVIDER` | `anthropic` | 大模型提供方 |
| `LLM_API_KEY` | 真实密钥 | **严禁占位符上线** |
| `JWT_SECRET` | 高强度随机串 | 登录签名密钥 |
| `ENCRYPTION_MASTER_KEY` | KMS 下发的 32 字节主密钥 | 字段加密主密钥 |
| `ENABLE_DESENSITIZATION` | `true` | 生产必须开启数据脱敏（等保三级要求） |
| `ENABLE_PROMPT_GUARD` | `true` | 开启 Prompt 注入防护 |
| `RADAR_INTERNAL_TOKEN` | 内部鉴权 token | BFF 与影像推理服务共享 |
| `HEALTH_CHECK_PATH` | `/health` | 健康检查端点 |

### 4.2 其他常用项

- `LOG_DIR=./logs`、`AUDIT_RETENTION_DAYS=180`：审计日志保留 ≥180 天；
- `HIS_BASE_URL` / `EMR_BASE_URL` / `HIS_API_KEY`：院内系统对接地址与密钥；
- `VECTOR_STORE_DIR=./data/vectors`：知识库向量落盘目录，需保证可写；
- `SENTRY_DSN`：错误上报地址，留空则不上报。

---

## 5. 构建与启动命令

```bash
# 1) 类型检查（必须零报错，再构建产物）
bun run typecheck

# 2) 生产构建（产物输出 dist/）
bun run build

# 3) 开发联调启动（仅内网测试环境）
bun run src/bff/server.ts

# 4) 生产启动（以产物运行，等价 npm script：bun run start:server）
bun dist/server.js
```

### 5.1 生产守护（systemd 示例）

`/etc/systemd/system/jlmedaios-bff.service`：

```ini
[Unit]
Description=Jianlan Gang-OS BFF
After=network.target postgresql.service

[Service]
WorkingDirectory=/opt/jlmedaios
EnvironmentFile=/opt/jlmedaios/.env
ExecStart=/home/deploy/.bun/bin/bun /opt/jlmedaios/dist/server.js
Restart=always
RestartSec=5
User=deploy

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now jlmedaios-bff
```

---

## 6. Nginx 反向代理

BFF 只监听 `127.0.0.1:8080`，对外流量一律经 Nginx。前端静态产物放在 `/opt/jlmedaios-web/`。

`/etc/nginx/conf.d/jlmedaios.conf`：

```nginx
server {
    listen 80;
    server_name medaios.example-hospital.cn;

    # 业务接口反代到本机 BFF
    location /api/v1/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;   # AI 对话接口耗时长
    }

    # 前端静态站点
    location / {
        root /opt/jlmedaios-web;
        index index.html;
        try_files $uri /index.html;
    }

    # 健康检查对外暴露（供负载均衡探活）
    location = /health {
        proxy_pass http://127.0.0.1:8080;
    }
}
```

生效前必须先校验语法，再平滑重载（不中断现有连接）：

```bash
nginx -t
nginx -s reload
```

---

## 7. HTTPS 配置

### 7.1 公网域名（Let's Encrypt）

```bash
sudo apt install certbot python3-certbot-nginx
certbot --nginx -d medaios.example-hospital.cn
# certbot 会自动改写 server 段为 listen 443 ssl，并配置 80 -> 443 跳转
```

certbot timer 默认已开启自动续期，无需额外配置；可用 `certbot renew --dry-run` 验证续期链路。

### 7.2 院内专网（院内 CA）

院内专网无公网 DNS 时，由院内 PKI 签发证书：

```nginx
server {
    listen 443 ssl;
    server_name medaios.internal;
    ssl_certificate     /etc/nginx/ssl/medaios.internal.crt;
    ssl_certificate_key /etc/nginx/ssl/medaios.internal.key;
    # 其余 location 同第 6 节
}
```

证书到期前 30 天更换，更换后执行 `nginx -t && nginx -s reload`。

---

## 8. 上线验证

按顺序执行，任一项失败必须先排查再放量：

```bash
# 1) BFF 本机存活探针（进程与路由层正常）
curl -f http://127.0.0.1:8080/health

# 2) 就绪探针（串联数据库/缓存等关键依赖；非 2xx 说明依赖未就绪）
curl -f http://127.0.0.1:8080/ready

# 3) 经 Nginx 的对外接口
curl -f https://medaios.example-hospital.cn/api/v1/health

# 4) 浏览器打开首页，完成一次登录与 AI 对话冒烟
```

---

## 9. 常见问题（FAQ）

**Q1：启动报 `DATABASE_URL` 连接被拒绝？**
检查 PostgreSQL 是否监听本机、`pg_hba.conf` 是否放行应用账号、`DATABASE_URL` 口令与 3.1 步创建的是否一致；`sudo -u postgres psql -d jlmedaios` 能通则问题在连接串。

**Q2：`/ready` 返回 503 但 `/health` 正常？**
`/health` 只证明进程活着，`/ready` 会检查 DB/缓存依赖。503 表示依赖未就绪：优先看 `./logs` 下 BFF 日志里的数据库/缓存报错，**不要直接对外放量**。

**Q3：页面打开是空白/404？**
检查 Nginx `root /opt/jlmedaios-web` 目录是否有 `index.html`，`try_files $uri /index.html` 是否配置（前端路由刷新 404 的标准修复）。

**Q4：`bun install` 报锁文件不一致？**
严禁自行升级依赖版本；确认使用 `bun.lock` 锁定结果。离线机房需提前在内网 registry 镜像同步全部依赖。

**Q5：日志去哪里看？**
systemd 部署用 `journalctl -u jlmedaios-bff -f`；应用业务日志落在 `.env` 中 `LOG_DIR`（默认 `./logs`），审计日志保留 `AUDIT_RETENTION_DAYS` 天。

**Q6：占位符忘了替换会怎样？**
以 `placeholder` / `CHANGE_ME` / `sk-placeholder` 开头的密钥会导致登录鉴权失败、LLM 调用 401；上线前对照 4.1 节表格逐项确认，生产环境 `ENABLE_DESENSITIZATION` 必须为 `true`。

**Q7：如何回滚版本？**
保留上一版本 `dist/` 目录（如 `dist.bak/`），回滚即切回旧产物并 `systemctl restart jlmedaios-bff`；数据库迁移均为幂等脚本，回滚应用代码不影响库结构。

---

## 10. 附录：容器化一键部署

已有完整容器编排时，可跳过第 2/5/6/7 节手工步骤：

```bash
cp .env.compose.example .env   # 替换全部占位口令
docker compose build
docker compose up -d
# 生产叠加覆盖文件：
# docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

编排已内置：Nginx 边缘网关（80→443）、PostgreSQL 16（含 WAL 归档）、Redis 7、
Prometheus/Grafana/Alertmanager 监控栈与日志栈。详见根目录 `docker-compose.yml` 与
`docs/deployment/02-部署步骤.md`。

---

*本指南由 M132-A 产品化收尾交付，与 `generateDeploymentChecklist()` 单一事实源联动维护；
命令或配置变更时，须同步更新聚合器 `VERIFIED_COMMANDS` 与 `REQUIRED_ENV_KEYS`。*

Copyright (c) 2026 杭州健澜科技有限公司. All rights reserved.
