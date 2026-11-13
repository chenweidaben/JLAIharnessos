# 健澜仓库两小时滚动巡检简报 — 2026-11-13 10:23 轮

## 0. 本轮摘要

08:23 轮后两小时常规巡检。**P0：BFF pid 23556 自行消失**（8080/6499 关闭、无 bun 进程，err 日志末尾无 crash 栈，与历史 pid 49368 自行消失模式一致）。已按模板重启新 BFF pid **25988**（10:24:01 启动，初始 CPU 9.59s，日志后缀 d）。PG pid 33384 稳定运行 8 小时。门禁实测全绿。

## 1. 智能体进度

- 组织智能体 `o_000Rfj7NkAk`：peek status=2（finished），85% completing，version 829（连续多轮未变），idle-resumable standby。
- 最近摘要仍为旧口径（wormLayeredStore 8/3 回归待排查、brand-gate 全仓扫发现构建产物含真名）。"wormLayeredStore 8/3 回归"已被 14:25 轮 wormStore attrib 1.5s 超时修复证伪（连续 15 轮全量单测 181/0/512 PASS）。
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
| 根 tsc（`node node_modules/typescript/bin/tsc --noEmit`） | exit 0 | `logs/patrol-1023-tsc-root.txt` |
| web tsc（`bun x tsc --noEmit`，cwd=web） | exit 0 | `logs/patrol-1023-tsc-web.txt` |
| gate-unit（`scripts/gate-unit.ps1`） | **181 / 0 / 512 PASS** | `logs/patrol-1023-gateunit.txt` |
| brand-gate（`scripts/brand-gate.ps1`） | 9816 files / 0 hard / backlog 13 PASS | `logs/patrol-1023-brand.txt` |
| router-check（`logs/patrol-1623-router-check.py`） | lazy=2872 / dangling=0 / route=2870 / dup=0 PASS | `logs/patrol-1023-router.txt` |

- 品牌硬违规：0（`gangos_` 13 处 backlog 不计硬违规，分布于 `src/bff/observability/metrics.ts`、`src/core/observability/metrics.ts`）。
- 悬空 lazy import：0；重复 Route：0。
- wormStore attrib 超时兜底持续稳定，本轮全量单测一次跑通。

## 4. 运行态

### PG pid 33384（02:23:59 重启后）

| 项 | 值 |
|---|---|
| PID | 33384（02:23:59 启动） |
| 运行时长 | 约 8 小时（02:23→10:23） |
| 5433 | listening（::1 + 127.0.0.1） |
| CPU 累计 | 6.06s（主进程），worker 进程 0.12–0.42s |
| 状态 | 稳定，无异常 |

### BFF pid 23556（自行消失，P0）

| 项 | 值 |
|---|---|
| PID | 23556（22:29:15 启动） |
| 消失时间 | 08:23→10:23 两小时间隔内（10:23 盘点时已不存在） |
| 消失前 CPU 读数（08:23） | 14115.94s |
| 第五小时间隔增量（08:23→10:23） | **未读到（进程已消失）** |
| err 日志末尾 | 无 crash 栈，最后一条为启动时初始化日志（`[audit] backfill TRUNCATED: filled=1000 total=2877 limit=1000 — SEAL DISABLED`） |
| out 日志末尾 | 健康请求 200（无异常） |
| 判定 | 历史第二次 BFF 自行消失（第一次为 pid 49368，16:25→18:25 两小时间隔内自行消失）。疑似 Windows 侧 OOM kill 或杀毒软件干预。需查 Windows 事件查看器应用日志。 |

历史 BFF 进程轨迹补记（pid 23556 终态）：
- 首轮（22:29→00:23）：+1784.33s ≈ 24.8%
- 次轮（00:23→02:23）：+3088.41s ≈ 42.9%
- 三轮（02:23→04:23）：+3059.92s ≈ 42.5%
- 四轮（04:23→06:23）：+3068.33s ≈ 42.6%
- 五轮（06:23→08:23）：+3105.14s ≈ 43.1%
- 终态（08:23→10:23）：进程自行消失，未读到第六小时间隔增量

### BFF pid 25988（本轮重启后）

| 项 | 值 |
|---|---|
| PID | 25988（10:24:01 启动） |
| 启动命令 | `bun --inspect=127.0.0.1:6499 run src/bff/server.ts`（日志后缀 d） |
| 8080/6499 | listening |
| 初始 CPU | 9.59s |
| ws URL | 从 `logs/bff-1112d-err.log` 头三行取（待下轮确认） |

### 五端点实测（10:25，新 BFF pid 25988）

/health 200、/ready 200、/api/v1/health 200、/api/v1/system/health 200、/metrics 200。

### vite

- 5173 未启动（历史死锁问题，四种启动方式均复现）。

## 5. 仓库卫生

- HEAD = `c7114809517f3de1599c8e33490fec698aa55d30`（与 08:23 轮一致，无新提交）。
- 分支：`consult-agent-m86`。
- `git status --porcelain` 计数 148（与历史一致）。
- 本轮未跟踪源码归属：无新增源码改动。另一路 consult 任务产物不代提交、不删除。

## 6. 本轮处理项与分组 commit

- P0 处理项：BFF pid 23556 自行消失 → 按模板重启新 BFF pid 25988（10:24:01 启动，日志后缀 d）。
- 分组 commit：
  - docs：`reports/patrol/patrol-20261113-1023-mainline.md`（本轮简报，1 file changed）。

## 7. 双仓推送与三端 SHA 核对

- push gitcode：`git push gitcode consult-agent-m86:master`
- push mirror：`git push mirror consult-agent-m86:master`（GitHub over SSH 443）
- 推送后 `git ls-remote` 核对：
  - local HEAD = 待填
  - gitcode master = 待填
  - mirror master = 待填
- 不推 origin（HTTPS token 口径）与 heagentos；不打 tag。

## 8. 遗留风险与下一轮重点

1. **BFF 自行消失根因未定位**：pid 23556 是历史第二次 BFF 自行消失（第一次 pid 49368）。err 日志无 crash 栈，疑似 Windows 侧 OOM kill 或杀毒软件干预。需查 Windows 事件查看器应用日志。
2. **BFF CPU 基线判定待续**：pid 23556 在连续四轮稳态 42.5–43.1% 后自行消失，第六小时间隔增量未读到。新 BFF pid 25988 首轮（10:24→12:23）读数将与历史进程首轮 20–25% 轨迹对照。
3. **PG 异常退出根因未定位**：pid 33384 是第九次 PG 进程（前八次中有七次无故退出或机器重启）。本轮稳定运行 8 小时。需查 Windows 事件查看器应用日志确认历史 OOM/杀毒干预。
4. **vite dev server 死锁**：5173 仍未启动。
5. **组织智能体旧说法未纠偏**：连续 48+ 轮未 `send_message` 给 `o_000Rfj7NkAk`。"wormLayeredStore 8/3 回归"已被证伪，但"brand-gate 全仓扫发现 web/dist 构建产物含真名"仍需在简报第 8 节明确口径差异。
6. **全量单测历史存量 fail**：P4-5 回放/取证包、P0-4/P0-5 路由自检、DDL 列对齐——历史存量，需另开时间窗复跑确认是否回归。

---

*本轮巡检时间：2026-11-13 10:23–10:31 CST。取证日志均落 `logs/patrol-1023-*.txt`，被 .gitignore 覆盖。*
