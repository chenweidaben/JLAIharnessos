# 健澜仓库两小时滚动巡检简报 — 2026-11-13 20:23 轮

## 0. 本轮摘要

18:23 轮后两小时常规巡检。**P0：BFF pid 42432 次轮 CPU 增量 61.9% 破 50% 阈值，强杀重启新 pid 20548**。PG pid 45756 稳定运行 6 小时。门禁实测全绿。

## 1. 智能体进度

- 组织智能体 `o_000Rfj7NkAk`：peek status=2（finished），85% completing，version 829（连续多轮未变），idle-resumable standby。
- 最近摘要仍为旧口径（wormLayeredStore 8/3 回归待排查、brand-gate 全仓扫发现构建产物含真名）。
- 按经验文件：status=2 standby 且无新切片产出，不唤醒。

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
| 根 tsc（`node node_modules/typescript/bin/tsc --noEmit`） | exit 0 | `logs/patrol-2023-tsc-root.txt` |
| web tsc（`bun x tsc --noEmit`，cwd=web） | exit 0 | `logs/patrol-2023-tsc-web.txt` |
| gate-unit（`scripts/gate-unit.ps1`） | **181 / 0 / 512 PASS** | `logs/patrol-2023-gateunit.txt` |
| brand-gate（`scripts/brand-gate.ps1`） | 9816 files / 0 hard / backlog 13 PASS | `logs/patrol-2023-brand.txt` |
| router-check（`logs/patrol-1623-router-check.py`） | lazy=2872 / dangling=0 / route=2870 / dup=0 PASS | `logs/patrol-2023-router.txt` |

- 品牌硬违规：0（`gangos_` 13 处 backlog 不计硬违规，分布于 `src/bff/observability/metrics.ts`、`src/core/observability/metrics.ts`）。
- 悬空 lazy import：0；重复 Route：0。
- wormStore attrib 超时兜底持续稳定，本轮全量单测一次跑通。

## 4. 运行态

### PG pid 45756（14:23:57 重启后）

| 项 | 值 |
|---|---|
| PID | 45756（14:23:57 启动） |
| 5433 | listening（::1 + 127.0.0.1） |
| CPU 累计 | 8.75s（主进程），运行 6 小时稳定 |
| 新增 worker | pid 2476（20:21:41 启动，CPU 1.89s）、pid 44744（20:12:41 启动，CPU 8.86s）——PG 后台任务（autovacuum/stats/walsender），正常 |

### BFF pid 42432（旧，16:28:39 启动）→ pid 20548（新，20:30:28 启动）

**旧 BFF pid 42432 处置前读数：**

| 项 | 值 |
|---|---|
| 启动 | 16:28:39（日志后缀 e） |
| 初始 CPU（16:28） | 10.94s |
| 首轮 CPU（18:23） | 1669.94s（+23.0%/2h） |
| 次轮 CPU（20:25） | 6129.33s（**+61.9%/2h**） |
| 判定 | 次轮增量从 23.0% 跳到 61.9%，加速爬升，与历史 pid 34256（26.3%→66.4%）、pid 3436（23.9%→62.4%）、pid 25988（23.5%→47.5%→62.9%）同轨迹，破 50% 阈值，**强杀** |
| 强杀前五端点 | 全 200（取证后再杀） |

**新 BFF pid 20548 重启后读数：**

| 项 | 值 |
|---|---|
| PID | 20548（20:30:28 启动） |
| 启动命令 | `bun --inspect=127.0.0.1:6499 run src/bff/server.ts`（日志后缀 f） |
| 8080/6499 | listening |
| 初始 CPU（20:30） | 10.72s |
| 重启后五端点 | 全 200 |

历史 BFF 进程次轮轨迹对照：
- pid 34256：首轮 26.3% → 次轮 66.4% → 强杀
- pid 3436：首轮 23.9% → 次轮 62.4% → 强杀
- pid 23556：首轮 24.8% → 次轮 42.9%（稳态，非加速）
- pid 25988：首轮 23.5% → 次轮 47.5% → 三轮 62.9% → 强杀
- **pid 42432：首轮 23.0% → 次轮 61.9% → 强杀** ← 本轮

### vite

- 5173 未启动（历史死锁问题，四种启动方式均复现）。

## 5. 仓库卫生

- HEAD = `f8c678fcc827bef29325ee6d293164f882d69b95`（与 18:23 轮一致，无新提交）。
- 分支：`consult-agent-m86`。
- `git status --porcelain` 计数 148（与历史一致）。
- 本轮未跟踪源码归属：无新增源码改动。另一路 consult 任务产物不代提交、不删除。

## 6. 本轮处理项与分组 commit

- **P0 处理项**：BFF pid 42432 次轮 CPU 增量 61.9% 破 50% 阈值，`Stop-Process -Id 42432 -Force` 强杀，按模板重启新 BFF pid 20548（日志后缀 f）。
- 分组 commit：
  - docs：`reports/patrol/patrol-20261113-2023-mainline.md`（本轮简报，1 file changed）。

## 7. 双仓推送与三端 SHA 核对

- push gitcode：`git push gitcode consult-agent-m86:master`
- push mirror：`git push mirror consult-agent-m86:master`（GitHub over SSH 443）
- 推送后 `git ls-remote` 核对：
  - local HEAD = 待填
  - gitcode master = 待填
  - mirror master = 待填
- 不推 origin（HTTPS token 口径）与 heagentos；不打 tag。

## 8. 遗留风险与下一轮重点

1. **BFF CPU 自转根因未定位**：已三十一次重启（pid 29468→42184→40000→40500→48236→37520→32176→45728→49368→15396→34256→3436→23556→25988→42432→20548）。前二十八次均在数小时内 CPU 持续爬升后被强杀、自行消失或机器重启停止。新 BFF pid 20548 于 20:30:28 启动，初始 CPU 10.72s。Bun 1.2.0 CDP 不支持 Profiler domain，运行时抓 CPU profile 走不通。
2. **PG 异常退出根因未定位**：pid 45756 是新重启（14:23:57），运行 6 小时稳定。前九次 PG 异常退出（25208、15384、37436、37728、39724、46664、51088、472、33384）疑似 Windows 侧 OOM kill 或杀毒软件干预。
3. **BFF 自行消失根因未定位**：pid 49368 和 pid 23556 两次自行消失，err 日志无 crash 栈。
4. **vite dev server 死锁**：5173 仍未启动。
5. **组织智能体旧说法未纠偏**：连续 50+ 轮未 `send_message` 给 `o_000Rfj7NkAk`。
6. **全量单测历史存量 fail**：P4-5 回放/取证包、P0-4/P0-5 路由自检、DDL 列对齐——历史存量，需另开时间窗复跑确认是否回归。
7. **下一轮重点**：22:23 轮读 BFF pid 20548 首轮（20:30→22:23）CPU 增量，与历史首轮轨迹（20-25%）对照；跟踪 PG pid 45756 稳定性（运行 8 小时）。

---

*本轮巡检时间：2026-11-13 20:25–20:35 CST。取证日志均落 `logs/patrol-2023-*.txt`，被 .gitignore 覆盖。*
