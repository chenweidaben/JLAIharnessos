# 健澜仓库两小时滚动巡检简报 — 2026-11-13 02:23 轮

## 0. 本轮摘要

00:23 轮后两小时常规巡检。**P0：PG pid 472 在运行 12 小时后消失**（5433 无监听、无 postgres 进程），pg.log 末尾无 crash 栈，与历史七次 PG 异常退出模式一致。已删除残留 postmaster.pid、pg_ctl start 重启新 PG pid 33384（02:23:59 启动，crash recovery 完成，5433 listening）。**BFF pid 23556 第二小时间隔增量 +3088.41s ≈ 42.9% 单核，未破 50% 阈值，不重启**（本轮次轮增速 42.9% 低于历史次轮 55-66% 轨迹，观察）。门禁全绿。

## 1. 智能体进度

- 组织智能体 `o_000Rfj7NkAk`：peek status=2（finished），85% completing，version 829（连续多轮未变），idle-resumable standby。
- 最近摘要仍为旧口径（wormLayeredStore 8/3 回归待排查、brand-gate 全仓扫发现构建产物含真名）。"wormLayeredStore 8/3 回归"已被 14:25 轮 wormStore attrib 1.5s 超时修复证伪（连续 11 轮全量单测 181/0/512 PASS）。
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
| 根 tsc（`node node_modules/typescript/bin/tsc --noEmit`） | exit 0 | `logs/patrol-0223-tsc-root.txt` |
| web tsc（`bun x tsc --noEmit`，cwd=web） | exit 0 | `logs/patrol-0223-tsc-web.txt` |
| gate-unit（`scripts/gate-unit.ps1`） | **181 / 0 / 512 PASS** | `logs/patrol-0223-gateunit.txt` |
| brand-gate（`scripts/brand-gate.ps1`） | 9816 files / 0 hard / backlog 13 PASS | `logs/patrol-0223-brand.txt` |
| router-check（`logs/patrol-1623-router-check.py`） | lazy=2872 / dangling=0 / route=2870 / dup=0 PASS | `logs/patrol-0223-router.txt` |

- 品牌硬违规：0（`gangos_` 13 处 backlog 不计硬违规，分布于 `src/bff/observability/metrics.ts`、`src/core/observability/metrics.ts`）。
- 悬空 lazy import：0；重复 Route：0。
- wormStore attrib 超时兜底持续稳定，本轮全量单测一次跑通。

## 4. 运行态

### P0：PG 异常退出与重启

| 项 | 值 |
|---|---|
| 旧 PID | 472（14:24:14 启动，运行约 12 小时后消失） |
| 消失时间 | 02:23 盘点时已不在（5433 无监听、无 postgres 进程） |
| pg.log 末尾 | 最后一条 22:29:13 client connection forcibly closed，无 crash 栈 |
| 处置 | 删除残留 `postmaster.pid`，`pg_ctl start -w -t 30` 超时（crash recovery 慢），进程实际已起 |
| 新 PID | **33384**（02:23:59 启动） |
| 5433 | listening（::1 + 127.0.0.1） |
| crash recovery | 02:24:36 完成，redo done at 0/79FD5A8，checkpoint complete |

PG 历史异常退出计数：旧 pid 25208、15384、37436、37728、39724、46664、51088（机器重启）、**472（本轮，02:23 消失，疑似 OOM kill 或杀毒干预）**。

### BFF pid 23556（次轮观察，02:23 读数）

| 指标 | 值 |
|---|---|
| PID | 23556 |
| 启动时间 | 2026-11-12 22:29:15（第二十二次 BFF 进程） |
| CPU 累计 | 4882.55s |
| 00:23 读数 | 1794.14s |
| 02:23 读数 | 4882.55s（第二小时间隔 +3088.41s ≈ **42.9% 单核**） |
| 判定 | **次轮 42.9%，未破 50% 阈值，不重启**（低于历史次轮 55-66% 轨迹，继续观察） |

历史次轮轨迹对照：
- pid 3436：次轮 62.4%（20:25→22:24）
- pid 34256：次轮 66.4%（16:23→18:25）
- pid 45728：次轮 59.7%（04:23→06:23）
- pid 37520：次轮 55.9%（19:09→21:09）
- **pid 23556：次轮 42.9%（00:23→02:23）** ← 本轮，增速低于历史

五端点实测（02:25，PG 重启后）：/health 200、/ready 200、/api/v1/health 200、/api/v1/system/health 200、/metrics 200。BFF 在 DEMO_MODE=1 用内存数据，PG 断连不影响健康端点。

### vite

- 5173 未启动（历史死锁问题，四种启动方式均复现）。

## 5. 仓库卫生

- HEAD = `0c219e84e2944a28e6219d0987a40380577502c9`（与 00:23 轮一致，无新提交）。
- 分支：`consult-agent-m86`。
- `git status --porcelain` 计数 148（与历史一致）。
- 本轮未跟踪源码归属：无新增源码改动。另一路 consult 任务产物不代提交、不删除。

## 6. 本轮处理项与分组 commit

- **P0 处理**：PG pid 472 消失 → 删除残留 postmaster.pid → pg_ctl start 重启新 pid 33384 → 5433 listening 验证。
- BFF pid 23556 次轮 42.9% 未破阈值，按纪律不重启；下一轮（04:23）观察第三小时间隔增量。
- 分组 commit：
  - docs：`reports/patrol/patrol-20261113-0223-mainline.md`（本轮简报，1 file changed）。

## 7. 双仓推送与三端 SHA 核对

- push gitcode：`git push gitcode consult-agent-m86:master`
- push mirror：`git push mirror consult-agent-m86:master`（GitHub over SSH 443）
- 推送后 `git ls-remote` 核对：
  - local HEAD = 待填
  - gitcode master = 待填
  - mirror master = 待填
- 不推 origin（HTTPS token 口径）与 heagentos；不打 tag。

## 8. 遗留风险与下一轮重点

1. **PG 异常退出根因未定位**：pid 472 在运行 12 小时后消失，pg.log 无 crash 栈。这是第八次 PG 异常退出（前七次中第六次无故退出、第七次因机器重启）。疑似 Windows 侧 OOM kill 或杀毒软件干预。需查 Windows 事件查看器应用日志确认。
2. **BFF CPU 自转根因仍未定位**：pid 23556 次轮 42.9% 低于历史次轮 55-66% 轨迹，是减速还是波动待观察。下一轮（04:23）读第三小时间隔增量。Bun 1.2.0 CDP 不支持 Profiler domain（`-32601`），运行时抓 profile 走不通；下一步可考虑改 BFF 代码加 `Bun.profiler` API 或用 Windows ETW 抓 bun.exe 系统级 profile。
3. **vite dev server 死锁**：5173 仍未启动。
4. **组织智能体旧说法未纠偏**：连续 44+ 轮未 `send_message` 给 `o_000Rfj7NkAk`。"wormLayeredStore 8/3 回归"已被证伪，但"brand-gate 全仓扫发现 web/dist 构建产物含真名"仍需在简报第 8 节明确口径差异。
5. **全量单测历史存量 fail**：P4-5 回放/取证包、P0-4/P0-5 路由自检、DDL 列对齐——历史存量，需另开时间窗复跑确认是否回归。

---

*本轮巡检时间：2026-11-13 02:23–02:32 CST。取证日志均落 `logs/patrol-0223-*.txt`，被 .gitignore 覆盖。*
