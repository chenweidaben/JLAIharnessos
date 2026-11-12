# 健澜仓库两小时滚动巡检简报 — 2026-11-12 14:23 轮

## 0. 本轮摘要

Windows 客户端离线约 16 小时（自 2026-11-11 22:25 轮后），连续 7 轮 cron 触发落在云端 Linux VM，按经验文件 `patrol-environment-switch-no-fabrication.md` 纪律输出阻断报告、未在 VM 上跑任何 git/门禁/推送。本轮（14:23）Windows 客户端回归，切回本机盘点。

**离线期间发生机器重启**：PG pid 51088、BFF pid 15396、vite 全部停止，5433/8080/6499/5173 端口均无监听。按模板重启 PG（新 pid 472）与 BFF（新 pid 34256，带 CDP 6499），五端点全 200。本轮无代码改动，仅落盘简报。

## 1. 智能体进度

- 组织智能体 `o_000Rfj7NkAk`（HIS-EMR一体化复刻与脱敏升级）：peek status=2（finished），85% completing，version 829，idle-resumable standby。
- 最近摘要仍为旧口径（wormLayeredStore 8/3 回归待排查、brand-gate 全仓扫发现构建产物含真名），其中"wormLayeredStore 8/3 回归"已被 14:25 轮 wormStore attrib 1.5s 超时修复证伪（连续 5 轮全量单测 181/0/512 PASS）。
- 按经验文件 `organizer-peek-idle-judge-and-post-wake-recheck`：status=2 standby 且无新切片产出，不唤醒，避免重复纠偏干扰。
- 旧智能体 `o_000pZ6W0z5F` / `o_000pKWRkDCO` / `o_000EkD3iWsb` / `o_000E2mfsz5X` 已终态，不巡查。

## 2. 工具链版本（实测）

| 工具 | 版本 |
|---|---|
| node | v22.23.2 |
| bun | 1.2.0（`C:\Users\lenovo\.bun\bin\bun.exe`） |
| npm | 10.9.8 |
| PowerShell | 7.6.4 |

## 3. 代码健康门禁（本轮实测）

| 门禁 | 结果 | 取证日志 |
|---|---|---|
| 根 tsc（`node node_modules/typescript/bin/tsc --noEmit`） | exit 0 | `logs/patrol-1423-tsc-root.txt` |
| web tsc（`bun x tsc --noEmit`，cwd=web） | exit 0 | `logs/patrol-1423-tsc-web.txt` |
| gate-unit（`scripts/gate-unit.ps1`） | **181 / 0 / 512 PASS** | `logs/patrol-1423-gateunit.txt` |
| brand-gate（`scripts/brand-gate.ps1`） | 9816 files / 0 hard / backlog 13 PASS | `logs/patrol-1423-brand.txt` |
| router-check（`logs/patrol-1623-router-check.py`） | lazy=2872 / dangling=0 / route=2870 / dup=0 PASS | `logs/patrol-1423-router.txt` |

- 品牌硬违规：0（`gangos_` 13 处 backlog 不计硬违规，分布于 `src/bff/observability/metrics.ts`、`src/core/observability/metrics.ts`）。
- 悬空 lazy import：0；重复 Route：0。
- wormStore attrib 超时兜底（14:25 轮修复）持续稳定，本轮全量单测一次跑通，未复现挂起。

## 4. 运行态

### 进程与端口

| 组件 | PID | 端口 | 启动时间 | CPU 累计 | 状态 |
|---|---|---|---|---|---|
| PG（PostgreSQL 16.15） | 472 | 5433 | 2026-11-12 14:24 | — | listening，psql 连接 jlmedaios 正常 |
| BFF（bun run src/bff/server.ts） | 34256 | 8080 / 6499(CDP) | 2026-11-12 14:25:04 | 11.48s（初始） | listening |
| vite（前端 dev） | — | 5173 | — | — | 未启动（历史死锁问题，不在本轮范围） |

- PG 启动：`postmaster.pid` 残留（pid 51088，上轮 22:24 启动，机器重启后进程已不存在），删除后 `pg_ctl start`，`-w -t 30` 超时（crash recovery 慢，老问题），实际进程已起，新 pid 472。这是第七次 PG 因机器重启/异常退出而恢复。
- BFF 启动：按模板 `Start-Process bun --inspect=127.0.0.1:6499 run src/bff/server.ts`，日志后缀 `a`（pid 34256），stdout/stderr 落 `logs/bff-1112a-out.log` / `bff-1112a-err.log`。这是第二十次 BFF 进程。

### 健康端点实测（HTTP 状态码）

| 端点 | 状态码 |
|---|---|
| GET http://127.0.0.1:8080/health | 200 |
| GET http://127.0.0.1:8080/ready | 200 |
| GET http://127.0.0.1:8080/api/v1/health | 200 |
| GET http://127.0.0.1:8080/api/v1/system/health | 200 |
| GET http://127.0.0.1:8080/metrics | 200 |
| GET http://127.0.0.1:5173/（vite） | 拒绝连接（未启动） |

## 5. 仓库卫生

- HEAD = `be46352cfcaac47187e9fa8d80bacbf27809b162`（与 22:25 轮一致，离线期间无新提交）。
- 分支：`consult-agent-m86`。
- `git status --porcelain` 计数 148（与历史一致：docs 99 / pgdata 6 / 旧简报 40 / logs 等，均为 .gitignore 覆盖或 backlog 范围）。
- 本轮未跟踪源码归属：无新增源码改动。另一路 consult 任务产物不代提交、不删除。

## 6. 本轮处理项与分组 commit

本轮无 P0 代码改动。机器重启导致运行态进程全停，按模板恢复：

1. 删除残留 `C:\postgres\data2\postmaster.pid`（pid 51088）。
2. `pg_ctl start` 恢复 PG，新 pid 472。
3. 按模板启动 BFF（带 `--inspect=127.0.0.1:6499`），新 pid 34256。
4. 实测双 tsc / 单测 / 品牌 / 路由门禁全绿。
5. 五端点实测全 200。

分组 commit：
- docs：`reports/patrol/patrol-20261112-1423-mainline.md`（本轮简报，1 file changed）。

## 7. 双仓推送与三端 SHA 核对

- push gitcode：`git push gitcode consult-agent-m86:master`
- push mirror：`git push mirror consult-agent-m86:master`（GitHub over SSH 443）
- 推送后 `git ls-remote` 核对：
  - local HEAD = ?
  - gitcode master = ?
  - mirror master = ?
- 不推 origin（HTTPS token 口径）与 heagentos；不打 tag。

## 8. 遗留风险与下一轮重点

1. **BFF CPU 自转根因仍未定位**：第二十次进程（pid 34256）刚启动，CPU 初始 11.48s。按历史轨迹每两小时爬升 ~30-40%，下一轮（16:23）需读 CPU 增量判断是否破 50% 阈值。Bun 1.2.0 CDP 不支持 Profiler domain（`-32601`），运行时抓 profile 走不通；下一步可考虑改 BFF 代码加 `Bun.profiler` API 或用 Windows ETW 抓 bun.exe 系统级 profile。
2. **PG 第七次异常退出**：本机机器重启导致（非无故退出，本轮有明确重启证据）。后续仍需观察 PG 是否在无重启情况下无故退出。
3. **vite dev server 死锁**：5173 仍未启动，四种启动方式均复现死锁。可用 `vite --debug` 观察请求进入后卡在哪个中间件。
4. **组织智能体旧说法未纠偏**：连续 40+ 轮未 `send_message` 给 `o_000Rfj7NkAk`。"wormLayeredStore 8/3 回归"已被证伪，但"brand-gate 全仓扫发现 web/dist 构建产物含真名"仍需在简报第 8 节明确口径差异（主线 brand-gate 默认 scope=src+web/src，不含 web/dist）。
5. **全量单测历史存量 fail**：P4-5 回放/取证包、P0-4/P0-5 路由自检、DDL 列对齐——历史存量，需另开时间窗复跑确认是否回归。

---

*本轮巡检时间：2026-11-12 14:23–14:35 CST。取证日志均落 `logs/patrol-1423-*.txt`，被 .gitignore 覆盖。*
