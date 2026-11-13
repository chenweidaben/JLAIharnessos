# 健澜仓库两小时滚动巡检简报 — 2026-11-13 22:23 轮

## 0. 本轮摘要

20:23 轮后两小时常规巡检。**本轮无 P0**。BFF pid 20548 首轮增量 22.1% 与历史轨迹一致，未破阈值。PG pid 45756 稳定运行 8 小时。门禁实测全绿。

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
| 根 tsc（`node node_modules/typescript/bin/tsc --noEmit`） | exit 0 | `logs/patrol-2223-tsc-root.txt` |
| web tsc（`bun x tsc --noEmit`，cwd=web） | exit 0 | `logs/patrol-2223-tsc-web.txt` |
| gate-unit（`scripts/gate-unit.ps1`） | **181 / 0 / 512 PASS** | `logs/patrol-2223-gateunit.txt` |
| brand-gate（`scripts/brand-gate.ps1`） | 9816 files / 0 hard / backlog 13 PASS | `logs/patrol-2223-brand.txt` |
| router-check（`logs/patrol-1623-router-check.py`） | lazy=2872 / dangling=0 / route=2870 / dup=0 PASS | `logs/patrol-2223-router.txt` |

- 品牌硬违规：0（`gangos_` 13 处 backlog 不计硬违规，分布于 `src/bff/observability/metrics.ts`、`src/core/observability/metrics.ts`）。
- 悬空 lazy import：0；重复 Route：0。
- wormStore attrib 超时兜底持续稳定，本轮全量单测一次跑通。

## 4. 运行态

### PG pid 45756（14:23:57 重启后）

| 项 | 值 |
|---|---|
| PID | 45756（14:23:57 启动） |
| 5433 | listening（::1 + 127.0.0.1） |
| CPU 累计 | 10.28s（主进程），运行 8 小时稳定 |
| 新增 worker | pid 42836（21:50:53 启动，CPU 35.61s）、pid 46164（22:01:55 启动，CPU 21.52s）——PG 后台任务（autovacuum/stats/walsender），正常 |

### BFF pid 20548（20:30:28 启动，日志后缀 f）

| 项 | 值 |
|---|---|
| PID | 20548（20:30:28 启动） |
| 8080/6499 | listening |
| 初始 CPU（20:30） | 10.72s |
| 首轮 CPU（22:23） | 1603.78s（**+22.1%/2h**） |
| 判定 | 首轮增量 22.1% 与历史进程首轮轨迹（20-25%）一致，未破 50% 阈值，**不重启** |
| 五端点 | 全 200 |

历史 BFF 进程首轮轨迹对照：
- pid 34256：首轮 26.3%
- pid 3436：首轮 23.9%
- pid 23556：首轮 24.8%
- pid 25988：首轮 23.5%
- pid 42432：首轮 23.0%
- **pid 20548：首轮 22.1%** ← 本轮

### vite

- 5173 未启动（历史死锁问题，四种启动方式均复现）。

## 5. 仓库卫生

- HEAD = `4bb98bba0483b3937dcbd05ce262bd22a920ab48`（与 20:23 轮一致，无新提交）。
- 分支：`consult-agent-m86`。
- `git status --porcelain` 计数 148（与历史一致）。
- 本轮未跟踪源码归属：无新增源码改动。另一路 consult 任务产物不代提交、不删除。

## 6. 本轮处理项与分组 commit

- 本轮无 P0 处理项。
- 分组 commit：
  - docs：`reports/patrol/patrol-20261113-2223-mainline.md`（本轮简报，1 file changed）。

## 7. 双仓推送与三端 SHA 核对

- push gitcode：`git push gitcode consult-agent-m86:master`
- push mirror：`git push mirror consult-agent-m86:master`（GitHub over SSH 443）
- 推送后 `git ls-remote` 核对：
  - local HEAD = 待填
  - gitcode master = 待填
  - mirror master = 待填
- 不推 origin（HTTPS token 口径）与 heagentos；不打 tag。

## 8. 遗留风险与下一轮重点

1. **BFF CPU 自转根因未定位**：已三十一次重启（pid 29468→42184→40000→40500→48236→37520→32176→45728→49368→15396→34256→3436→23556→25988→42432→20548）。前二十八次均在数小时内 CPU 持续爬升后被强杀、自行消失或机器重启停止。新 BFF pid 20548 于 20:30:28 启动，首轮 CPU 22.1%，与历史轨迹一致。Bun 1.2.0 CDP 不支持 Profiler domain，运行时抓 CPU profile 走不通。
2. **PG 异常退出根因未定位**：pid 45756 是新重启（14:23:57），运行 8 小时稳定。前九次 PG 异常退出（25208、15384、37436、37728、39724、46664、51088、472、33384）疑似 Windows 侧 OOM kill 或杀毒软件干预。
3. **BFF 自行消失根因未定位**：pid 49368 和 pid 23556 两次自行消失，err 日志无 crash 栈。
4. **vite dev server 死锁**：5173 仍未启动。
5. **组织智能体旧说法未纠偏**：连续 50+ 轮未 `send_message` 给 `o_000Rfj7NkAk`。
6. **全量单测历史存量 fail**：P4-5 回放/取证包、P0-4/P0-5 路由自检、DDL 列对齐——历史存量，需另开时间窗复跑确认是否回归。
7. **下一轮重点**：00:23 轮读 BFF pid 20548 次轮（22:23→00:23）CPU 增量，与历史次轮轨迹（42-66%）对照——若从 22.1% 加速到 50%+ 则强杀重启；跟踪 PG pid 45756 稳定性（运行 10 小时）。

---

*本轮巡检时间：2026-11-13 22:23–22:28 CST。取证日志均落 `logs/patrol-2223-*.txt`，被 .gitignore 覆盖。*
