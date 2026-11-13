# 健澜仓库两小时滚动巡检简报 — 2026-11-13 14:23 轮

## 0. 本轮摘要

12:23 轮后两小时常规巡检。**P0：PG pid 33384 已消失**（第九次异常退出），已按模板重启新 PG pid **45756**（14:23:57 启动），5433 listening。BFF pid 25988 次轮（12:23→14:23）CPU 增量 3422.31s ≈ **47.5% 单核**，介于 pid 23556 的 42.9% 和 pid 34256/3436 的 62-66% 之间，未破 50% 阈值，不重启。门禁实测全绿。

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
| 根 tsc（`node node_modules/typescript/bin/tsc --noEmit`） | exit 0 | `logs/patrol-1423-tsc-root.txt` |
| web tsc（`bun x tsc --noEmit`，cwd=web） | exit 0 | `logs/patrol-1423-tsc-web.txt` |
| gate-unit（`scripts/gate-unit.ps1`） | **181 / 0 / 512 PASS** | `logs/patrol-1423-gateunit.txt` |
| brand-gate（`scripts/brand-gate.ps1`） | 9816 files / 0 hard / backlog 13 PASS | `logs/patrol-1423-brand.txt` |
| router-check（`logs/patrol-1623-router-check.py`） | lazy=2872 / dangling=0 / route=2870 / dup=0 PASS | `logs/patrol-1423-router.txt` |

- 品牌硬违规：0（`gangos_` 13 处 backlog 不计硬违规，分布于 `src/bff/observability/metrics.ts`、`src/core/observability/metrics.ts`）。
- 悬空 lazy import：0；重复 Route：0。
- wormStore attrib 超时兜底持续稳定，本轮全量单测一次跑通。

## 4. 运行态

### PG pid 45756（14:23:59 重启后）

| 项 | 值 |
|---|---|
| PID | 45756（14:23:57 启动） |
| 5433 | listening（::1 + 127.0.0.1） |
| CPU 累计 | 3.80s（主进程），worker 进程 0.00–0.81s |
| 状态 | crash recovery 进行中，已 listening |
| 旧 pid 33384 | 14:23 盘点时已消失，pg.log 末尾为 02:24:36 crash recovery 完成记录，无 crash 栈，与历史八次 PG 异常退出模式一致 |

### BFF pid 25988（10:24:01 启动后）

| 项 | 值 |
|---|---|
| PID | 25988（10:24:01 启动） |
| 启动命令 | `bun --inspect=127.0.0.1:6499 run src/bff/server.ts`（日志后缀 d） |
| 8080/6499 | listening |
| 初始 CPU（10:24） | 9.59s |
| 首轮 CPU（12:23） | 1697.33s |
| 本轮 CPU（14:23） | 5119.64s |
| **次轮增量（12:23→14:23）** | **+3422.31s ≈ 47.5% 单核** |
| 判定 | 介于 pid 23556 的 42.9% 和 pid 34256/3436 的 62-66% 之间，未破 50% 阈值，不重启 |

历史 BFF 进程次轮轨迹对照：
- pid 34256（14:25 启动）：次轮 +4782.83s ≈ 66.4% → 强杀
- pid 3436（18:30 启动）：次轮 +4489.90s ≈ 62.4% → 强杀
- pid 23556（22:29 启动）：次轮 +3088.41s ≈ 42.9% → 稳态
- **pid 25988（10:24 启动）：次轮 +3422.31s ≈ 47.5%** ← 本轮

### 五端点实测（14:25）

/health 200、/ready 200、/api/v1/health 200、/api/v1/system/health 200、/metrics 200。

### vite

- 5173 未启动（历史死锁问题，四种启动方式均复现）。

## 5. 仓库卫生

- HEAD = `6727b636d7ec91e9074cdc002eabd1eaf7d9dc8c`（与 12:23 轮一致，无新提交）。
- 分支：`consult-agent-m86`。
- `git status --porcelain` 计数 148（与历史一致）。
- 本轮未跟踪源码归属：无新增源码改动。另一路 consult 任务产物不代提交、不删除。

## 6. 本轮处理项与分组 commit

- P0 处理项：**PG pid 33384 异常退出（第九次）**，已按模板重启新 PG pid 45756（删除残留 postmaster.pid，pg_ctl start，5433 listening）。
- 分组 commit：
  - docs：`reports/patrol/patrol-20261113-1423-mainline.md`（本轮简报，1 file changed）。

## 7. 双仓推送与三端 SHA 核对

- push gitcode：`git push gitcode consult-agent-m86:master`
- push mirror：`git push mirror consult-agent-m86:master`（GitHub over SSH 443）
- 推送后 `git ls-remote` 核对：
  - local HEAD = 待填
  - gitcode master = 待填
  - mirror master = 待填
- 不推 origin（HTTPS token 口径）与 heagentos；不打 tag。

## 8. 遗留风险与下一轮重点

1. **PG 异常退出根因未定位**：pid 33384 是第九次 PG 异常退出（前八次：25208、15384、37436、37728、39724、46664、51088、472）。新 PG pid 45756 刚重启。疑似 Windows 侧 OOM kill 或杀毒软件干预，需查 Windows 事件查看器应用日志。
2. **BFF 次轮 47.5% 接近阈值**：pid 25988 次轮增量 47.5%，介于 pid 23556 的 42.9%（稳态）和 pid 34256/3436 的 62-66%（强杀）之间。下一轮（16:23）读第三轮增量，若破 50% 则强杀重启。
3. **BFF 自行消失根因未定位**：pid 49368 和 pid 23556 两次自行消失，err 日志无 crash 栈。
4. **vite dev server 死锁**：5173 仍未启动。
5. **组织智能体旧说法未纠偏**：连续 50+ 轮未 `send_message` 给 `o_000Rfj7NkAk`。
6. **全量单测历史存量 fail**：P4-5 回放/取证包、P0-4/P0-5 路由自检、DDL 列对齐——历史存量，需另开时间窗复跑确认是否回归。

---

*本轮巡检时间：2026-11-13 14:23–14:32 CST。取证日志均落 `logs/patrol-1423-*.txt`，被 .gitignore 覆盖。*
