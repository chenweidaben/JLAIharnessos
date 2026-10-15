# jlmedaios 生产部署运维指南（DEPLOYMENT_GUIDE）

> 健澜科技 Gang-OS（jlmedaios）· AI 原生未来医院操作系统
>
> 适用对象：首次接手本系统的运维 / 实施工程师。按本文顺序照做，即可在一台干净 Linux
> 服务器上把生产环境跑起来，并完成 HTTPS、备份、日志轮转与监控告警的闭环。
>
> 配套：
> - 交互式配置生成：管理员后台「部署配置生成器」（`web/src/pages/admin/deploy/ConfigGenerator`），
>   或调用 `GET /api/v1/admin/deploy/config?domain=你的域名` 直接拿现成的 docker-compose.yml 与 nginx.conf；
> - 从零到上线的完整清单见 [`docs/DEPLOYMENT_GUIDE.md`](./docs/DEPLOYMENT_GUIDE.md)；
> - 日常运维操作见 [`OPERATIONS.md`](./OPERATIONS.md)。
>
> Copyright (c) 2026 杭州健澜科技有限公司. All rights reserved.

---

## 目录

1. [架构与端口总览](#1-架构与端口总览)
2. [环境准备](#2-环境准备)
3. [Docker Compose 一键部署](#3-docker-compose-一键部署)
4. [Nginx 反向代理](#4-nginx-反向代理)
5. [HTTPS 证书配置](#5-https-证书配置)
6. [数据备份与恢复](#6-数据备份与恢复)
7. [日志轮转](#7-日志轮转)
8. [监控告警](#8-监控告警)
9. [上线验收清单](#9-上线验收清单)

---

## 1. 架构与端口总览

生产环境采用「Nginx 唯一对外入口 + 内网容器编排」的收敛架构：

```
                     ┌──────────────────────────────────────────┐
   用户浏览器 ─────▶ │  Nginx（443/HTTPS，唯一对外入口）          │
   hospital.xxx     │   ├─ /.well-known/acme-challenge  (80)     │
                    │   ├─ /api/   ──▶ 127.0.0.1:8080 (bff)      │
                    │   └─ /       ──▶ 静态站点 /var/www/jlmedaios │
                    └───────────────┬──────────────────────────────┘
                                    │ 内网 bridge 网络 jlm_net
                    ┌───────────────┴───────────────┐
                    │  bff (127.0.0.1:8080)           │
                    │  ├─ postgres:5432（仅内网）      │
                    │  └─ redis:6379（带密码）        │
                    └─────────────────────────────────┘
```

| 端口 | 暴露范围 | 说明 |
|---|---|---|
| 80/tcp | 公网 | 仅用于 ACME 证书挑战，其余 301 跳 443 |
| 443/tcp | 公网 | 唯一业务入口（TLS1.2/1.3） |
| 8080/tcp | **仅 127.0.0.1** | bff，不对公网开放 |
| 5432/tcp | 仅容器内网 | PostgreSQL，宿主机不映射 |
| 6379/tcp | 仅容器内网 | Redis，带 `requirepass` |

> WebSocket 升级路径由既有边缘网关托管，本指南的 Nginx 配置不含 Upgrade/Connection 代理块，
> 请勿自行追加，以免与边缘层重复握手。

---

## 2. 环境准备

| 组件 | 版本 | 说明 |
|---|---|---|
| 操作系统 | Ubuntu 22.04 LTS / CentOS Stream 9+ / 麒麟 V10 | 生产不支持 Windows 直接托管 |
| 配置 | 最低 4C8G，推荐 8C16G | AI 聚合接口内存占用较大 |
| 磁盘 | 系统盘 100G+，数据盘独立挂载 | PostgreSQL 数据盘预留 3 年增长 |
| Docker | 24.0+ | 含 docker compose 插件（`docker compose version`） |
| Nginx | 1.20+ | 边缘反向代理 |

防火墙只放通 80/443：

```bash
# Ubuntu (ufw)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
# 切勿放通 5432/6379/8080 到公网
```

---

## 3. Docker Compose 一键部署

最省事的做法：登录管理员后台「部署配置生成器」，填入域名点「生成」，把
`docker-compose.yml` 内容复制到服务器；或直接调用接口：

```bash
# 管理员已登录时（浏览器带 Cookie），拉取现成编排
curl -s "https://hospital.example.com/api/v1/admin/deploy/config?domain=hospital.example.com" \
  | jq -r .data.dockerCompose > docker-compose.yml
```

手工准备时，在项目根创建 `.env`（**勿提交 git**）：

```bash
cp .env.compose.example .env
# 编辑 .env，把以下三项换成随机强口令（至少 24 位、含大小写数字符号）
#   DB_PASSWORD=...
#   REDIS_PASSWORD=...
#   JWT_SECRET=...
```

启动：

```bash
docker compose up -d
docker compose ps          # postgres 应 healthy；bff/redis 应 running
docker compose logs -f bff # 看启动日志，确认连上数据库与 redis
```

编排要点（由 `generateDockerCompose()` 生成，已内置）：

- 三服务 `postgres:16-alpine` / `redis:7-alpine` / `bff`，均 `restart: always`；
- 命名卷 `pg_data` / `redis_data` / `backup_data` 持久化，容器删了数据不丢；
- bff 端口只映射到 `127.0.0.1:8080`，外部一律走 Nginx；
- postgres 带 `pg_isready` 健康检查，bff 等库 healthy 后才启动；
- 备份 sidecar `jlmedaios-backup` 由宿主机 cron 触发，非常驻。

前端静态产物构建后放到 `/var/www/jlmedaios`（见第 4 节 root 路径）。

---

## 4. Nginx 反向代理

把生成的 `nginx.conf` 放到 `/etc/nginx/conf.d/jlmedaios.conf`：

```bash
# 同样可从接口直接取
curl -s "https://hospital.example.com/api/v1/admin/deploy/config?domain=hospital.example.com" \
  | jq -r .data.nginxConf | sudo tee /etc/nginx/conf.d/jlmedaios.conf

sudo nginx -t          # 校验语法，必须 syntax ok
sudo systemctl reload nginx
```

关键行为（已内置）：

- 80 端口：`/.well-known/acme-challenge/` 放行证书续签，其余一律 `301 -> https`；
- 443：`http2 on`，TLS1.2/1.3，安全响应头（HSTS / X-Frame-Options / nosniff / Referrer-Policy）；
- `/api/` 反代到 `upstream jlm_bff { server 127.0.0.1:8080; }`，带 `X-Forwarded-*`；
- `/` 走 `/var/www/jlmedaios` 静态产物，SPA `try_files ... /index.html`，缓存 7 天；
- `client_max_body_size 50m`，gzip 开。

> 证书路径默认 `/etc/nginx/ssl/fullchain.pem`，私钥同目录 `privkey.pem`；
> 若你的证书路径不同，生成时传 `sslCert=/your/path/fullchain.pem`。

---

## 5. HTTPS 证书配置

推荐 Let's Encrypt（certbot）自动签发与续签：

```bash
sudo apt-get install -y certbot
# 首次签发（Nginx 已监听 80 且 acme-challenge 目录可访问）
sudo certbot certonly --webroot -w /var/www/certbox \
  -d hospital.example.com
# 证书落在 /etc/letsencrypt/live/hospital.example.com/
sudo mkdir -p /etc/nginx/ssl
sudo cp /etc/letsencrypt/live/hospital.example.com/fullchain.pem /etc/nginx/ssl/
sudo cp /etc/letsencrypt/live/hospital.example.com/privkey.pem  /etc/nginx/ssl/
sudo nginx -t && sudo systemctl reload nginx
```

自动续签（certbot 自带 timer 通常已启用）：

```bash
sudo systemctl enable --now certbot.timer
# 续签后复制新证书并 reload nginx（可写入续签 deploy-hook）
echo '0 3 * * * root certbot renew --quiet --deploy-hook "cp /etc/letsencrypt/live/hospital.example.com/*.pem /etc/nginx/ssl/ && systemctl reload nginx"' \
  | sudo tee /etc/cron.d/certbot-renew
```

验收：浏览器访问 `https://hospital.example.com`，证书有效；`http://` 自动跳转。

---

## 6. 数据备份与恢复

备份策略由 `generateBackupPolicy()` 统一产出，文档、后台与单测三方一致：

| 项 | 策略 |
|---|---|
| 全量备份 | 每日 02:00 `pg_dump`，落 `/backup/postgres/full` |
| WAL 归档 | PostgreSQL continuous WAL，支持 PITR 时点恢复 |
| 本地保留 | 30 天 |
| Redis | 每日 03:15 导出 RDB，落 `/backup/redis/dump` |
| 异地副本 | 每周日 04:00 同步到 `s3://jlmedaios-backup/offsite` |
| 恢复演练 | 每月一次在隔离环境还原并校验 |

宿主机 cron 示例（`/etc/cron.d/jlm-backup`）：

```cron
# m h dom mon dow user  command
0  2  * * *  root  docker compose exec -T postgres pg_dump -U jlm jlmedaios | gzip > /backup/postgres/full/jlm-$(date +\%F).sql.gz
15 3  * * *  root  docker compose exec -T redis redis-cli -a "$REDIS_PASSWORD" BGSAVE
0  4  * * 0  root  aws s3 sync /backup/ s3://jlmedaios-backup/offsite/ --exclude "*" --include "*/full/*"
```

恢复（受控事务内执行，严禁在生产直接覆盖）：

```bash
# 1) 停 bff，避免恢复期间写入
docker compose stop bff
# 2) 还原最近全量
gunzip -c /backup/postgres/full/jlm-YYYY-MM-DD.sql.gz | \
  docker compose exec -T postgres psql -U jlm -d jlmedaios
# 3) 按需 WAL PITR 重放到指定时点；演练通过后再启 bff
docker compose start bff
```

> 应用层也提供 `GET /api/v1/admin/backup/export`（白名单小表 JSON 导出），
> 但**海量临床交易表的备份以 `pg_dump`/WAL 为准**，不要依赖应用层导出。

---

## 7. 日志轮转

两层都做，防止日志撑爆数据盘：

1. **容器层（Docker json-file）**：compose 已内置 `x-logging` 默认段，
   每容器 `max-size: "10m"`、`max-file: "3"`，超出自动滚动删除旧日志。
2. **宿主机层（journald）**：系统服务日志限制总量。

```bash
# /etc/systemd/journald.conf.d/jlm.conf
[Journal]
SystemMaxUse=2G
MaxRetentionSec=14day
```

```bash
sudo systemctl restart systemd-journald
# 确认 docker 日志大小受控
docker inspect --format '{{.Name}} {{.HostConfig.LogConfig.Config}}' jlmedaios-bff
```

日常排障：`docker compose logs --since 1h bff`，不要 `tail` 无界。

---

## 8. 监控告警

最小可用监控栈（按团队实际选型替换，指标口径不变）：

| 监控对象 | 指标 | 告警阈值（建议） |
|---|---|---|
| bff 进程 | 存活 / 5xx 率 / 平均延迟 | 5xx > 1% 持续 5 分钟；延迟 P95 > 2s |
| postgres | 连接数 / 慢查询 / 复制延迟 | 连接 > 80% 上限；复制延迟 > 30s |
| redis | 内存 / 命中率 / 主从偏移 | 内存 > 80% maxmemory |
| 磁盘 | 数据盘 / 备份盘 / 日志盘使用率 | > 80% 警告，> 90% 紧急 |
| 证书 | TLS 证书剩余有效期 | 剩余 < 20 天告警 |
| 备份 | 最近一次全备是否成功 | 超过 26h 无成功全备即告警 |

健康检查入口：`GET /api/v1/health`（既有），探活脚本示例：

```bash
# 加入 Prometheus blackbox / 或 crontab 探活
curl -fsS https://hospital.example.com/api/v1/health || \
  curl -fsS http://127.0.0.1:8080/api/v1/health || \
  echo "[ALERT] bff health check failed" >&2
```

证书有效期巡检（cron 每日）：

```bash
echo | openssl s_client -servername hospital.example.com -connect hospital.example.com:443 2>/dev/null \
  | openssl x509 -noout -enddate
```

---

## 9. 上线验收清单

- [ ] `docker compose ps`：postgres healthy、redis/bff running；
- [ ] `https://hospital.example.com` 可打开，证书有效，HTTP 自动跳 HTTPS；
- [ ] 登录管理员账号，进入「部署配置生成器」能生成并复制两份配置；
- [ ] `docker compose exec postgres pg_isready` 正常；redis `PING` 返回 PONG；
- [ ] 手动跑一次 `pg_dump` 备份并验证可还原（演练）；
- [ ] 磁盘 / 证书 / 备份 三类告警已配置；
- [ ] 确认 5432/6379/8080 未对公网暴露（`ss -lntp` 核对）。

---

Copyright (c) 2026 杭州健澜科技有限公司. All rights reserved.
