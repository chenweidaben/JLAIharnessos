# 健澜仓库两小时滚动巡检简报 — 2026-11-12 22:23 轮

## 0. 本轮摘要

18:23 轮强杀 pid 34256、重启 pid 3436 后两小时常规巡检。**BFF pid 3436 第二个两小时间隔增量 +4489.90s ≈ 62.4% 单核，破 50% 阈值，加速爬升**（与 pid 34256 从 26.3%→66.4% 同轨迹）。按历史纪律先跑门禁取证（全绿），再测旧 BFF 五端点（全 200），然后强杀，按模板重启新 BFF pid **23556**（日志后缀 c）。PG pid 472 稳定。

## 1. 智能体进度

- 组织智能体 `o_000Rfj7NkAk`：peek status=2（finished），85% completing，version 829（与 18:23、20:23 轮一致，未变），idle-resumable standby。
- 最近摘要仍为旧口径（wormLayeredStore 8/3 回归待排查、brand-gate 全仓扫发现构建产物含真名）。"wormLayeredStore 8/3 回归"已被 14:25 轮 wormStore attrib 1.5s 超时修复证伪（连续 9 轮全量单测 181/0/512 PASS）。
- 按经验文件：status=2 standby 且无新切片产出，不唤醒。

## 2. 工具链版本（实测）

| 工具 | 版本 |
|---|---|
| node | v22.23.2 |
| bun | 1.2.0（`C:\Users\lenovo\.bun\bin\bun.exe`） |
| npm | 10.9.8 |
| PowerShell | 7.6.4 |

## 3. 代码健康门禁（本轮实测，BFF 强杀前取证）

| 门禁 | 结果 | 取证日志 |
|---|---|---|
| 根 tsc（`node node_modules/typescript/bin/tsc --noEmit`） | exit 0 | `logs/patrol-2225-tsc-root.txt` |
| web tsc（`bun x tsc --noEmit`，cwd=web） | exit 0 | `logs/patrol-2225-tsc-web.txt` |
| gate-unit（`scripts/gate-unit.ps1`） | **181 / 0 / 512 PASS** | `logs/patrol-2225-gateunit.txt` |
| brand-gate（`scripts/brand-gate.ps1`） | 9816 files / 0 hard / backlog 13 PASS | `logs/patrol-2225-brand.txt` |
| router-check（`logs/patrol-1623-router-check.py`） | lazy=2872 / dangling=0 / route=2870 / dup=0 PASS | `logs/patrol-2225-router.txt` |

- 品牌硬违规：0（`gangos_` 13 处 backlog 不计硬违规，分布于 `src/bff/observability/metrics.ts`、`src/core/observability/metrics.ts`）。
- 悬空 lazy import：0；重复 Route：0。
- wormStore attrib 超时兜底持续稳定，本轮全量单测一次跑通。

## 4. 运行态

### 旧 BFF pid 3436（强杀前，22:24 读数）

| 指标 | 值 |
|---|---|
| PID | 3436 |
| 启动时间 | 2026-11-12 18:30:35（第二十一次 BFF 进程） |
| CPU 累计 | 6223.92s |
| 18:30 初始 | 10.58s |
| 20:25 读数 | 1734.02s（第一小时间隔 +1723.44s ≈ 23.9%） |
| 22:24 读数 | 6223.92s（第二小时间隔 +4489.90s ≈ **62.4% 单核**） |
| 判定 | **加速爬升，破 50% 阈值，强杀** |

旧 BFF 五端点实测（强杀前）：/health 200、/ready 200、/api/v1/health 200、/api/v1/system/health 200、/metrics 200——业务正常，纯 CPU 自转问题。

### 新 BFF pid 23556（重启后，22:29 读数）

| 指标 | 值 |
|---|---|
| PID | 23556 |
| 启动时间 | 2026-11-12 22:29:15 |
| 初始 CPU | 9.81s |
| 监听端口 | 8080（::）、6499（127.0.0.1 CDP） |
| 日志 | `logs/bff-1112c-out.log` / `bff-1112c-err.log` |

新 BFF 五端点实测（重启后）：/health 200、/ready 200、/api/v1/health 200、/api/v1/system/health 200、/metrics 200。

### PG

| 组件 | PID | 端口 | 启动时间 | CPU 累计 | 状态 |
|---|---|---|---|---|---|
| PG（PostgreSQL 16.15） | 472 | 5433 | 2026-11-12 14:24:14 | 6.17s | listening，稳定（运行 8 小时） |

附属工作进程：pid 3680/17320/26228/26872/37844（14:24 启动），pid 18392（22:23:21）、25996（22:15:12）为新活跃连接，正常。

### vite

- 5173 未启动（历史死锁问题，四种启动方式均复现）。

## 5. 仓库卫生

- HEAD = `36aa140bdee52d1c611f604ac9df7a3e0635a660`（与 20:23 轮一致，无新提交）。
- 分支：`consult-agent-m86`。
- `git status --porcelain` 计数 148（与历史一致）。
- 本轮未跟踪源码归属：无新增源码改动。另一路 consult 任务产物不代提交、不删除。

## 6. 本轮处理项与分组 commit

- **P0 处理：BFF pid 3436 强杀重启为 pid 23556**（第二十二次 BFF 进程）。
  - 触发条件：第二小时间隔 CPU 增量 +4489.90s ≈ 62.4% 单核，破 50% 阈值。
  - 取证：双 tsc exit 0 / unit 181/0/512 / brand 9816/0/backlog13 / router 2872/0/2870/0，全绿。
  - 操作：`Stop-Process -Id 3436 -Force`，按模板 `Start-Process bun --inspect=127.0.0.1:6499 run src/bff/server.ts`（日志后缀 c）。
  - 验证：新 pid 23556 五端点全 200。
- 分组 commit：
  - docs：`reports/patrol/patrol-20261112-2223-mainline.md`（本轮简报，1 file changed）。

## 7. 双仓推送与三端 SHA 核对

- push gitcode：`git push gitcode consult-agent-m86:master`
- push mirror：`git push mirror consult-agent-m86:master`（GitHub over SSH 443）
- 推送后 `git ls-remote` 核对：
  - local HEAD = 待填
  - gitcode master = 待填
  - mirror master = 待填
- 不推 origin（HTTPS token 口径）与 heagentos；不打 tag。

## 8. 遗留风险与下一轮重点

1. **BFF CPU 自转根因仍未定位**：第二十二次进程（pid 23556）刚于 22:29:15 启动。历史轨迹显示进程在第二、第三小时间隔加速爬升（pid 3436 从 23.9% 跳到 62.4%，pid 34256 从 26.3% 跳到 66.4%）。下一轮（00:23）需读 CPU 增量判断是否重复。Bun 1.2.0 CDP 不支持 Profiler domain（`-32601`），运行时抓 profile 走不通；下一步可考虑改 BFF 代码加 `Bun.profiler` API 或用 Windows ETW 抓 bun.exe 系统级 profile。
2. **PG 稳定运行**：pid 472 自 14:24 启动以来 8 小时无异常，CPU 6.17s，正常。
3. **vite dev server 死锁**：5173 仍未启动。
4. **组织智能体旧说法未纠偏**：连续 42+ 轮未 `send_message` 给 `o_000Rfj7NkAk`。"wormLayeredStore 8/3 回归"已被证伪，但"brand-gate 全仓扫发现 web/dist 构建产物含真名"仍需在简报第 8 节明确口径差异。
5. **全量单测历史存量 fail**：P4-5 回放/取证包、P0-4/P0-5 路由自检、DDL 列对齐——历史存量，需另开时间窗复跑确认是否回归。

---

*本轮巡检时间：2026-11-12 22:24–22:35 CST。取证日志均落 `logs/patrol-2225-*.txt`，被 .gitignore 覆盖。*
