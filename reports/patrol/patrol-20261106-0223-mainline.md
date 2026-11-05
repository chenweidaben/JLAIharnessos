# 健澜仓库滚动巡检简报（2026-11-06 02:23 槽位）

- **本轮时间**：2026-11-06 02:23 触发（仓库时间 +08:00），02:2x–02:3x 完成收口。
- **仓库/分支**：`C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1`，`consult-agent-m86`。
- **进入本轮 HEAD**：`86aef0f5`（组织侧 P5-13 第 5 条提交，02:23:22，尚未推送）。
- **本轮主线修复**：`823def1c`（生产 unsafe combo 自检 fail-open → 拒绝启动）。

## 1. 组织智能体状态

| 项 | 值 |
|---|---|
| 组织者 | `o_000Rfj7NkAk`（HIS-EMR一体化复刻与脱敏升级） |
| 状态 | `status=4` processing / executing，本轮巡检时仍在补跑门禁 |
| 进度 | 92%，version 497，round 6473–6482，`updated_at_unix=1793902988` |
| 本轮新增产出 | 5 条提交（审计持久化 2 条 + seq 回填修复 + 后端可见/fail-closed + /ready JSON） |
| 判定 | 有实质产出且在跑，不打断、不重复唤醒；改以独立复跑校验其自报。 |

旧智能体 `o_000pZ6W0z5F` / `o_000pKWRkDCO` / `o_000EkD3iWsb` / `o_000E2mfsz5X` 已终态，不再巡查。

## 2. 工具链

node `v22.23.2`、bun `1.2.0`、npm `10.9.8`、git `2.54.0.windows.1`。

## 3. 门禁实测（主线独立复跑）

| 门禁 | 结果 | 取证 |
|---|---|---|
| 根 tsc（修复前） | exit 0 / 0 字节 | `logs/patrol-2026e-tsc-root.log` |
| 根 tsc（server.ts 修复后复跑） | exit 0 / 0 字节 | `logs/patrol-2026e-tsc-root2.log` |
| web tsc | exit 0 / 0 字节 | `logs/patrol-2026e-tsc-web.log` |
| worm 单测组合（archive/keyProvider/keysRoutes/auditCombo） | **102 pass / 0 fail（7.78s）** | `logs/patrol-2026e-unit-worm.log` |
| 审计持久化单测（store/hook/events/rateLimit） | **59 pass / 0 fail（110ms）** | `logs/patrol-2026e-unit-audit.log` |
| E2E 第 1 轮 | **23 pass / 0 fail（2.75s）** | `logs/patrol-2026e-e2e-R1.log` |
| E2E 第 2 轮 | **23 pass / 0 fail（4.29s）** | `logs/patrol-2026e-e2e-R2.log` |
| fs 后端验收脚本 | **8/8 PASS** | `logs/patrol-2026e-fsverify.log` |

- E2E 跑在干净环境 BFF（pid 32980，02:24 启动，晚于 HEAD `86aef0f5` 02:23:22），结论有效。
- 路由体检：`2870` 声明 / `2870` 唯一 / `0` 重复 / `2863` lazy / `0` 悬空（`logs/patrol-2026e-route.log`）。
- 品牌 17 词 Ordinal 扫描（`src`+`web\src`）：**files=9810，hits=0，hitFiles=0**。

## 4. 运行态

| 项 | 实测 |
|---|---|
| 8080 | 本轮起始 **无监听**（上一轮 pid 35612 已退出、组织侧测试进程亦退出）→ 由主线拉起 pid 32980 完成 E2E 与端点取证；随后组织侧自起 pid **9320**（02:30:08）接续占用，主线进程因 EADDRINUSE 退出 |
| 5173 | LISTEN pid 36328（node/vite，2026-11-05 22:28:04），持续稳定 |
| 3000 / 8000 / 9090 | 无监听 |

六端点（组织侧 pid 9320 上实测）：`/health` 200/2B、`/ready` 200/123B、`/api/v1/health` 200/163B、`/api/v1/system/health` 200/145B、`/metrics` 200/35022B、`5173/` 200/838B。

`/ready` 新字段（P5-13）：`{"status":"ok","wormBackend":"memory","wormStoreDir":"(in-process memory; not persisted)","auditStore":"pg","uptimeSec":…}` —— WORM 与审计后端已对运维可见。

## 5. 本轮处理项

### 5.1 修复：生产 unsafe combo 自检 fail-open（`823def1c`）

**问题**：`assertWormAuditCombo` 在 `audit=pg + worm=memory + production` 时返回 `ok=false`，`server.ts` 原写法是 `throw new Error(...)`，但该 throw 位于异步链 `.then()` 内，被末尾 `.catch(e => console.error('[audit] init failed'))` 吞掉 —— 进程照常 `listen`。安全自检由此退化为告警，实际仍以危险组合对外服务。

**修复**：改为 `console.error(check.message)` + `process.exit(1)`，与 `worm-key-provider` 的 production fail-closed 口径一致。

**实测取证**（`logs/patrol-2026e-prodcombo4-*.log`）：`NODE_ENV=production`、`DEMO_MODE=0`、`WORM_KEY_DIR`+`WORM_KEK` 齐备、不设 `WORM_BACKEND` → 进程 **exit code 1**，stderr 打出 `[worm] unsafe combo: 审计事件已持久化到 PG，但 WORM 段仅在内存…`；修复前同配置可正常监听 8080。探针用的一次性 KEK 目录已删除，未入库。

### 5.2 诊断：组织侧 E2E 9 条失败是环境密钥所致，非产品红灯

组织侧 02:19 两轮自测各 `14 pass / 9 fail`，失败断言集中在 `purge` 期望 `key-in-use` 却收到 `cannot-purge-active`、`rotate` 500。根因：其测试用 BFF 以 `WORM_SM2_*` 环境密钥启动（`EnvKeyProvider`），而 `rotate()` 在 env 模式按设计抛 `worm-env-rotate-not-supported`（密钥由 KMS/运维注入，不支持进程内轮换）；主线在无 `WORM_*` 环境的 BFF 上同一用例两轮全绿，可反证代码无回归。

**结论/后续**：E2E 套件对宿主环境密钥不设防（非 hermetic），同一份代码在不同 env 下给出相反结论。已要求组织侧在 `worm-e2e.test.ts` 前置断言 `/api/v1/worm/keys` 的 `keySource` 非 `env`（或显式跳过 rotate/purge 段并打印原因），把 9 条晦涩红灯收敛成 1 条明确前置条件；主线本轮不改测试文件，避免与其在制编辑冲突。

## 6. 提交与推送

| 项 | 值 |
|---|---|
| 组织侧 5 条（本轮一并推送） | `1e64532e` DDL+Store+写穿 · `6ef894f7` 回填/查询分层/verifyChain 流式 · `4a6dbbce` PG 路径回填真实 seq · `852093c6` 后端可见 + 不安全组合校验 · `86aef0f5` /ready JSON + 抽函数 + fs 脚本 8/8 |
| 主线 1 条 | `823def1c` 生产 unsafe combo 拒绝启动 |
| 本简报 | 随本文件另行提交 |
| 推送 | `gitcode` 与 `mirror`，`consult-agent-m86` → 双方 `master` 与本分支；`ls-remote` 逐位核对见本轮回复（简报不写死最终 SHA） |
| 未推送 | `origin`、`heagentos`；未打 tag |

## 7. 审计持久化实现复核（P5-13）

- `PgAuditStore.append` 在事务内用 `pg_advisory_xact_lock + MAX(seq)+1 + INSERT ... RETURNING seq`，seq 由 DB 分配并回写内存占位值，避免并发断号。
- `backfillPending(fromSeq)` 强制显式传 `fromSeq`（禁止默认 0），`server.ts` 先 `ensureCountersHydrated()` 取 `lastArchivedSeq` 再回填，顺序写死防重复归档。
- `verifyChain` 走 `streamAll()` 游标分批（500/批），不再一次性载入全表。
- 文档 `docs/security/audit-persistence.md`（92 行）随 `6ef894f7` 入库。

## 8. 仓库卫生

- `trackedDirty=0`；未跟踪 **401 项全部位于 `reports/`**（另一路 consult 任务产物与历史简报），本主线不代提交、不删除。
- 本轮取证日志与探针全部落 `logs/`，不入库；`logs/worm-prodprobe` 一次性密钥目录已清理。

## 9. 遗留风险与下一轮重点

1. **WORM 默认 memory 与审计 PG 不匹配**：当前运行态 `wormBackend=memory` + `auditStore=pg`，正是被新守卫拦下的危险组合（开发环境仅告警）。生产必须 `WORM_BACKEND=fs`，默认值是否切 fs 仍未拍板。
2. **E2E 非 hermetic**：见 5.2，待组织侧加前置断言。
3. **`/ready` 恒 200**：即使 `auditStore=memory`（非生产）也返回 `status=ok`，是否需要降级为 degraded 由产品口径定。
4. **BFF 进程生命周期无守护**：本轮起始 8080 无监听，靠巡检/组织侧手动拉起；建议纳入 supervisor 或健康守护。
5. **运维审计并发写（B）**：`_key-ops.json` 单文件追加仍多实例覆盖风险，未做。
6. **S3/SIEM 适配（D）**：无环境，仅可 mock。
7. **`scripts/` 11 个历史脚本类型债**、**397→401 项未跟踪 `reports/`**、**本地 `master` 历史指向** 均未定。

**下一轮重点**：独立复核组织侧对 E2E 前置条件的修补与 B（审计并发写）；确认 `/ready` degraded 语义；继续双 tsc + E2E 两轮 + fs 8 项全量复跑。
