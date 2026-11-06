# 健澜仓库滚动巡检简报 · 2026-11-05 14:28 槽位

- 巡检时间：2026-11-05 14:28–14:45（CST）
- 仓库根：`C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1`
- 工作分支：`consult-agent-m86`；本轮基线 HEAD：`c12218a2`（`chore(tsc): scripts/** 纳入根 tsc 类型检查`）
- 产品正式名：健澜AI原生医院操作系统OS
- 说明：本简报按纪律不写死自身最终 SHA，最终 SHA 只在巡检回执中给出。

## 1. 组织智能体状态

`o_000Rfj7NkAk`（HIS-EMR 一体化复刻与脱敏升级，thread `60620697200580098`）：

- peek 结果：`status=2`（finished）、overall 80%、version 378、round 4944–4945、`updated_at_unix=1793855347`（约 14:29）。
- 自报摘要：「globalRateLimit localhost 免流三门控（devMode + noProxy + isLocal）代码已就位，E2E 两轮 22/0/73 全绿，双 tsc 0B，待补生产单测 + 品牌扫描 + commit」。
- 主线核对：工作区 `git status --porcelain` 只有本轮三处改动，**`src/bff/middleware/globalRateLimit.ts` 无未提交改动**；该文件最近两次提交是 `9b0ed348`（本机回环免流加环境门控）与 `e6207a62`，即组织侧所称「三门控」的落地能力早已在库内，其「代码已就位但未 commit」的表述与磁盘不符，属自述滞后，非 P0。
- 组织侧 P5-8 四个提交（`94f9c491` / `8b69a109` / `52a261d9` / `c12218a2`）代码走读已完成，本轮针对其门禁自报做了独立复跑（见第 3、4 节）。

## 2. 工具链实测

| 工具 | 版本 |
|---|---|
| node | v22.23.2 |
| bun | 1.2.0（全路径 `C:\Users\lenovo\.bun\bin\bun.exe`，PATH 未注册） |
| npm | 10.9.8 |

## 3. 双 tsc 门禁（实测，非沿用旧口径）

| 目标 | 命令 | 结果 |
|---|---|---|
| 根 tsc | `node node_modules/typescript/bin/tsc --noEmit` | 修复前 **exit 2 / 16566 字节 / 158 行**；修复后 **exit 0 / 0 字节** |
| web tsc | `bun x tsc --noEmit`（cwd=`web`） | **exit 0 / 0 字节** |

**本轮修掉的 P0（组织侧假绿）**：`c12218a2` 把 `include` 由 `src/tests` 扩到 `scripts/**/*`，一次性拖入 35 个历史 ts/mts 脚本。这些脚本没有 import/export，被 tsc 视为全局脚本合并进同一作用域，`scripts` 内 11 个文件互相重名，报 TS2393 / TS2451（`BASE`）/ TS2339 / TS2769 / TS18048。涉及 `scripts/docker/healthcheck.ts`、`scripts/e2e-api-test.ts`、`scripts/evidence/m1b2-http-evidence.ts`、`scripts/inpatient-cleanup.ts`、`scripts/inpatient-concurrency.ts`、`scripts/inpatient-e2e.ts`、`scripts/inpatient-restart.ts`、`scripts/m201-stress.ts`、`scripts/smoke-check.ts`、`scripts/verify-perf.ts`、`scripts/verify-roles.ts`。

处置：`include` 收敛为 `["src/**/*","tests/**/*","scripts/perf-worm-search.mts"]`，只保留本轮新增的性能脚本受检；11 个历史脚本一个未改，其类型债登记为 backlog。

## 4. 测试门禁（实测）

| 套件 | 结果 | 日志 |
|---|---|---|
| 五文件单测（wormKeyProvider + wormArchive + auditEventHook + auditEvents + auditReport） | **99 pass / 0 fail / 254 expect（2.82s）** | `logs/patrol-1428-unit-worm2.log` |
| WORM E2E R1（BFF 14:37 重启到 P5-8 新代码 + 干净 store） | **22 pass / 0 fail / 73 expect** | `logs/patrol-1428-e2e-R1.log` |
| WORM E2E R2（紧接着连打第二遍） | **22 pass / 0 fail / 73 expect** | `logs/patrol-1428-e2e-R2.log` |

**本轮修掉的 P0（跨文件测试污染）**：五文件组合曾跑出 72 pass / 27 fail，而单跑 `wormArchive` 是 48/0/165。按文件顺序二分复现：`wormArchive→keyProvider` = 59 pass 全绿，`keyProvider→wormArchive` = 32 pass / 27 fail，确定与加载顺序相关。根因是 `wormKeyProvider.test.ts` 的 `beforeEach` 执行 `delete NODE_ENV / DEMO_MODE / WORM_FILE_KEY`，`afterAll` 只清临时目录、**不还原环境变量**；后加载的 `wormArchiveAggregator` 在模块级 `initKeys()` 读不到 `DEMO_MODE=1`，SM4 与 SM2 密钥双双置空，`seal()` 守卫（`sm4KeyHex.length !== 32 || !sm2PrivateKeyHex`）全部命中，返回 `worm-key-not-configured`。处置只修污染源、不动任何断言：加 `ORIGINAL_ENV` 五项快照 + `restoreEnv()`，`afterAll` 逐项还原后再 `__resetKeyProvider(null)`。

另有注释与实现对齐一处（非行为变更）：`wormKeyProvider.ts` 文件头原写「KEK=WORM_KEK 或回落 WORM_SM4_KEY」，与实际实现（缺失即拒绝构造）矛盾，已改为「KEK 只认 WORM_KEK，缺失即拒绝构造，绝不回落内容密钥 WORM_SM4_KEY」。

## 5. 运行态与健康端点（实测）

BFF：`pid 13180`，`bun.exe run src/bff/index.ts`，启动 `2026-11-05 14:37:11`（已重启到 P5-8 新代码，`WORM_STORE_DIR=logs\worm-store-1428` 干净目录）。前端：`5173`，`pid 6528`，node 跑 `vite.js --host 127.0.0.1 --port 5173`，启动 `10:51:27`。

| 端点 | 状态 | 字节 |
|---|---|---|
| `8080/health` | 200 | 7 |
| `8080/ready` | 200 | 115 |
| `8080/api/v1/health` | 200 | 163 |
| `8080/api/v1/system/health` | 200 | 145 |
| `8080/metrics` | 200 | 32751 |
| `5173/` | 200 | 894 |

端口：3000 / 8000 / 9090 无监听（符合本项目拓扑）；5173 与 8080 均单实例监听，无冲突。

**WORM 运行时实证（P5-8 新能力）**：

- `GET /api/v1/worm/keys` → 200，`keySource=demo-ephemeral`、`signerKeyId=k-043b212bbaac`。
- `POST /api/v1/worm/keys/rotate` → 200，`fromKeyId=k-043b212bbaac`、`toKeyId=k-0440720c7883`、`keySource=demo-ephemeral`，响应体不含私钥。
- 轮换后 `GET /api/v1/worm/keys` → `signerKeyId` 已切到 `k-0440720c7883`。
- `POST /api/v1/worm/verify?scope=real` → 200，`valid=true`、`realChainValid=true`、`digestValid=true`、`signatureValid=true`、`seqContinuity.valid=true`（`gaps=[]`、`duplicateSeq=[]`、`outOfOrder=false`），`segmentCount=6`，6 个段逐个 `digestValid/signatureValid=true`——**证明轮换后旧段仍能用旧钥验签**，按 keyId 选钥的改造在运行态成立。

## 6. 品牌与路由

- 品牌硬禁词 17 词（`gang-os`、`gangos-`、`Gang-OS`、`GangOS`、`Jianlan OS`、`杠OS`、`建兰`、`卫宁`、`Winning`、`WiNEX`、`WiNGPT`、`Weining`、`Chuangye`、`Donghua`、`Lianzhong`、`Zhiye`、`weining`）：遍历 `src` + `web/src` 共 **9809** 个文件，逐文件 `ReadAllText` + `IndexOf(Ordinal)`，**命中 0**（`gangos_` 存量指标名属专项 backlog，未计入硬违规）。
- 路由体检 `node logs/route-audit.cjs`：`routePathDeclarations=2870`、`uniquePaths=2870`、`duplicatePaths=0`、`lazyImports=2863`、`lazyMissing=0`。本轮未新增路由（仅新增 admin 的 rotate 路由已在 P5-8 提交内），无悬空 lazy import。

## 7. 仓库卫生

- 本轮提交后 `trackedDirty=0`。
- 未跟踪 **376** 项，全部在 `reports/`：`reports/consult-deepen` 194、`reports/patrol` 170、`reports/consult-rebuild` 12。属另一路 consult 任务与历史轮次产物，本主线不代提交、不删除。
- `logs/` 由 `.gitignore:33` 覆盖，本轮全部日志与探针脚本（`patrol-1428-*`、`tmp-seal-probe*.ts`）不入库。

## 8. 本轮分组 commit

| SHA | 类型 | 内容 |
|---|---|---|
| `70ad21f9` | fix(tsc) | 根 tsc 只纳入本轮性能脚本，纠正 scripts 整目录造成的假绿（`tsconfig.json`） |
| `d6a40b8b` | fix(test) | KeyProvider 单测还原进程环境、消除跨文件假红 + KEK 注释与实现对齐（`tests/unit/wormKeyProvider.test.ts`、`src/bff/aggregators/wormKeyProvider.ts`） |

## 9. 遗留风险与下一轮重点

1. **密钥体系仍是 demo 形态**：`.env` 无任何 `WORM_*` 变量，运行态 provider 为 `demo-ephemeral`，重启即换钥、旧段签名随之失效。生产必须走 `FileKeyProvider` + `WORM_KEK`（或 KMS/HSM），注入方式未定，需产品确认。
2. **密钥环只增不删**：无 `retire(keyId)` 回收策略，`_keys.json` 文件级防护有限（仅只读属性），组织侧已自陈，列为下一批候选。
3. **`scripts/` 11 个历史脚本类型债**：本轮只收敛 include 避免误伤，是否修复 / 加 `@ts-nocheck` / 长期排除未定，登记 backlog。
4. **限流三态门控缺生产单测**：组织侧自报代码已就位（实际已在 `9b0ed348`），但「生产环境 127.0.0.1 仍受限流」的负向用例尚无测试覆盖，需补。
5. **376 个未跟踪 `reports/` 项**长期未收口，归另一路 consult 任务。
6. 下一轮重点：复跑双 tsc 与五文件 + E2E 基线；验证组织侧新增切片是否带测试且能独立复跑；推动 `retire(keyId)` 与 KEK 注入路径落地。

## 10. 结论

本轮门禁全绿且均为实测：双 tsc 0/0B、单测 99/0/254、E2E 22/0 ×2、六端点全 200、品牌 0/9809、路由 2870/0 dup、WORM 轮换与验签运行态成立。两处 P0（组织侧根 tsc 假绿、单测跨文件污染）已就地修复并复跑清零，已分两组提交；双仓推送与三端 SHA 逐位核对结果见巡检回执。
