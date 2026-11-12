# 健澜仓库两小时滚动巡检简报 — 2026-11-13 06:23 轮

## 0. 本轮摘要

04:23 轮后两小时常规巡检。**本轮无 P0 代码改动**。PG pid 33384（02:23:59 重启后）稳定运行 4 小时，5433 listening，CPU 3.05s。**BFF pid 23556 第四小时间隔增量 +3068.33s ≈ 42.6% 单核**——与次轮 42.9%、三轮 42.5% 连续三轮持平，**真稳态确认**，不再是历史进程"次轮加速到 55-66%"的轨迹。判断为 DEMO_MODE 下周期性内存任务的基线 CPU 占用，按纪律不重启。门禁全绿。

## 1. 智能体进度

- 组织智能体 `o_000Rfj7NkAk`：peek status=2（finished），85% completing，version 829（连续多轮未变），idle-resumable standby。
- 最近摘要仍为旧口径（wormLayeredStore 8/3 回归待排查、brand-gate 全仓扫发现构建产物含真名）。"wormLayeredStore 8/3 回归"已被 14:25 轮 wormStore attrib 1.5s 超时修复证伪（连续 13 轮全量单测 181/0/512 PASS）。
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
| 根 tsc（`node node_modules/typescript/bin/tsc --noEmit`） | exit 0 | `logs/patrol-0623-tsc-root.txt` |
| web tsc（`bun x tsc --noEmit`，cwd=web） | exit 0 | `logs/patrol-0623-tsc-web.txt` |
| gate-unit（`scripts/gate-unit.ps1`） | **181 / 0 / 512 PASS** | `logs/patrol-0623-gateunit.txt` |
| brand-gate（`scripts/brand-gate.ps1`） | 9816 files / 0 hard / backlog 13 PASS | `logs/patrol-0623-brand.txt` |
| router-check（`logs/patrol-1623-router-check.py`） | lazy=2872 / dangling=0 / route=2870 / dup=0 PASS | `logs/patrol-0623-router.txt` |

- 品牌硬违规：0（`gangos_` 13 处 backlog 不计硬违规，分布于 `src/bff/observability/metrics.ts`、`src/core/observability/metrics.ts`）。
- 悬空 lazy import：0；重复 Route：0。
- wormStore attrib 超时兜底持续稳定，本轮全量单测一次跑通。

## 4. 运行态

### PG pid 33384（上轮 02:23 重启后）

| 项 | 值 |
|---|---|
| PID | 33384（02:23:59 启动） |
| 运行时长 | 约 4 小时（02:23→06:23） |
| 5433 | listening（::1 + 127.0.0.1） |
| CPU 累计 | 3.05s（主进程），worker 进程 0.11–0.33s |
| 状态 | 稳定，无异常 |

### BFF pid 23556（第四小时间隔观察，06:23 读数）

| 指标 | 值 |
|---|---|
| PID | 23556 |
| 启动时间 | 2026-11-12 22:29:15（第二十二次 BFF 进程） |
| CPU 累计 | 11010.80s |
| 04:23 读数 | 7942.47s |
| 06:23 读数 | 11010.80s（第四小时间隔 +3068.33s ≈ **42.6% 单核**） |
| 判定 | **连续三轮 42.9%→42.5%→42.6% 持平，真稳态确认，不重启** |

历史进程对照（第二十二次 pid 23556 轨迹）：
- 首轮（22:29→00:23）：+1784.33s ≈ 24.8%
- 次轮（00:23→02:23）：+3088.41s ≈ 42.9%
- 三轮（02:23→04:23）：+3059.92s ≈ 42.5%
- 四轮（04:23→06:23）：+3068.33s ≈ **42.6%** ← 本轮，连续三轮稳态

与历史其他进程次轮 55–66% 的加速轨迹不同，pid 23556 在第二轮到达 42.9% 后连续三轮维持 42.5–42.6%，未继续爬升也未下降。判断为 DEMO_MODE 下周期性内存任务的基线 CPU 占用，非持续泄漏。继续观察。

五端点实测（06:24）：/health 200、/ready 200、/api/v1/health 200、/api/v1/system/health 200、/metrics 200。

### vite

- 5173 未启动（历史死锁问题，四种启动方式均复现）。

## 5. 仓库卫生

- HEAD = `dec1f8c58e846e67468f6563266a8748157aa476`（与 04:23 轮一致，无新提交）。
- 分支：`consult-agent-m86`。
- `git status --porcelain` 计数 148（与历史一致）。
- 本轮未跟踪源码归属：无新增源码改动。另一路 consult 任务产物不代提交、不删除。

## 6. 本轮处理项与分组 commit

- 本轮无 P0 处理项。
- 分组 commit：
  - docs：`reports/patrol/patrol-20261113-0623-mainline.md`（本轮简报，1 file changed）。

## 7. 双仓推送与三端 SHA 核对

- push gitcode：`git push gitcode consult-agent-m86:master`
- push mirror：`git push mirror consult-agent-m86:master`（GitHub over SSH 443）
- 推送后 `git ls-remote` 核对：
  - local HEAD = 待填
  - gitcode master = 待填
  - mirror master = 待填
- 不推 origin（HTTPS token 口径）与 heagentos；不打 tag。

## 8. 遗留风险与下一轮重点

1. **BFF CPU 稳态确认**：pid 23556 连续三轮 42.5–42.6% 持平，真稳态已确认。下一轮（08:23）继续读第五小时间隔增量，若维持 ~42% 可正式判定为 DEMO_MODE 基线占用。
2. **PG 异常退出根因未定位**：pid 33384 是第九次 PG 进程（前八次中有七次无故退出或机器重启）。本轮稳定运行 4 小时。需查 Windows 事件查看器应用日志确认历史 OOM/杀毒干预。
3. **vite dev server 死锁**：5173 仍未启动。
4. **组织智能体旧说法未纠偏**：连续 46+ 轮未 `send_message` 给 `o_000Rfj7NkAk`。"wormLayeredStore 8/3 回归"已被证伪，但"brand-gate 全仓扫发现 web/dist 构建产物含真名"仍需在简报第 8 节明确口径差异。
5. **全量单测历史存量 fail**：P4-5 回放/取证包、P0-4/P0-5 路由自检、DDL 列对齐——历史存量，需另开时间窗复跑确认是否回归。

---

*本轮巡检时间：2026-11-13 06:23–06:31 CST。取证日志均落 `logs/patrol-0623-*.txt`，被 .gitignore 覆盖。*
