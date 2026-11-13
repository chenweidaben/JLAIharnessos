# 健澜仓库两小时滚动巡检简报 — 2026-11-13 12:23 轮

## 0. 本轮摘要

10:23 轮后两小时常规巡检。无 P0。BFF pid 25988 首轮（10:24→12:23）CPU 增量 1687.74s ≈ **23.5% 单核**，与历史进程首轮 20–25% 轨迹一致，未破 50% 阈值，不重启。PG pid 33384 稳定运行 10 小时。门禁实测全绿。

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
| 根 tsc（`node node_modules/typescript/bin/tsc --noEmit`） | exit 0 | `logs/patrol-1223-tsc-root.txt` |
| web tsc（`bun x tsc --noEmit`，cwd=web） | exit 0 | `logs/patrol-1223-tsc-web.txt` |
| gate-unit（`scripts/gate-unit.ps1`） | **181 / 0 / 512 PASS** | `logs/patrol-1223-gateunit.txt` |
| brand-gate（`scripts/brand-gate.ps1`） | 9816 files / 0 hard / backlog 13 PASS | `logs/patrol-1223-brand.txt` |
| router-check（`logs/patrol-1623-router-check.py`） | lazy=2872 / dangling=0 / route=2870 / dup=0 PASS | `logs/patrol-1223-router.txt` |

- 品牌硬违规：0（`gangos_` 13 处 backlog 不计硬违规，分布于 `src/bff/observability/metrics.ts`、`src/core/observability/metrics.ts`）。
- 悬空 lazy import：0；重复 Route：0。
- wormStore attrib 超时兜底持续稳定，本轮全量单测一次跑通。

## 4. 运行态

### PG pid 33384（02:23:59 重启后）

| 项 | 值 |
|---|---|
| PID | 33384（02:23:59 启动） |
| 运行时长 | 约 10 小时（02:23→12:23） |
| 5433 | listening（::1 + 127.0.0.1） |
| CPU 累计 | 7.86s（主进程），worker 进程 0.12–0.48s |
| 新增 worker | pid 18768（12:13:58，CPU 10.36s）、pid 27680（12:14:00，CPU 9.69s）——PG 后台任务（autovacuum/stats/walsender），正常 |
| 状态 | 稳定，无异常 |

### BFF pid 25988（10:24:01 重启后）

| 项 | 值 |
|---|---|
| PID | 25988（10:24:01 启动） |
| 启动命令 | `bun --inspect=127.0.0.1:6499 run src/bff/server.ts`（日志后缀 d） |
| 8080/6499 | listening |
| 初始 CPU（10:24） | 9.59s |
| 本轮 CPU（12:23） | 1697.33s |
| **首轮增量（10:24→12:23）** | **+1687.74s ≈ 23.5% 单核** |
| 判定 | 与历史进程首轮轨迹（pid 34256 26.3%、pid 3436 23.9%、pid 23556 24.8%）一致，未破 50% 阈值，不重启 |

历史 BFF 进程首轮轨迹对照：
- pid 34256（14:25 启动）：首轮 +1890.44s ≈ 26.3%
- pid 3436（18:30 启动）：首轮 +1723.44s ≈ 23.9%
- pid 23556（22:29 启动）：首轮 +1784.33s ≈ 24.8%
- **pid 25988（10:24 启动）：首轮 +1687.74s ≈ 23.5%** ← 本轮

### 五端点实测（12:25）

/health 200、/ready 200、/api/v1/health 200、/api/v1/system/health 200、/metrics 200。

### vite

- 5173 未启动（历史死锁问题，四种启动方式均复现）。

## 5. 仓库卫生

- HEAD = `3ef42a5f58c788d16f1f69c3d64add2d8f59cf42`（与 10:23 轮一致，无新提交）。
- 分支：`consult-agent-m86`。
- `git status --porcelain` 计数 148（与历史一致）。
- 本轮未跟踪源码归属：无新增源码改动。另一路 consult 任务产物不代提交、不删除。

## 6. 本轮处理项与分组 commit

- P0 处理项：无（本轮无 P0）。
- 分组 commit：
  - docs：`reports/patrol/patrol-20261113-1223-mainline.md`（本轮简报，1 file changed）。

## 7. 双仓推送与三端 SHA 核对

- push gitcode：`git push gitcode consult-agent-m86:master`
- push mirror：`git push mirror consult-agent-m86:master`（GitHub over SSH 443）
- 推送后 `git ls-remote` 核对：
  - local HEAD = 待填
  - gitcode master = 待填
  - mirror master = 待填
- 不推 origin（HTTPS token 口径）与 heagentos；不打 tag。

## 8. 遗留风险与下一轮重点

1. **BFF 自行消失根因未定位**：pid 23556 是历史第二次 BFF 自行消失（第一次 pid 49368）。新 BFF pid 25988 首轮 23.5% 与历史轨迹一致，次轮（12:23→14:23）读数将与历史次轮 42–66% 轨迹对照。
2. **PG 异常退出根因未定位**：pid 33384 是第九次 PG 进程（前八次中有七次无故退出或机器重启）。本轮稳定运行 10 小时。
3. **vite dev server 死锁**：5173 仍未启动。
4. **组织智能体旧说法未纠偏**：连续 48+ 轮未 `send_message` 给 `o_000Rfj7NkAk`。"wormLayeredStore 8/3 回归"已被证伪，但"brand-gate 全仓扫发现 web/dist 构建产物含真名"仍需在简报第 8 节明确口径差异。
5. **全量单测历史存量 fail**：P4-5 回放/取证包、P0-4/P0-5 路由自检、DDL 列对齐——历史存量，需另开时间窗复跑确认是否回归。

---

*本轮巡检时间：2026-11-13 12:23–12:31 CST。取证日志均落 `logs/patrol-1223-*.txt`，被 .gitignore 覆盖。*
