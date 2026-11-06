# 健澜仓库滚动巡检简报（2026-11-06 06:23 槽位）

- **本轮时间**：2026-11-06 06:23 触发，06:23–06:5x 完成收口（仓库时间 +08:00）。
- **仓库/分支**：`C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1`，`consult-agent-m86`。
- **进入本轮 HEAD**：`6fb897da`（组织侧 P5-15 第 4 条，04:57:21，未推送）。
- **本轮代码改动**：无（P5-15 四项独立复跑全部通过，未发现需就地修复的 P0）。

## 1. 组织智能体状态

| 项 | 值 |
|---|---|
| 组织者 | `o_000Rfj7NkAk`（HIS-EMR一体化复刻与脱敏升级） |
| 状态 | `status=2` finished，overall 100%，version **526**，round 6924–6928 |
| 本轮新增产出 | 4 条提交：P1 清理语义修复 + S3/SIEM 适配器（mock）+ AsyncWormStore 拆分 + P5-15 简报 |
| 处置 | 已完成进入 idle-resumable；复跑通过后本轮末尾唤醒续做下一批 |

旧智能体 `o_000pZ6W0z5F` / `o_000pKWRkDCO` / `o_000EkD3iWsb` / `o_000E2mfsz5X` 已终态，不再巡查。

## 2. 工具链

node `v22.23.2`、bun `1.2.0`、npm `10.9.8`、git `2.54.0.windows.1`。

## 3. 门禁实测（主线独立复跑，非沿用组织侧自报）

| 门禁 | 结果 | 取证 |
|---|---|---|
| 根 tsc（`node node_modules/typescript/bin/tsc --noEmit`） | exit 0 / 0 字节 | `logs/patrol-0623-tsc-root.log` |
| web tsc（`bun x tsc --noEmit`） | exit 0 / 0 字节 | `logs/patrol-0623-tsc-web.log` |
| 六文件单测（keyOpsStore + wormArchive + wormKeyProvider + wormKeysRoutes + wormAuditCombo + auditEventHook） | **128 pass / 0 fail / 355 expect（7.48s）** | `logs/patrol-0623-unit.log` |
| `wormExternalIntegrations.test.ts` | **7 pass / 0 fail / 37 expect（81ms）** | `logs/patrol-0623-external.log` |
| E2E 第 1 轮 | **23 pass / 0 fail（6.66s）** | `logs/patrol-0623-e2e-R1.log` |
| E2E 第 2 轮 | **23 pass / 0 fail（8.12s）** | `logs/patrol-0623-e2e-R2.log` |
| 路由体检 | `2870` 声明 / `2870` 唯一 / `0` 重复 / `2863` lazy / `0` 悬空 | `logs/patrol-0623-route.log` |
| 品牌 17 词 Ordinal 扫描（`src`+`web\src` 逐文件） | **files=9813，hits=0，hitFiles=0** | 见第 6 节 |
| P5-15 简报 + 外部集成文档单独重扫 | 均 **hits=0** | 见第 6 节 |

**lint 未通过（如实记录，非代码问题）**：`eslint .` 在本机退出 **134**。本轮额外用 `--max-old-space-size=6144` 重试一次，仍然是 `Ineffective mark-compacts near heap limit / JavaScript heap out of memory`，与组织侧结论一致 —— 本机跑不动全量 lint，属环境限制。此项不列为通过，转下一轮换机或调堆参数再验。

## 4. 运行态

| 项 | 实测 |
|---|---|
| 8080 | LISTEN pid **40980**（bun，04:49:04 起，晚于全部代码提交 `b203b6de` 04:45:29，加载的是当前代码） |
| 5173 | LISTEN pid 36328（node/vite，2026-11-05 22:28:04），持续稳定 |
| 3000 / 8000 / 9090 | 无监听；无端口冲突 |

端点实测：`/health` 200/2B、`/ready` 200/125B、`/api/v1/health` 200/165B、`/api/v1/system/health` 200/145B、`/metrics` 200/35085B、`5173/` 200/838B。

`/ready` 正文：`{"status":"ok","wormBackend":"memory","wormStoreDir":"(in-process memory; not persisted)","auditStore":"pg","uptimeSec":5914}` —— 运行态仍是 memory + pg 的危险组合（开发环境仅告警，生产已被守卫硬拦），与上一轮口径一致。

## 5. P5-15 复核结论（逐条实测）

| 提交 | 内容 | 复核结论 |
|---|---|---|
| `f745aa85` | 运维审计文件清理改为按日期跨实例 + 留存期 180 天 | **成立**，见下方正向实测 |
| `40e5b43e` | S3 / SIEM Syslog-CEF 适配器接口 + 契约测试（mock，未联调） | **边界诚实**：文件头有 `NOT INTEGRATED — mock only`，`src` 内除自身模块外无任何引用，未伪装成已接线 |
| `b203b6de` | 拆出独立 `AsyncWormStore` + 文档标注异步改造前置 | **成立**：`wormStore.ts:43` 定义异步接口、`:53` 提供 `toAsyncStore` 桥接、`s3WormStore.ts:46` 实现的是异步接口而非同步的 `WormStore` |
| `6fb897da` | P5-15 简报 | **成立**：品牌词 0 命中 |

**清理语义正向实测（关键，不只看单测）**：主线另建临时目录，放两个"他实例"的 2025 年旧文件 + 一个今天的文件 + 一个不可识别命名的文件，分别跑 dry-run 与 `--apply`：

- dry-run：`retentionDays=180 apply=false`、`cutoff=2026-05-09T22:26Z`、`candidates=2`，**未删任何文件**；
- `--apply`：`removed=2`，两个跨实例旧文件被删；
- 剩余：今天的新文件保留、不可识别的命名文件保留（不误删）。
- 留存期护栏：`KEY_OPS_RETENTION_DAYS=90` 抛「低于合规下限 180 天」，`=abc` 抛「必须是正整数」，均 exit 1，不静默取默认。
- 进程内无自动调用：`src` 全量 grep `cleanupOldKeyOps` 仅 1 处定义（`keyOpsStore.ts:176`），`server.ts` 无调用点 —— 只在显式运维脚本触发，符合"删除不可逆必须人工确认"的要求。

至此上一轮登记的 P1（清理死代码 + 实例作用域不可达 + 30 天留存不足）**闭环**。

## 6. 本轮查看的细节（无 P0）

- `cleanupOldKeyOps` 的 `dryRun` 默认为 `true`（`keyOpsStore.ts:178`），显式 `--apply` 才真删；清理前后都不判 `instanceId`，改按文件名 `YYYYMMDD` 提取日期，任何实例的旧文件都能被回收。
- `extractDateFromName` 用正则 `^_key-ops-[^-]+-\d+-[a-z0-9]+-(\d{8})\.jsonl$`，与真实文件名 `_key-ops-DESKTOPOBE6S1B-<pid>-<rand6>-<YYYYMMDD>.jsonl` 结构一致（`INSTANCE_ID` 已把 hostname 里的非字母数字字符剔除，所以不会带连字符）；现网 `logs/worm-store` 下 17 个文件命名全部符合。
- P3（理论边角，未修）：`Math.random().toString(36).slice(2,8)` 在 `random()===0` 时会得到空串，生成 `...-<pid>--<日期>.jsonl` 这类不可解析的名字，此后永不进入清理。概率约 2^-53，但补一句"取不到就回落固定串"即可彻底消除，留给下一批顺手处理。
- 文案小瑕：`resolveRetentionDays` 抛错文案写「拒绝启动」，而实际调用方只有运维脚本，措辞可改为「拒绝执行」，避免误读成启动期门禁。

## 7. 提交与推送

| 项 | 值 |
|---|---|
| 组织侧 4 条（本轮复核后一并推送） | `f745aa85` 清理语义修复 · `40e5b43e` S3/SIEM 适配器 · `b203b6de` AsyncWormStore 拆分 · `6fb897da` P5-15 简报 |
| 主线 | 本简报（无源码改动） |
| 推送 | `gitcode` 与 `mirror`，`consult-agent-m86` → 双方 `master` 与本分支；`ls-remote` 四 ref 逐位核对见本轮回复（简报不写死最终 SHA） |
| 未推送 | `origin`、`heagentos`；未打 tag |

## 8. 仓库卫生

- `trackedDirty=0`；未跟踪 **409 项全部位于 `reports/`**（另一路 consult 任务的每小时巡检产物 `patrol-20261106-0207/0307/…/0607.md` 等及历史简报），本主线不代提交、不删除。
- 根目录历史探针 `*.txt/*.csv` 共 **1362 个**（其中 265 个已被跟踪，其余由 `.gitignore` 覆盖），属长期技术债，非本轮新增，未做清理（清理需用户确认归属）。
- `logs/` 被 `.gitignore` 覆盖；本轮取证日志（`patrol-0623-*`）与临时清理验证目录均不入库，临时目录已删除。`logs` 目录现有 3729 个文件、136 个子目录。

## 9. 遗留风险与下一轮重点

1. **lint 全量仍跑不动**（本机 6GB 堆仍 OOM）。需要换机、拆分 lint 范围或调 `.eslintrc` 扫描边界，否则"lint 通过"这一门禁长期缺失。
2. **S3 真接入的前置改造未做**：`wormArchiveAggregator` 的 `seal/verify/listSegments/getSegment/countBySigner` 全同步，真接 S3 前必须改 async 或加带超时与并发上限的桥接层；本切片只到 mock 契约，**未联调**。
3. **`/ready` 恒 200 的 degraded 语义未拍板**（非生产 `auditStore=memory` 时是否降级）。
4. **`WORM_BACKEND` 默认 memory**：dev 重启会重复归档；彻底修法是 `NODE_ENV=test → memory`、其余默认 `fs`，需连带改 E2E 的 storeDir 隔离，应单独立项。
5. **fallback JSONL 的 replay 脚本未做**（replay 会重新分配 seq，导致 seq 顺序 ≠ 事件时间顺序，需单独设计）。
6. **BFF 无进程守护**：本轮 8080 由组织侧 pid 40980 持有，退出后仍需人工/巡检拉起。
7. **`gangos_` 存量 2 文件**仍为 backlog（本批未新增）。

**下一轮重点**：验证 lint 可跑通方案；跟进 S3 异步改造是否立项；清理脚本进 CI 的前置（dry-run 常驻 + apply 人工）；继续双 tsc + 六文件单测 + E2E 两轮 + 外部集成 7 项全量复跑。
