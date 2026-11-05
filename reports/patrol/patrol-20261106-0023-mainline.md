# 健澜仓库滚动巡检简报（2026-11-06 00:23 槽位）

- **本轮区间**：2026-11-05 22:23 触发 → 2026-11-06 00:23 触发续接，跨零点合并为同一工作段收口（两次调度共用一次实测取证，无重复执行）。
- **仓库/分支**：`C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1`，`consult-agent-m86`。
- **基线 HEAD**：`c86bacdf252027be95463c7e570cef5e24cdad9b`（组织侧 P5-12 末条提交，进入本轮时未推送）。
- **本轮优化提交**：`0c92bb1d`（fs 后端验收脚本 KNOWN_LIMITATION 断言化，详见第 6 节）。

## 1. 组织智能体状态

| 项 | 值 |
|---|---|
| 组织者 | `o_000Rfj7NkAk`（HIS-EMR一体化复刻与脱敏升级） |
| 状态 | `status=2` finished / idle-resumable standby |
| 进度 | 95%，`completing`，version 446，round 5953–5962，`reason=round` |
| 最近更新时间 | `updated_at_unix=1793885663`（约 2026-11-05 21:34 +08） |
| 判定 | 自 21:34 起无新产出，P5-12 验收停在“fs 脚本等待输出”，属正常待唤醒；本轮收口后派发下一批切片。 |

旧智能体 `o_000pZ6W0z5F` / `o_000pKWRkDCO` / `o_000EkD3iWsb` / `o_000E2mfsz5X` 已终态，不再巡查。

## 2. 工具链与环境

- node `v22.23.2`、bun `1.2.0`、npm `10.9.8`、git `2.54.0.windows.1`。
- 仓库时间口径为 `2026-11-05/06 +08:00`，与系统注入日期不一致的历史差异仍存，槽位标签统一按仓库时间。
- 工作区：`trackedDirty=0`；未跟踪 397 项，**全部位于 `reports/`**（历史简报与另一路 consult 任务产物），本主线不代提交、不删除。

## 3. 门禁实测（主线独立复跑）

| 门禁 | 结果 | 取证 |
|---|---|---|
| 根 tsc（`node node_modules/typescript/bin/tsc --noEmit`） | exit 0 / 0 字节 | `logs/patrol-2026d-tsc-root.log` |
| web tsc（`bun x tsc --noEmit`，cwd=web） | exit 0 / 0 字节 | `logs/patrol-2026d-tsc-web.log` |
| worm 四文件组合（wormArchive + wormKeyProvider + wormKeysRoutes + worm-e2e） | **118 pass / 0 fail / 356 expect（18.51s）** | `logs/patrol-2026d-unit-worm.log` |
| E2E 第 1 轮（`tests/integration/worm-e2e.test.ts`） | **23 pass / 0 fail / 81 expect（8.81s）** | `logs/patrol-2026d-e2e-R1.log` |
| E2E 第 2 轮 | **23 pass / 0 fail / 81 expect（13.32s）** | `logs/patrol-2026d-e2e-R2.log` |

- 跑 E2E 前已比对：BFF pid **35612** 启动 **2026-11-05 21:34:39**，晚于基线提交 `c86bacdf`（21:29:36），进程加载的是本轮代码，E2E 结果有效。
- 首跑曾因把 E2E 路径写成 `tests/e2e/...` 报 `ModuleNotFound`，纠正为 `tests/integration/worm-e2e.test.ts` 后全绿；该失败属取证路径错误，非产品红灯。

## 4. 运行态（端口 / 进程 / 端点）

| 端口 | 状态 |
|---|---|
| 5173 | LISTEN pid 36328（node/vite，启动 2026-11-05 22:28:04；本轮起始为空，已由主线拉起） |
| 8080 | LISTEN pid 35612（bun `src/bff/index.ts`，启动 21:34:39） |
| 3000 / 8000 / 9090 | 无监听 |

六端点实测（00:2x）：

| 端点 | 状态 | 字节 |
|---|---|---|
| `/health` | 200 | 2 |
| `/ready` | 200 | 115 |
| `/api/v1/health` | 200 | 166 |
| `/api/v1/system/health` | 200 | 145 |
| `/metrics` | 200 | 39072 |
| `5173/`（前端首页） | 200 | 894 |

## 5. 品牌 / 路由 / 卫生

- 品牌 17 词 Ordinal 扫描（`src` + `web\src`，逐文件 `ReadAllText`）：**files=9809，hits=0，hitFiles=0**。
- 路由体检：`routePathDeclarations=2870`、`uniquePaths=2870`、`duplicatePaths=0`、`lazyImports=2863`、`lazyMissing=0`（`logs/patrol-2026d-route.log`）。
- 根目录无新增未跟踪探针文件；本轮取证脚本与日志均落在 `logs/`，不入库。

## 6. 本轮就地优化：fs 验收脚本的“已知限制”免检通道

**问题**：`scripts/verify-fs-backend.mts` 中 `CHECK-B-seal-after-restart` 原先只用 `console.log` 无条件打印 `KNOWN_LIMITATION`，不进入 `results`、不参与 PASS/FAIL。即便 seal 因密钥缺失返回 500 或网络异常，脚本仍会判 `PASS_WITH_KNOWN_LIMITATIONS` —— 等同于给已知限制开了一条免检通道（fail-open 的另一种形态）。

**改动**（commit `0c92bb1d`）：
1. A 段两次 seal 分别断言：`A-seal-1st`、`A-seal-2nd`，原先静默的第一次 seal 纳入判定；
2. B 段改为条件断言：仅当 `status=400` 且 message 含“当前无待归档事件”才认定该已知限制（pending 池纯内存、重启后为空），密钥缺失 500、时间窗非法、网络异常一律 FAIL。

**修后复跑**：8/8 CHECK PASS，`RESULT: PASS_WITH_KNOWN_LIMITATIONS (1)`（`logs/patrol-2026c-fsverify3.log`），根 tsc 复跑 0 错。

**过程修正（如实记录）**：第一次改脚本时误加了一次多余的第三次 seal，导致 `A-seal-2nd: FAIL | status=400`；读源码与独立诊断脚本（`logs/patrol-2026c-sealseq.log`，进程内 seed→seal→seed→seal 均为 201）确认 `400` 来自“无待归档事件”的第三调用，而非产品缺陷；删除多余调用后全绿。此教训说明：断言红灯先核对夹具自身调用次数，再怀疑被测实现。

## 7. 组织侧 P5-12 独立复核结论（自报 vs 实测）

| 自报项 | 主线实测 | 结论 |
|---|---|---|
| 双 tsc 全绿 | 根/web 均 exit 0、0 字节 | 真 |
| worm 单测 113/0/425（四文件口径） | 主线四文件（含 E2E）118/0/356 | 口径差异，均全绿；非冲突 |
| fs 后端跨进程可用 | 脚本 A 段 2 段落盘、B 进程读回 `kind=fs count=2`、`verify valid=true gaps=[]` | 真 |
| 跨进程密钥稳定 | `KEY-STATUS-A/B` 均 `keySource=env`、`signerKeyId` 逐位相同 | 真（发现 1 修复生效） |
| factory 全 fail-closed | 独立进程矩阵：只配私钥/只配公钥 → `worm-env-key-invalid`；KEY_DIR 无 KEK → `worm-kek-not-configured`；production 无配置 → `worm-key-provider-not-configured-for-production` | 真 |
| `KNOWN_LIMITATION` | 已改为条件断言，400 + “当前无待归档事件” | 现已可证伪 |

运行态 worm 真值（pid 35612）：`keys` → `keySource=demo-ephemeral`、`signerKeyId=k-04c2c05bc7a9`、`sm4Configured=true`；`store/info` → `kind=memory`、`segmentCount=25`、`oldestSeq=1`、`newestSeq=121`；`keys/ops?limit=20` → 20 条、`leak_privkey=false`；`verify?scope=real` → `valid=true`、`gaps=[]`；`purge` 缺 confirm → 400/`40000`/`confirm-required`；无 token → 401/`40100`。

## 8. 提交与推送

| 项 | 值 |
|---|---|
| 本轮优化提交 | `0c92bb1d`（`fix(patrol): fs 后端验收脚本把“已知限制”改为可证伪断言`） |
| 本简报提交 | 随本文件另行提交 |
| 推送目标 | `gitcode`（JLMEDAIOS.git）与 `mirror`（JLAIharnessos.git），分支 `consult-agent-m86` → 双方 `master` 与本分支 |
| 推送结果 | 双仓推送成功；`git ls-remote` 逐位核对见本轮回复（简报不写死“最终 SHA”，避免自我指涉） |
| 未推送 | `origin`（HTTPS token 口径）、`heagentos`；未打 tag |

## 9. 遗留风险与下一轮重点

1. **P4 审计持久化（最重，待用户定夺）**：`src/bff/aggregators/auditEventAggregator.ts` 的 `events` 为纯内存数组，`recordEvent` 只 push、`queryEvents` 只 filter，全文无任何 fs/DB 写入；`/api/v1/audit/events` 读同一数组 → **重启即清空**，等保三级“审计留存 ≥6 个月”不合规。建议单独立项：PG 落盘 + 启动回填（`seq > lastArchivedSeq` 灌回 pending 池）。
2. **运维审计并发写口径（B）**：`_key-ops.json` 单文件追加 + 1000 条截断，多实例互相覆盖；需按实例/按日分文件或加锁。
3. **S3 / SIEM 适配（D）**：无环境，只能 mock，暂不立项。
4. **默认存储后端**：`WORM_BACKEND` 默认 memory，重启丢段；是否默认 fs 未拍板。
5. **`.env` 无 `WORM_*`**：运行态恒 `demo-ephemeral`，重启换钥、旧段 `unknown-key-id`；生产 KEK/KMS 注入路径已文档化但落地方式未定。
6. **`scripts/` 11 个历史一次性脚本类型债**：修复 / `@ts-nocheck` / 长期排除，未定。
7. **397 项未跟踪 `reports/`**：归属另一路 consult 任务，长期未收口。
8. **本地 `master` 指向历史提交**：是否清理未定。

**下一轮重点**：跟踪组织智能体对 P4 审计持久化的立项反馈与 B（审计并发写）切片；复核 `docs/security/worm-key-provider.md` 新增的“索引一致性边界”章节质量；继续每轮独立复跑双 tsc + E2E + fs 验收脚本，防止自报假绿。
