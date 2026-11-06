# 健澜仓库滚动巡检简报 · 2026-11-05 18:28 槽位

- 巡检时间：2026-11-05 18:28–18:45（CST）
- 仓库根：`C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1`
- 工作分支：`consult-agent-m86`；本轮基线 HEAD：`a51b3807`（组织侧 P5-10 最后一个提交）
- 产品正式名：健澜AI原生医院操作系统OS
- 说明：本简报不写死自身最终 SHA，最终 HEAD 与三端核对值在巡检回执中给出。

## 1. 组织智能体状态

`o_000Rfj7NkAk`（HIS-EMR 一体化复刻与脱敏升级）：

- peek：`status=2`（finished）、overall **100%**、version **412**、round 5377–5385、`updated_at_unix=1793869465`（约 17:57）。已进入 idle-resumable standby。
- P5-10 六个提交全在本地，本轮之前未推送：
  `2639bf7` HTTP 入口 + 倒排索引 → `971b849` E2E 闭环 + 双保险 → `548ca1a` 段数扫掠 → `3f8ae5c` 路由单测 + `refs===2` → `3e33fe2` 401 修正 + 无私钥断言 → `a51b380` TS2345 收窄。
- 方法改进（本轮起其自述强制）：报告必须同时给 `git log -1 --format=%cI` 与 tsc 日志 `LastWriteTime`，日志时间必须晚于 commit 时间。
- 其自陈缺口：简报停在 `971b849`，之后 5 个提交未回写；最终 ALL_GREEN 由其另建的「只验收不改码」独立代理给出，非其亲手执行（云主机 `switch` 不可用）。

## 2. 工具链实测

| 工具 | 版本 |
|---|---|
| node | v22.23.2 |
| bun | 1.2.0 |
| npm | 10.9.8 |

## 3. 双 tsc 门禁（主线独立复跑）

| 目标 | 结果 |
|---|---|
| 根 tsc | **exit 0 / 0 字节 / 0 行**（`logs/patrol-1828b-tsc-root.log`） |
| web tsc | **exit 0 / 0 字节 / 0 行**（`logs/patrol-1828b-tsc-web.log`） |

前几轮反复出现的「commit 后未复跑」假绿，本轮未复现：a51b3807 之后主线直接复跑为真 0/0/0。

## 4. 测试门禁（实测）

| 套件 | 结果 | 日志 |
|---|---|---|
| 四文件组合（wormKeysRoutes + wormKeyProvider + wormArchive + globalRateLimit） | **89 pass / 0 fail / 379 expect（6.48s）** | `logs/patrol-1828b-unit-worm.log` |
| WORM E2E R1 | **23 pass / 0 fail / 81 expect（12.02s）** | `logs/patrol-1828b-e2e-R1.log` |
| WORM E2E R2 | **23 pass / 0 fail / 81 expect（12.33s）** | `logs/patrol-1828b-e2e-R2.log` |

两轮之间无污染、无 429，与组织侧自报数字一致（本轮其数字可信，已由主线独立复现）。

## 5. 运行态与健康端点

旧 BFF pid 38772 启动 16:47:35，早于 401 修复提交 `3e33fe27`（16:50:06），运行的是旧代码。已重启到 `a51b3807`：**pid 31548，启动 2026-11-05 18:34:39**，`WORM_STORE_DIR=logs\worm-store-1828b`（干净目录），日志 `logs/bff-1828b.out.log` / `.err.log`。前端 5173 pid 6528 未动。

| 端点 | 状态 | 字节 |
|---|---|---|
| `8080/health` | 200 | 2 |
| `8080/ready` | 200 | 115 |
| `8080/api/v1/health` | 200 | 162 |
| `8080/api/v1/system/health` | 200 | 145 |
| `8080/metrics` | 200 | 6254（新进程计数尚少） |
| `5173/` | 200 | 838 |

端口：3000 / 8000 / 9090 无监听；8080 与 5173 各单实例，无冲突。

### 5.1 新增 HTTP 运维入口的运行态取证

`logs/patrol-1828b-probe.ps1`（第一段）+ `logs/patrol-1828b-probe-refs.ps1`（第二段）：

- **未认证**：`POST /keys/retire`、`POST /keys/purge` 无 token → **401 / `code=40100`**（此前是 403，语义已修）。
- **非管理员**：nurse token → **403 / `code=40300`**。
- **retire**：seal 1 段（k0）→ rotate → `retire(k0)` 200，`activeKeyId` 切到新钥；随后 `verify?scope=real` 仍 `valid=true`、`signatureValid=true` —— 退役钥的旧段仍可验签成立。
- **purge 在用钥**：`purge(k0)` → **409 `key-in-use` refs=1**。
- **purge active 钥** → **409 `cannot-purge-active`**。
- **同钥两段引用计数**：用 active 钥 `k-04ebb7e9081c` 连封两段（`WORM-0002-mw3et714`、`WORM-0003-mw3et73n`），rotate 后 `purge(k-04ebb7e9081c)` → **409 `key-in-use` refs=2** —— 倒排索引跨段累加成立（非单段特例）。
- **成功 purge**：rotate 两次把中间未引用钥 `k-047fcbe302df` 停用后 `purge` → **200**；再 purge 同 id → **400 `unknown-key-id`**；purge 不存在 id → 400 同码。
- **私钥泄漏**：所有响应体 `privateKey` / `PRIVATE` / `privateKeyHex` 逐字 `IndexOf` 扫描 **hits=0**。
- 附带确认：无待归档事件时 `seal` 返 **400 `当前无待归档事件`**，属正确行为，不是缺陷。

## 6. 品牌与路由

- 品牌硬禁词 17 词：`src` + `web/src` 共 **9809** 文件逐字 `Ordinal` 匹配，**hits=0 / hitFiles=0**（`logs/patrol-1828b-brand.log`）。`gangos_` 存量指标名仍不计硬违规。
- 前端路由体检：`routePathDeclarations=2870`、`uniquePaths=2870`、`duplicatePaths=0`、`lazyImports=2863`、`lazyMissing=0`。P5-10 只加 BFF 路由，前端数字不变属预期（该脚本只体检 `web/src/router/index.tsx`，不统计后端）。

## 7. 仓库卫生

- 提交前 `trackedDirty=0`（工作区干净，组织侧提交已全部落盘）。
- 未跟踪 **385** 项，全部在 `reports/`：`consult-deepen` 199、`patrol` 174、`consult-rebuild` 12（较上轮 381 增加 4，为本轮/组织侧新简报）。属另一路 consult 任务与历史产物，本主线不代提交不删除。
- `logs/` 由 `.gitignore:33` 覆盖；本轮 10 个日志与 2 个探针脚本均不入库。

## 8. 本轮处理项与分组 commit

| SHA | 类型 | 内容 |
|---|---|---|
| （见回执） | fix(docs) | 修正 P5-10 简报中「purge 后旧段验签失效」的误导性表述——purge 只允许零引用时执行，成功不会断链 |
| （见回执） | docs(patrol) | 本简报 |

代码门禁全绿，本轮无源码 P0，故无 fix 类源码提交。

## 9. 双仓推送

待回执给出推送范围与三端 SHA 核对值。

## 10. 遗留风险与下一轮重点

1. **purge 索引强一致**：现为「refresh 语义 + 命中 0 回退全扫」的最终一致方案；多进程同时写同一 store 时，仍可能读到滞后索引（回退扫描能兜底误删，但不能兜底「多算」场景下误放行）。下一步要么给 FileWormStore 加目录 mtime 自动 refresh，要么在 purge 前强制一次 refresh。
2. **密钥体系仍是 demo 形态**：`.env` 无 `WORM_*`，运行态恒为 demo-ephemeral，重启换钥旧段即失效；生产 KEK/KMS 注入路径待定。
3. **purge 缺少二次确认与审计留痕**：当前只要 admin 即可物理删钥，建议加 `confirm: true` 字段或独立权限码，并确认审计事件里记录 keyId（非密钥值）。
4. **scripts 下 11 个历史脚本类型债**：仍登记 backlog。
5. **组织侧简报滞后**：其 `reports/patrol/patrol-20261105-1700-p5-10-worm-key-ops.md` 未覆盖 401/403 与 TS2345 修复，已在本轮修正语义错误；建议其下批把 changelog 写全，或改为「最终回执即文档」。
6. 385 个未跟踪 `reports/` 项长期未收口，归另一路 consult 任务。

## 11. 结论

a51b3807 的门禁经主线独立复跑全部为真：双 tsc 0/0/0、单测 89/0/379、E2E 23/0/81 ×2。运行态重启到最新代码后，retire/purge 四条路径（401/403/409/200）与「同钥两段 refs=2」全部实测通过，私钥零泄漏。本轮修掉一处运维文档语义错误；源码无 P0。
