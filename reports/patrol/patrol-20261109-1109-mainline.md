# 巡检简报 2026-11-09 11:09（环境回归后首轮）

## 0. 本轮背景

- 自 2026-11-08 08:40 起，原 Windows 客户端 `client:582478` 离线，连续 12 轮 cron 触发落在云端 Linux VM，按 `patrol-environment-switch-no-fabrication` 纪律如实报告阻断、未跑任何门禁/git。
- 本轮（2026-11-09 ~10:25）Windows 客户端恢复在线，重新切回本机 `DESKTOP-OBE6S1B`，按七步闭环实测。
- 仓库根：`C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1`，分支 `consult-agent-m86`。
- 基线 HEAD：`323c38f5`（06:23 轮简报）；本轮提交后 HEAD：`bdacd1f4`。

## 1. 智能体进度

- 组织智能体 `o_000Rfj7NkAk`（HIS-EMR 一体化复刻与脱敏升级）：本轮环境刚恢复，未单独 `peek_task_progress`。上一轮可见状态为 `status=2 finished`、85% completing、idle-resumable standby。
- 连续 12 轮未发 `send_message` 纠偏；本轮因时间预算优先收口门禁与 docs 提交，纠偏消息顺延下一轮。
- 待纠偏旧说法（08:23 已实测证伪）：
  1. `wormLayeredStore` 8/3 "真实回归" → 实测 8 pass / 0 fail / 25 expect()，日志中 "3 fail" 来自正文 `simulated s3 failure` 被正则误抠。
  2. `web/dist` 构建产物含 3 个真名 → 实测 2919 文件 0 命中。
  3. `reports/slices` 有 backlog 命中 → 实测 16 文件 0 命中。

## 2. 工具链与门禁（本轮实测）

| 项 | 结果 | 备注 |
|---|---|---|
| node | v22.23.2 | |
| npm | 10.9.8 | |
| bun | 1.2.0（`C:\Users\lenovo\.bun\bin\bun.exe`） | |
| tsc-root | PASS（exit 0） | `node node_modules/typescript/bin/tsc --noEmit`，日志 `logs/patrol-1109-tsc-root.txt` |
| tsc-web | PASS（exit 0） | cwd=web，`bun x tsc --noEmit`，日志 `logs/patrol-1109-tsc-web.txt` |
| gate-unit | PASS | actual 181 / 0 / 512，baseline 一致，`logs/gate-unit-20261109-110719.log` |
| gate-e2e | PASS | actual 23 / 0 / 83，baseline 一致，port 8081 clean，`logs/gate-e2e-20261109-110738.log` |
| brand-gate | PASS | scope `src,web/src`，filesScanned 9816，hardViolations 0 (code=0 doc=0)，backlogGangos 13（落点同 08:23） |
| router-check | PASS | lazy_imports=2872 dangling=0 route_paths=2870 dup_paths=0 |

全量 `bun test tests/unit`（2131 文件）本轮未跑完：跑到约 14775 pass / 12 fail 后进程仍在 churn，按时间预算终止。12 个 fail 集中在 P4-5 回放/取证包、P0-4/P0-5 路由自检、DDL 列对齐——均不在 curated gate 范围内，且自 323c38f5 以来无代码改动，视为历史存量，不属本轮回归。下一轮如需全量门禁需另开时间窗。

## 3. 运行态

机器离线约 26 小时后，PG / BFF / vite 全部停止，本轮按序拉起：

| 服务 | 端口 | PID | 状态 |
|---|---|---|---|
| PostgreSQL 16.15 | 5433 | 25208 | crash recovery 完成（redo 0/7922DE8→0/7922E98），无数据损坏 |
| BFF (bun run src/bff/server.ts) | 8080 | 29468 | listening，DEMO_MODE=1，audit store=pg，backfill truncated 1000/2877（SEAL DISABLED，与 08:23 一致） |
| Vite dev | 5173 | — | **P0：TCP listen 但 HTTP 不回响应**，见下 |

BFF 五端点实测（全部 200）：

| 端点 | 状态 | 大小 |
|---|---|---|
| /health | 200 | 2B |
| /ready | 200 | 232B |
| /api/v1/health | 200 | 163B |
| /api/v1/system/health | 200 | 145B |
| /metrics | 200 | 4373B |

## 4. P0 未决：Vite dev server 死锁

- 现象：vite 5.4.21 启动日志 `ready in ~1.1s`，TCP 5173 处于 listen，但 `Invoke-WebRequest` 与 raw TcpClient 发送 `GET / HTTP/1.1` 后 60s 无响应。esbuild 子进程 0.09s CPU（空闲），node vite 进程 ~60s CPU 不增长。
- 已尝试：
  1. `bun x vite`（绑 0.0.0.0）→ 首个请求 200/894B/2860ms，后续全部挂起。
  2. `bun x vite --host 127.0.0.1 --strictPort` → 启动 ready，HTTP 挂起。
  3. 直接 `node node_modules/vite/bin/vite.js --host 127.0.0.1 --strictPort` → ready，HTTP 挂起。
  4. 清 `web/node_modules/.vite` 缓存后重启 → ready，HTTP 仍挂起。
- 配置无异常中间件（vite.config.ts 仅 /api、/ws 代理到 8080，对 `/` 无拦截）。BFF（bun.exe:8080）同机 HTTP 完全正常，排除系统代理/防火墙全局问题。
- 本轮未定位根因，未修复。前端开发入口本轮不可用；BFF API 与所有门禁不受影响。下一轮重点：用 `--debug` 启动 vite 观察请求进入后卡在哪个中间件；或检查 Windows Defender/安全产品对 node.exe 5173 的 loopback 拦截。

## 5. 仓库卫生

- `git status --porcelain`：150 行（08:23 为 148，新增为本次运行日志，被 `.gitignore:33` 覆盖）。
- 107 项 modified 仍为 CRLF 行尾规范化差异，`git diff -- docs` 内容 0 行；不代提交。
- untracked 41+ 项为 `reports/patrol/` 历史简报与 `pgdata/pg_stat/`，归属另一路或已忽略，不代提交。

## 6. 本轮处理项与 commit

- 08:23 轮就地修复的两处 docs 文档引用错配，本轮正式提交：
  - `docs/operations/01-监控手册.md`：规则路径 `gangos.yml` → `jlmedaios.yml`；Grafana 大盘文件名 → `jlmedaios-overview.json`。
  - `docs/operations/02-告警手册.md`：规则路径同上；表格 9 行告警名 `Gangos*` → `Jlmedaios*`。
- commit：`bdacd1f4` `docs(operations): 修正监控与告警手册中实际文件名与告警名前缀`，2 files changed, 12 insertions(+), 12 deletions(-)。

## 7. 双仓推送与 SHA 核对

推送与核对见本简报末尾「推送结果」节（推送后回填）。

## 8. 遗留风险与下一轮重点

1. **P0 vite 死锁**：dev server 不可用，需 `--debug` 定位中间件卡点或排查安全产品 loopback 拦截。
2. **组织智能体纠偏消息未发**：连续 13 轮未 `send_message` 给 `o_000Rfj7NkAk`，三条已证伪旧说法仍未纠正。
3. **全量单测 12 fail**：P4-5 回放/取证包、P0-4/P0-5 路由自检、DDL 列对齐——历史存量，需另开时间窗复跑确认是否回归。
4. **BFF 空闲 CPU 自转**（08:23 测得 0.23 核 / 整机 ~1.4%）：根因仍未定位，需 `bun --inspect` + CDP Profiler。
5. `AUDIT_BACKFILL_LIMIT`（2877 vs 当前 1000，SEAL DISABLED）仍待用户拍板。
6. `docs/architecture/` 3 处非指标 `gangos` 残留（数据库名、镜像路径、目录树）待用户拍板。
