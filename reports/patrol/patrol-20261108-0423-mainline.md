# 巡检简报 · 2026-11-08 04:23 轮（主线）

- **轮次**：2026-11-08 04:23（两小时滚动巡检）
- **仓库**：`C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1`，分支 `consult-agent-m86`
- **轮次基线**：`16ab75b6`（02:23 轮收口值）
- **本轮有一处实修**：`web/dist` 陈旧构建产物中残留 3 个厂商真名，已重建清空

## 1. 组织智能体进度

- `o_000Rfj7NkAk`：`version` **818 → 821**，round 12819–12822，`reason=flush`，`updated_at_unix=1794076355`（约 02:32），90% completing。
- 本窗口自报：14 文件双口径闭合验证完成；P5-31 survey 与简报完成；40 词表重扫进行中；brand-gate 全仓扫发现"`web/dist` 构建产物含 3 个真名、`reports/slices` 有 backlog 命中"，并要求在 P5-31 简报第 8 节写清口径差异。
- 它仍挂着 `wormLayeredStore 8/3` 待排查、仍把 `worm-s3-fallback` 首次 0/0/0 记成"加载异常"。**这两条 02:23 轮已定性**（见第 4 节），但本窗口 flush 早于我发出的纠偏消息，尚未消化。

## 2. 代码健康门禁（全绿）

| 项 | 结果 |
|---|---|
| node / bun / npm / pwsh | v22.23.2 / 1.2.0 / 10.9.8 / 7.6.4 |
| root tsc | exit 0（34s，0 字节） |
| web tsc | exit 0（71s，0 字节） |
| 单测 | 181 / 0 / 512（12s） |
| E2E | 23 / 0 / 83（14s） |
| brand-gate（src,web/src） | 9816 文件 / 0 硬违规（code=0 doc=0）/ backlog 13（11s） |
| brand-gate（docs） | 294 文件 / 0 硬违规 / backlog 14 |
| gate-all | `OVERALL: PASS`，exit 0，总耗时 144s |
| 路由 | lazy 2872 / 悬空 0 / route 2870 / 重复 0 |

## 3. 本轮处理项：陈旧构建产物中的厂商真名（实修）

组织侧提的"`web/dist` 含真名"经实测成立，但它不是源码问题：

- `web/dist` 共 **2900 文件**，**0 文件被 git 跟踪**，由 `web/.gitignore:7` 忽略；全部 mtime 停在 **2026-10-26 08:48**，比源码脱敏提交 `cde84098`（11-07 16:30）早 12 天。
- 用 40 词表扫该目录：命中 **1 个 bundle**（`assets/systemStore-*.js`）里的 **3 个厂商真名、4 处**（其中 1 个出现 2 次）。
- 同一词表回扫当前源码：`web/src` **0**、`src` **0**、`web/public` **0**。也就是说源码侧确实是干净的，泄漏只存在于**脱敏前构建出来的旧产物**。

处置：在 `web` 目录 `bun x vite build` 重建（exit 0，67s，`logs\patrol-0423-vite-build.txt`），产物 2920 文件、mtime 04:31；同名目录再扫 **0 命中**（`logs\patrol-0423-brand-dist-after.txt`）。构建产物不入库，故本轮提交只需带简报。

**这条的价值在口径，不在修法**：只要"源码 0 违规"就够了是不够的——`dist` 是要发出去的东西，一份 12 天前的旧构建能把已经清掉的真名原样带出门。凡是"清理完成"的结论，都要连带问一句**派生产物重建了没有**。

## 4. 承前：两条"待排查"的定性（02:23 轮结论，本窗口复核仍成立）

1. `wormLayeredStore` 报告的 **8/3** 是日志正文误读：`simulated s3 failure` 里的 `3 fail` 被 `(\d+)\s+fail` 吃中。单跑实测 **8 pass / 0 fail / 25 expect**，两轮同值。
2. `worm-s3-fallback` 首次 0/0/0 不是"加载异常"，是**路径写错**（真实位置 `tests/integration/`）叠加 `bun test` 不带 `./` 前缀被当成文件名过滤器。正确路径 8/0/20，13 文件 Σ=173/0/492 加它正好 181/0/512——所以"173 + 8 = 181"这个算术本身没错，错的是把"0/0/0"当成了环境异常。

## 5. 品牌口径：把"0 违规"到底覆盖了什么算清楚

本轮改按 **git 跟踪文件**做一次全量定量（`logs\patrol-0423-brand-tracked.txt`）：28053 个跟踪文本文件，命中 **38 文件 / 213 处**。

| 目录 | 文件 | 处数 | 其中指标前缀族 |
|---|---|---|---|
| `reports/` | 25 | 185 | 82 |
| `pgsql/` | 7 | 20 | 0 |
| `docs/` | 4 | 6 | 6 |
| 根目录（CHANGELOG） | 1 | 1 | 1 |
| `web/` | 1 | 1 | 1 |

两个结论可以直接拿出来支撑待拍板项：

- **非前缀族命中 123 处，100% 落在 `reports/`（103）与 `pgsql/`（20）**，`src`、`web/src`、`docs`、`deploy`、`scripts` 一处都没有。也就是说"reports 豁免"这个悬了多轮的口子，量就是 103 处 / 25 文件，不是此前转述的 894 处。
- `pgsql/` 那 20 处逐条看过，**全部在 `pgsql/pgAdmin 4/python/Lib/site-packages/` 下的第三方文件**（Google API 的 discovery JSON、pygments lexer、win32 头文件），是词表里两条正则与三个短拉丁词打出来的误报。这跟"`pgsql/` 2220 个第三方文件该不该留仓"是同一件事——留仓它就永远在扫，不留仓这 20 处直接消失。

## 6. 运行态

| 端口 | 归属 |
|---|---|
| 3000 / 5174 / 8081 / 9090 | 无监听 |
| 5173 | pid 51604 node，06:02:17（外部沙箱 vite） |
| 8080 | pid 46600 bun，06:52:46（BFF） |
| 8000 | pid 36640 python，06:02:18 |
| 5433 | pid 240 postgres，08:26:54 |

- 六端点最终全 200：`/health` 2B（4s）、`/ready` 235B、`/api/v1/health` 166B、`/api/v1/system/health` 145B、`/metrics` 4400B、`5173/` 714B。
- `/ready`：`status=ok`、`auditStore=pg`、`dbReachable=true`、`sealDisabled=true`（`audit-backfill-truncated`）、`uptimeSec=77812`。六窗口 uptime 连续 41825 → 48884 → 56094 → 63213 → 70430 → **77812**，同 pid 46600 未重启。
- **但本轮首探出现一次 4/6 端点 8s 超时**：`/health`、`/ready`、`/api/v1/system/health`、`/metrics` 全超时，只有 `/api/v1/health` 200；把超时放宽到 20–25s 后逐个恢复 200，`/health` 仍要 4s。这次没有门禁在跑（gate 144s 前已结束），系统侧 `bun` 进程累计 CPU 已 76883s。**属第二次复现的偶发全阻塞，仍未定位**，与 18:23 那次（门禁并发期间）成因是否同源无法判定。

## 7. 提交与推送

- 单笔提交：本轮巡检简报。双推 `gitcode` + `mirror`，`ls-remote` 四 ref 逐位核对与本地 HEAD 全等；不推 `origin`、`heagentos`，不打 tag。

## 8. 仓库卫生

- 根目录 `*.txt` 1361、`*.log` 762（与前轮同值）；`logs/` **5309** 文件（+15，gitignored）。
- 脏项 **147**（`docs/_m2xx*`、`docs/api/tools/*` 为另一路 consult 在制品，未代提交、未删除）。
- 未跟踪 **40**：`reports/patrol/` 39 篇 + `pgdata/pg_stat/`。`pgdata/` 仍被跟踪 2220。
- 顺带查到一条此前没记的规则：`.gitignore:148` 忽略 `reports/patrol/patrol-????????-????.md`——组织侧按 `patrol-20261108-0207.md` 这种"日期+时刻"命名的轮次简报**被设计性忽略、本就不入库**；主线简报因带 `-mainline` 后缀不在该模式下，才能正常提交。

## 9. 遗留风险与下一轮重点

1. `reports/` 豁免口径的量已经出来（103 处 / 25 文件），可以据此拍板，不必再等估算。
2. `pgsql/` 20 处全是第三方误报，但"留仓即永扫"这一点需与 `pgdata/` 2220 一并决定。
3. BFF 偶发全阻塞第二次复现（非门禁并发条件下），下一轮起固定记"首探/复探"两组数，才谈得上定位。
4. 组织侧两处口径（8/3、加载异常）是否已改口，看它下一次 flush。
5. `logs/p5-31-survey.log` 含 4 个厂商真名（114B，gitignored、仅本地）：P5-31 方案引用其数字前须先映射为 `厂商A–H`。

## 10. 待拍板（跨轮累积）

- **词表扩词 + `reports/` 豁免口径**（同一套门禁的两面，须一起定）
- `pgdata/`（2220 文件）与 `pgsql/`（2220 级第三方树）是否摘除
- `AUDIT_BACKFILL_LIMIT`（A / B / C）、`WORM_BACKEND=memory` 是否改 `fs`
- P5-30 B 方案边界、P5-31 E1/E2 拆分；`m600Routes.ts` 供应商字段改名
- 演示环境明文口令取舍（位置 `src\bff\routes\auth.ts` L104-113，仅可引用位置）
