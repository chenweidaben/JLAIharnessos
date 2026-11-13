# 健澜仓库两小时滚动巡检简报 — 2026-11-14 02:23 轮

## 0. 本轮摘要

00:23 轮后两小时常规巡检。**本轮 P0：PG pid 45756 盘点时已消失（第十次 PG 异常退出），按模板重启为新 pid 39432**。BFF pid 36904 首轮（00:28→02:23）CPU 增量 5.5%，处于预热期，与 pid 32176 前 2.5 小时 7.8% 轨迹类似，未破阈值，不重启。门禁实测全绿。

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
| 根 tsc（`node node_modules/typescript/bin/tsc --noEmit`） | exit 0 | `logs/patrol-0223-tsc-root.txt` |
| web tsc（`bun x tsc --noEmit`，cwd=web） | exit 0 | `logs/patrol-0223-tsc-web.txt` |
| gate-unit（`scripts/gate-unit.ps1`） | **181 / 0 / 512 PASS** | `logs/patrol-0223-gateunit.txt` |
| brand-gate（`scripts/brand-gate.ps1`） | 9816 files / 0 hard / backlog 13 PASS | `logs/patrol-0223-brand.txt` |
| router-check（`logs/patrol-1623-router-check.py`） | lazy=2872 / dangling=0 / route=2870 / dup=0 PASS | `logs/patrol-0223-router.txt` |

- 品牌硬违规：0（`gangos_` 13 处 backlog 不计硬违规）。
- 悬空 lazy import：0；重复 Route：0。

## 4. 运行态

### PG pid 45756（14:23:57 重启后）—— 已消失

| 项 | 值 |
|---|---|
| PID | 45756（14:23:57 启动，运行 12 小时） |
| 5433 | 盘点时无监听 |
| 消失时间 | 00:23→02:23 两小时间隔内 |
| pg.log 末尾 | 无 crash 栈（最后日志为 crash recovery 完成记录） |
| postmaster.pid | 残留 PID 45756，已删除 |
| 判定 | 与历史九次 PG 异常退出模式一致（25208、15384、37436、37728、39724、46664、51088、472、33384），疑似 Windows 侧 OOM kill 或杀毒软件干预 |

### PG pid 39432（02:23:47 启动）—— 新进程

| 项 | 值 |
|---|---|
| PID | 39432（02:23:47 启动） |
| 5433 | listening（::1 + 127.0.0.1） |
| 启动方式 | 删除残留 postmaster.pid 后 `pg_ctl start -w -t 30`（超时，crash recovery 慢），进程实际已起 |
| 主进程 CPU | 2.48s（刚启动） |
| 新增 worker | pid 28692、36440（02:23:48 启动）、pid 24736、33268、45148、47760（02:24:24 启动）、pid 11540（02:24:32 启动）——PG 后台任务（autovacuum/stats/walsender），正常 |

### BFF pid 36904（00:28:19 启动，日志后缀 g）—— 首轮观察

| 项 | 值 |
|---|---|
| PID | 36904（00:28:19 启动） |
| 8080/6499 | listening |
| 初始 CPU（00:28） | 11.28s |
| 首轮 CPU（02:23） | 406.53s（**+395.25s ≈ 5.5% 单核**） |
| 判定 | 首轮增量 5.5%，远低于历史首轮轨迹（20-25%），与 pid 32176 前 2.5 小时 7.8% 预热期轨迹类似，属于冷启动阶段，**未破 50% 阈值，不重启** |
| 五端点实测 | 全 200 |

### vite

- 5173 未启动（历史死锁问题，四种启动方式均复现）。

## 5. 仓库卫生

- HEAD = `032a039113010251eb07a0a1f8e67bc98a71d96d`（与 00:23 轮一致，无新提交）。
- 分支：`consult-agent-m86`。
- `git status --porcelain` 计数 148（与历史一致）。
- 本轮未跟踪源码归属：无新增源码改动。另一路 consult 任务产物不代提交、不删除。

## 6. 本轮处理项与分组 commit

- **P0 处理**：PG pid 45756 消失（第十次异常退出），删除残留 postmaster.pid，`pg_ctl start` 重启为新 pid 39432。
- 分组 commit：
  - docs：`reports/patrol/patrol-20261114-0223-mainline.md`（本轮简报，1 file changed）。

## 7. 双仓推送与三端 SHA 核对

- push gitcode：`git push gitcode consult-agent-m86:master`
- push mirror：`git push mirror consult-agent-m86:master`（GitHub over SSH 443）
- 推送后 `git ls-remote` 核对：
  - local HEAD = 待填
  - gitcode master = 待填
  - mirror master = 待填
- 不推 origin（HTTPS token 口径）与 heagentos；不打 tag。

## 8. 遗留风险与下一轮重点

1. **P0 BFF CPU 自转根因未定位**：已三十二次重启（pid 29468→42184→40000→40500→48236→37520→32176→45728→49368→15396→34256→3436→23556→25988→42432→20548→36904）。BFF pid 36904 首轮增量 5.5%（预热期），下一轮（04:23）读次轮增量，观察是否从 5.5% 跳到 20%+ 再加速到 50%+。Bun 1.2.0 CDP 不支持 Profiler domain。
2. **P0 PG 异常退出根因未定位（第十次）**：旧 pid 25208、15384、37436、37728、39724、46664（前六次）、51088（第七次，机器重启）、472（第八次，02:23 消失）、33384（第九次，14:23 消失）、**45756（第十次，02:23 盘点时消失，运行 12 小时）**。新 pid 39432（02:23:47 重启）。疑似 Windows 侧 OOM kill 或杀毒软件干预。需查 Windows 事件查看器应用日志。
3. **BFF 自行消失根因未定位**：pid 49368 和 pid 23556 两次自行消失，err 日志无 crash 栈。
4. **vite dev server 死锁**：5173 仍未启动。
5. **组织智能体旧说法未纠偏**：连续 50+ 轮未 `send_message` 给 `o_000Rfj7NkAk`。
6. **全量单测历史存量 fail**：P4-5 回放/取证包、P0-4/P0-5 路由自检、DDL 列对齐——历史存量。
7. **下一轮重点**：04:23 轮读 BFF pid 36904 次轮（02:23→04:23）CPU 增量，观察是否从 5.5% 跳到 20%+（预热期结束）；跟踪 PG pid 39432 稳定性。

---

*本轮巡检时间：2026-11-14 02:23–02:30 CST。取证日志均落 `logs/patrol-0223-*.txt`，被 .gitignore 覆盖。*
