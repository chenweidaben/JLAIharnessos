# 健澜仓库两小时滚动巡检简报（2026-11-06 22:23 轮）

- 巡检时间：2026-11-06 22:0x–22:4x（UTC+8，星期五）
- 仓库：`C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1`，分支 `consult-agent-m86`
- 基线（起点）：`bfe8ead0`（组织侧 P5-21 收口 5 个提交，均未推送）
- 执行口径：组织侧自报一律独立复跑；本轮重点是把「11 文件 vs 12 文件」的旧账彻底算清

## 一、智能体进度

| 项 | 实测值 |
|---|---|
| 组织智能体 | `o_000Rfj7NkAk`（HIS-EMR一体化复刻与脱敏升级） |
| 状态 | status=2，finished，100% done，version 689 |
| 本批落地 | `5732df48` / `47475da5` / `50ac321d` / `065ea9be` / `bfe8ead0`（5 提交，各 1 文件） |
| 自报 | P5-21 验收 ALL_GREEN；P5-17 续作"核心门禁全绿待最终报告" |

组织侧这轮的最大价值不是"又全绿"，而是**主动暴露自己的门禁脚本会造假红**：`Bun.spawnSync` 从 bun 内 spawn bun，子进程继承父进程全局状态，造出 41 个假 fail；改 `execSync` 仍污染；最后确认"bun 内 spawn bun"这条路不可用，脚本退化为"只打印清单 + 命令 + 基线，不执行"。这个判断是对的，本轮采纳并沿用。

## 二、工具链与编译门禁

| 项 | 结果 |
|---|---|
| node / bun / npm | v22.23.2 / 1.2.0 / 10.9.8 |
| 根 tsc（HEAD=bfe8ead0） | **exit 0 / 0 字节** |
| web tsc（cwd=web） | **exit 0 / 0 字节** |
| 根 tsc（改完 `scripts/*.mts` 后复跑） | **exit 0 / 0 字节** |

日志：`logs/patrol-2223-tsc-root.log`、`logs/patrol-2223-tsc-web.log`、`logs/patrol-2223-tsc-root2.log`（均 0 字节）。

## 三、单测口径彻底对齐（本轮核心成果）

旧账：主线报 154/0/445（11 文件），组织侧报 152/0/449（12 文件），连续三轮被写成"集合边界不同"，等于没有可比对的回归门禁。

本轮做法：**不再争论集合，而是逐文件实测，然后用等式把四个数字全部闭合。**

| 组合 | 文件数 | pass | fail | expect |
|---|---|---|---|---|
| 官方全集（已固化进 `scripts/gate-unit.mts`） | **13** | **181** | **0** | **512** |
| 主线早期口径（全集 − keyOpsStore − auditEventHook） | 11 | **154** | 0 | 445 |
| 组织侧 12 文件口径（全集 − wormKeyProvider） | 12 | **152** | 0 | 449 |
| 组织侧 11 文件口径（再 − s3-fallback） | 11 | **144** | 0 | 429 |

单文件实测（PowerShell 直跑，日志 `logs/patrol-2223-single-*.log`）：

- `wormKeyProvider.test.ts` → 29 pass / 63 expect
- `keyOpsStore.test.ts` → 10 pass / 41 expect
- `auditEventHook.test.ts` → 17 pass / 26 expect
- `worm-s3-fallback.test.ts` → 8 pass / 20 expect

对账等式（全部可复算）：

```
181 − 27(keyOpsStore 10 + auditEventHook 17) = 154   ← 主线早期 11 文件
181 − 29(wormKeyProvider)                    = 152   ← 组织侧 12 文件
152 − 8(worm-s3-fallback)                    = 144   ← 组织侧 11 文件
```

结论：**四个数字的差全部来自文件集合本身，0 fail 在三套口径下一致，不存在回归。** 之前的"差 2 pass 对不上"是集合差异，不是缺陷，也不是环境差异。

本轮同时确认：13 文件合并跑 181/0，没有出现组织侧担心的跨文件环境变量污染（`auditEventHook` 与本轮合并跑正常）。

## 四、E2E

```
23 pass / 0 fail / Ran 23 tests across 1 files. [8.69s]   E2E_EXIT=0
[P5-6-dump] store/info: {"segmentCount":2,"oldestSeq":1,"newestSeq":16}
[P5-6-dump] search: {"total":16,"scanned":2,"rowsLen":10}
[P5-6-dump] seg[0]: {"segmentId":"WORM-0001-mw52ijwv","eventCount":2,"fromSeq":1,"toSeq":2,"cipherBytesLen":1760,"ivLen":32}
```

`newestSeq=16`（生产共享表已 2877）→ 隔离实例真实生效；跑后 8081 无残留监听。

## 五、品牌脱敏 / 路由

| 项 | 值 |
|---|---|
| filesScanned / termCount / totalHits | 9815 / 24 词 / 13 |
| 命中构成 | 仅 `gangos`，13 处 / 2 文件（`src/bff/observability/metrics.ts` 7、`src/core/observability/metrics.ts` 6），属 backlog |
| 硬违规 | **0** |
| 路由 lazy import | 2865 / resolved 2865 / package 0 / MISSING 0 |
| route path | 2870 / duplicates 0 |
| elements | 2769 / undefined 0 |

## 六、运行态（本轮第二次掉线，已恢复但根因仍是假设）

开工时 **8080 无监听**——这是连续第二轮掉线。上一轮（20:28 起 pid 47344）的进程在 20:26:34 写完最后两行健康日志后再无任何输出，`logs/bff-8080-r2.out.log` 仅 466 字节，无异常栈、无退出记录。

排除项：E2E `stopBff` 按 `handle.pid` 精确 `taskkill /T /F`，且本轮 E2E 跑完 8080 仍存活过，不是测试误杀；Windows 应用事件日志无 bun 条目。

处置：改用**stdin 重定向**方式启动（`Start-Process -RedirectStandardInput logs\stdin-empty.txt`），假设是控制台/stdin 句柄随启动它的 PowerShell 会话结束而关闭导致 bun 退出：

| 项 | 值 |
|---|---|
| 启动 PID / 监听 PID | 44264 / **44264**（一致） |
| `/ready` | 200，`status=ok`、`auditStore=pg`、`wormBackend=memory`、`sealDisabled=false`、`uptimeSec=10` |
| 端点 | `/health` 200 len=2、`/api/v1/health` 200 len=163、`/api/v1/system/health` 200 len=145、`/metrics` 200 len=4149 |
| 启动日志 | `[audit] backfilled 2877 events (seq 1..2877), truncated=false` |
| 环境 | `HTTP_PORT=8080`、`AUDIT_BACKFILL_LIMIT=10000`、`DEMO_MODE=1`（与 `.env` 默认一致）、WORM memory |

**必须说清楚**：这只是换了一种启动方式，**根因未证实**。下一轮开工第一件事就是探 8080，若仍掉线，本假设即被推翻，改上看门狗 + pid 文件方案。

端口全景：3000 none、5173 pid 41116（外部沙箱 vite，非本仓）、5174 pid 37772（本仓 vite）、8080 pid 44264、8081 none、8082 none、8000 pid 12744（他项目）、9090 none。

## 七、数据态

| 项 | 值 |
|---|---|
| `public.schema_migrations` | 349 |
| `consult` 表数 / `to_regclass('consult.threads')` | 0 / null |
| `audit.events` | **2877**（上一轮 1833，+1044；BFF 正常运行写入所致） |

组织侧 `demo0-cycle.mts --check` 我这边独立跑过：输出 `349 / null / 0 / 2877`、`CHECK OK: 可启动`、exit 0。该脚本 `--check` 的判定只含前三条，`audit.events` 仅打印不参与判定——这个设计是对的（该数字会一直涨，拿它当判据必然误报）。

## 八、本轮处理项与提交

| 提交 | 文件 | 内容 |
|---|---|---|
| `8707e87c` | `scripts/gate-unit.mts`、`scripts/demo0-cycle.mts` | 单测清单固化为官方 13 文件 + 实测基线 181/0/512 + 逐文件计数 + 四个历史数字的对账等式；`demo0-cycle` 启动入口由 re-export 壳 `src/bff/index.ts` 改为 `src/bff/server.ts` |
| 本轮 docs 提交 | `reports/patrol/patrol-20261106-2223-mainline.md` | 本简报 |

组织侧 5 个提交（`5732df48` 起的脚本三件套 + 入口修正）经复核后随本轮一并收口。

## 九、双仓推送与四 ref 核对

| 仓 | 命令 | 结果 |
|---|---|---|
| gitcode | `git push gitcode consult-agent-m86:master consult-agent-m86` | exit 0 |
| mirror | `git push mirror consult-agent-m86:master consult-agent-m86` | exit 0 |

四 ref 逐位核对原始输出落 `logs/patrol-2223-refs.txt`；本地 HEAD、gitcode/master、gitcode/consult-agent-m86、mirror/master、mirror/consult-agent-m86 应完全一致（值见该日志）。不推 origin / heagentos，未打 tag。

## 十、仓库卫生

- tracked 修改：0（本轮改动全部已入库）
- untracked：39 项，全部为另一路 consult 任务的巡检简报，按纪律不代提交、不删除
- 根目录探针 txt **1361** 个、log **762** 个，均由 `.gitignore` 的 `/*.txt` 等规则覆盖（`git check-ignore` 验证通过），不入库
- `logs/` 目录文件累计 **4181** 个，体积无碍但检索成本在上升，建议后续单独做一次归档清理（不属本轮范围）

## 十一、遗留风险与下一轮重点

1. **8080 连续两轮掉线**：本轮换 stdin 重定向启动，根因仍为假设。下一轮先探端口，若再失效即推翻假设，改上「pid 文件 + 看门狗」。
2. **`audit.events` 已 2877**，dev 库持续累积；任何 `AUDIT_BACKFILL_LIMIT` 默认值（1000）启动都会 `sealDisabled=true`。生产上限策略待用户拍板，不擅改默认。
3. **P5 台账缺失**：组织侧在仓库里查不到 P5-21 之后的切片定义，本轮由主线给出 P5-22 定义（见下），避免其自行编造任务。
4. `seal` 响应 `sourceChainValid:false`（历史现象）仍未定性 —— 已作为 P5-22 指定给组织侧做最小复现。
5. `wormArchiveAggregator.ts:86` 的 `no-unsafe-argument` 抑制缺理由注释。
6. 五项配置决策仍待用户拍板（`layered.put` 兜底、`AUDIT_DB_SCHEMA` 优先级、`/ready` 非生产 `degraded`、`WORM_BACKEND` 默认 `fs`、演示环境明文口令取舍）。
7. 更早遗留：`docs/**` 历史商业分析文档厂商真名专项脱敏、`gangos_` 13 处是否清理、PG 备份表 drop、2403 对象 rewrite、根目录探针清理、本地 master 清理。

## 十二、本轮结论

- 双 tsc 0/0、单测 181/0/512（官方 13 文件）、E2E 23/0/82（隔离指纹 16≠2877）、品牌硬违规 0、路由 0 悬空 —— 五条门禁实测通过。
- **单测口径这笔旧账本轮彻底算清**：181 / 154 / 152 / 144 四个数字由同一份逐文件实测数据推出，0 fail 全口径一致，不再有"集合边界"这种无法复核的表述。
- 8080 第二次掉线已恢复（pid 44264，五端点 200），启动方式已改为 stdin 重定向，但根因仍是待验证假设，未谎称已解决。
