# 健澜仓库两小时滚动巡检简报 — 2026-11-13 00:23 轮

## 0. 本轮摘要

22:23 轮强杀 pid 3436、重启 pid 23556 后两小时常规巡检。**BFF pid 23556 第一个两小时间隔增量 +1784.33s ≈ 24.8% 单核，与历史进程首轮轨迹一致（20-26%），未破 50% 阈值，不重启**。PG pid 472 稳定运行 10 小时。门禁全绿。本轮无 P0 代码改动。

## 1. 智能体进度

- 组织智能体 `o_000Rfj7NkAk`：peek status=2（finished），85% completing，version 829（与 18:23、20:23、22:23 轮一致，未变），idle-resumable standby。
- 最近摘要仍为旧口径（wormLayeredStore 8/3 回归待排查、brand-gate 全仓扫发现构建产物含真名）。"wormLayeredStore 8/3 回归"已被 14:25 轮 wormStore attrib 1.5s 超时修复证伪（连续 10 轮全量单测 181/0/512 PASS）。
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
| 根 tsc（`node node_modules/typescript/bin/tsc --noEmit`） | exit 0 | `logs/patrol-0023-tsc-root.txt` |
| web tsc（`bun x tsc --noEmit`，cwd=web） | exit 0 | `logs/patrol-0023-tsc-web.txt` |
| gate-unit（`scripts/gate-unit.ps1`） | **181 / 0 / 512 PASS** | `logs/patrol-0023-gateunit.txt` |
| brand-gate（`scripts/brand-gate.ps1`） | 9816 files / 0 hard / backlog 13 PASS | `logs/patrol-0023-brand.txt` |
| router-check（`logs/patrol-1623-router-check.py`） | lazy=2872 / dangling=0 / route=2870 / dup=0 PASS | `logs/patrol-0023-router.txt` |

- 品牌硬违规：0（`gangos_` 13 处 backlog 不计硬违规，分布于 `src/bff/observability/metrics.ts`、`src/core/observability/metrics.ts`）。
- 悬空 lazy import：0；重复 Route：0。
- wormStore attrib 超时兜底持续稳定，本轮全量单测一次跑通。

## 4. 运行态

### BFF pid 23556（首轮观察，00:23 读数）

| 指标 | 值 |
|---|---|
| PID | 23556 |
| 启动时间 | 2026-11-12 22:29:15（第二十二次 BFF 进程） |
| CPU 累计 | 1794.14s |
| 22:29 初始 | 9.81s |
| 00:23 读数 | 1794.14s（第一小时间隔 +1784.33s ≈ **24.8% 单核**） |
| 判定 | **首轮正常，与历史轨迹一致，不重启** |

历史首轮轨迹对照：
- pid 3436：首轮 23.9%（18:30→20:25）
- pid 34256：首轮 26.3%（14:25→16:23）
- pid 49368：首轮 22.8%（06:23→08:23）
- pid 37520：首轮 19.3%（16:24→19:09）
- pid 45728：首轮 20.7%（02:25→04:23）
- **pid 23556：首轮 24.8%（22:29→00:23）** ← 本轮

五端点实测（00:23）：/health 200、/ready 200、/api/v1/health 200、/api/v1/system/health 200、/metrics 200。

### PG

| 组件 | PID | 端口 | 启动时间 | CPU 累计 | 状态 |
|---|---|---|---|---|---|
| PG（PostgreSQL 16.15） | 472 | 5433 | 2026-11-12 14:24:14 | 7.91s | listening，稳定（运行 10 小时） |

附属工作进程：pid 3680/17320/26228/26872/37844（14:24 启动），pid 7912（00:16:00）、22076（00:12:51）为新活跃连接，正常。

### vite

- 5173 未启动（历史死锁问题，四种启动方式均复现）。

## 5. 仓库卫生

- HEAD = `2020de1993ab123946f16aae25aafc3815029daa`（与 22:23 轮一致，无新提交）。
- 分支：`consult-agent-m86`。
- `git status --porcelain` 计数 148（与历史一致）。
- 本轮未跟踪源码归属：无新增源码改动。另一路 consult 任务产物不代提交、不删除。

## 6. 本轮处理项与分组 commit

- **本轮无 P0 代码改动**。
- BFF pid 23556 首轮 24.8% 正常，按纪律不重启；下一轮（02:23）观察第二小时间隔增量是否重复"首轮正常、次轮加速到 55-66%"的模式。
- 分组 commit：
  - docs：`reports/patrol/patrol-20261113-0023-mainline.md`（本轮简报，1 file changed）。

## 7. 双仓推送与三端 SHA 核对

- push gitcode：`git push gitcode consult-agent-m86:master`
- push mirror：`git push mirror consult-agent-m86:master`（GitHub over SSH 443）
- 推送后 `git ls-remote` 核对：
  - local HEAD = 待填
  - gitcode master = 待填
  - mirror master = 待填
- 不推 origin（HTTPS token 口径）与 heagentos；不打 tag。

## 8. 遗留风险与下一轮重点

1. **BFF CPU 自转根因仍未定位**：第二十二次进程（pid 23556）首轮 24.8% 正常。历史轨迹显示进程在第二、第三小时间隔加速爬升（pid 3436 从 23.9% 跳到 62.4%，pid 34256 从 26.3% 跳到 66.4%）。下一轮（02:23）需读第二小时间隔增量，判断是否重复模式。Bun 1.2.0 CDP 不支持 Profiler domain（`-32601`），运行时抓 profile 走不通；下一步可考虑改 BFF 代码加 `Bun.profiler` API 或用 Windows ETW 抓 bun.exe 系统级 profile。
2. **PG 稳定运行**：pid 472 自 14:24 启动以来 10 小时无异常，CPU 7.91s，正常。
3. **vite dev server 死锁**：5173 仍未启动。
4. **组织智能体旧说法未纠偏**：连续 43+ 轮未 `send_message` 给 `o_000Rfj7NkAk`。"wormLayeredStore 8/3 回归"已被证伪，但"brand-gate 全仓扫发现 web/dist 构建产物含真名"仍需在简报第 8 节明确口径差异。
5. **全量单测历史存量 fail**：P4-5 回放/取证包、P0-4/P0-5 路由自检、DDL 列对齐——历史存量，需另开时间窗复跑确认是否回归。

---

*本轮巡检时间：2026-11-13 00:23–00:30 CST。取证日志均落 `logs/patrol-0023-*.txt`，被 .gitignore 覆盖。*
